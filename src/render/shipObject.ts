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

  for (const id of ['bow', 'middle', 'stern'] as const) {
    const group = groups[id];
    group.matrixAutoUpdate = false;
    const geometry = geometryFromMeshData(model.sections[id]);
    disposables.push(geometry);
    group.add(new Mesh(geometry, paint));
    const lamps = model.lamps.filter((lamp) => lamp.section === id);
    if (lamps.length > 0) {
      const lampMesh = createLamps(lamps, lampMaterial, lampGeometry);
      disposables.push(lampMesh);
      group.add(lampMesh);
    }
    root.add(group);
  }

  const funnels = model.funnels.map((funnel) => {
    const geometry = geometryFromMeshData(funnel.mesh);
    disposables.push(geometry);
    const mesh = new Mesh(geometry, paint);
    groups[funnel.section].add(mesh);
    return mesh;
  });
  for (const mast of model.masts) {
    const geometry = geometryFromMeshData(mast.mesh);
    disposables.push(geometry);
    groups[mast.section].add(new Mesh(geometry, paint));
  }

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
    root.updateMatrixWorld();
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
