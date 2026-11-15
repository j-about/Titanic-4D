"""Accumulation of triangles per material, in body coordinates.

Triangles are stored as corner positions and corner normals. Their corners are listed
counter-clockwise when seen from outside. Body coordinates are right-handed: ``x`` aft, ``y`` to
starboard, ``z`` up.
"""

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Self

import numpy as np
import numpy.typing as npt

type FloatArray = npt.NDArray[np.float64]
type IntArray = npt.NDArray[np.int64]
type Point = tuple[float, float, float]

_WELD_TOLERANCE_M = 1e-5
_MINIMUM_DOUBLE_AREA_M2 = 1e-9


@dataclass(frozen=True, slots=True)
class Triangles:
    """Triangles of one material: corner positions and corner normals, each of shape (n, 3, 3)."""

    positions: FloatArray
    normals: FloatArray

    @property
    def count(self) -> int:
        """Number of triangles."""
        return int(self.positions.shape[0])


def _double_area_vectors(positions: FloatArray) -> FloatArray:
    """Return, for triangles of shape (n, 3, 3), their normal vectors scaled by twice their area."""
    return np.cross(positions[:, 1] - positions[:, 0], positions[:, 2] - positions[:, 0])


def _normalised(vectors: FloatArray) -> FloatArray:
    """Scale vectors to unit length; vectors of zero length become the vertical unit vector."""
    lengths = np.sqrt(np.sum(vectors * vectors, axis=-1, keepdims=True))
    fallback = np.zeros_like(vectors)
    fallback[..., 2] = 1.0
    safe = np.where(lengths > 0.0, lengths, 1.0)
    return np.where(lengths > 0.0, vectors / safe, fallback)


def smooth_normals(positions: FloatArray, triangles: IntArray) -> FloatArray:
    """Compute one normal per vertex as the area-weighted mean of the adjacent triangle normals.

    Vertices closer than the welding tolerance share their normal.
    """
    keys = np.round(positions / _WELD_TOLERANCE_M).astype(np.int64)
    _, inverse = np.unique(keys, axis=0, return_inverse=True)
    inverse = inverse.reshape(-1)
    weighted = _double_area_vectors(positions[triangles])
    accumulated = np.zeros((int(inverse.max()) + 1, 3), dtype=np.float64)
    for corner in range(3):
        np.add.at(accumulated, inverse[triangles[:, corner]], weighted)
    return _normalised(accumulated)[inverse]


def grid_triangles(columns: int, rows: int, *, closed: bool = False) -> IntArray:
    """Return the triangles of a grid of ``columns`` by ``rows`` vertices, numbered column first.

    With ``closed``, the last column is joined to the first. Seen from the side the normals
    point to, rows run upward and columns run to the left.
    """
    column_count = columns if closed else columns - 1
    first = np.repeat(np.arange(column_count), rows - 1)
    second = (first + 1) % columns
    row = np.tile(np.arange(rows - 1), column_count)
    a = first * rows + row
    b = first * rows + row + 1
    c = second * rows + row + 1
    d = second * rows + row
    return np.concatenate((np.stack((a, b, c), axis=1), np.stack((a, c, d), axis=1)))


