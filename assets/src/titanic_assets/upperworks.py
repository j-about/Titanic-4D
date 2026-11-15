"""Upper works of a section: superstructure, Boat deck, deckhouses, bridge and davits.

Everything is built for the part of the ship lying between the two ends of a section. Elements
symmetric about the centre plane are built on the starboard side and reflected.
"""

from dataclasses import dataclass

from titanic_assets import modelling as m
from titanic_assets.materials import DECK_WOOD, SHADOW, WHITE
from titanic_assets.mesh import MeshBuilder
from titanic_assets.offsets import DeckLine, Extent, Offsets
from titanic_assets.walls import (
    Block,
    Line,
    Plate,
    add_block,
    add_plate,
    add_wall,
    constant,
    cross_wall,
    inboard_wall,
    negated,
    shifted,
    side_wall,
    window_row,
)

_TOLERANCE_M = 1e-6
_MINIMUM_LENGTH_M = 0.01
_CUT_MARGIN_M = 1.0


@dataclass(frozen=True, slots=True)
class _Site:
    """The section being built, with the lines and distances shared by its upper works."""

    offsets: Offsets
    section: Extent
    deck_a: DeckLine
    deck_b: DeckLine
    boat: DeckLine
    boat_top: DeckLine
    side: Line
    promenade_wall: float

    def clip(self, start: float, end: float) -> tuple[float, float] | None:
        """Return the part of a range of stations lying inside the section, if any."""
        xa, xb = max(start, self.section.x_start), min(end, self.section.x_end)
        return (xa, xb) if xb - xa > _MINIMUM_LENGTH_M else None

    def has(self, x: float) -> bool:
        """Tell whether station ``x`` belongs to the section, ends included."""
        return self.section.x_start - _TOLERANCE_M <= x <= self.section.x_end + _TOLERANCE_M

    def cuts(self) -> list[tuple[float, bool]]:
        """List the ends of the section that are cuts through the hull, and whether they face aft."""
        hull = self.offsets.hull
        ends: list[tuple[float, bool]] = []
        if self.section.x_start > hull.start_x + _CUT_MARGIN_M:
            ends.append((self.section.x_start, False))
        if self.section.x_end < hull.end_x - _CUT_MARGIN_M:
            ends.append((self.section.x_end, True))
        return ends


def _site(offsets: Offsets, section: Extent) -> _Site:
    boat = offsets.deck("boat")
    return _Site(
        offsets=offsets,
        section=section,
        deck_a=offsets.deck("a"),
        deck_b=offsets.deck("b"),
        boat=boat,
        boat_top=boat.raised(m.DECK_SLAB_M),
        side=offsets.hull.side_half_breadth,
        promenade_wall=offsets.particulars.breadth / 2 - m.PROMENADE_WIDTH_M,
    )


def _add_b_deck_level(mesh: MeshBuilder, half: MeshBuilder, site: _Site) -> None:
    """Add the sides of the superstructure between B deck and A deck, its ends and its roof."""
    zone = site.offsets.zones["superstructure"]
    clipped = site.clip(zone.x_start, zone.x_end)
    if clipped is not None:
        windows = window_row(m.B_DECK_WINDOWS, zone.x_start, zone.x_end)
        wall = side_wall(*clipped, site.side, site.deck_b, site.deck_a, overlap=m.SEAM_OVERLAP_M)
        add_wall(half, wall, windows)
        add_plate(mesh, Plate(*clipped, negated(site.side), site.side, site.deck_a, DECK_WOOD))
    for x, facing_aft in ((zone.x_start, False), (zone.x_end, True)):
        if site.has(x):
            heights = (site.deck_b(x), site.deck_a(x))
            span = (-site.side(x), site.side(x))
            add_wall(mesh, cross_wall(x, span, heights, facing_aft=facing_aft))


