import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { BufferGeometry, Material, Object3D } from 'three/webgpu';
import type { SectionId } from '../ship/lod0.ts';

/**
 * The detailed model of the ship, loaded from the GLB produced by the asset pipeline
 * (`docs/ASSETS.md`). Its parts carry the names and the coordinates of the generated model, so
 * that one can stand in for the other: geometry is expressed in the frame of the section that
 * holds it, with X forward, Y up and Z to starboard.
 */
export interface DetailedShip {
  readonly sections: Readonly<Record<SectionId, Object3D>>;
  /** The four funnels, from forward to aft. */
  readonly funnels: readonly Object3D[];
  readonly foremast: Object3D;
  readonly mainmast: Object3D;
  /** The after section as it lies on the seabed. */
  readonly sternWreck: Object3D;
  dispose(): void;
}

const FUNNEL_COUNT = 4;

function isMeshLike(
  object: Object3D,
): object is Object3D & { geometry: BufferGeometry; material: Material | Material[] } {
  return 'geometry' in object && 'material' in object;
}

/** Loads the detailed model. Rejects when the file cannot be fetched, decoded or lacks a part. */
export async function loadDetailedShip(url: string): Promise<DetailedShip> {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const { scene } = await loader.loadAsync(url);

  const part = (name: string): Object3D => {
    const found = scene.getObjectByName(name);
    if (found === undefined) {
      throw new Error(`The detailed model has no part named "${name}".`);
    }
    return found;
  };

  const detailed = {
    sections: { bow: part('bow'), middle: part('middle'), stern: part('stern') },
    funnels: Array.from({ length: FUNNEL_COUNT }, (_unused, index) => part(`funnel-${index + 1}`)),
    foremast: part('foremast'),
    mainmast: part('mainmast'),
    sternWreck: part('stern-wreck'),
  };

  const dispose = (): void => {
    const materials = new Set<Material>();
    scene.traverse((object) => {
      if (isMeshLike(object)) {
        object.geometry.dispose();
        for (const material of [object.material].flat()) {
          materials.add(material);
        }
      }
    });
    for (const material of materials) {
      material.dispose();
    }
  };

  return { ...detailed, dispose };
}
