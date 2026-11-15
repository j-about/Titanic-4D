import { Group, Mesh, MeshStandardNodeMaterial } from 'three/webgpu';
import { buildIcebergMesh } from '../sim/iceberg.ts';
import type { ShipState } from '../sim/timelineModel.ts';
import { geometryFromMeshData } from './geometry.ts';

export interface IcebergObject {
  readonly root: Group;
  update(state: ShipState): void;
  dispose(): void;
}

/** Angle between the length of the iceberg and the track of the ship, in radians. */
const HEADING_RAD = 0.18;

/** Creates the iceberg of the collision: a generic mass of ice lit by the stars alone. */
export function createIcebergObject(): IcebergObject {
  const geometry = geometryFromMeshData(buildIcebergMesh());
  const material = new MeshStandardNodeMaterial({
    vertexColors: true,
    roughness: 0.55,
    metalness: 0,
    flatShading: true,
  });
  const mesh = new Mesh(geometry, material);
  mesh.rotation.y = HEADING_RAD;
  mesh.name = 'iceberg';
  const root = new Group();
  root.add(mesh);

  const update = (state: ShipState): void => {
    // Scene axes: X forward, Y up, Z to starboard.
    mesh.position.set(state.iceberg.forwardM, 0, state.iceberg.starboardM);
  };

  const dispose = (): void => {
    geometry.dispose();
    material.dispose();
  };

  return { root, update, dispose };
}
