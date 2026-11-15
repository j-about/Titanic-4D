"""Modelling values (not historical records).

Every dimension of the model that is not read from the dataset is defined here, in metres unless
stated otherwise. The values under "Mirrors of the level-of-detail 0 model" repeat constants of
``src/ship/lod0.ts`` and ``src/sim/boatPlacement.ts``, which the application keeps private.
"""

from typing import NamedTuple


class WindowRow(NamedTuple):
    """A row of equal windows along a wall."""

    inset_start: float
    """Distance from the start of the wall to the centre of the first window."""
    inset_end: float
    """Least distance from the centre of the last window to the end of the wall."""
    spacing: float
    centre_height: float
    """Height of the centre of the windows above the deck line."""
    width: float
    height: float


# --- Mirrors of the level-of-detail 0 model -------------------------------------------------

BOOT_TOPPING_M = 0.3
"""Height of the antifouling paint above the load waterline."""
SHEER_STRIPE_HALF_HEIGHT_M = 0.12
"""Half-height of the stripe painted along the line of C deck."""
DECK_SLAB_M = 0.25
"""Thickness of the Boat deck above the recorded deck line."""
PROMENADE_BULWARK_HEIGHT_M = 1.1
"""Height of the bulwark of the open promenade of A deck."""
PROMENADE_WIDTH_M = 2.6
"""Distance from the ship's side to the house wall of the open promenade of A deck."""
DECKHOUSE_HEIGHT_M = 2.9
"""Height of the roof of the deckhouses above the Boat deck line."""
RAISED_ROOF_HEIGHT_M = 1.3
"""Height of the raised roofs above the Boat deck line."""
FUNNEL_CASING_MARGIN_M = 0.6
"""Margin of a funnel casing around the section of its funnel."""
FUNNEL_BLACK_FROM = 0.78
"""Fraction of the height of a funnel at which the black top begins."""
MAST_RADIUS_BASE_M = 0.45
MAST_RADIUS_TOP_M = 0.16
BRIDGE_WING_INSET_M = 0.4
"""Distance from the ship's side to the outboard end of the bridge wings."""
BRIDGE_BULWARK_HEIGHT_M = 1.2
"""Height of the bulwark of the bridge wings above the Boat deck line."""
WHEELHOUSE_FRONT_OFFSET_M = 1.4
"""Distance from the front of the bridge to the front of the wheelhouse."""
WHEELHOUSE_HALF_WIDTH_M = 5.2
OFFICERS_QUARTERS_HALF_WIDTH_M = 6.6

DECKHOUSES: tuple[tuple[float | None, float | None, float, float], ...] = (
    (None, 104.0, 8.0, DECKHOUSE_HEIGHT_M),
    (106.0, 128.0, 7.4, RAISED_ROOF_HEIGHT_M),
    (133.0, 152.0, 6.6, DECKHOUSE_HEIGHT_M),
    (160.0, 192.0, 7.2, RAISED_ROOF_HEIGHT_M),
    (198.0, None, 5.6, DECKHOUSE_HEIGHT_M),
)
"""Deckhouses abaft the officers' quarters: forward end, after end, half-width and height above
the Boat deck line. A missing forward end is the after end of the officers' quarters; a missing
after end is the after end of the Boat deck."""

B_DECK_WINDOWS = WindowRow(2.0, 2.0, 2.2, 1.45, 0.8, 1.0)
"""Windows of B deck, along the midship superstructure."""
SCREEN_WINDOWS = WindowRow(1.5, 1.0, 2.4, 1.55, 0.9, 1.1)
"""Windows of the enclosed promenade of A deck."""

STOWED_BOAT_INBOARD_M = 1.7
"""Distance of the centre line of a boat stowed under davits from the ship's side."""
COLLAPSIBLE_ON_DECK_INBOARD_M = 4.4
"""Distance of the centre line of a collapsible boat stowed on deck from the ship's side."""
COLLAPSIBLE_ON_ROOF_OFFSET_M = 3.6
"""Distance of a collapsible boat stowed on the officers' quarters from the centre line."""
BOAT_CHOCK_HEIGHT_M = 0.7
"""Height of the keel of a stowed boat above the line of the deck it stands on."""

