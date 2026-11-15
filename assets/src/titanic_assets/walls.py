"""Walls, plates and blocks following the sheer, with recessed windows.

A wall is described by a coordinate ``u`` that grows along it: the outer face is on the left of
someone walking toward growing ``u``. Along the ship ``u`` is the station ``x`` for a wall facing
starboard and ``-x`` for a wall facing port; across the ship it is ``y`` for a wall facing forward
and ``-y`` for a wall facing aft.
"""

import math
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from itertools import pairwise

from titanic_assets import modelling as m
from titanic_assets.materials import GLASS, SHADOW, WHITE
from titanic_assets.mesh import MeshBuilder, Point

type Line = Callable[[float], float]
type Plan = Callable[[float], tuple[float, float]]

_TOLERANCE_M = 1e-6
_MINIMUM_LENGTH_M = 0.01


@dataclass(frozen=True, slots=True)
class Opening:
    """A window: its extent along the wall and its sill and head above the base of the wall."""

    low: float
    high: float
    sill: float
    head: float

    def reversed(self) -> "Opening":
        """Return the opening as seen along the opposite coordinate."""
        return Opening(-self.high, -self.low, self.sill, self.head)


def constant(value: float) -> Line:
    """Return a line of constant value."""
    return lambda _: value


def negated(line: Line) -> Line:
    """Return the opposite of a line."""
    return lambda u: -line(u)


def shifted(line: Line, shift: float) -> Line:
    """Return a line moved by a constant."""
    return lambda u: line(u) + shift


def window_row(
    row: m.WindowRow,
    start: float,
    end: float,
    lift: float = 0.0,
    *,
    centred: bool = False,
) -> list[Opening]:
    """Place a row of windows between two coordinates of a wall whose base is ``lift`` above
    the deck line.

    The first window is at its inset from ``start`` and the others follow at the spacing of the
    row; with ``centred`` the row is centred between ``start`` and ``end`` instead.
    """
    span = end - start - row.inset_start - row.inset_end
    if span < 0:
        return []
    count = math.floor(span / row.spacing + _TOLERANCE_M) + 1
    first = start + row.inset_start
    if centred:
        first = (start + end) / 2 - (count - 1) * row.spacing / 2
    sill = row.centre_height - row.height / 2 - lift
    return [
        Opening(
            first + index * row.spacing - row.width / 2,
            first + index * row.spacing + row.width / 2,
            sill,
            sill + row.height,
        )
        for index in range(count)
    ]


def _cuts(start: float, end: float, step: float | None, openings: Sequence[Opening]) -> list[float]:
    """Return the coordinates at which a wall is divided: its ends, the multiples of ``step``
    and the edges of its openings."""
    cuts = {start, end}
    if step is not None:
        cuts.update(
            index * step for index in range(math.ceil(start / step), math.floor(end / step) + 1)
        )
    for opening in openings:
        cuts.update((opening.low, opening.high))
    ordered = sorted(cut for cut in cuts if start - _TOLERANCE_M <= cut <= end + _TOLERANCE_M)
    return [
        cut
        for index, cut in enumerate(ordered)
        if index == 0 or cut - ordered[index - 1] > _TOLERANCE_M
    ]


@dataclass(frozen=True, slots=True)
class Wall:
    """A vertical wall between two coordinates, standing on ``base`` and reaching ``top``."""

    start: float
    end: float
    plan: Plan
    base: Line
    top: Line
    material: str = WHITE
    step: float | None = None
    overlap: float = 0.0
    """Distance by which the wall extends below its base."""


def add_wall(mesh: MeshBuilder, wall: Wall, openings: Sequence[Opening] = ()) -> None:
    """Add a wall. Openings that do not fit between its ends are left out."""
    if wall.end - wall.start < _MINIMUM_LENGTH_M:
        return
    fitting = [
        opening
        for opening in openings
        if opening.low > wall.start + m.OPENING_END_MARGIN_M
        and opening.high < wall.end - m.OPENING_END_MARGIN_M
    ]
    for ua, ub in pairwise(_cuts(wall.start, wall.end, wall.step, fitting)):
        middle = (ua + ub) / 2
        opening = next((item for item in fitting if item.low < middle < item.high), None)
        (xa, ya), (xb, yb) = wall.plan(ua), wall.plan(ub)
        base_a, base_b = wall.base(ua), wall.base(ub)
        foot_a: Point = (xa, ya, base_a - wall.overlap)
        foot_b: Point = (xb, yb, base_b - wall.overlap)
        head_a: Point = (xa, ya, wall.top(ua))
        head_b: Point = (xb, yb, wall.top(ub))
        if opening is None:
            mesh.add_quad(wall.material, foot_a, head_a, head_b, foot_b)
            continue
        length = math.hypot(xb - xa, yb - ya)
        inward = ((yb - ya) / length * m.GLASS_RECESS_M, -(xb - xa) / length * m.GLASS_RECESS_M)
        face = _Frame((xa, ya), (xb, yb), base_a, base_b, opening)
        glass = _Frame((xa + inward[0], ya + inward[1]), (xb + inward[0], yb + inward[1]), base_a, base_b, opening)
        mesh.add_quad(wall.material, foot_a, face.sill_a, face.sill_b, foot_b)
        mesh.add_quad(wall.material, face.head_a, head_a, head_b, face.head_b)
        mesh.add_quad(GLASS, glass.sill_a, glass.head_a, glass.head_b, glass.sill_b)
        mesh.add_quad(wall.material, face.sill_a, glass.sill_a, glass.sill_b, face.sill_b)
        mesh.add_quad(wall.material, face.head_a, face.head_b, glass.head_b, glass.head_a)
        if abs(ua - opening.low) < _TOLERANCE_M:
            mesh.add_quad(wall.material, face.sill_a, face.head_a, glass.head_a, glass.sill_a)
        if abs(ub - opening.high) < _TOLERANCE_M:
            mesh.add_quad(wall.material, face.sill_b, glass.sill_b, glass.head_b, face.head_b)


