"""Loading of the table of offsets written by ``tools/export-hull-offsets.ts``.

Lengths are in metres, in body coordinates: ``x`` aft of the forward perpendicular, ``y`` to
starboard of the centre line, ``z`` above the keel.
"""

import json
from dataclasses import dataclass
from pathlib import Path
from typing import cast

import numpy as np
import numpy.typing as npt

type FloatArray = npt.NDArray[np.float64]
type JsonObject = dict[str, object]

_STATION_TOLERANCE_M = 1e-6


@dataclass(frozen=True, slots=True)
class Extent:
    """A named range of stations: a zone, a deck or a section of the hull."""

    id: str
    x_start: float
    x_end: float

    def contains(self, x: float) -> bool:
        """Tell whether station ``x`` lies strictly inside the range."""
        return self.x_start < x < self.x_end


@dataclass(frozen=True, slots=True)
class Particulars:
    """Principal particulars read from the dataset."""

    length_overall: float
    length_between_perpendiculars: float
    breadth: float
    load_draught: float
    stem_overhang: float
    stern_overhang: float
    crows_nest_height: float
    wing_propeller_diameter: float
    centre_propeller_diameter: float
    rudder_height: float


@dataclass(frozen=True, slots=True)
class Funnel:
    """A funnel record of the dataset, with the section that carries it."""

    id: int
    x: float
    base: float
    top: float
    length_fore_aft: float
    breadth: float
    rake_deg: float
    exhausts_boilers: bool
    section: str


@dataclass(frozen=True, slots=True)
class Mast:
    """A mast record of the dataset, with the section that carries it."""

    id: str
    x: float
    base: float
    top: float
    rake_deg: float
    section: str


@dataclass(frozen=True, slots=True)
class Boat:
    """Station and dimensions of a boat of the dataset."""

    id: str
    type: str
    side: str
    group: str
    x: float
    length: float
    breadth: float
    depth: float


@dataclass(frozen=True, slots=True)
class Lamp:
    """A lamp of the level-of-detail 0 model: position, outward direction and size."""

    section: str
    position: tuple[float, float, float]
    normal: tuple[float, float, float]
    width: float
    height: float


@dataclass(frozen=True, slots=True)
class HullTable:
    """Half-breadths of the hull form on a grid of stations and waterlines."""

    start_x: float
    end_x: float
    well_bulwark_height: float
    stations: FloatArray
    waterlines: FloatArray
    bottom_offsets: FloatArray
    stem_x: FloatArray
    stern_x: FloatArray
    bottom_height: FloatArray
    top_height: FloatArray
    half_breadth_at_bottom: FloatArray
    half_breadth_at_top: FloatArray
    half_breadths_above_bottom: FloatArray
    half_breadths: FloatArray
    deck_heights: dict[str, FloatArray]

    def station_index(self, x: float) -> int:
        """Return the index of the tabulated station at ``x``."""
        index = int(np.argmin(np.abs(self.stations - x)))
        if abs(float(self.stations[index]) - x) > _STATION_TOLERANCE_M:
            message = f"The table of offsets has no station at x = {x}."
            raise ValueError(message)
        return index

    def profile(self, index: int) -> tuple[FloatArray, FloatArray]:
        """Return the heights and half-breadths tabulated at one station, from the bottom up."""
        bottom = float(self.bottom_height[index])
        top = float(self.top_height[index])
        near_bottom = bottom + self.bottom_offsets
        keep_offsets = near_bottom < top
        keep_waterlines = (self.waterlines > bottom) & (self.waterlines < top)
        heights = np.concatenate(
            ([bottom], near_bottom[keep_offsets], self.waterlines[keep_waterlines], [top]),
        )
        half_breadths = np.concatenate(
            (
                [self.half_breadth_at_bottom[index]],
                self.half_breadths_above_bottom[index][keep_offsets],
                self.half_breadths[index][keep_waterlines],
                [self.half_breadth_at_top[index]],
            ),
        )
        order = np.argsort(heights, kind="stable")
        return heights[order], half_breadths[order]

    def half_breadths_at(self, index: int, heights: FloatArray) -> FloatArray:
        """Interpolate the half-breadths of one station at the given heights."""
        tabulated_heights, tabulated_half_breadths = self.profile(index)
        return np.interp(heights, tabulated_heights, tabulated_half_breadths)

    def deck_height(self, deck_id: str, x: float) -> float:
        """Interpolate the height of a deck at station ``x``."""
        return float(np.interp(x, self.stations, self.deck_heights[deck_id]))

    def side_half_breadth(self, x: float) -> float:
        """Interpolate the half-breadth of the top of the plating at station ``x``."""
        return float(np.interp(x, self.stations, self.half_breadth_at_top))

    def bottom_at(self, x: float) -> float:
        """Interpolate the height of the bottom of the hull at station ``x``."""
        return float(np.interp(x, self.stations, self.bottom_height))