# --- Tessellation of the hull ----------------------------------------------------------------

STATION_SPACINGS: tuple[tuple[float, float], ...] = ((12.0, 0.25), (45.0, 0.5))
"""Spacing of the stations of the mesh within a given distance of either end of the hull."""
STATION_SPACING_M = 1.0
"""Spacing of the stations of the mesh elsewhere."""
END_SQUARED_STEPS = 15
END_SQUARED_UNIT_M = 0.1
"""Stations are added at the squares of multiples of this unit from each end of the hull."""
BILGE_ROW_OFFSETS_M = (0.02, 0.15, 0.3, 0.6, 0.9, 1.3, 1.7, 2.2, 2.7, 3.3, 3.8, 4.4)
"""Heights above the bottom of the hull of the rows of the mesh in the turn of the bilge."""
LOWER_SIDE_ROWS = 8
"""Rows of the mesh between the bilge and the top of the antifouling paint."""
BLACK_ROWS_BELOW_KNUCKLE = 10
BLACK_ROWS_ABOVE_KNUCKLE = 2
"""Rows of the mesh in the black paint, below and above the knuckle of the plating: the height
at which the stem meets the forward perpendicular, where the flare of the hull form ends."""
WHITE_ROWS = 2
"""Rows of the mesh in the white paint."""

# --- Stem head -------------------------------------------------------------------------------

STEM_HEAD_LENGTH_M = 1.0
"""Length over which the stem head falls back to the forecastle deck."""

# --- Superstructure --------------------------------------------------------------------------

WALL_STEP_M = 4.0
"""Greatest length of a facet of a wall or of a deck following the sheer."""
SEAM_OVERLAP_M = 0.02
"""Distance by which a wall extends below the deck it stands on, over the plating beneath."""
GLASS_RECESS_M = 0.08
"""Depth of the glass behind the face of a wall."""
OPENING_END_MARGIN_M = 0.015
"""Least distance between an opening and the end of its wall."""
BULWARK_THICKNESS_M = 0.08
"""Thickness of the bulwarks of the well decks, of the open promenade and of the bridge wings."""
STANCHION_SPACING_M = 3.05
STANCHION_SIZE_M = 0.12
"""Spacing and side of the stanchions of the open promenade of A deck."""
HOUSE_WINDOWS = WindowRow(1.6, 1.6, 2.6, 1.75, 0.55, 0.7)
"""Windows of the sides of the deckhouses of full height."""

# --- Navigating bridge -----------------------------------------------------------------------

BRIDGE_ENCLOSED_HALF_WIDTH_M = 9.0
"""Half-width of the roofed part of the navigating bridge."""
BRIDGE_ROOF_HEIGHT_M = 2.5
"""Height of the roof of the navigating bridge above the Boat deck line."""
BRIDGE_WINDOWS = WindowRow(0.75, 0.75, 1.25, 1.75, 1.0, 0.9)
"""Windows of the front of the navigating bridge, across the ship."""
WING_CAB_LENGTH_M = 2.2
WING_CAB_WIDTH_M = 1.7
WING_CAB_HEIGHT_M = 2.3
"""Cabs at the outboard ends of the bridge wings: length, width and height above the deck line."""
WING_CAB_WINDOW = WindowRow(0.8, 0.8, 2.2, 1.7, 0.9, 0.8)
"""Windows of the front and of the outboard side of a wing cab."""

# --- Funnels ---------------------------------------------------------------------------------

FUNNEL_SEGMENTS = 48
FUNNEL_RIM_HEIGHT_M = 0.3
FUNNEL_RIM_OUTSET_M = 0.07
"""Height and projection of the rim at the top of a funnel."""
FUNNEL_WALL_M = 0.15
"""Distance between the outer and the inner surface at the top of a funnel."""
FUNNEL_WELL_DEPTH_M = 2.5
"""Depth at which the inside of a funnel is closed."""
FUNNEL_PIPE_RADIUS_M = 0.14
FUNNEL_PIPE_GAP_M = 0.1
"""Radius of the pipes standing against a funnel and their clearance from its surface."""
FUNNEL_PIPE_TOP_BELOW_RIM_M = 0.5
FUNNEL_PIPE_SEGMENTS = 8

# --- Masts -----------------------------------------------------------------------------------

