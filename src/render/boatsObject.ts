import { Euler, Group, Mesh, MeshStandardNodeMaterial } from 'three/webgpu';
import type { Dataset } from '../data/schema/dataset.ts';
import type { BoatTypeId } from '../data/schema/lifeboats.ts';
import { buildBoatMesh } from '../ship/lod0.ts';
import type { BoatPlacer } from '../sim/boatPlacement.ts';
import type { ShipState } from '../sim/timelineModel.ts';
import { geometryFromMeshData } from './geometry.ts';

export interface BoatsObject {
  readonly root: Group;
  update(state: ShipState): void;
  dispose(): void;
}

const RADIANS_PER_DEGREE = Math.PI / 180;

/** Creates one mesh per lifeboat, sharing a geometry per type of boat. */
export function createBoatsObject(dataset: Dataset, placeBoats: BoatPlacer): BoatsObject {
  const material = new MeshStandardNodeMaterial({
    vertexColors: true,
    roughness: 0.8,
    metalness: 0,
  });
  const geometries = new Map(
    dataset.lifeboats.types.map((type): [BoatTypeId, ReturnType<typeof geometryFromMeshData>] => [
      type.id,
      geometryFromMeshData(buildBoatMesh(type.length_m, type.breadth_m, type.depth_m)),
    ]),
  );
  const root = new Group();
  const meshes = dataset.lifeboats.boats.map((boat) => {
    const mesh = new Mesh(geometries.get(boat.type), material);
    mesh.name = `boat-${boat.id}`;
    root.add(mesh);
    return mesh;
  });
  const rotation = new Euler(0, 0, 0, 'YZX');

  const update = (state: ShipState): void => {
    placeBoats(state).forEach((placement, index) => {
      const mesh = meshes[index];
      if (mesh === undefined) {
        return;
      }
      mesh.position.set(placement.forward, placement.up, placement.starboard);
      rotation.set(
        placement.heelDeg * RADIANS_PER_DEGREE,
        -placement.yawDeg * RADIANS_PER_DEGREE,
        -placement.pitchDeg * RADIANS_PER_DEGREE,
      );
      mesh.setRotationFromEuler(rotation);
    });
  };

  const dispose = (): void => {
    material.dispose();
    for (const geometry of geometries.values()) {
      geometry.dispose();
    }
  };

  return { root, update, dispose };
}
