"""Hull of the model: shell plating, bottom, weather decks, section caps and stem head.

The plating is a grid of points taken from the table of offsets: one column per station, one row
per height, on the starboard side. The port side is its reflection.
"""

from dataclasses import dataclass

import numpy as np
import numpy.typing as npt

from titanic_assets import modelling as m
from titanic_assets.materials import ANTIFOULING, DECK_WOOD, HULL_BLACK, SHADOW, SHEER_STRIPE, WHITE
from titanic_assets.mesh import FloatArray, MeshBuilder, grid_triangles, smooth_normals
from titanic_assets.offsets import Extent, Offsets

_TOLERANCE_M = 1e-6

ROW_MATERIALS: tuple[str, ...] = (
    *(ANTIFOULING,) * (len(m.BILGE_ROW_OFFSETS_M) + m.LOWER_SIDE_ROWS),
    *(HULL_BLACK,) * m.BLACK_ROWS,
    SHEER_STRIPE,
    *(WHITE,) * m.WHITE_ROWS,
)
"""Material of each interval between two rows of the grid, from the bottom up."""


@dataclass(frozen=True, slots=True)
class HullGrid:
    """Points and normals of the starboard plating, of shape (columns, rows, 3).

    A station at which the top of the plating steps appears as two columns, the first belonging
    to the plating forward of the step.
    """

    stations: FloatArray
    in_well: npt.NDArray[np.bool_]
    points: FloatArray
    normals: FloatArray

    def columns_between(self, x_start: float, x_end: float) -> tuple[int, int]:
        """Return the first and last columns whose stations lie in a closed range."""
        inside = np.flatnonzero(
            (self.stations >= x_start - _TOLERANCE_M) & (self.stations <= x_end + _TOLERANCE_M),
        )
        return int(inside[0]), int(inside[-1])

    def column_at(self, x: float) -> int:
        """Return the first column whose station is ``x``."""
        return int(np.flatnonzero(np.abs(self.stations - x) < _TOLERANCE_M)[0])


def _is_multiple(value: float, unit: float) -> bool:
    ratio = value / unit
    return abs(ratio - round(ratio)) < _TOLERANCE_M


def _station_spacing(distance_from_end: float) -> float:
    for limit, spacing in m.STATION_SPACINGS:
        if distance_from_end < limit:
            return spacing
    return m.STATION_SPACING_M


def mesh_stations(offsets: Offsets) -> list[float]:
    """Choose the stations of the mesh among the stations of the table of offsets."""
    hull = offsets.hull
    wanted = {hull.start_x, hull.end_x, float(hull.stem_x[0])}
    wanted.add(offsets.particulars.length_between_perpendiculars)
    for extent in (
        *offsets.sections,
        offsets.zones["forward-well-deck"],
        offsets.zones["after-well-deck"],
    ):
        wanted.update((extent.x_start, extent.x_end))
    for step in range(1, m.END_SQUARED_STEPS + 1):
        distance = (step * m.END_SQUARED_UNIT_M) ** 2
        wanted.update((hull.start_x + distance, hull.end_x - distance))
    for station in hull.stations.tolist():
        distance = min(station - hull.start_x, hull.end_x - station)
        if _is_multiple(station, _station_spacing(distance)):
            wanted.add(station)
    indices = sorted({hull.station_index(x) for x in wanted})
    return [float(hull.stations[index]) for index in indices]


def _columns(offsets: Offsets) -> list[tuple[float, bool]]:
    """List the columns of the grid as a station and whether its plating encloses a well deck."""
    wells = (offsets.zones["forward-well-deck"], offsets.zones["after-well-deck"])
    columns: list[tuple[float, bool]] = []
    for x in mesh_stations(offsets):
        if any(abs(x - well.x_start) < _TOLERANCE_M for well in wells):
            columns.extend(((x, False), (x, True)))
        elif any(abs(x - well.x_end) < _TOLERANCE_M for well in wells):
            columns.extend(((x, True), (x, False)))
        else:
            columns.append((x, any(well.contains(x) for well in wells)))
    return columns


def _row_heights(bottom: float, top: float, paint_line: float, stripe: float) -> FloatArray:
    """Return the heights of the rows of one column, from the bottom to the top of the plating."""
    paint = min(max(paint_line, bottom), top)
    stripe_low = min(max(stripe - m.SHEER_STRIPE_HALF_HEIGHT_M, bottom), top)
    stripe_high = min(max(stripe + m.SHEER_STRIPE_HALF_HEIGHT_M, bottom), top)
    bilge = [min(bottom + offset, paint) for offset in m.BILGE_ROW_OFFSETS_M]
    lower_side = [
        bilge[-1] + (paint - bilge[-1]) * step / m.LOWER_SIDE_ROWS
        for step in range(1, m.LOWER_SIDE_ROWS + 1)
    ]
    black = [
        paint + (stripe_low - paint) * step / m.BLACK_ROWS for step in range(1, m.BLACK_ROWS + 1)
    ]
    white = [
        stripe_high + (top - stripe_high) * step / m.WHITE_ROWS
        for step in range(1, m.WHITE_ROWS + 1)
    ]
    return np.asarray([bottom, *bilge, *lower_side, *black, stripe_high, *white], dtype=np.float64)


