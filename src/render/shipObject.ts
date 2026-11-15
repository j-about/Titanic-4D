import { color, mix, positionWorld, smoothstep, uniform } from 'three/tsl';
import {
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicNodeMaterial,
  MeshStandardNodeMaterial,
  PlaneGeometry,
  PointLight,
  Quaternion,
  Vector3,
} from 'three/webgpu';
import type { Dataset } from '../data/schema/dataset.ts';
import { buildLod0Model, type LampInstance, type SectionId } from '../ship/lod0.ts';
import { factValue } from '../ship/particulars.ts';
import { deckHeightAt } from '../ship/sheer.ts';
import type { Pose } from '../sim/pose.ts';
import { poseToMatrix } from '../sim/sceneFrame.ts';
import type { ShipState } from '../sim/timelineModel.ts';
import { geometryFromMeshData } from './geometry.ts';

export interface ShipObject {
  readonly root: Group;
  update(state: ShipState): void;
  dispose(): void;
}

/** Colour of an incandescent lamp of the period, and its brightness relative to scene white. */
const LAMP_COLOUR = 0xffc98a;
const LAMP_BRIGHTNESS = 3.2;
/** Fraction of its brightness that a lamp keeps once it is under water. */
const SUBMERGED_LAMP_FACTOR = 0.08;
/** Depth over which a lamp fades as it goes under, in metres. */
const LAMP_FADE_DEPTH_M = 1.2;
/** Distance by which lamps stand proud of the plating, to avoid coplanar surfaces. */
const LAMP_OFFSET_M = 0.04;
/**
 * Lights standing for the glow of the lit decks on the ship's own structure: stations along the
 * hull, on both sides, with their intensity in candelas and their reach in metres. They follow
 * the electric lighting output and go out as they are submerged.
 */
const GLOW_STATIONS_M: readonly number[] = [70, 115, 190, 228];
const GLOW_OUTBOARD_M = 9;
const GLOW_HEIGHT_M = 23;
const GLOW_INTENSITY_CD = 650;
const GLOW_REACH_M = 140;
/** Where the fallen foremast rests: height above the Boat deck and distance to port of the centre line, as a fraction of the breadth. */
const FALLEN_MAST_REST_HEIGHT_M = 1.5;
const FALLEN_MAST_PORT_RATIO = 0.3;

function applyPose(group: Group, pose: Pose): void {
  group.matrix.fromArray(poseToMatrix(pose));
  group.matrixWorldNeedsUpdate = true;
}

