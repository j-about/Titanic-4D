"""Reading of binary glTF files for the tests."""

import json
import struct
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np
import numpy.typing as npt

_GLB_MAGIC = 0x46546C67
_JSON_CHUNK = 0x4E4F534A
_BINARY_CHUNK = 0x004E4942
_COMPONENT_TYPES: dict[int, type[np.generic]] = {
    5121: np.uint8,
    5123: np.uint16,
    5125: np.uint32,
    5126: np.float32,
}
_COMPONENT_COUNTS = {"SCALAR": 1, "VEC3": 3}


@dataclass(frozen=True, slots=True)
class Glb:
    """The JSON document and the binary chunk of a binary glTF file."""

    document: dict[str, Any]
    binary: bytes

    def accessor(self, index: int) -> npt.NDArray[Any]:
        """Read an accessor stored without compression, one row per element."""
        accessor = self.document["accessors"][index]
        view = self.document["bufferViews"][accessor["bufferView"]]
        dtype = np.dtype(_COMPONENT_TYPES[accessor["componentType"]])
        components = _COMPONENT_COUNTS[accessor["type"]]
        offset = view.get("byteOffset", 0) + accessor.get("byteOffset", 0)
        stride = view.get("byteStride", dtype.itemsize * components)
        rows = np.ndarray(
            shape=(accessor["count"], components),
            dtype=dtype,
            buffer=self.binary,
            offset=offset,
            strides=(stride, dtype.itemsize),
        )
        return np.array(rows)

    def node(self, name: str) -> dict[str, Any]:
        """Return the node with the given name."""
        return next(node for node in self.document["nodes"] if node["name"] == name)

    def primitives(self, node_name: str) -> list[dict[str, Any]]:
        """Return the primitives of the mesh of a node."""
        return self.document["meshes"][self.node(node_name)["mesh"]]["primitives"]

    def material_name(self, primitive: dict[str, Any]) -> str:
        """Return the name of the material of a primitive."""
        return self.document["materials"][primitive["material"]]["name"]

    def bounds(self, node_name: str) -> tuple[npt.NDArray[np.float64], npt.NDArray[np.float64]]:
        """Return the bounding box of a node from the bounds declared by its position accessors."""
        accessors = [
            self.document["accessors"][primitive["attributes"]["POSITION"]]
            for primitive in self.primitives(node_name)
        ]
        low = np.min([accessor["min"] for accessor in accessors], axis=0)
        high = np.max([accessor["max"] for accessor in accessors], axis=0)
        return low, high

    def triangle_count(self) -> int:
        """Return the number of triangles of every mesh of the file."""
        return sum(
            self.document["accessors"][primitive["indices"]]["count"] // 3
            for mesh in self.document["meshes"]
            for primitive in mesh["primitives"]
        )

    def primitive_count(self) -> int:
        """Return the number of primitives of every mesh of the file."""
        return sum(len(mesh["primitives"]) for mesh in self.document["meshes"])


def read_glb(path: Path) -> Glb:
    """Read the JSON document and the first binary chunk of a binary glTF file."""
    data = path.read_bytes()
    magic, _version, length = struct.unpack_from("<III", data, 0)
    if magic != _GLB_MAGIC or length != len(data):
        message = f"{path} is not a binary glTF file."
        raise ValueError(message)
    document: dict[str, Any] = {}
    binary = b""
    offset = 12
    while offset < length:
        chunk_length, chunk_type = struct.unpack_from("<II", data, offset)
        chunk = data[offset + 8 : offset + 8 + chunk_length]
        if chunk_type == _JSON_CHUNK:
            document = json.loads(chunk)
        elif chunk_type == _BINARY_CHUNK and not binary:
            binary = chunk
        offset += 8 + chunk_length
    return Glb(document, binary)
