import {
  attribute,
  color,
  dot,
  float,
  instancedBufferAttribute,
  instancedDynamicBufferAttribute,
  mix,
  positionLocal,
  smoothstep,
  uniform,
  uv,
  vec2,
} from 'three/tsl';
import {
  AdditiveBlending,
  BackSide,
  Group,
  InstancedBufferAttribute,
  Matrix4,
  Mesh,
  MeshBasicNodeMaterial,
  type Node,
  SphereGeometry,
  Sprite,
  SpriteNodeMaterial,
  Vector3,
} from 'three/webgpu';
import type { SceneVector } from '../sim/sceneFrame.ts';
import type { SkyState } from '../sky/skyModel.ts';
import { starAppearance } from '../sky/starAppearance.ts';
import type { StarField } from '../sky/starCatalogue.ts';

export interface SkyFrame {
  readonly sky: SkyState;
  readonly cameraPosition: SceneVector;
  /** Height of the viewport in CSS pixels and vertical field of view, to size the stars. */
  readonly viewportHeightPx: number;
  readonly fieldOfViewDeg: number;
}

export interface SkyObject {
  readonly root: Group;
  update(frame: SkyFrame): void;
  dispose(): void;
}

/** Colour of the haze along the horizon; the fog of the scene uses the same colour. */
export const HORIZON_COLOUR = 0x0b1622;
const ZENITH_COLOUR = 0x02040a;
/** Radius at which the dome and the stars are drawn around the camera, in metres. */
const SKY_RADIUS_M = 20_000;
/** Sine of the altitude over which stars fade into the haze near the horizon. */
const HORIZON_FADE = 0.11;
/** Planets fainter than this magnitude are not drawn. */
const FAINTEST_PLANET_MAGNITUDE = 6.5;

/** Material shared by stars and planets: a soft additive disc of constant size on screen. */
function createPointMaterial(pixelScale: Node<'float'>): SpriteNodeMaterial {
  const material = new SpriteNodeMaterial({
    blending: AdditiveBlending,
    depthTest: false,
    depthWrite: false,
    transparent: true,
    sizeAttenuation: false,
  });
  material.fog = false;
  const radiusPx = attribute('starRadius', 'float');
  const diameter = radiusPx.mul(2).mul(pixelScale);
  material.scaleNode = vec2(diameter, diameter);
  const distance = uv().sub(0.5).length().mul(2);
  const disc = smoothstep(1, 0, distance);
  material.colorNode = attribute('starColour', 'vec3')
    .mul(attribute('starIntensity', 'float'))
    .mul(disc.mul(disc));
  return material;
}

