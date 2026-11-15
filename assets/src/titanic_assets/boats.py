"""Space taken by the stowed boats, which the application draws itself."""

from dataclasses import dataclass

from titanic_assets import modelling as m
from titanic_assets.offsets import Boat, Offsets


@dataclass(frozen=True, slots=True)
class Box:
    """An axis-aligned box in body coordinates, given by two opposite corners."""

    low: tuple[float, float, float]
    high: tuple[float, float, float]


def stowed_boat_box(offsets: Offsets, boat: Boat) -> Box:
    """Return the box enclosing a boat at its stowed position."""
    half_breadth = offsets.particulars.breadth / 2
    side = 1.0 if boat.side == "starboard" else -1.0
    keel = offsets.hull.deck_height("boat", boat.x) + m.BOAT_CHOCK_HEIGHT_M
    if boat.group == "officers-quarters-roof":
        centre = side * m.COLLAPSIBLE_ON_ROOF_OFFSET_M
        keel += m.DECKHOUSE_HEIGHT_M
    elif boat.type == "collapsible":
        centre = side * (half_breadth - m.COLLAPSIBLE_ON_DECK_INBOARD_M)
    else:
        centre = side * (half_breadth - m.STOWED_BOAT_INBOARD_M)
    return Box(
        (boat.x - boat.length / 2, centre - boat.breadth / 2, keel),
        (boat.x + boat.length / 2, centre + boat.breadth / 2, keel + boat.depth),
    )