def _add_a_deck_level(mesh: MeshBuilder, half: MeshBuilder, site: _Site) -> None:
    """Add the enclosed promenade forward and the open promenade abaft it."""
    deck = site.offsets.decks["a"]
    screen = site.offsets.zones["promenade-screen"]
    inner = site.promenade_wall
    clipped = site.clip(screen.x_start, screen.x_end)
    if clipped is not None:
        windows = window_row(m.SCREEN_WINDOWS, screen.x_start, screen.x_end)
        wall = side_wall(*clipped, site.side, site.deck_a, site.boat, overlap=m.SEAM_OVERLAP_M)
        add_wall(half, wall, windows)
    if site.has(screen.x_start):
        x = screen.x_start
        span = (-site.side(x), site.side(x))
        add_wall(mesh, cross_wall(x, span, (site.deck_a(x), site.boat(x)), facing_aft=False))
    if site.has(screen.x_end):
        x = screen.x_end
        heights = (site.deck_a(x), site.boat(x))
        add_wall(half, cross_wall(x, (inner, site.side(x)), heights, facing_aft=True))

    clipped = site.clip(screen.x_end, deck.x_end)
    if clipped is not None:
        bulwark_top = site.deck_a.raised(m.PROMENADE_BULWARK_HEIGHT_M)
        outer = side_wall(*clipped, site.side, site.deck_a, bulwark_top, overlap=m.SEAM_OVERLAP_M)
        add_wall(half, outer)
        inner_face = shifted(site.side, -m.BULWARK_THICKNESS_M)
        add_wall(half, inboard_wall(*clipped, inner_face, site.deck_a, bulwark_top))
        add_plate(half, Plate(*clipped, inner_face, site.side, bulwark_top, WHITE))
        house = side_wall(*clipped, constant(inner), site.deck_a, site.boat, material=SHADOW)
        add_wall(half, house)
        _add_stanchions(half, site, clipped, (screen.x_end, deck.x_end))
    if site.has(deck.x_end):
        x = deck.x_end
        heights = (site.deck_a(x), site.boat(x))
        add_wall(mesh, cross_wall(x, (-inner, inner), heights, facing_aft=True))


def _add_stanchions(
    half: MeshBuilder,
    site: _Site,
    clipped: tuple[float, float],
    promenade: tuple[float, float],
) -> None:
    """Add the stanchions standing on the bulwark of the open promenade, under the Boat deck."""
    count = int((promenade[1] - promenade[0]) / m.STANCHION_SPACING_M)
    size = m.STANCHION_SIZE_M
    for index in range(1, count + 1):
        x = promenade[0] + index * m.STANCHION_SPACING_M
        if clipped[0] + size < x < clipped[1] - size:
            outboard = site.side(x)
            half.add_box(
                WHITE,
                (x - size / 2, outboard - size, site.deck_a(x) + m.PROMENADE_BULWARK_HEIGHT_M),
                (x + size / 2, outboard, site.boat(x)),
            )


def _add_boat_deck(mesh: MeshBuilder, half: MeshBuilder, site: _Site) -> None:
    """Add the Boat deck: its planking, its edges and its underside over the open promenade."""
    deck = site.offsets.decks["boat"]
    screen = site.offsets.zones["promenade-screen"]
    negative_side = negated(site.side)
    clipped = site.clip(deck.x_start, deck.x_end)
    if clipped is not None:
        add_plate(mesh, Plate(*clipped, negative_side, site.side, site.boat_top, DECK_WOOD))
        edge = side_wall(*clipped, site.side, site.boat, site.boat_top, overlap=m.SEAM_OVERLAP_M)
        add_wall(half, edge)
    clipped = site.clip(screen.x_end, deck.x_end)
    if clipped is not None:
        underside = Plate(*clipped, negative_side, site.side, site.boat, WHITE, facing_down=True)
        add_plate(mesh, underside)
    for x, facing_aft in ((deck.x_start, False), (deck.x_end, True)):
        if site.has(x):
            heights = (site.boat(x), site.boat_top(x))
            span = (-site.side(x), site.side(x))
            add_wall(mesh, cross_wall(x, span, heights, facing_aft=facing_aft))


