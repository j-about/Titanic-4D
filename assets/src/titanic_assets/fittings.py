"""Fittings of the model: funnels, masts, rudder, deadwood, shaft fairings and propellers."""

import math
from collections.abc import Sequence

import numpy as np

from titanic_assets import modelling as m
from titanic_assets.materials import ANTIFOULING, FUNNEL_BLACK, FUNNEL_BUFF, MAST, STEEL
from titanic_assets.mesh import FloatArray, MeshBuilder, Point
from titanic_assets.offsets import Funnel, Mast, Offsets


def _unit_circle(segments: int) -> list[tuple[float, float]]:
    """Return the cosines and sines of ``segments`` angles evenly spaced round the circle."""
    return [
        (math.cos(2 * math.pi * index / segments), math.sin(2 * math.pi * index / segments))
        for index in range(segments)
    ]


def _level_ring(centre: Point, semi_axes: tuple[float, float], segments: int) -> list[Point]:
    """Return a horizontal ellipse, listed clockwise when seen from above."""
    x, y, z = centre
    along, across = semi_axes
    return [(x + along * cosine, y - across * sine, z) for cosine, sine in _unit_circle(segments)]


def _cross_ring(centre: Point, radius: float, segments: int) -> list[Point]:
    """Return a circle in a plane across the ship, listed clockwise when seen from aft."""
    x, y, z = centre
    return [(x, y + radius * cosine, z - radius * sine) for cosine, sine in _unit_circle(segments)]


def _loft(rings: Sequence[Sequence[Point]]) -> FloatArray:
    """Arrange rings of equal length as the rows of a grid of points of shape (columns, rows, 3)."""
    return np.asarray(rings, dtype=np.float64).transpose(1, 0, 2)


def build_funnel(funnel: Funnel) -> MeshBuilder:
    """Build a funnel: raked elliptical shell, black top, rim, open top and pipes."""
    mesh = MeshBuilder()
    slope = math.tan(math.radians(funnel.rake_deg))
    semi_axes = (funnel.length_fore_aft / 2, funnel.breadth / 2)
    black_from = funnel.base + (funnel.top - funnel.base) * m.FUNNEL_BLACK_FROM
    rim_base = funnel.top - m.FUNNEL_RIM_HEIGHT_M
    well = funnel.top - m.FUNNEL_WELL_DEPTH_M

    def ring(height: float, outset: float = 0.0) -> list[Point]:
        centre = (funnel.x + (height - funnel.base) * slope, 0.0, height)
        axes = (semi_axes[0] + outset, semi_axes[1] + outset)
        return _level_ring(centre, axes, m.FUNNEL_SEGMENTS)

    def centre(height: float) -> list[Point]:
        return [(funnel.x + (height - funnel.base) * slope, 0.0, height)] * m.FUNNEL_SEGMENTS

    rim = m.FUNNEL_RIM_OUTSET_M
    wall = -m.FUNNEL_WALL_M
    shell = _loft((ring(funnel.base), ring(black_from), ring(rim_base)))
    mesh.add_surface((FUNNEL_BUFF, FUNNEL_BLACK), shell, closed=True)
    for rows in (
        (ring(rim_base), ring(rim_base, rim)),
        (ring(rim_base, rim), ring(funnel.top, rim)),
        (ring(funnel.top, rim), ring(funnel.top, wall)),
        (ring(funnel.top, wall), ring(well, wall)),
        (ring(well, wall), centre(well)),
    ):
        mesh.add_surface((FUNNEL_BLACK,), _loft(rows), closed=True)

    for side in (-1, 1) if funnel.exhausts_boilers else (-1,):
        _add_funnel_pipe(mesh, funnel, side)
    return mesh


def _add_funnel_pipe(mesh: MeshBuilder, funnel: Funnel, side: int) -> None:
    """Add a pipe standing against the fore side (``side`` -1) or the after side of a funnel."""
    slope = math.tan(math.radians(funnel.rake_deg))
    reach = funnel.length_fore_aft / 2 + m.FUNNEL_PIPE_GAP_M + m.FUNNEL_PIPE_RADIUS_M
    black_from = funnel.base + (funnel.top - funnel.base) * m.FUNNEL_BLACK_FROM
    top = funnel.top - m.FUNNEL_RIM_HEIGHT_M - m.FUNNEL_PIPE_TOP_BELOW_RIM_M

    def ring(height: float, radius: float = m.FUNNEL_PIPE_RADIUS_M) -> list[Point]:
        x = funnel.x + (height - funnel.base) * slope + side * reach
        return _level_ring((x, 0.0, height), (radius, radius), m.FUNNEL_PIPE_SEGMENTS)

    pipe = _loft((ring(funnel.base), ring(black_from), ring(top)))
    mesh.add_surface((FUNNEL_BUFF, FUNNEL_BLACK), pipe, closed=True)
    mesh.add_surface((FUNNEL_BLACK,), _loft((ring(top), ring(top, 0.0))), closed=True)


