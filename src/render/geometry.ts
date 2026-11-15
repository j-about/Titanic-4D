import { BufferAttribute, BufferGeometry } from 'three/webgpu';
import type { MeshData } from '../ship/meshBuilder.ts';

/** Wraps the typed arrays produced by the mesh builder in a renderable geometry. */
export function geometryFromMeshData(mesh: MeshData): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(mesh.positions, 3));
  geometry.setAttribute('normal', new BufferAttribute(mesh.normals, 3));
  geometry.setAttribute('color', new BufferAttribute(mesh.colors, 3));
  geometry.setIndex(new BufferAttribute(mesh.indices, 1));
  geometry.computeBoundingSphere();
  return geometry;
}