def _plating_triangles(stations: FloatArray, row_count: int) -> npt.NDArray[np.int64]:
    """Return the triangles of the grid, leaving out the cells between the two columns of a step."""
    triangles = grid_triangles(len(stations), row_count)
    column = np.min(triangles // row_count, axis=1)
    return triangles[stations[column + 1] - stations[column] > _TOLERANCE_M]


def build_hull_grid(offsets: Offsets) -> HullGrid:
    """Sample the starboard plating and compute its smooth normals."""
    hull = offsets.hull
    paint_line = offsets.particulars.load_draught + m.BOOT_TOPPING_M
    columns = _columns(offsets)
    points = np.zeros((len(columns), len(ROW_MATERIALS) + 1, 3), dtype=np.float64)
    for column, (x, in_well) in enumerate(columns):
        index = hull.station_index(x)
        stripe = float(hull.deck_heights["c"][index])
        top = stripe + hull.well_bulwark_height if in_well else float(hull.top_height[index])
        heights = _row_heights(float(hull.bottom_height[index]), top, paint_line, stripe)
        points[column, :, 0] = x
        points[column, :, 1] = hull.half_breadths_at(index, heights)
        points[column, :, 2] = heights

    column_count, row_count = points.shape[0], points.shape[1]
    # The normals take into account the starboard half of the bottom plating, which joins the
    # lowest row of the grid to the centre line.
    centre_line = points[:, 0, :] * np.asarray([1.0, 0.0, 1.0])
    vertices = np.concatenate((points.reshape(-1, 3), centre_line))
    low = np.arange(column_count - 1) * row_count
    centre = column_count * row_count + np.arange(column_count - 1)
    half_bottom = np.concatenate(
        (
            np.stack((low, low + row_count, centre + 1), axis=1),
            np.stack((low, centre + 1, centre), axis=1),
        ),
    )
    stations = np.asarray([x for x, _ in columns], dtype=np.float64)
    plating = _plating_triangles(stations, row_count)
    normals = smooth_normals(vertices, np.concatenate((plating, half_bottom)))
    normals = normals[: column_count * row_count]
    return HullGrid(
        stations=stations,
        in_well=np.asarray([in_well for _, in_well in columns], dtype=np.bool_),
        points=points,
        normals=normals.reshape(points.shape),
    )


_MIRROR = np.asarray([1.0, -1.0, 1.0])


def add_shell(mesh: MeshBuilder, grid: HullGrid, section: Extent) -> None:
    """Add the plating of both sides and the bottom plating of a section."""
    first, last = grid.columns_between(section.x_start, section.x_end)
    points = grid.points[first : last + 1]
    normals = grid.normals[first : last + 1]
    row_count = points.shape[1]
    triangles = _plating_triangles(grid.stations[first : last + 1], row_count)
    row_of_triangle = np.min(triangles % row_count, axis=1)
    half = MeshBuilder()
    for material in sorted(set(ROW_MATERIALS)):
        wanted = np.asarray([name == material for name in ROW_MATERIALS], dtype=np.bool_)
        half.add_indexed(
            material,
            points.reshape(-1, 3),
            normals.reshape(-1, 3),
            triangles[wanted[row_of_triangle]],
        )
    mesh.add_symmetric(half)

    starboard, starboard_normal = points[:, 0], normals[:, 0]
    port, port_normal = starboard * _MIRROR, starboard_normal * _MIRROR
    for positions, corner_normals in (
        (
            np.stack((starboard[:-1], starboard[1:], port[1:]), axis=1),
            np.stack((starboard_normal[:-1], starboard_normal[1:], port_normal[1:]), axis=1),
        ),
        (
            np.stack((starboard[:-1], port[1:], port[:-1]), axis=1),
            np.stack((starboard_normal[:-1], port_normal[1:], port_normal[:-1]), axis=1),
        ),
    ):
        mesh.add(ANTIFOULING, positions, corner_normals)


def add_cap(mesh: MeshBuilder, grid: HullGrid, x: float, *, facing_aft: bool) -> None:
    """Close the hull at station ``x`` with a flat fan of triangles through its outline."""
    starboard = grid.points[grid.column_at(x)]
    outline = np.concatenate((starboard, (starboard * _MIRROR)[::-1]))
    following = np.roll(outline, -1, axis=0)
    centre = np.asarray([x, 0.0, (starboard[0, 2] + starboard[-1, 2]) / 2])
    centres = np.broadcast_to(centre, outline.shape)
    corners = (centres, outline, following) if facing_aft else (centres, following, outline)
    positions = np.stack(corners, axis=1)
    normal = np.asarray([1.0 if facing_aft else -1.0, 0.0, 0.0])
    mesh.add(SHADOW, positions, np.broadcast_to(normal, positions.shape).copy())


def _cross_wall(mesh: MeshBuilder, corner: tuple[float, float, float], top: float, *, facing_aft: bool) -> None:
    """Add a white wall across the ship, from ``corner`` on the starboard side up to ``top``."""
    x, half_width, base = corner
    quad = ((x, half_width, base), (x, half_width, top), (x, -half_width, top), (x, -half_width, base))
    mesh.add_polygon(WHITE, quad if facing_aft else quad[::-1])


def add_weather_decks(
    mesh: MeshBuilder,
    offsets: Offsets,
    grid: HullGrid,
    section: Extent,
    *,
    covered: bool,
) -> None:
    """Add the decks open to the sky, the inner faces of the well bulwarks and the breaks.

    With ``covered`` the deck inside the midship superstructure is left out.
    """
    hull = offsets.hull
    superstructure = offsets.zones["superstructure"]
    first, last = grid.columns_between(section.x_start, section.x_end)
    for column in range(first, last):
        xa, xb = float(grid.stations[column]), float(grid.stations[column + 1])
        if xb - xa < _TOLERANCE_M:
            continue
        in_well = bool(grid.in_well[column] and grid.in_well[column + 1])
        if covered and not in_well and superstructure.contains((xa + xb) / 2):
            continue
        edge_a = grid.points[column, -1]
        edge_b = grid.points[column + 1, -1]
        if not in_well:
            mesh.add_quad(
                DECK_WOOD,
                (xa, -edge_a[1], edge_a[2]),
                (xb, -edge_b[1], edge_b[2]),
                (xb, edge_b[1], edge_b[2]),
                (xa, edge_a[1], edge_a[2]),
            )
            continue
        deck_a = edge_a[2] - hull.well_bulwark_height
        deck_b = edge_b[2] - hull.well_bulwark_height
        side_a = float(hull.half_breadths_at(hull.station_index(xa), np.asarray([deck_a]))[0])
        side_b = float(hull.half_breadths_at(hull.station_index(xb), np.asarray([deck_b]))[0])
        mesh.add_quad(
            DECK_WOOD,
            (xa, -side_a, deck_a),
            (xb, -side_b, deck_b),
            (xb, side_b, deck_b),
            (xa, side_a, deck_a),
        )
        thickness = m.BULWARK_THICKNESS_M
        half = MeshBuilder()
        half.add_quad(
            WHITE,
            (xa, side_a - thickness, deck_a),
            (xb, side_b - thickness, deck_b),
            (xb, edge_b[1] - thickness, edge_b[2]),
            (xa, edge_a[1] - thickness, edge_a[2]),
        )
        half.add_quad(
            WHITE,
            (xa, edge_a[1] - thickness, edge_a[2]),
            (xb, edge_b[1] - thickness, edge_b[2]),
            (xb, edge_b[1], edge_b[2]),
            (xa, edge_a[1], edge_a[2]),
        )
        mesh.add_symmetric(half)

    for well in (offsets.zones["forward-well-deck"], offsets.zones["after-well-deck"]):
        for x, facing_aft in ((well.x_start, True), (well.x_end, False)):
            if section.x_start - _TOLERANCE_M <= x <= section.x_end + _TOLERANCE_M:
                index = hull.station_index(x)
                corner = (
                    x,
                    float(hull.half_breadth_at_top[index]),
                    float(hull.deck_heights["c"][index]),
                )
                _cross_wall(mesh, corner, float(hull.top_height[index]), facing_aft=facing_aft)


def add_stem_head(mesh: MeshBuilder, offsets: Offsets, grid: HullGrid) -> None:
    """Add the stem head: the stem carried up along its rake to the recorded overhang.

    Its sides fall from the tip to the edge of the forecastle deck, and a sloping plate closes
    it abaft.
    """
    hull = offsets.hull
    top = grid.points[0, -1]
    rake = float(hull.stem_x[-2] - hull.stem_x[-1]) / float(hull.waterlines[-1] - hull.waterlines[-2])
    tip_x = -offsets.particulars.stem_overhang
    tip = (tip_x, 0.0, float(top[2]) + (float(top[0]) - tip_x) / rake)
    last = int(np.searchsorted(grid.stations, hull.start_x + m.STEM_HEAD_LENGTH_M))
    edge = [(float(x), float(y), float(z)) for x, y, z in grid.points[: last + 1, -1]]
    half = MeshBuilder()
    for forward, after in zip(edge[:-1], edge[1:], strict=True):
        half.add_polygon(WHITE, (tip, after, forward))
    mesh.add_symmetric(half)
    x, y, z = edge[-1]
    mesh.add_polygon(WHITE, (tip, (x, -y, z), (x, y, z)))
