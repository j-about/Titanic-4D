import {
  Color,
  DirectionalLight,
  DoubleSide,
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

export interface Environment {
  readonly root: Group;
  /** Adapts fog, background and lighting to the position of the camera. */
  update(cameraPosition: SceneVector): void;
  dispose(): void;
}

const NIGHT_SKY_COLOUR = 0x02050c;
const DEEP_WATER_COLOUR = 0x00070d;
const SEA_COLOUR = 0x0a1c2b;
const SEABED_COLOUR = 0x5a5244;
/** Fog density above and below the surface, per metre. */
const AIR_FOG_DENSITY = 0.00009;
const WATER_FOG_DENSITY = 0.0042;
const SEA_SIZE_M = 60_000;
const SEABED_SIZE_M = 8000;
/** Depth below which the lamp carried by the camera reaches full strength. */
const CAMERA_LAMP_FULL_DEPTH_M = 150;
const CAMERA_LAMP_INTENSITY = 26_000;
/**
 * Intensity of the light of the night sky. The night was moonless; the scene is lit more than
 * starlight alone would, so that the ship remains legible.
 */
const SKY_LIGHT_INTENSITY = 2.6;
const STARLIGHT_INTENSITY = 1.1;

/**
 * Creates the surroundings of the ship: sea surface, seabed, sky colour, haze and light. No
 * daylight reaches the depth of the wreck; below the surface the scene is lit by a lamp carried
 * by the camera, as a submersible would.
 */
export function createEnvironment(scene: Scene, seabedHeightM: number): Environment {
  const root = new Group();
  const skyColour = new Color(NIGHT_SKY_COLOUR);
  const waterColour = new Color(DEEP_WATER_COLOUR);
  const background = new Color(NIGHT_SKY_COLOUR);
  const fog = new FogExp2(NIGHT_SKY_COLOUR, AIR_FOG_DENSITY);
  scene.background = background;
  scene.fog = fog;

  const seaGeometry = new PlaneGeometry(SEA_SIZE_M, SEA_SIZE_M);
  const seaMaterial = new MeshStandardNodeMaterial({
    color: SEA_COLOUR,
    roughness: 0.22,
    metalness: 0,
    side: DoubleSide,
  });
  const sea = new Mesh(seaGeometry, seaMaterial);
  sea.rotation.x = -Math.PI / 2;
  sea.name = 'sea';
  root.add(sea);

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
    background.copy(underwater ? waterColour : skyColour);
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
    seaGeometry.dispose();
    seaMaterial.dispose();
    seabedGeometry.dispose();
    seabedMaterial.dispose();
    skyLight.dispose();
    starlight.dispose();
    cameraLamp.dispose();
  };

  return { root, update, dispose };
}
