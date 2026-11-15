"""Assembly of the nodes of the model from the table of offsets."""

from dataclasses import dataclass

from titanic_assets.fittings import add_stern_gear, build_funnel, build_mast
from titanic_assets.hull import (
    HullGrid,
    add_cap,
    add_shell,
    add_stem_head,
    add_weather_decks,
    build_hull_grid,
)
from titanic_assets.mesh import MeshBuilder, Triangles
from titanic_assets.offsets import Extent, Offsets
from titanic_assets.upperworks import add_upper_works

STERN_WRECK = "stern-wreck"
CROWS_NEST_MAST = "foremast"
_CUT_MARGIN_M = 1.0


@dataclass(frozen=True, slots=True)
class Node:
    """A node of the model: its name, the name of its parent and its triangles per material."""

    name: str
    parent: str | None
    triangles: dict[str, Triangles]

    @property
    def triangle_count(self) -> int:
        """Number of triangles of the node."""
        return sum(part.count for part in self.triangles.values())


def _build_section(
    offsets: Offsets,
    grid: HullGrid,
    section: Extent,
    *,
    upper_works: bool,
) -> MeshBuilder:
    """Build a section of the hull, closed by a cap at each end that is a cut."""
    hull = offsets.hull
    mesh = MeshBuilder()
    add_shell(mesh, grid, section)
    if section.x_start > hull.start_x + _CUT_MARGIN_M:
        add_cap(mesh, grid, section.x_start, facing_aft=False)
    else:
        add_stem_head(mesh, offsets, grid)
    if section.x_end < hull.end_x - _CUT_MARGIN_M:
        add_cap(mesh, grid, section.x_end, facing_aft=True)
    else:
        add_stern_gear(mesh, offsets)
    add_weather_decks(mesh, offsets, grid, section, covered=upper_works)
    if upper_works:
        add_upper_works(mesh, offsets, section)
    return mesh


def build_model(offsets: Offsets) -> tuple[Node, ...]:
    """Build every node: the three sections, the stern as a wreck, the funnels and the masts."""
    grid = build_hull_grid(offsets)
    nodes = [
        Node(section.id, None, _build_section(offsets, grid, section, upper_works=True).build())
        for section in offsets.sections
    ]
    wreck = _build_section(offsets, grid, offsets.sections[-1], upper_works=False)
    nodes.append(Node(STERN_WRECK, None, wreck.build()))
    nodes.extend(
        Node(f"funnel-{funnel.id}", funnel.section, build_funnel(funnel).build())
        for funnel in offsets.funnels
    )
    for mast in offsets.masts:
        nest = offsets.particulars.crows_nest_height if mast.id == CROWS_NEST_MAST else None
        nodes.append(Node(mast.id, mast.section, build_mast(mast, nest).build()))
    return tuple(nodes)
