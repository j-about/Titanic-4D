"""Tests of the geometry of the model, before it goes through Blender."""

import numpy as np
import numpy.typing as npt
import pytest

from titanic_assets import modelling as m
from titanic_assets.boats import stowed_boat_box
from titanic_assets.hull import build_hull_grid
from titanic_assets.materials import MATERIAL_ORDER, SHADOW
from titanic_assets.mesh import grid_triangles
from titanic_assets.model import STERN_WRECK, Node, build_model
from titanic_assets.offsets import Offsets

SECTIONS = ("bow", "middle", "stern")
LAMP_OFFSET_M = 0.04
"""Distance by which the application draws its lamps proud of the plating."""

type FloatArray = npt.NDArray[np.float64]


def corners(node: Node) -> FloatArray:
    """Return every triangle corner of a node, one row per corner."""
    return np.concatenate([part.positions.reshape(-1, 3) for part in node.triangles.values()])


def triangles(node: Node) -> FloatArray:
    """Return every triangle of a node, of shape (n, 3, 3)."""
    return np.concatenate([part.positions for part in node.triangles.values()])


def distance_to_triangles(point: FloatArray, candidates: FloatArray) -> float:
    """Return the distance from a point to the nearest of some triangles."""
    a, b, c = candidates[:, 0], candidates[:, 1], candidates[:, 2]
    ab, ac, ap = b - a, c - a, point - a
    d1, d2 = np.sum(ab * ap, axis=1), np.sum(ac * ap, axis=1)
    d00, d01, d11 = np.sum(ab * ab, axis=1), np.sum(ab * ac, axis=1), np.sum(ac * ac, axis=1)
    denominator = d00 * d11 - d01 * d01
    v = np.clip((d11 * d1 - d01 * d2) / denominator, 0.0, 1.0)
    w = np.clip((d00 * d2 - d01 * d1) / denominator, 0.0, 1.0)
    excess = np.maximum(v + w, 1.0)
    v, w = v / excess, w / excess
    inside = a + ab * v[:, None] + ac * w[:, None]
    best = np.linalg.norm(inside - point, axis=1)
    for start, edge in ((a, ab), (a, ac), (b, c - b)):
        t = np.clip(np.sum((point - start) * edge, axis=1) / np.sum(edge * edge, axis=1), 0.0, 1.0)
        best = np.minimum(best, np.linalg.norm(start + edge * t[:, None] - point, axis=1))
    return float(best.min())


def test_nodes_are_named_and_parented_like_the_level_of_detail_0_model(
    nodes: dict[str, Node],
) -> None:
    assert list(nodes) == [
        "bow",
        "middle",
        "stern",
        "stern-wreck",
        "funnel-1",
        "funnel-2",
        "funnel-3",
        "funnel-4",
        "foremast",
        "mainmast",
    ]
    parents = {name: node.parent for name, node in nodes.items()}
    assert parents == {
        "bow": None,
        "middle": None,
        "stern": None,
        "stern-wreck": None,
        "funnel-1": "bow",
        "funnel-2": "bow",
        "funnel-3": "middle",
        "funnel-4": "stern",
        "foremast": "bow",
        "mainmast": "stern",
    }


def test_sections_span_the_recorded_length_overall_and_extreme_breadth(
    nodes: dict[str, Node],
    offsets: Offsets,
) -> None:
    points = np.concatenate([corners(nodes[name]) for name in SECTIONS])
    low, high = points.min(axis=0), points.max(axis=0)
    assert high[0] - low[0] == pytest.approx(offsets.particulars.length_overall, abs=0.01)
    assert high[1] - low[1] == pytest.approx(offsets.particulars.breadth, abs=0.01)
    assert low[0] == pytest.approx(-offsets.particulars.stem_overhang, abs=1e-6)
    assert low[2] == pytest.approx(0.0, abs=1e-6)


def test_sections_are_cut_where_the_hull_parted(nodes: dict[str, Node], offsets: Offsets) -> None:
    bow, middle, stern = (offsets.sections[index] for index in range(3))
    assert (bow.x_end, stern.x_start) == (143.0, 164.0)
    assert corners(nodes["bow"])[:, 0].max() == pytest.approx(bow.x_end, abs=1e-9)
    assert corners(nodes["middle"])[:, 0].min() == pytest.approx(middle.x_start, abs=1e-9)
    assert corners(nodes["middle"])[:, 0].max() == pytest.approx(middle.x_end, abs=1e-9)
    assert corners(nodes["stern"])[:, 0].min() == pytest.approx(stern.x_start, abs=1e-9)
    assert corners(nodes[STERN_WRECK])[:, 0].min() == pytest.approx(stern.x_start, abs=1e-9)