class _Frame:
    """Corners of an opening in a vertical plane: sill and head at the two ends of a cell."""

    def __init__(
        self,
        a: tuple[float, float],
        b: tuple[float, float],
        base_a: float,
        base_b: float,
        opening: Opening,
    ) -> None:
        self.sill_a: Point = (a[0], a[1], base_a + opening.sill)
        self.head_a: Point = (a[0], a[1], base_a + opening.head)
        self.sill_b: Point = (b[0], b[1], base_b + opening.sill)
        self.head_b: Point = (b[0], b[1], base_b + opening.head)


def side_wall(
    start: float,
    end: float,
    half_width: Line,
    base: Line,
    top: Line,
    *,
    material: str = WHITE,
    overlap: float = 0.0,
) -> Wall:
    """Describe a wall along the ship facing starboard, between two stations."""
    return Wall(
        start,
        end,
        lambda u: (u, half_width(u)),
        base,
        top,
        material=material,
        step=m.WALL_STEP_M,
        overlap=overlap,
    )


def inboard_wall(start: float, end: float, half_width: Line, base: Line, top: Line) -> Wall:
    """Describe a wall along the ship facing port, between two stations."""
    return Wall(
        -end,
        -start,
        lambda u: (-u, half_width(-u)),
        lambda u: base(-u),
        lambda u: top(-u),
        step=m.WALL_STEP_M,
    )


def cross_wall(
    x: float,
    span: tuple[float, float],
    heights: tuple[float, float],
    *,
    facing_aft: bool,
    material: str = WHITE,
) -> Wall:
    """Describe a wall across the ship at station ``x``, between two distances from the centre
    line and two heights."""
    low, high = span
    base, top = constant(heights[0]), constant(heights[1])
    if facing_aft:
        return Wall(-high, -low, lambda u: (x, -u), base, top, material=material)
    return Wall(low, high, lambda u: (x, u), base, top, material=material)


@dataclass(frozen=True, slots=True)
class Plate:
    """A deck or a roof between two stations, following a height line."""

    start: float
    end: float
    low: Line
    high: Line
    height: Line
    material: str
    facing_down: bool = False


def add_plate(mesh: MeshBuilder, plate: Plate) -> None:
    """Add a plate between the distances ``low`` and ``high`` from the centre line."""
    if plate.end - plate.start < _MINIMUM_LENGTH_M:
        return
    for xa, xb in pairwise(_cuts(plate.start, plate.end, m.WALL_STEP_M, ())):
        za, zb = plate.height(xa), plate.height(xb)
        corners: tuple[Point, Point, Point, Point] = (
            (xa, plate.low(xa), za),
            (xb, plate.low(xb), zb),
            (xb, plate.high(xb), zb),
            (xa, plate.high(xa), za),
        )
        if plate.facing_down:
            corners = (corners[3], corners[2], corners[1], corners[0])
        mesh.add_quad(plate.material, *corners)


@dataclass(frozen=True, slots=True)
class Block:
    """A house: four walls and a roof between two stations and two distances from the centre."""

    x_start: float
    x_end: float
    y_low: float
    y_high: float
    base: Line
    top: Line
    side_windows: m.WindowRow | None = None
    front_windows: m.WindowRow | None = None
    lift: float = 0.0
    """Height of the base above the deck line from which the windows are measured."""


def add_block(mesh: MeshBuilder, block: Block, x_start: float, x_end: float) -> None:
    """Add the part of a block lying between two stations.

    An end produced by the cut is closed in the shadow colour and carries no window.
    """
    xa, xb = max(block.x_start, x_start), min(block.x_end, x_end)
    if xb - xa < _MINIMUM_LENGTH_M:
        return
    sides: list[Opening] = []
    if block.side_windows is not None:
        sides = window_row(block.side_windows, block.x_start, block.x_end, block.lift)
    add_wall(mesh, side_wall(xa, xb, constant(block.y_high), block.base, block.top), sides)
    add_wall(
        mesh,
        inboard_wall(xa, xb, constant(block.y_low), block.base, block.top),
        [opening.reversed() for opening in sides],
    )
    span = (block.y_low, block.y_high)
    for x, facing_aft, cut in (
        (xa, False, xa > block.x_start + _TOLERANCE_M),
        (xb, True, xb < block.x_end - _TOLERANCE_M),
    ):
        wall = cross_wall(
            x,
            span,
            (block.base(x), block.top(x)),
            facing_aft=facing_aft,
            material=SHADOW if cut else WHITE,
        )
        front: list[Opening] = []
        if block.front_windows is not None and not facing_aft and not cut:
            front = window_row(block.front_windows, *span, block.lift, centred=True)
        add_wall(mesh, wall, front)
    add_plate(
        mesh,
        Plate(xa, xb, constant(block.y_low), constant(block.y_high), block.top, SHADOW),
    )
