"""Review renders of the scene built by ``titanic_assets.blender``, with Cycles on the processor."""

import math
from dataclasses import dataclass
from pathlib import Path

import bpy
from mathutils import Vector

from titanic_assets.model import STERN_WRECK

_SAMPLES = 24
_SUN_STRENGTH = 3.0
_SKY_COLOUR = (0.55, 0.62, 0.7, 1.0)
_SKY_STRENGTH = 1.0


@dataclass(frozen=True, slots=True)
class View:
    """A camera: where it stands and what it looks at, in Blender coordinates.

    ``scale`` is the width of an orthographic view in metres; without it the view is a
    perspective view. ``wreck`` shows the stern as a wreck instead of the complete ship.
    """

    name: str
    position: tuple[float, float, float]
    target: tuple[float, float, float]
    scale: float | None = None
    size: tuple[int, int] = (2000, 900)
    wreck: bool = False


VIEWS: tuple[View, ...] = (
    View(
        "profile-starboard",
        (-134.0, -400.0, 28.0),
        (-134.0, 0.0, 28.0),
        scale=285.0,
        size=(2400, 640),
    ),
    View("top", (-134.0, 0.0, 400.0), (-134.0, 0.0, 0.0), scale=285.0, size=(2400, 400)),
    View("bow-three-quarter", (95.0, -120.0, 60.0), (-70.0, 0.0, 22.0)),
    View("stern-three-quarter", (-360.0, -120.0, 55.0), (-195.0, 0.0, 20.0)),
    View("bridge", (-20.0, -55.0, 50.0), (-75.0, 0.0, 30.0)),
    View("boat-deck", (-150.0, -70.0, 60.0), (-185.0, 0.0, 28.0)),
    View("stern-gear", (-300.0, -38.0, -6.0), (-252.0, 0.0, 6.0)),
    View("stern-wreck", (-330.0, -110.0, 60.0), (-215.0, 0.0, 14.0), wreck=True),
)


def _prepare_scene() -> tuple[bpy.types.Object, bpy.types.Camera]:
    """Set up the renderer, the light and the camera; return the camera and its lens."""
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = _SAMPLES
    scene.cycles.use_denoising = False
    scene.cycles.seed = 0
    scene.render.image_settings.file_format = "PNG"
    scene.view_settings.view_transform = "Standard"

    world = bpy.data.worlds.new("review")
    background = world.node_tree.nodes["Background"]
    background.inputs["Color"].default_value = _SKY_COLOUR
    background.inputs["Strength"].default_value = _SKY_STRENGTH
    scene.world = world

    light = bpy.data.lights.new("sun", "SUN")
    light.energy = _SUN_STRENGTH
    sun = bpy.data.objects.new("sun", light)
    sun.rotation_euler = (math.radians(55.0), math.radians(15.0), math.radians(-35.0))
    scene.collection.objects.link(sun)

    lens = bpy.data.cameras.new("camera")
    lens.clip_end = 5000.0
    camera = bpy.data.objects.new("camera", lens)
    scene.collection.objects.link(camera)
    scene.camera = camera
    return camera, lens


def _show(*, wreck: bool) -> None:
    """Show either the complete ship or the stern as a wreck."""
    for scene_object in bpy.data.objects:
        if scene_object.type != "MESH":
            continue
        is_wreck = scene_object.name == STERN_WRECK
        scene_object.hide_render = is_wreck != wreck


def render_views(directory: Path) -> list[Path]:
    """Render every review view of the current scene as a PNG file in ``directory``."""
    directory.mkdir(parents=True, exist_ok=True)
    camera, lens = _prepare_scene()
    scene = bpy.context.scene
    written: list[Path] = []
    for view in VIEWS:
        _show(wreck=view.wreck)
        camera.location = view.position
        direction = Vector(view.target) - Vector(view.position)
        camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
        lens.type = "PERSP" if view.scale is None else "ORTHO"
        if view.scale is not None:
            lens.ortho_scale = view.scale
        scene.render.resolution_x, scene.render.resolution_y = view.size
        path = directory / f"{view.name}.png"
        scene.render.filepath = str(path)
        bpy.ops.render.render(write_still=True)
        written.append(path)
    return written