def _add_deckhouses(mesh: MeshBuilder, site: _Site) -> None:
    """Add the deckhouses of the Boat deck and the casings under the funnels."""
    offsets = site.offsets
    section = site.section
    quarters = offsets.zones["officers-quarters"]
    boat_deck = offsets.decks["boat"]
    houses = [
        (quarters.x_start, quarters.x_end, m.OFFICERS_QUARTERS_HALF_WIDTH_M, m.DECKHOUSE_HEIGHT_M),
        *(
            (
                quarters.x_end if start is None else start,
                boat_deck.x_end if end is None else end,
                half_width,
                height,
            )
            for start, end, half_width, height in m.DECKHOUSES
        ),
    ]
    for start, end, half_width, height in houses:
        full_height = height >= m.DECKHOUSE_HEIGHT_M
        block = Block(
            start,
            end,
            -half_width,
            half_width,
            site.boat_top,
            site.boat.raised(height),
            side_windows=m.HOUSE_WINDOWS if full_height else None,
            lift=m.DECK_SLAB_M,
        )
        add_block(mesh, block, section.x_start, section.x_end)
    for funnel in offsets.funnels:
        reach = funnel.length_fore_aft / 2 + m.FUNNEL_CASING_MARGIN_M
        half_width = funnel.breadth / 2 + m.FUNNEL_CASING_MARGIN_M
        top = max(funnel.base, site.boat(funnel.x) + m.DECKHOUSE_HEIGHT_M)
        block = Block(
            funnel.x - reach,
            funnel.x + reach,
            -half_width,
            half_width,
            site.boat_top,
            constant(top),
        )
        add_block(mesh, block, section.x_start, section.x_end)


def _add_bridge(mesh: MeshBuilder, half: MeshBuilder, site: _Site) -> None:
    """Add the navigating bridge: its roofed part, the wheelhouse, the wings and their cabs."""
    bridge = site.offsets.zones["navigating-bridge"]
    section = site.section
    enclosed = m.BRIDGE_ENCLOSED_HALF_WIDTH_M
    add_block(
        mesh,
        Block(
            bridge.x_start,
            bridge.x_end,
            -enclosed,
            enclosed,
            site.boat_top,
            site.boat.raised(m.BRIDGE_ROOF_HEIGHT_M),
            front_windows=m.BRIDGE_WINDOWS,
            lift=m.DECK_SLAB_M,
        ),
        section.x_start,
        section.x_end,
    )
    add_block(
        mesh,
        Block(
            bridge.x_start + m.WHEELHOUSE_FRONT_OFFSET_M,
            bridge.x_end,
            -m.WHEELHOUSE_HALF_WIDTH_M,
            m.WHEELHOUSE_HALF_WIDTH_M,
            site.boat_top,
            site.boat.raised(m.DECKHOUSE_HEIGHT_M),
        ),
        section.x_start,
        section.x_end,
    )
    if not site.has(bridge.x_start) or not site.has(bridge.x_end):
        return
    wing_end = site.offsets.particulars.breadth / 2 - m.BRIDGE_WING_INSET_M
    cab_start = wing_end - m.WING_CAB_WIDTH_M
    cab_end_x = bridge.x_start + m.WING_CAB_LENGTH_M
    add_block(
        half,
        Block(
            bridge.x_start,
            cab_end_x,
            cab_start,
            wing_end,
            site.boat_top,
            site.boat.raised(m.WING_CAB_HEIGHT_M),
            side_windows=m.WING_CAB_WINDOW,
            front_windows=m.WING_CAB_WINDOW,
            lift=m.DECK_SLAB_M,
        ),
        section.x_start,
        section.x_end,
    )
    thickness = m.BULWARK_THICKNESS_M
    for start, end, low, high in (
        (bridge.x_start, bridge.x_start + thickness, enclosed, cab_start),
        (cab_end_x, bridge.x_end, wing_end - thickness, wing_end),
    ):
        middle = (start + end) / 2
        half.add_box(
            WHITE,
            (start, low, site.boat_top(middle)),
            (end, high, site.boat(middle) + m.BRIDGE_BULWARK_HEIGHT_M),
        )


