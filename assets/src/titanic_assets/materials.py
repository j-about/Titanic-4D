"""Materials of the model: names, sRGB base colours, roughness and metalness."""

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class Material:
    """A metallic-roughness material with a uniform base colour."""

    name: str
    srgb: int
    roughness: float
    metalness: float

    def linear_rgba(self) -> tuple[float, float, float, float]:
        """Return the base colour as linear RGB components with an opaque alpha."""
        channels = ((self.srgb >> 16) & 0xFF, (self.srgb >> 8) & 0xFF, self.srgb & 0xFF)
        red, green, blue = (srgb_to_linear(channel / 255) for channel in channels)
        return (red, green, blue, 1.0)


_SRGB_LINEAR_LIMIT = 0.04045


def srgb_to_linear(value: float) -> float:
    """Convert one sRGB component in [0, 1] to its linear value."""
    if value <= _SRGB_LINEAR_LIMIT:
        return value / 12.92
    return ((value + 0.055) / 1.055) ** 2.4


HULL_BLACK = "hull-black"
ANTIFOULING = "antifouling"
SHEER_STRIPE = "sheer-stripe"
WHITE = "white"
FUNNEL_BUFF = "funnel-buff"
FUNNEL_BLACK = "funnel-black"
DECK_WOOD = "deck-wood"
STEEL = "steel"
MAST = "mast"
GLASS = "glass"
SHADOW = "shadow"

_PAINT_ROUGHNESS = 0.72
_PAINT_METALNESS = 0.08

MATERIALS: tuple[Material, ...] = (
    Material(HULL_BLACK, 0x15171A, _PAINT_ROUGHNESS, _PAINT_METALNESS),
    Material(ANTIFOULING, 0x6E2A22, _PAINT_ROUGHNESS, _PAINT_METALNESS),
    Material(SHEER_STRIPE, 0xC9A23C, _PAINT_ROUGHNESS, _PAINT_METALNESS),
    Material(WHITE, 0xE6E2D6, _PAINT_ROUGHNESS, _PAINT_METALNESS),
    Material(FUNNEL_BUFF, 0xC98F52, _PAINT_ROUGHNESS, _PAINT_METALNESS),
    Material(FUNNEL_BLACK, 0x121314, _PAINT_ROUGHNESS, _PAINT_METALNESS),
    Material(DECK_WOOD, 0x8C7A60, 0.85, 0.0),
    Material(STEEL, 0x6F7377, 0.45, 0.6),
    Material(MAST, 0x9A7B4F, _PAINT_ROUGHNESS, _PAINT_METALNESS),
    Material(GLASS, 0x10161C, 0.15, 0.0),
    Material(SHADOW, 0x1B1D20, 0.9, 0.0),
)

MATERIAL_ORDER: dict[str, int] = {material.name: index for index, material in enumerate(MATERIALS)}