def build_mast(mast: Mast, crows_nest_height: float | None) -> MeshBuilder:
    """Build a raked, tapered pole mast, with a crow's nest when its height is given."""
    mesh = MeshBuilder()
    slope = math.tan(math.radians(mast.rake_deg))

    def ring(
        height: float, radius: float, forward: float = 0.0, segments: int = m.MAST_SEGMENTS
    ) -> list[Point]:
        centre = (mast.x + (height - mast.base) * slope - forward, 0.0, height)
        return _level_ring(centre, (radius, radius), segments)

    pole = _loft((ring(mast.base, m.MAST_RADIUS_BASE_M), ring(mast.top, m.MAST_RADIUS_TOP_M)))
    mesh.add_surface((MAST,), pole, closed=True)
    cap = _loft((ring(mast.top, m.MAST_RADIUS_TOP_M), ring(mast.top, 0.0)))
    mesh.add_surface((MAST,), cap, closed=True)
    if crows_nest_height is None:
        return mesh

    def nest(height: float, radius: float = m.CROWS_NEST_RADIUS_M) -> list[Point]:
        return ring(height, radius, m.CROWS_NEST_FORWARD_M, m.CROWS_NEST_SEGMENTS)

    floor = crows_nest_height
    rail = floor + m.CROWS_NEST_HEIGHT_M
    for rows in (
        (nest(floor), nest(rail)),
        (nest(rail), nest(floor)),
        (nest(floor), nest(floor, 0.0)),
        (nest(floor, 0.0), nest(floor)),
    ):
        mesh.add_surface((MAST,), _loft(rows), closed=True)
    return mesh


def _add_propeller(mesh: MeshBuilder, centre: Point, diameter: float) -> None:
    """Add a propeller turning about an axis along the ship: hub, cone and blades."""
    x, y, z = centre
    radius = diameter / 2
    hub_radius = diameter * m.PROPELLER_HUB_RADIUS_RATIO
    hub_start = x - diameter * m.PROPELLER_HUB_LENGTH_RATIO / 2
    hub_end = x + diameter * m.PROPELLER_HUB_LENGTH_RATIO / 2
    tip = hub_end + diameter * m.PROPELLER_CONE_LENGTH_RATIO
    segments = m.PROPELLER_HUB_SEGMENTS

    def ring(station: float, ring_radius: float) -> list[Point]:
        return _cross_ring((station, y, z), ring_radius, segments)

    hub = _loft((ring(hub_start, hub_radius), ring(hub_end, hub_radius), ring(tip, 0.0)))
    mesh.add_surface((STEEL, STEEL), hub, closed=True)
    mesh.add_surface(
        (STEEL,), _loft((ring(hub_start, 0.0), ring(hub_start, hub_radius))), closed=True
    )

    pitch = diameter * m.PROPELLER_PITCH_RATIO
    chord = diameter * m.PROPELLER_CHORD_RATIO
    root = hub_radius * 0.8
    for blade in range(m.PROPELLER_BLADES):
        angle = 2 * math.pi * blade / m.PROPELLER_BLADES
        radial = (math.cos(angle), math.sin(angle))
        tangent = (-math.sin(angle), math.cos(angle))
        columns: list[list[Point]] = []
        for edge in (-0.5, 0.0, 0.5):
            column: list[Point] = []
            for span, width in m.PROPELLER_BLADE_PROFILE:
                distance = root + (radius - root) * span
                twist = math.atan2(pitch, 2 * math.pi * distance)
                offset = edge * width * chord
                column.append(
                    (
                        x + offset * math.sin(twist),
                        y + distance * radial[0] + offset * math.cos(twist) * tangent[0],
                        z + distance * radial[1] + offset * math.cos(twist) * tangent[1],
                    ),
                )
            columns.append(column)
        surface = np.asarray(columns, dtype=np.float64)
        mesh.add_surface((STEEL,) * (len(m.PROPELLER_BLADE_PROFILE) - 1), surface)
        mesh.add_surface((STEEL,) * (len(m.PROPELLER_BLADE_PROFILE) - 1), surface, inward=True)


