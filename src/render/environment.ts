import {
  Color,
  DirectionalLight,
  FogExp2,
  Group,
  HemisphereLight,
  Mesh,
  MeshStandardNodeMaterial,
  PlaneGeometry,
  PointLight,
  type Scene,
} from 'three/webgpu';
import type { SceneVector } from '../sim/sceneFrame.ts';
import { HORIZON_COLOUR } from './skyObject.ts';

export interface Environment {
  readonly root: Group;
  /** Adapts fog, background and lighting to the position of the camera. */
  update(cameraPosition: SceneVector): void;
  dispose(): void;
}

const DEEP_WATER_COLOUR = 0x00070d;
const SEABED_COLOUR = 0x5a5244;
/** Fog density above and below the surface, per metre. */
const AIR_FOG_DENSITY = 0.00007;
const WATER_FOG_DENSITY = 0.0042;
const SEABED_SIZE_M = 8000;
/** Depth below which the lamp carried by the camera reaches full strength. */
const CAMERA_LAMP_FULL_DEPTH_M = 150;
const CAMERA_LAMP_INTENSITY = 26_000;
/**
 * Intensity of the light of the night sky, set above that of starlight alone.
 */
const SKY_LIGHT_INTENSITY = 1.5;
const STARLIGHT_INTENSITY = 0.5;

/**
 * Creates the haze, the light of the night sky and the seabed. No daylight reaches the depth of
 * the wreck; below the surface the scene is lit by a lamp carried by the camera, as a
 * submersible would.
 */
export function createEnvironment(scene: Scene, seabedHeightM: number): Environment {
  const root = new Group();
  const hazeColour = new Color(HORIZON_COLOUR);
  const waterColour = new Color(DEEP_WATER_COLOUR);
  const background = new Color(HORIZON_COLOUR);
  const fog = new FogExp2(HORIZON_COLOUR, AIR_FOG_DENSITY);
  scene.background = background;
  scene.fog = fog;

  const seabedGeometry = new PlaneGeometry(SEABED_SIZE_M, SEABED_SIZE_M);
  const seabedMaterial = new MeshStandardNodeMaterial({
    color: SEABED_COLOUR,
    roughness: 1,
    metalness: 0,
  });
  const seabed = new Mesh(seabedGeometry, seabedMaterial);
  seabed.rotation.x = -Math.PI / 2;
  seabed.position.y = seabedHeightM;
  seabed.name = 'seabed';
  root.add(seabed);

  const skyLight = new HemisphereLight(0x4a6294, 0x080b10, SKY_LIGHT_INTENSITY);
  const starlight = new DirectionalLight(0xa9bfe6, STARLIGHT_INTENSITY);
  starlight.position.set(-0.4, 1, 0.3);
  const cameraLamp = new PointLight(0xdfe9f2, 0, 0, 1.6);
  root.add(skyLight, starlight, cameraLamp);

  const update = (cameraPosition: SceneVector): void => {
    const underwater = cameraPosition[1] < 0;
    background.copy(underwater ? waterColour : hazeColour);
    fog.color.copy(background);
    fog.density = underwater ? WATER_FOG_DENSITY : AIR_FOG_DENSITY;
    const depth = Math.max(-cameraPosition[1], 0);
    const daylightLoss = Math.min(depth / CAMERA_LAMP_FULL_DEPTH_M, 1);
    skyLight.intensity = SKY_LIGHT_INTENSITY * (1 - daylightLoss);
    starlight.intensity = STARLIGHT_INTENSITY * (1 - daylightLoss);
    cameraLamp.intensity = CAMERA_LAMP_INTENSITY * daylightLoss;
    cameraLamp.position.set(cameraPosition[0], cameraPosition[1], cameraPosition[2]);
  };

  const dispose = (): void => {
    seabedGeometry.dispose();
    seabedMaterial.dispose();
    skyLight.dispose();
    starlight.dispose();
    cameraLamp.dispose();
  };

  return { root, update, dispose };
}
