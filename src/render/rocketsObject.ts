import { uniform } from 'three/tsl';
import { Color, Group, Mesh, MeshBasicNodeMaterial, SphereGeometry } from 'three/webgpu';
import type { Dataset } from '../data/schema/dataset.ts';
import { factValue } from '../ship/particulars.ts';
import { deckHeightAt } from '../ship/sheer.ts';
import { rocketAppearance } from '../sim/rocketAppearance.ts';
import { bodyPointToScene } from '../sim/sceneFrame.ts';
import type { ShipState } from '../sim/timelineModel.ts';

export interface RocketsObject {
  readonly root: Group;
  update(state: ShipState): void;
  dispose(): void;
}

/** Brightness of the burst relative to scene white, before tone mapping. */
const PEAK_BRIGHTNESS = 6;
/** Signals that can be in the air at once: one, since they were fired minutes apart. */
const POOL_SIZE = 2;
const RAIL_HEIGHT_M = 1.2;
const INBOARD_M = 0.5;

/** Creates the lights that represent the distress signals fired from the starboard bridge rail. */
export function createRocketsObject(dataset: Dataset): RocketsObject {
  const { ship } = dataset;
  const bridge = ship.zones.find((zone) => zone.id === 'navigating-bridge');
  if (bridge === undefined) {
    throw new RangeError('The dataset has no navigating bridge.');
  }
  const firingPoint = {
    x: (bridge.x_start_m + bridge.x_end_m) / 2,
    y: factValue(ship.particulars, 'breadth') / 2 - INBOARD_M,
    z: deckHeightAt(ship, 'boat', bridge.x_start_m) + RAIL_HEIGHT_M,
  };

  const geometry = new SphereGeometry(1, 16, 12);
  const root = new Group();
  const pool = Array.from({ length: POOL_SIZE }, () => {
    const brightness = uniform(0);
    const material = new MeshBasicNodeMaterial();
    material.colorNode = uniform(new Color(0xffffff)).mul(brightness);
    material.fog = false;
    const mesh = new Mesh(geometry, material);
    mesh.visible = false;
    root.add(mesh);
    return { mesh, material, brightness };
  });

  const update = (state: ShipState): void => {
    const origin = bodyPointToScene(state.bow, firingPoint);
    pool.forEach((slot, index) => {
      const rocket = state.rockets[index];
      slot.mesh.visible = rocket !== undefined;
      if (rocket === undefined) {
        return;
      }
      const appearance = rocketAppearance(rocket.ageSeconds);
      slot.mesh.position.set(origin[0], origin[1] + appearance.heightM, origin[2]);
      slot.mesh.scale.setScalar(appearance.radiusM);
      slot.brightness.value = appearance.brightness * PEAK_BRIGHTNESS;
    });
  };

  const dispose = (): void => {
    geometry.dispose();
    for (const slot of pool) {
      slot.material.dispose();
    }
  };

  return { root, update, dispose };
}