def _add_rudder(mesh: MeshBuilder, offsets: Offsets) -> None:
    """Add the blade of the rudder below the counter, its post and the sole piece under it."""
    hull = offsets.hull
    post = offsets.particulars.length_between_perpendiculars
    leading = post + m.RUDDER_POST_OFFSET_M
    heel = m.RUDDER_HEEL_HEIGHT_M
    chord = m.RUDDER_CHORD_M

    def under_counter(x: float) -> float:
        return hull.bottom_at(x) + m.SEAM_OVERLAP_M * 5

    top_fraction = m.RUDDER_OUTLINE[-1][0]
    height = under_counter(leading + top_fraction * chord) - heel
    outline: list[tuple[float, float]] = [(leading, heel)]
    outline.extend((leading + along * chord, heel + up * height) for along, up in m.RUDDER_OUTLINE)
    outline.extend(
        (
            leading + fraction * top_fraction * chord,
            under_counter(leading + fraction * top_fraction * chord),
        )
        for fraction in (0.75, 0.5, 0.25, 0.0)
    )

    def half_thickness(x: float) -> float:
        thick, thin = m.RUDDER_HALF_THICKNESS_M
        return thick + (thin - thick) * (x - leading) / chord

    def starboard(point: tuple[float, float]) -> Point:
        return (point[0], half_thickness(point[0]), point[1])

    def port(point: tuple[float, float]) -> Point:
        return (point[0], -half_thickness(point[0]), point[1])

    centre = (leading + chord * 0.45, heel + height * 0.45)
    half = MeshBuilder()
    for index, point in enumerate(outline):
        following = outline[(index + 1) % len(outline)]
        half.add_polygon(ANTIFOULING, (starboard(centre), starboard(following), starboard(point)))
        mesh.add_quad(
            ANTIFOULING, starboard(point), starboard(following), port(following), port(point)
        )
    mesh.add_symmetric(half)

    thickness = m.SKEG_HALF_THICKNESS_M
    mesh.add_box(
        ANTIFOULING,
        (m.PROPELLER_POST_X_M, -thickness, 0.0),
        (leading + chord * m.RUDDER_OUTLINE[0][0], thickness, m.SOLE_PIECE_HEIGHT_M),
    )
    mesh.add_box(
        ANTIFOULING,
        (post - m.RUDDER_POST_OFFSET_M, -thickness, m.SOLE_PIECE_HEIGHT_M),
        (leading, thickness, under_counter(leading)),
    )


def _add_deadwood(mesh: MeshBuilder, offsets: Offsets) -> None:
    """Add the deadwood between the rising bottom of the hull and the keel line."""
    hull = offsets.hull
    thickness = m.SKEG_HALF_THICKNESS_M
    steps = math.ceil((m.PROPELLER_POST_X_M - m.SKEG_START_X_M) / m.SKEG_STEP_M)
    stations = [
        m.SKEG_START_X_M + (m.PROPELLER_POST_X_M - m.SKEG_START_X_M) * step / steps
        for step in range(steps + 1)
    ]
    tops = [hull.bottom_at(x) + m.SEAM_OVERLAP_M * 5 for x in stations]
    half = MeshBuilder()
    for index in range(steps):
        xa, xb = stations[index], stations[index + 1]
        low_a, low_b = (xa, thickness, 0.0), (xb, thickness, 0.0)
        half.add_quad(
            ANTIFOULING,
            low_a,
            (xa, thickness, tops[index]),
            (xb, thickness, tops[index + 1]),
            low_b,
        )
        mesh.add_quad(ANTIFOULING, low_a, low_b, (xb, -thickness, 0.0), (xa, -thickness, 0.0))
    mesh.add_symmetric(half)
    end, top = stations[-1], tops[-1]
    mesh.add_quad(
        ANTIFOULING,
        (end, thickness, 0.0),
        (end, thickness, top),
        (end, -thickness, top),
        (end, -thickness, 0.0),
    )


def add_stern_gear(mesh: MeshBuilder, offsets: Offsets) -> None:
    """Add the rudder, the deadwood, the fairings of the wing shafts and the three propellers."""
    particulars = offsets.particulars
    _add_deadwood(mesh, offsets)
    _add_rudder(mesh, offsets)

    centre: Point = (m.CENTRE_PROPELLER_X_M, 0.0, m.CENTRE_SHAFT_HEIGHT_M)
    diameter = particulars.centre_propeller_diameter
    hub_radius = diameter * m.PROPELLER_HUB_RADIUS_RATIO
    boss = _loft(
        (
            _cross_ring(
                (m.PROPELLER_POST_X_M - 1.0, 0.0, centre[2]), hub_radius, m.PROPELLER_HUB_SEGMENTS
            ),
            _cross_ring((centre[0], 0.0, centre[2]), hub_radius, m.PROPELLER_HUB_SEGMENTS),
        ),
    )
    mesh.add_surface((ANTIFOULING,), boss, closed=True)
    _add_propeller(mesh, centre, diameter)

    half = MeshBuilder()
    wing: Point = (m.WING_PROPELLER_X_M, m.WING_SHAFT_OFFSET_M, m.WING_SHAFT_HEIGHT_M)
    forward_radius, after_radius = m.BOSSING_RADII_M
    fairing = _loft(
        (
            _cross_ring(
                (m.BOSSING_START_X_M, wing[1], wing[2]), forward_radius, m.BOSSING_SEGMENTS
            ),
            _cross_ring(wing, after_radius, m.BOSSING_SEGMENTS),
        ),
    )
    half.add_surface((ANTIFOULING,), fairing, closed=True)
    _add_propeller(half, wing, particulars.wing_propeller_diameter)
    mesh.add_symmetric(half)