@dataclass(frozen=True, slots=True)
class Offsets:
    """Everything the model is built from."""

    particulars: Particulars
    decks: dict[str, Extent]
    zones: dict[str, Extent]
    sections: tuple[Extent, ...]
    funnels: tuple[Funnel, ...]
    masts: tuple[Mast, ...]
    boats: tuple[Boat, ...]
    lamps: tuple[Lamp, ...]
    hull: HullTable

    def deck(self, deck_id: str, lift: float = 0.0) -> "DeckLine":
        """Return the line of a deck, raised by ``lift``."""
        return DeckLine(self.hull, deck_id, lift)


@dataclass(frozen=True, slots=True)
class DeckLine:
    """Height of a deck along the hull, following the sheer, plus a constant lift."""

    hull: HullTable
    deck_id: str
    lift: float

    def __call__(self, x: float) -> float:
        """Return the height of the line at station ``x``."""
        return self.hull.deck_height(self.deck_id, x) + self.lift

    def raised(self, lift: float) -> "DeckLine":
        """Return the same line raised by a further ``lift``."""
        return DeckLine(self.hull, self.deck_id, self.lift + lift)


def _number(record: JsonObject, key: str) -> float:
    value = record[key]
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        message = f'The value of "{key}" is not a number.'
        raise TypeError(message)
    return float(value)


def _text(record: JsonObject, key: str) -> str:
    value = record[key]
    if not isinstance(value, str):
        message = f'The value of "{key}" is not a string.'
        raise TypeError(message)
    return value


def _records(document: JsonObject, key: str) -> list[JsonObject]:
    return cast("list[JsonObject]", document[key])


def _array(record: JsonObject, key: str) -> FloatArray:
    return np.asarray(record[key], dtype=np.float64)


def _triple(record: JsonObject, key: str) -> tuple[float, float, float]:
    x, y, z = cast("list[float]", record[key])
    return (float(x), float(y), float(z))


def _extent(record: JsonObject) -> Extent:
    return Extent(_text(record, "id"), _number(record, "x_start_m"), _number(record, "x_end_m"))


def _hull(record: JsonObject) -> HullTable:
    deck_heights = cast("JsonObject", record["deck_heights_m"])
    return HullTable(
        start_x=_number(record, "start_x_m"),
        end_x=_number(record, "end_x_m"),
        well_bulwark_height=_number(record, "well_bulwark_height_m"),
        stations=_array(record, "stations_m"),
        waterlines=_array(record, "waterlines_m"),
        bottom_offsets=_array(record, "bottom_offsets_m"),
        stem_x=_array(record, "stem_x_m"),
        stern_x=_array(record, "stern_x_m"),
        bottom_height=_array(record, "bottom_height_m"),
        top_height=_array(record, "top_height_m"),
        half_breadth_at_bottom=_array(record, "half_breadth_at_bottom_m"),
        half_breadth_at_top=_array(record, "half_breadth_at_top_m"),
        half_breadths_above_bottom=_array(record, "half_breadths_above_bottom_m"),
        half_breadths=_array(record, "half_breadths_m"),
        deck_heights={deck_id: _array(deck_heights, deck_id) for deck_id in sorted(deck_heights)},
    )


def load_offsets(path: Path) -> Offsets:
    """Read the table of offsets from a JSON file."""
    document = cast("JsonObject", json.loads(path.read_text(encoding="utf-8")))
    particulars = cast("JsonObject", document["particulars"])
    return Offsets(
        particulars=Particulars(
            **{name: _number(particulars, name) for name in Particulars.__slots__},
        ),
        decks={_text(record, "id"): _extent(record) for record in _records(document, "decks")},
        zones={_text(record, "id"): _extent(record) for record in _records(document, "zones")},
        sections=tuple(_extent(record) for record in _records(document, "sections")),
        funnels=tuple(
            Funnel(
                id=int(_number(record, "id")),
                x=_number(record, "x_m"),
                base=_number(record, "base_above_keel_m"),
                top=_number(record, "top_above_keel_m"),
                length_fore_aft=_number(record, "length_fore_aft_m"),
                breadth=_number(record, "breadth_m"),
                rake_deg=_number(record, "rake_deg"),
                exhausts_boilers=bool(record["exhausts_boilers"]),
                section=_text(record, "section"),
            )
            for record in _records(document, "funnels")
        ),
        masts=tuple(
            Mast(
                id=_text(record, "id"),
                x=_number(record, "x_m"),
                base=_number(record, "base_above_keel_m"),
                top=_number(record, "top_above_keel_m"),
                rake_deg=_number(record, "rake_deg"),
                section=_text(record, "section"),
            )
            for record in _records(document, "masts")
        ),
        boats=tuple(
            Boat(
                id=_text(record, "id"),
                type=_text(record, "type"),
                side=_text(record, "side"),
                group=_text(record, "group"),
                x=_number(record, "x_m"),
                length=_number(record, "length_m"),
                breadth=_number(record, "breadth_m"),
                depth=_number(record, "depth_m"),
            )
            for record in _records(document, "boats")
        ),
        lamps=tuple(
            Lamp(
                section=_text(record, "section"),
                position=_triple(record, "position_m"),
                normal=_triple(record, "normal"),
                width=_number(record, "width_m"),
                height=_number(record, "height_m"),
            )
            for record in _records(document, "lamps")
        ),
        hull=_hull(cast("JsonObject", document["hull"])),
    )
