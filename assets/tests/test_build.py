"""Tests of the files written by the command line: the Blender export and the final model."""

import hashlib
from pathlib import Path

import numpy as np
import pytest

from tests.conftest import MODEL_NAME
from tests.glb import Glb, read_glb
from titanic_assets.cli import MODEL, RAW_MODEL_NAME
from titanic_assets.materials import MATERIALS
from titanic_assets.model import Node
from titanic_assets.offsets import Offsets

SECTIONS = ("bow", "middle", "stern")
NODE_NAMES = {
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
}
POSITION_STEP_M = 1 / 256
MAXIMUM_SIZE_BYTES = 1_500_000
MAXIMUM_TRIANGLES = 250_000
MAXIMUM_DRAW_CALLS = 60


@pytest.fixture(scope="module")
def model(builds: tuple[Path, Path]) -> Glb:
    """The final model of the first build."""
    return read_glb(builds[0] / MODEL_NAME)


@pytest.fixture(scope="module")
def raw_model(builds: tuple[Path, Path]) -> Glb:
    """The model of the first build as exported by Blender, before optimisation."""
    return read_glb(builds[0] / RAW_MODEL_NAME)


def test_two_builds_are_byte_identical(builds: tuple[Path, Path]) -> None:
    for name in (RAW_MODEL_NAME, MODEL_NAME):
        first, second = (
            hashlib.sha256((directory / name).read_bytes()).hexdigest() for directory in builds
        )
        assert first == second, name


def test_the_committed_model_is_the_one_the_pipeline_builds(
    builds: tuple[Path, Path],
    root: Path,
) -> None:
    assert (root / MODEL).read_bytes() == (builds[0] / MODEL_NAME).read_bytes()


def test_nodes_are_named_parented_and_untransformed(model: Glb) -> None:
    nodes = model.document["nodes"]
    assert {node["name"] for node in nodes} == NODE_NAMES
    assert len(nodes) == len(NODE_NAMES)
    for node in nodes:
        assert not {"matrix", "translation", "rotation", "scale"} & set(node), node["name"]
    scene = model.document["scenes"][model.document["scene"]]
    assert sorted(nodes[index]["name"] for index in scene["nodes"]) == [
        "bow",
        "middle",
        "stern",
        "stern-wreck",
    ]
    children = {
        node["name"]: sorted(nodes[index]["name"] for index in node.get("children", []))
        for node in nodes
    }
    assert children["bow"] == ["foremast", "funnel-1", "funnel-2"]
    assert children["middle"] == ["funnel-3"]
    assert children["stern"] == ["funnel-4", "mainmast"]
    assert children["stern-wreck"] == []


def test_materials_are_the_named_single_sided_materials(model: Glb) -> None:
    materials = {material["name"]: material for material in model.document["materials"]}
    assert set(materials) == {material.name for material in MATERIALS}
    for definition in MATERIALS:
        material = materials[definition.name]
        pbr = material["pbrMetallicRoughness"]
        assert pbr["baseColorFactor"] == pytest.approx(definition.linear_rgba(), abs=1e-6)
        assert pbr.get("roughnessFactor", 1.0) == pytest.approx(definition.roughness, abs=1e-6)
        assert pbr.get("metallicFactor", 1.0) == pytest.approx(definition.metalness, abs=1e-6)
        assert not material.get("doubleSided", False)
        assert "emissiveFactor" not in material
    assert "textures" not in model.document


def test_the_model_is_compressed_with_meshopt(model: Glb) -> None:
    assert sorted(model.document["extensionsRequired"]) == [
        "EXT_meshopt_compression",
        "KHR_mesh_quantization",
    ]
    for view in model.document["bufferViews"]:
        assert "EXT_meshopt_compression" in view["extensions"]


def test_the_model_respects_its_budgets(model: Glb, builds: tuple[Path, Path]) -> None:
    assert (builds[0] / MODEL_NAME).stat().st_size <= MAXIMUM_SIZE_BYTES
    assert model.triangle_count() <= MAXIMUM_TRIANGLES
    assert model.primitive_count() <= MAXIMUM_DRAW_CALLS
    for mesh in model.document["meshes"]:
        names = [model.material_name(primitive) for primitive in mesh["primitives"]]
        assert len(names) == len(set(names)), mesh["name"]


def test_sections_span_the_recorded_length_overall_and_extreme_breadth(
    model: Glb,
    offsets: Offsets,
) -> None:
    bounds = [model.bounds(name) for name in SECTIONS]
    low = np.min([bound[0] for bound in bounds], axis=0)
    high = np.max([bound[1] for bound in bounds], axis=0)
    assert high[0] - low[0] == pytest.approx(offsets.particulars.length_overall, abs=0.01)
    assert high[2] - low[2] == pytest.approx(offsets.particulars.breadth, abs=0.01)
    assert high[0] == pytest.approx(offsets.particulars.stem_overhang, abs=POSITION_STEP_M)
    assert low[1] == pytest.approx(0.0, abs=POSITION_STEP_M)


def test_sections_are_cut_where_the_hull_parted(model: Glb, offsets: Offsets) -> None:
    bow, _, stern = offsets.sections
    assert model.bounds("bow")[0][0] == pytest.approx(-bow.x_end, abs=1e-9)
    assert model.bounds("middle")[1][0] == pytest.approx(-bow.x_end, abs=1e-9)
    assert model.bounds("middle")[0][0] == pytest.approx(-stern.x_start, abs=1e-9)
    assert model.bounds("stern")[1][0] == pytest.approx(-stern.x_start, abs=1e-9)
    assert model.bounds("stern-wreck")[1][0] == pytest.approx(-stern.x_start, abs=1e-9)


def test_blender_exports_the_geometry_in_the_scene_frame(
    raw_model: Glb,
    nodes: dict[str, Node],
) -> None:
    assert raw_model.triangle_count() == sum(node.triangle_count for node in nodes.values())
    for name, node in nodes.items():
        for primitive in raw_model.primitives(name):
            part = node.triangles[raw_model.material_name(primitive)]
            indices = raw_model.accessor(primitive["indices"]).reshape(-1)
            positions = raw_model.accessor(primitive["attributes"]["POSITION"])[indices]
            normals = raw_model.accessor(primitive["attributes"]["NORMAL"])[indices]
            body_positions = part.positions.reshape(-1, 3)
            body_normals = part.normals.reshape(-1, 3)
            expected_positions = np.stack(
                (-body_positions[:, 0], body_positions[:, 2], body_positions[:, 1]),
                axis=1,
            )
            expected_normals = np.stack(
                (-body_normals[:, 0], body_normals[:, 2], body_normals[:, 1]),
                axis=1,
            )
            assert np.allclose(positions, expected_positions, atol=1e-4)
            assert np.allclose(normals, expected_normals, atol=5e-3)


def test_caps_of_the_final_model_lie_in_the_cut_planes(model: Glb, raw_model: Glb) -> None:
    for name, x in (("bow", -143.0), ("middle", -143.0), ("middle", -164.0), ("stern", -164.0)):
        for glb in (model, raw_model):
            shadow = next(
                primitive
                for primitive in glb.primitives(name)
                if glb.material_name(primitive) == "shadow"
            )
            accessor = glb.document["accessors"][shadow["attributes"]["POSITION"]]
            assert accessor["min"][0] <= x <= accessor["max"][0]
            assert x in (accessor["min"][0], accessor["max"][0])