/** Builds one instanced mesh holding the lamps of a section, in the local frame of that section. */
function createLamps(
  lamps: readonly LampInstance[],
  material: MeshBasicNodeMaterial,
  geometry: PlaneGeometry,
): InstancedMesh {
  const mesh = new InstancedMesh(geometry, material, lamps.length);
  const matrix = new Matrix4();
  const position = new Vector3();
  const normal = new Vector3();
  const scale = new Vector3();
  const orientation = new Quaternion();
  const facing = new Vector3(0, 0, 1);
  lamps.forEach((lamp, index) => {
    normal.set(-lamp.normal.x, lamp.normal.z, lamp.normal.y).normalize();
    position
      .set(-lamp.position.x, lamp.position.z, lamp.position.y)
      .addScaledVector(normal, LAMP_OFFSET_M);
    orientation.setFromUnitVectors(facing, normal);
    scale.set(lamp.width, lamp.height, 1);
    mesh.setMatrixAt(index, matrix.compose(position, orientation, scale));
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.frustumCulled = false;
  return mesh;
}

/**
 * Transform that lays the foremast down from its step, aft and to port, so that it rests across
 * the port side of the bridge (record `foremast-condition` of `data/site.json`). It is expressed
 * in the frame of the forward section, whose axes are X forward, Y up and Z to starboard.
 */
function fallenForemastMatrix(dataset: Dataset): Matrix4 {
  const { ship } = dataset;
  const mast = ship.masts.find((candidate) => candidate.id === 'foremast');
  const bridge = ship.zones.find((zone) => zone.id === 'navigating-bridge');
  if (mast === undefined || bridge === undefined) {
    throw new RangeError('The dataset has no foremast or no navigating bridge.');
  }
  const rake = (mast.rake_deg * Math.PI) / 180;
  const step = new Vector3(-mast.x_m, mast.base_above_keel_m, 0);
  const upright = new Vector3(-Math.sin(rake), Math.cos(rake), 0);
  const restingPoint = new Vector3(
    -bridge.x_start_m,
    deckHeightAt(ship, 'boat', bridge.x_start_m) + FALLEN_MAST_REST_HEIGHT_M,
    -factValue(ship.particulars, 'breadth') * FALLEN_MAST_PORT_RATIO,
  );
  const lying = restingPoint.sub(step).normalize();
  const rotation = new Matrix4().makeRotationFromQuaternion(
    new Quaternion().setFromUnitVectors(upright, lying),
  );
  return new Matrix4()
    .makeTranslation(step.x, step.y, step.z)
    .multiply(rotation)
    .multiply(new Matrix4().makeTranslation(-step.x, -step.y, -step.z));
}

/** Creates the level-of-detail 0 ship: three hull parts, four funnels, two masts and the lamps. */
export function createShipObject(dataset: Dataset): ShipObject {
  const { ship, breakup } = dataset;
  const model = buildLod0Model(ship, breakup.bow_section.x_end_m, breakup.stern_section.x_start_m);

  const paint = new MeshStandardNodeMaterial({
    vertexColors: true,
    roughness: 0.72,
    metalness: 0.08,
  });
  const lightingOutput = uniform(1);
  const lampMaterial = new MeshBasicNodeMaterial();
  const aboveWater = smoothstep(-LAMP_FADE_DEPTH_M, 0, positionWorld.y);
  lampMaterial.colorNode = color(LAMP_COLOUR)
    .mul(LAMP_BRIGHTNESS)
    .mul(lightingOutput)
    .mul(mix(SUBMERGED_LAMP_FACTOR, 1, aboveWater));
  const lampGeometry = new PlaneGeometry(1, 1);

  const root = new Group();
  const groups: Record<SectionId, Group> = {
    bow: new Group(),
    middle: new Group(),
    stern: new Group(),
  };
  const disposables: { dispose(): void }[] = [paint, lampMaterial, lampGeometry];

  const hulls = {} as Record<SectionId, Mesh>;
  const lampMeshes: Partial<Record<SectionId, InstancedMesh>> = {};
  for (const id of ['bow', 'middle', 'stern'] as const) {
    const group = groups[id];
    group.matrixAutoUpdate = false;
    const geometry = geometryFromMeshData(model.sections[id]);
    disposables.push(geometry);
    hulls[id] = new Mesh(geometry, paint);
    group.add(hulls[id]);
    const lamps = model.lamps.filter((lamp) => lamp.section === id);
    if (lamps.length > 0) {
      const lampMesh = createLamps(lamps, lampMaterial, lampGeometry);
      disposables.push(lampMesh);
      lampMeshes[id] = lampMesh;
      group.add(lampMesh);
    }
    root.add(group);
  }
  const sternWreckGeometry = geometryFromMeshData(model.sternWreck);
  disposables.push(sternWreckGeometry);
  const sternWreck = new Mesh(sternWreckGeometry, paint);
  sternWreck.visible = false;
  groups.stern.add(sternWreck);

  const funnels = model.funnels.map((funnel) => {
    const geometry = geometryFromMeshData(funnel.mesh);
    disposables.push(geometry);
    const mesh = new Mesh(geometry, paint);
    groups[funnel.section].add(mesh);
    return mesh;
  });
  const masts = new Map<string, Mesh>();
  for (const mast of model.masts) {
    const geometry = geometryFromMeshData(mast.mesh);
    disposables.push(geometry);
    const mesh = new Mesh(geometry, paint);
    mesh.matrixAutoUpdate = false;
    masts.set(mast.id, mesh);
    groups[mast.section].add(mesh);
  }
  const foremast = masts.get('foremast');
  const mainmast = masts.get('mainmast');
  const standing = new Matrix4();
  const fallen = fallenForemastMatrix(dataset);

  const halfBreadth = Math.max(...model.lamps.map((lamp) => Math.abs(lamp.position.y)));
  const glowLights = GLOW_STATIONS_M.flatMap((x) =>
    ([1, -1] as const).map((side) => {
      const light = new PointLight(LAMP_COLOUR, 0, GLOW_REACH_M, 2);
      light.position.set(-x, GLOW_HEIGHT_M, side * (halfBreadth + GLOW_OUTBOARD_M));
      const section =
        model.ranges.find((range) => x >= range.xStart && x < range.xEnd)?.id ?? 'stern';
      groups[section].add(light);
      disposables.push(light);
      return light;
    }),
  );
  const glowPosition = new Vector3();

  const update = (state: ShipState): void => {
    applyPose(groups.bow, state.bow);
    applyPose(groups.stern, state.stern);
    // The zone between the two sections of the wreck stays with the bow until the hull parts.
    applyPose(groups.middle, state.bow);
    groups.middle.visible = state.intact;
    funnels.forEach((funnel, index) => {
      funnel.visible = state.funnelsStanding[index] ?? false;
    });
    lightingOutput.value = state.lightingOutput;
    // On the seabed the foremast lies across the bridge and the after section has lost its
    // upper works, its mast and its lamps.
    foremast?.matrix.copy(state.wreck.bowAtRest ? fallen : standing);
    hulls.stern.visible = !state.wreck.sternAtRest;
    sternWreck.visible = state.wreck.sternAtRest;
    if (mainmast !== undefined) {
      mainmast.visible = !state.wreck.sternAtRest;
    }
    if (lampMeshes.stern !== undefined) {
      lampMeshes.stern.visible = !state.wreck.sternAtRest;
    }
    root.updateMatrixWorld(true);
    for (const light of glowLights) {
      const height = light.getWorldPosition(glowPosition).y;
      const aboveWater = Math.min(Math.max(height / LAMP_FADE_DEPTH_M + 1, 0), 1);
      light.intensity = GLOW_INTENSITY_CD * state.lightingOutput * aboveWater;
    }
  };

  const dispose = (): void => {
    for (const disposable of disposables) {
      disposable.dispose();
    }
  };

  return { root, update, dispose };
}