def hull_section_area(node: Node, x: float, top: float) -> float:
    """Return the area enclosed by the plating of a node at a cut, below the height ``top``."""
    plating = np.concatenate(
        [part.positions for name, part in node.triangles.items() if name != SHADOW],
    ).reshape(-1, 3)
    outline = plating[(np.abs(plating[:, 0] - x) < 1e-9) & (plating[:, 2] <= top + 1e-6)]
    starboard = np.unique(outline[outline[:, 1] >= 0][:, 1:], axis=0)
    starboard = starboard[np.argsort(starboard[:, 1], kind="stable")]
    y, z = starboard[:, 0], starboard[:, 1]
    return float(2 * np.sum((y[1:] + y[:-1]) / 2 * np.diff(z)))


@pytest.mark.parametrize(
    ("name", "end", "facing"),
    [
        ("bow", "x_end", 1.0),
        ("middle", "x_start", -1.0),
        ("middle", "x_end", 1.0),
        ("stern", "x_start", -1.0),
        (STERN_WRECK, "x_start", -1.0),
    ],
)
def test_each_cut_is_closed_by_a_flat_cap(
    nodes: dict[str, Node],
    offsets: Offsets,
    name: str,
    end: str,
    facing: float,
) -> None:
    section = next(
        extent for extent in offsets.sections if extent.id == name.removesuffix("-wreck")
    )
    x = getattr(section, end)
    cap = nodes[name].triangles[SHADOW]
    in_plane = np.all(np.abs(cap.positions[:, :, 0] - x) < 1e-9, axis=1)
    positions, normals = cap.positions[in_plane], cap.normals[in_plane]
    assert np.allclose(normals, [facing, 0.0, 0.0])
    doubled = np.cross(positions[:, 1] - positions[:, 0], positions[:, 2] - positions[:, 0])
    assert np.all(doubled[:, 0] * facing > 0)
    area = float(np.sum(np.abs(doubled[:, 0])) / 2)
    deck_b = offsets.hull.deck_height("b", x)
    hull_area = hull_section_area(nodes[name], x, deck_b)
    below_deck_b = np.all(positions[:, :, 2] <= deck_b + 1e-6, axis=1)
    hull_cap_area = float(np.sum(np.abs(doubled[below_deck_b, 0])) / 2)
    assert hull_cap_area == pytest.approx(hull_area, rel=1e-3)
    if name == STERN_WRECK:
        assert area == pytest.approx(hull_area, rel=1e-3)
    else:
        assert area > hull_area + 100


def test_normals_are_unit_vectors_on_the_outer_side_of_their_triangle(
    nodes: dict[str, Node],
) -> None:
    for node in nodes.values():
        for part in node.triangles.values():
            assert np.allclose(np.linalg.norm(part.normals, axis=2), 1.0, atol=1e-9)
            doubled = np.cross(
                part.positions[:, 1] - part.positions[:, 0],
                part.positions[:, 2] - part.positions[:, 0],
            )
            face = doubled / np.linalg.norm(doubled, axis=1, keepdims=True)
            assert np.all(np.einsum("tcj,tj->tc", part.normals, face) > 0.2)


def test_the_plating_carries_the_lamps_of_the_application(
    nodes: dict[str, Node],
    offsets: Offsets,
) -> None:
    all_triangles = {name: triangles(nodes[name]) for name in SECTIONS}
    assert len(offsets.lamps) > 800
    behind_glass = 0
    for lamp in offsets.lamps:
        position = np.asarray(lamp.position)
        candidates = all_triangles[lamp.section]
        centres = candidates.mean(axis=1)
        near = np.all(np.abs(centres - position) < (3.0, 3.0, 3.0), axis=1)
        normal = np.asarray(lamp.normal) / np.linalg.norm(lamp.normal)
        on_plating = distance_to_triangles(position, candidates[near])
        proud = distance_to_triangles(position + normal * LAMP_OFFSET_M, candidates[near])
        if on_plating >= 0.02:
            behind_glass += 1
            assert abs(on_plating - m.GLASS_RECESS_M) < 0.015
        assert proud > LAMP_OFFSET_M - 0.01
    assert behind_glass > 150


