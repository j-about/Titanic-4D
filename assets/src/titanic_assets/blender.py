"""Blender scene of the model and its export to glTF.

Blender works with ``z`` up: a body point ``(x, y, z)`` is placed at ``(-x, -y, z)``, which the
exporter writes as the glTF point ``(-x, z, y)``: ``X`` forward, ``Y`` up, ``Z`` to starboard.
"""

from collections.abc import Sequence
from pathlib import Path

import bpy
import numpy as np

from titanic_assets.materials import MATERIAL_ORDER, MATERIALS
from titanic_assets.model import Node

_TO_BLENDER = np.asarray([-1.0, -1.0, 1.0])


def _create_materials() -> dict[str, bpy.types.Material]:
    """Create one Principled material per material of the model."""
    materials: dict[str, bpy.types.Material] = {}
    for definition in MATERIALS:
        material = bpy.data.materials.new(definition.name)
        material.use_backface_culling = True
        shader = material.node_tree.nodes["Principled BSDF"]
        shader.inputs["Base Color"].default_value = definition.linear_rgba()
        shader.inputs["Roughness"].default_value = definition.roughness
        shader.inputs["Metallic"].default_value = definition.metalness
        materials[definition.name] = material
    return materials


def _create_mesh(node: Node, materials: dict[str, bpy.types.Material]) -> bpy.types.Mesh:
    """Create the mesh of a node: one vertex per triangle corner, with its own normal."""
    names = sorted(node.triangles, key=MATERIAL_ORDER.__getitem__)
    positions = np.concatenate([node.triangles[name].positions for name in names]) * _TO_BLENDER
    normals = np.concatenate([node.triangles[name].normals for name in names]) * _TO_BLENDER
    slots = np.concatenate(
        [
            np.full(node.triangles[name].count, slot, dtype=np.int32)
            for slot, name in enumerate(names)
        ],
    )
    triangle_count = positions.shape[0]
    corner_count = triangle_count * 3

    mesh = bpy.data.meshes.new(node.name)
    mesh.vertices.add(corner_count)
    mesh.vertices.foreach_set("co", positions.astype(np.float32).ravel())
    mesh.loops.add(corner_count)
    mesh.loops.foreach_set("vertex_index", np.arange(corner_count, dtype=np.int32))
    mesh.polygons.add(triangle_count)
    mesh.polygons.foreach_set("loop_start", np.arange(0, corner_count, 3, dtype=np.int32))
    mesh.polygons.foreach_set("loop_total", np.full(triangle_count, 3, dtype=np.int32))
    mesh.polygons.foreach_set("material_index", slots)
    mesh.polygons.foreach_set("use_smooth", np.ones(triangle_count, dtype=np.bool_))
    for name in names:
        mesh.materials.append(materials[name])
    mesh.update(calc_edges=True)
    if mesh.validate():
        message = f'Blender found invalid geometry in the mesh of "{node.name}".'
        raise ValueError(message)
    mesh.normals_split_custom_set(normals.astype(np.float32).reshape(-1, 3).tolist())
    return mesh


def build_scene(nodes: Sequence[Node]) -> None:
    """Replace the content of Blender by the model: one object per node, parents before children."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    materials = _create_materials()
    objects: dict[str, bpy.types.Object] = {}
    for node in nodes:
        scene_object = bpy.data.objects.new(node.name, _create_mesh(node, materials))
        bpy.context.scene.collection.objects.link(scene_object)
        if node.parent is not None:
            scene_object.parent = objects[node.parent]
        objects[node.name] = scene_object


def export_glb(path: Path) -> None:
    """Write the scene as a binary glTF file: positions, normals and materials only."""
    path.parent.mkdir(parents=True, exist_ok=True)
    result = bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format="GLB",
        export_yup=True,
        export_apply=False,
        export_texcoords=False,
        export_normals=True,
        export_tangents=False,
        export_materials="EXPORT",
        export_vertex_color="NONE",
        export_cameras=False,
        export_lights=False,
        export_animations=False,
        export_skins=False,
        export_morph=False,
        export_extras=False,
        use_selection=False,
    )
    if "FINISHED" not in result:
        message = f"Blender did not export {path}."
        raise RuntimeError(message)
