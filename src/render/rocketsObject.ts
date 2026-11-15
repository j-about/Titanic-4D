import {
  Color,
  Group,
  InstancedMesh,
  Matrix4,
  MeshBasicNodeMaterial,
  SphereGeometry,
} from 'three/webgpu';
import type { Dataset } from '../data/schema/dataset.ts';
import { factValue } from '../ship/particulars.ts';
import { deckHeightAt } from '../ship/sheer.ts';
import { ROCKET_STAR_OFFSETS, rocketDisplay } from '../sim/rocketAppearance.ts';
import { bodyPointToScene } from '../sim/sceneFrame.ts';
import type { RocketFiring, ShipState } from '../sim/timelineModel.ts';

export interface RocketsObject {
  readonly root: Group;
  /** `timeScale` is how many times faster than real time the simulation is running. */
  update(state: ShipState, timeScale: number): void;
  dispose(): void;
}

/** Brightness of a star relative to scene white, before tone mapping. */
const PEAK_BRIGHTNESS = 9;
/** Radius of the sphere drawn for each star, in metres: about two pixels from a ship's length away. */
const STAR_RADIUS_M = 1.1;
/** Signals that can be on screen at once: during fast playback one fades as the next comes up. */
const MAX_SIGNALS = 3;
const RAIL_HEIGHT_M = 1.2;
const INBOARD_M = 0.5;

/** Creates the lights that represent the distress signals fired from the starboard bridge rail. */
export function createRocketsObject(
  dataset: Dataset,
  firings: readonly RocketFiring[],
): RocketsObject {
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

  const geometry = new SphereGeometry(STAR_RADIUS_M, 8, 6);
  const material = new MeshBasicNodeMaterial();
  material.fog = false;
  const stars = new InstancedMesh(geometry, material, MAX_SIGNALS * ROCKET_STAR_OFFSETS.length);
  stars.frustumCulled = false;
  const root = new Group();
  root.add(stars);
  const matrix = new Matrix4();
  const colour = new Color();

  const update = (state: ShipState, timeScale: number): void => {
    const origin = bodyPointToScene(state.bow, firingPoint);
    const shown = firings
      .map((firing) => rocketDisplay(state.t - firing.seconds, timeScale))
      .filter((appearance) => appearance !== undefined)
      .slice(0, MAX_SIGNALS);
    let count = 0;
    for (const appearance of shown) {
      colour.setScalar(appearance.brightness * PEAK_BRIGHTNESS);
      for (const offset of ROCKET_STAR_OFFSETS) {
        matrix.makeTranslation(
          origin[0] + offset[0] * appearance.radiusM,
          origin[1] + appearance.heightM + offset[1] * appearance.radiusM,
          origin[2] + offset[2] * appearance.radiusM,
        );
        stars.setMatrixAt(count, matrix);
        stars.setColorAt(count, colour);
        count += 1;
      }
    }
    stars.count = count;
    stars.visible = count > 0;
    stars.instanceMatrix.needsUpdate = true;
    if (stars.instanceColor !== null) {
      stars.instanceColor.needsUpdate = true;
    }
  };

  const dispose = (): void => {
    geometry.dispose();
    material.dispose();
    stars.dispose();
  };

  return { root, update, dispose };
}
