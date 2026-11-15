# Declarations of the Blender data types used by the asset pipeline.

from collections.abc import Iterator, Sequence

import numpy as np
import numpy.typing as npt
from mathutils import Euler

type _Array = npt.NDArray[np.float32] | npt.NDArray[np.int32] | npt.NDArray[np.bool_]

class NodeSocket:
    default_value: float | tuple[float, float, float, float]

class _NodeSockets:
    def __getitem__(self, name: str) -> NodeSocket: ...

class Node:
    inputs: _NodeSockets

class _Nodes:
    def __getitem__(self, name: str) -> Node: ...

class NodeTree:
    nodes: _Nodes

class Material:
    name: str
    use_backface_culling: bool
    node_tree: NodeTree

class World:
    node_tree: NodeTree

class _MeshElements:
    def add(self, count: int) -> None: ...
    def foreach_set(self, attribute: str, values: _Array) -> None: ...

class _MeshMaterials:
    def append(self, material: Material) -> None: ...

class Mesh:
    vertices: _MeshElements
    loops: _MeshElements
    polygons: _MeshElements
    materials: _MeshMaterials
    def update(self, *, calc_edges: bool = False) -> None: ...
    def validate(self) -> bool: ...
    def normals_split_custom_set(self, normals: Sequence[Sequence[float]]) -> None: ...

class Light:
    energy: float

class Camera:
    type: str
    ortho_scale: float
    clip_end: float

class Object:
    name: str
    type: str
    parent: Object | None
    hide_render: bool
    location: tuple[float, float, float]
    rotation_euler: Euler | tuple[float, float, float]

class _CollectionObjects:
    def link(self, scene_object: Object) -> None: ...

class Collection:
    objects: _CollectionObjects

class ImageFormatSettings:
    file_format: str

class RenderSettings:
    engine: str
    resolution_x: int
    resolution_y: int
    filepath: str
    image_settings: ImageFormatSettings

class CyclesRenderSettings:
    device: str
    samples: int
    use_denoising: bool
    seed: int

class ColorManagedViewSettings:
    view_transform: str

class Scene:
    collection: Collection
    render: RenderSettings
    cycles: CyclesRenderSettings
    view_settings: ColorManagedViewSettings
    world: World
    camera: Object

class Context:
    scene: Scene

class _Materials:
    def new(self, name: str) -> Material: ...

class _Meshes:
    def new(self, name: str) -> Mesh: ...

class _Worlds:
    def new(self, name: str) -> World: ...

class _Lights:
    def new(self, name: str, kind: str, /) -> Light: ...

class _Cameras:
    def new(self, name: str) -> Camera: ...

class _Objects:
    def new(self, name: str, object_data: Mesh | Light | Camera) -> Object: ...
    def __iter__(self) -> Iterator[Object]: ...

class BlendData:
    materials: _Materials
    meshes: _Meshes
    worlds: _Worlds
    lights: _Lights
    cameras: _Cameras
    objects: _Objects