/** Creates the night sky: a hazy dome, the given catalogue stars and the planets. */
export function createSkyObject(stars: StarField): SkyObject {
  const root = new Group();
  const domeGeometry = new SphereGeometry(SKY_RADIUS_M, 48, 24);
  const domeMaterial = new MeshBasicNodeMaterial({
    side: BackSide,
    depthTest: false,
    depthWrite: false,
  });
  domeMaterial.fog = false;
  const height = positionLocal.normalize().y;
  const aboveHorizon = mix(color(HORIZON_COLOUR), color(ZENITH_COLOUR), smoothstep(0, 0.5, height));
  domeMaterial.colorNode = mix(
    color(HORIZON_COLOUR),
    aboveHorizon,
    smoothstep(-0.01, 0.02, height),
  );
  const dome = new Mesh(domeGeometry, domeMaterial);
  dome.renderOrder = -3;
  dome.frustumCulled = false;
  root.add(dome);

  const pixelScale = uniform(0.003);
  const upInEquatorial = uniform(new Vector3(0, 0, 1));

  // Stars: fixed directions in the equatorial frame, turned as one body by the group matrix.
  const starPositions = new Float32Array(stars.count * 3);
  const starRadii = new Float32Array(stars.count);
  const starIntensities = new Float32Array(stars.count);
  const starColours = new Float32Array(stars.count * 3);
  for (let index = 0; index < stars.count; index += 1) {
    const appearance = starAppearance(
      stars.magnitudes[index] ?? 0,
      stars.colourIndices[index] ?? 0,
    );
    for (let axis = 0; axis < 3; axis += 1) {
      starPositions[index * 3 + axis] = (stars.directions[index * 3 + axis] ?? 0) * SKY_RADIUS_M;
      starColours[index * 3 + axis] = appearance.colour[axis] ?? 1;
    }
    starRadii[index] = appearance.radiusPx;
    starIntensities[index] = appearance.intensity;
  }
  const starMaterial = createPointMaterial(pixelScale);
  const starPosition = instancedBufferAttribute<'vec3'>(
    new InstancedBufferAttribute(starPositions, 3),
    'vec3',
  );
  starMaterial.positionNode = starPosition;
  // Stars fade into the haze as they near the horizon; below it the sea hides them.
  const sineOfAltitude = dot(starPosition.normalize(), upInEquatorial);
  starMaterial.colorNode =
    starMaterial.colorNode?.mul(smoothstep(float(0), float(HORIZON_FADE), sineOfAltitude)) ?? null;
  const starSprite = new Sprite(starMaterial);
  starSprite.count = stars.count;
  starSprite.geometry = starSprite.geometry.clone();
  starSprite.geometry.setAttribute('starRadius', new InstancedBufferAttribute(starRadii, 1));
  starSprite.geometry.setAttribute(
    'starIntensity',
    new InstancedBufferAttribute(starIntensities, 1),
  );
  starSprite.geometry.setAttribute('starColour', new InstancedBufferAttribute(starColours, 3));
  starSprite.frustumCulled = false;
  starSprite.renderOrder = -2;
  const starGroup = new Group();
  starGroup.matrixAutoUpdate = false;
  starGroup.add(starSprite);
  root.add(starGroup);

  // Planets: directions recomputed for each instant, already in the scene frame.
  const planetCount = 5;
  const planetPositions = new InstancedBufferAttribute(new Float32Array(planetCount * 3), 3);
  const planetRadii = new InstancedBufferAttribute(new Float32Array(planetCount), 1);
  const planetIntensities = new InstancedBufferAttribute(new Float32Array(planetCount), 1);
  const planetColours = new InstancedBufferAttribute(new Float32Array(planetCount * 3).fill(1), 3);
  const planetMaterial = createPointMaterial(pixelScale);
  planetMaterial.positionNode = instancedDynamicBufferAttribute<'vec3'>(planetPositions, 'vec3');
  const planetSprite = new Sprite(planetMaterial);
  planetSprite.count = planetCount;
  planetSprite.geometry = planetSprite.geometry.clone();
  planetSprite.geometry.setAttribute('starRadius', planetRadii);
  planetSprite.geometry.setAttribute('starIntensity', planetIntensities);
  planetSprite.geometry.setAttribute('starColour', planetColours);
  planetSprite.frustumCulled = false;
  planetSprite.renderOrder = -1;
  root.add(planetSprite);

  const rotation = new Matrix4();

  const update = (frame: SkyFrame): void => {
    const [x, y, z] = frame.cameraPosition;
    root.position.set(x, y, z);
    root.visible = y >= 0;
    const m = frame.sky.equatorialToScene;
    rotation.set(
      m[0] ?? 1,
      m[1] ?? 0,
      m[2] ?? 0,
      0,
      m[3] ?? 0,
      m[4] ?? 1,
      m[5] ?? 0,
      0,
      m[6] ?? 0,
      m[7] ?? 0,
      m[8] ?? 1,
      0,
      0,
      0,
      0,
      1,
    );
    starGroup.matrix.copy(rotation);
    starGroup.matrixWorldNeedsUpdate = true;
    upInEquatorial.value.set(m[3] ?? 0, m[4] ?? 0, m[5] ?? 1);
    pixelScale.value =
      (2 * Math.tan((frame.fieldOfViewDeg * Math.PI) / 360)) / Math.max(frame.viewportHeightPx, 1);

    frame.sky.planets.forEach((planet, index) => {
      const visible = planet.magnitude <= FAINTEST_PLANET_MAGNITUDE && planet.direction[1] > 0;
      const appearance = starAppearance(planet.magnitude, 0.6);
      const fade = Math.min(Math.max(planet.direction[1] / HORIZON_FADE, 0), 1);
      planetPositions.setXYZ(
        index,
        planet.direction[0] * SKY_RADIUS_M,
        planet.direction[1] * SKY_RADIUS_M,
        planet.direction[2] * SKY_RADIUS_M,
      );
      planetRadii.setX(index, appearance.radiusPx);
      planetIntensities.setX(index, visible ? appearance.intensity * fade : 0);
    });
    planetPositions.needsUpdate = true;
    planetRadii.needsUpdate = true;
    planetIntensities.needsUpdate = true;
  };

  const dispose = (): void => {
    domeGeometry.dispose();
    domeMaterial.dispose();
    starMaterial.dispose();
    starSprite.geometry.dispose();
    planetMaterial.dispose();
    planetSprite.geometry.dispose();
  };

  return { root, update, dispose };
}