def test_the_plating_follows_the_hull_form(offsets: Offsets) -> None:
    hull = offsets.hull
    grid = build_hull_grid(offsets)
    row_count = grid.points.shape[1]
    cell = grid_triangles(2, row_count)
    worst = 0.0
    for index in range(0, len(hull.stations), 4):
        x = float(hull.stations[index])
        after = int(np.clip(np.searchsorted(grid.stations, x), 1, len(grid.stations) - 1))
        columns = [
            column
            for column in (after - 1, after, after + 1)
            if 1 <= column < len(grid.stations)
            and grid.stations[column] - grid.stations[column - 1] > 1e-9
        ]
        candidates = np.concatenate(
            [grid.points[column - 1 : column + 1].reshape(-1, 3)[cell] for column in columns],
        )
        doubled = np.cross(
            candidates[:, 1] - candidates[:, 0],
            candidates[:, 2] - candidates[:, 0],
        )
        candidates = candidates[np.linalg.norm(doubled, axis=1) > 1e-12]
        top = max(grid.points[column, -1, 2] for column in columns)
        heights, half_breadths = hull.profile(index)
        for z, y in zip(heights.tolist(), half_breadths.tolist(), strict=True):
            if z <= top:
                worst = max(worst, distance_to_triangles(np.asarray([x, y, z]), candidates))
    assert worst < 0.04


def test_the_stowed_boats_have_their_space(nodes: dict[str, Node], offsets: Offsets) -> None:
    margin = 0.05
    all_triangles = np.concatenate([triangles(nodes[name]) for name in SECTIONS])
    low, high = all_triangles.min(axis=1), all_triangles.max(axis=1)
    assert len(offsets.boats) == 20
    for boat in offsets.boats:
        box = stowed_boat_box(offsets, boat)
        overlapping = np.all(
            (high > np.asarray(box.low) + margin) & (low < np.asarray(box.high) - margin),
            axis=1,
        )
        assert not overlapping.any(), boat.id


def test_funnels_and_masts_reach_the_recorded_heights(
    nodes: dict[str, Node],
    offsets: Offsets,
) -> None:
    for funnel in offsets.funnels:
        points = corners(nodes[f"funnel-{funnel.id}"])
        assert points[:, 2].min() == pytest.approx(funnel.base, abs=1e-9)
        assert points[:, 2].max() == pytest.approx(funnel.top, abs=1e-9)
        assert points[:, 0].max() > funnel.x + 3
    for mast in offsets.masts:
        points = corners(nodes[mast.id])
        assert points[:, 2].min() == pytest.approx(mast.base, abs=1e-9)
        assert points[:, 2].max() == pytest.approx(mast.top, abs=1e-9)
    nest = corners(nodes["foremast"])
    widest = nest[np.abs(nest[:, 1]) > m.MAST_RADIUS_BASE_M + 0.1]
    assert widest[:, 2].min() == pytest.approx(offsets.particulars.crows_nest_height, abs=1e-9)


def test_the_stern_wreck_has_no_upper_works(nodes: dict[str, Node], offsets: Offsets) -> None:
    wreck = corners(nodes[STERN_WRECK])
    highest_deck = max(offsets.hull.deck_height("b", x) for x in (164.0, offsets.hull.end_x))
    assert wreck[:, 2].max() <= highest_deck + 1e-6
    assert corners(nodes["stern"])[:, 2].max() > highest_deck + 5


def test_the_model_respects_its_budgets(nodes: dict[str, Node]) -> None:
    assert sum(node.triangle_count for node in nodes.values()) <= 250_000
    assert sum(len(node.triangles) for node in nodes.values()) <= 60
    for node in nodes.values():
        assert set(node.triangles) <= set(MATERIAL_ORDER)


def test_the_model_is_identical_when_built_twice(nodes: dict[str, Node], offsets: Offsets) -> None:
    for node in build_model(offsets):
        first = nodes[node.name]
        assert list(node.triangles) == list(first.triangles)
        for material, part in node.triangles.items():
            assert np.array_equal(part.positions, first.triangles[material].positions)
            assert np.array_equal(part.normals, first.triangles[material].normals)