MAST_SEGMENTS = 12
CROWS_NEST_RADIUS_M = 0.72
CROWS_NEST_HEIGHT_M = 1.25
CROWS_NEST_FORWARD_M = 0.45
"""Radius and height of the crow's nest, and distance of its axis forward of the mast."""
CROWS_NEST_SEGMENTS = 14

# --- Davits ----------------------------------------------------------------------------------

DAVIT_END_CLEARANCE_M = 0.4
"""Distance from each end of a stowed boat to its davit."""
DAVIT_FOOT_INBOARD_M = 0.55
"""Distance of the foot of a davit from the ship's side."""
DAVIT_ARM_PROFILE: tuple[tuple[float, float], ...] = (
    (0.0, 0.0),
    (0.0, 2.2),
    (0.18, 2.75),
    (0.55, 3.1),
    (1.0, 3.2),
    (1.15, 3.05),
)
"""Centre line of the arm of a davit: distance inboard of its foot and height above the deck."""
DAVIT_ARM_WIDTH_M = 0.2
DAVIT_ARM_DEPTH_M = 0.16
"""Section of the arm of a davit, along the ship and across it."""
DAVIT_FRAME_SIZE_M = (0.34, 0.95, 0.55)
"""Frame at the foot of a davit: length along the ship, breadth and height."""

# --- Stern gear ------------------------------------------------------------------------------

RUDDER_POST_OFFSET_M = 0.35
"""Distance of the leading edge of the rudder abaft the after perpendicular."""
RUDDER_CHORD_M = 4.65
"""Greatest length of the rudder, 15 ft 3 in, quoted in the summary of the dataset record."""
RUDDER_HEEL_HEIGHT_M = 0.45
RUDDER_OUTLINE: tuple[tuple[float, float], ...] = (
    (0.74, 0.0),
    (0.93, 0.13),
    (1.0, 0.35),
    (1.0, 0.62),
    (0.88, 0.82),
    (0.62, 1.0),
)
"""Trailing edge of the rudder from its heel upward: fraction of the chord abaft the leading
edge and fraction of the height between the heel and the counter."""
RUDDER_HALF_THICKNESS_M = (0.28, 0.06)
"""Half-thickness of the rudder at its leading and trailing edges."""
SKEG_START_X_M = 226.0
"""Station from which the deadwood fills the space between the rising bottom and the keel line."""
SKEG_HALF_THICKNESS_M = 0.28
SKEG_STEP_M = 2.5
PROPELLER_POST_X_M = 253.6
"""Station of the after end of the deadwood, forward of the aperture of the centre propeller."""
SOLE_PIECE_HEIGHT_M = 0.45
CENTRE_PROPELLER_X_M = 256.3
CENTRE_SHAFT_HEIGHT_M = 3.1
WING_PROPELLER_X_M = 249.2
WING_SHAFT_OFFSET_M = 5.6
WING_SHAFT_HEIGHT_M = 3.75
"""Stations and heights of the propellers, and distance of the wing shafts from the centre line."""
BOSSING_START_X_M = 221.0
BOSSING_RADII_M = (1.0, 0.62)
"""Fairing of a wing shaft: forward station, and radius at its forward and after ends."""
BOSSING_SEGMENTS = 12
PROPELLER_BLADES = 3
PROPELLER_HUB_RADIUS_RATIO = 0.1
PROPELLER_HUB_LENGTH_RATIO = 0.3
PROPELLER_CONE_LENGTH_RATIO = 0.16
"""Radius and length of the hub and length of its cone, as fractions of the diameter."""
PROPELLER_PITCH_RATIO = 1.1
"""Pitch of the blades as a fraction of the diameter."""
PROPELLER_CHORD_RATIO = 0.3
"""Greatest width of a blade as a fraction of the diameter."""
PROPELLER_BLADE_PROFILE: tuple[tuple[float, float], ...] = (
    (0.0, 0.5),
    (0.2, 0.8),
    (0.45, 1.0),
    (0.7, 0.92),
    (0.88, 0.66),
    (1.0, 0.18),
)
"""Outline of a blade: fraction of the span from the hub to the tip and fraction of the
greatest width."""
PROPELLER_HUB_SEGMENTS = 12