class MeshBuilder:
    """Triangles of one node of the model, grouped by material."""

    def __init__(self) -> None:
        """Create an empty mesh."""
        self._positions: dict[str, list[FloatArray]] = {}
        self._normals: dict[str, list[FloatArray]] = {}

    def add(self, material: str, positions: FloatArray, normals: FloatArray) -> None:
        """Add triangles given as corner positions and corner normals of shape (n, 3, 3).

        Triangles without area are dropped.
        """
        double_areas = _double_area_vectors(positions)
        keep = np.sum(double_areas * double_areas, axis=1) > _MINIMUM_DOUBLE_AREA_M2**2
        if not bool(np.any(keep)):
            return
        self._positions.setdefault(material, []).append(positions[keep])
        self._normals.setdefault(material, []).append(normals[keep])

    def add_indexed(
        self,
        material: str,
        positions: FloatArray,
        normals: FloatArray,
        triangles: IntArray,
    ) -> None:
        """Add triangles given as vertex positions, vertex normals and vertex indices."""
        self.add(material, positions[triangles], normals[triangles])

    def add_polygon(self, material: str, corners: Sequence[Point]) -> None:
        """Add a flat convex polygon as a fan of triangles sharing one normal."""
        points = np.asarray(corners, dtype=np.float64)
        fan = np.stack(
            [
                np.stack((points[0], points[index], points[index + 1]))
                for index in range(1, len(points) - 1)
            ],
        )
        normal = _normalised(np.sum(_double_area_vectors(fan), axis=0))
        self.add(material, fan, np.broadcast_to(normal, fan.shape).copy())

    def add_quad(self, material: str, a: Point, b: Point, c: Point, d: Point) -> None:
        """Add a flat quadrilateral."""
        self.add_polygon(material, (a, b, c, d))

    def add_box(self, material: str, low: Point, high: Point) -> None:
        """Add the six faces of an axis-aligned box given by two opposite corners."""
        x0, y0, z0 = low
        x1, y1, z1 = high
        self.add_quad(material, (x0, y0, z0), (x0, y0, z1), (x0, y1, z1), (x0, y1, z0))
        self.add_quad(material, (x1, y1, z0), (x1, y1, z1), (x1, y0, z1), (x1, y0, z0))
        self.add_quad(material, (x1, y0, z0), (x1, y0, z1), (x0, y0, z1), (x0, y0, z0))
        self.add_quad(material, (x0, y1, z0), (x0, y1, z1), (x1, y1, z1), (x1, y1, z0))
        self.add_quad(material, (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1))
        self.add_quad(material, (x0, y1, z0), (x1, y1, z0), (x1, y0, z0), (x0, y0, z0))

    def add_surface(
        self,
        materials: Sequence[str],
        points: FloatArray,
        *,
        closed: bool = False,
        inward: bool = False,
    ) -> None:
        """Add a smooth surface through a grid of points of shape (columns, rows, 3).

        ``materials`` names the material of each interval between two rows. With ``closed`` the
        last column is joined to the first. With ``inward`` the surface faces the other way.
        """
        columns, rows = points.shape[0], points.shape[1]
        triangles = grid_triangles(columns, rows, closed=closed)
        if inward:
            triangles = triangles[:, ::-1]
        vertices = points.reshape(-1, 3)
        normals = smooth_normals(vertices, triangles)
        row_of_triangle = np.min(triangles % rows, axis=1)
        for material in sorted(set(materials)):
            wanted = np.asarray([name == material for name in materials], dtype=np.bool_)
            self.add_indexed(material, vertices, normals, triangles[wanted[row_of_triangle]])

    def merge(self, other: Self) -> None:
        """Add every triangle of another mesh."""
        for material in sorted(other._positions):
            self._positions.setdefault(material, []).extend(other._positions[material])
            self._normals.setdefault(material, []).extend(other._normals[material])

    def mirrored(self) -> "MeshBuilder":
        """Return the reflection of this mesh in the centre plane."""
        result = MeshBuilder()
        flip = np.asarray([1.0, -1.0, 1.0])
        for material in sorted(self._positions):
            for positions, normals in zip(
                self._positions[material], self._normals[material], strict=True
            ):
                result.add(material, (positions * flip)[:, ::-1], (normals * flip)[:, ::-1])
        return result

    def add_symmetric(self, half: Self) -> None:
        """Add a mesh and its reflection in the centre plane."""
        self.merge(half)
        self.merge(half.mirrored())

    def build(self) -> dict[str, Triangles]:
        """Return the triangles of each material, materials in alphabetical order."""
        return {
            material: Triangles(
                np.concatenate(self._positions[material]),
                np.concatenate(self._normals[material]),
            )
            for material in sorted(self._positions)
        }