def _add_tier_caps(mesh: MeshBuilder, site: _Site) -> None:
    """Close the superstructure, the promenade house and the Boat deck at the cuts."""
    offsets = site.offsets
    screen = offsets.zones["promenade-screen"]
    for x, facing_aft in site.cuts():
        tiers: list[tuple[float, float, float]] = []
        if offsets.zones["superstructure"].contains(x):
            tiers.append((site.side(x), site.deck_b(x), site.deck_a(x)))
        if offsets.decks["a"].contains(x):
            half_width = site.side(x) if x < screen.x_end else site.promenade_wall
            tiers.append((half_width, site.deck_a(x), site.boat(x)))
        if offsets.decks["boat"].contains(x):
            tiers.append((site.side(x), site.boat(x), site.boat_top(x)))
        for half_width, base, top in tiers:
            wall = cross_wall(
                x,
                (-half_width, half_width),
                (base, top),
                facing_aft=facing_aft,
                material=SHADOW,
            )
            add_wall(mesh, wall)


def _add_davits(half: MeshBuilder, site: _Site) -> None:
    """Add a pair of davits at the ends of each boat stowed under davits on the starboard side.

    The port side is their reflection: every station carries a boat on each side.
    """
    side = site.offsets.particulars.breadth / 2
    foot = side - m.DAVIT_FOOT_INBOARD_M
    frame_length, frame_breadth, frame_height = m.DAVIT_FRAME_SIZE_M
    stations = sorted(
        {
            (boat.x, boat.length)
            for boat in site.offsets.boats
            if boat.type != "collapsible" and boat.side == "starboard"
        },
    )
    for station, length in stations:
        for end in (-1, 1):
            x = station + end * (length / 2 + m.DAVIT_END_CLEARANCE_M)
            if not site.section.x_start < x < site.section.x_end:
                continue
            deck = site.boat_top(x)
            half.add_box(
                WHITE,
                (x - frame_length / 2, foot - frame_breadth + m.DAVIT_ARM_DEPTH_M, deck),
                (x + frame_length / 2, foot + m.DAVIT_ARM_DEPTH_M, deck + frame_height),
            )
            _add_davit_arm(half, (x, foot, deck))


def _add_davit_arm(half: MeshBuilder, foot: tuple[float, float, float]) -> None:
    """Add the arm of a davit as a bar of rectangular section along its centre line."""
    x, y, z = foot
    width, depth = m.DAVIT_ARM_WIDTH_M / 2, m.DAVIT_ARM_DEPTH_M / 2
    profile = m.DAVIT_ARM_PROFILE
    rings: list[list[tuple[float, float, float]]] = []
    for index, (inboard, height) in enumerate(profile):
        before = profile[max(index - 1, 0)]
        after = profile[min(index + 1, len(profile) - 1)]
        along = (after[0] - before[0], after[1] - before[1])
        norm = (along[0] ** 2 + along[1] ** 2) ** 0.5
        across = (-along[1] / norm * depth, along[0] / norm * depth)
        centre = (y - inboard, z + height)
        outer = (centre[0] - across[0], centre[1] + across[1])
        inner = (centre[0] + across[0], centre[1] - across[1])
        rings.append(
            [
                (x - width, outer[0], outer[1]),
                (x + width, outer[0], outer[1]),
                (x + width, inner[0], inner[1]),
                (x - width, inner[0], inner[1]),
            ],
        )
    for lower, upper in zip(rings[:-1], rings[1:], strict=True):
        for corner in range(4):
            following = (corner + 1) % 4
            half.add_quad(WHITE, lower[corner], upper[corner], upper[following], lower[following])
    half.add_polygon(WHITE, rings[-1][::-1])


def add_upper_works(mesh: MeshBuilder, offsets: Offsets, section: Extent) -> None:
    """Add the upper works of a section."""
    site = _site(offsets, section)
    half = MeshBuilder()
    _add_b_deck_level(mesh, half, site)
    _add_a_deck_level(mesh, half, site)
    _add_boat_deck(mesh, half, site)
    _add_deckhouses(mesh, site)
    _add_bridge(mesh, half, site)
    _add_tier_caps(mesh, site)
    _add_davits(half, site)
    mesh.add_symmetric(half)
