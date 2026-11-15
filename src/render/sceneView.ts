import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { pass } from 'three/tsl';
import {
  AgXToneMapping,
  PerspectiveCamera,
  RenderPipeline,
  Scene,
  WebGPURenderer,
} from 'three/webgpu';
import type { Dataset } from '../data/schema/dataset.ts';
import { createHullForm } from '../ship/hullForm.ts';
import { factValue } from '../ship/particulars.ts';
import { createBoatPlacer } from '../sim/boatPlacement.ts';
import type { ShipState, TimelineModel } from '../sim/timelineModel.ts';
import { waterlineFootprint } from '../sim/waterline.ts';
import { createSkyModel, type SkyState } from '../sky/skyModel.ts';
import type { StarField } from '../sky/starCatalogue.ts';
import { createBoatsObject } from './boatsObject.ts';
import { createCalifornianLightObject } from './californianLightObject.ts';
import { createCameraInput } from './camera/cameraInput.ts';
import type { CameraMode } from './camera/cameraPose.ts';
import { createCameraRig } from './camera/cameraRig.ts';
import type { CameraStep } from './camera/cameraStep.ts';
import { loadDetailedShip } from './detailedShip.ts';
import { buildOrRelease, createDisposalStack, type DisposalStack } from './disposalStack.ts';
import { createEnvironment } from './environment.ts';
import { createIcebergObject } from './icebergObject.ts';
import { createOceanObject } from './oceanObject.ts';
import { createCanvasPresenter, createReadbackPresenter } from './presenter.ts';
import { QUALITY_SETTINGS, type QualityLevel } from './quality.ts';
import { createRocketsObject } from './rocketsObject.ts';
import { createShipObject } from './shipObject.ts';
import { createSkyObject } from './skyObject.ts';
import { loadStarCatalogue } from './starCatalogueLoader.ts';

export type RenderBackend = 'webgpu' | 'webgl2';

export type ShipModelKind = 'generated' | 'detailed';

/**
 * How the scene is rendered: `auto` uses WebGPU where available and WebGL 2 otherwise, `webgl2`
 * forces the WebGL 2 backend, and `webgpu-readback` renders with WebGPU off screen and copies
 * each frame to the canvas (see `presenter.ts`).
 */
export type RendererChoice = 'auto' | 'webgl2' | 'webgpu-readback';

export interface SceneViewOptions {
  readonly canvas: HTMLCanvasElement;
  readonly dataset: Dataset;
  readonly model: TimelineModel;
  readonly renderer: RendererChoice;
  readonly quality: QualityLevel;
  /** Called when the graphics device is lost and the view can no longer draw. */
  onDeviceLost(reason: string): void;
}

export interface SceneFrame {
  readonly state: ShipState;
  readonly cameraMode: CameraMode;
  /** Wall-clock time since the previous frame, in seconds. */
  readonly deltaSeconds: number;
  /** How many times faster than real time the simulation is running; 1 when it is paused. */
  readonly timeScale: number;
  readonly reducedMotion: boolean;
}

export interface SceneView {
  readonly backend: RenderBackend;
  /** Sets the size of the drawing buffer, in CSS pixels and device pixel ratio. */
  resize(width: number, height: number, pixelRatio: number): void;
  /**
   * True while user input on the canvas, a step of the camera or a part of the scene just loaded
   * calls for a new frame.
   */
  hasPendingInput(): boolean;
  /**
   * True once nothing more is being loaded: the detailed model of the ship is in place, could
   * not be loaded, or is not used at this level of quality.
   */
  assetsSettled(): boolean;
  /** Which model of the ship is drawn: the one generated from the dataset or the detailed one. */
  shipModel(): ShipModelKind;
  /** Renders a frame; resolves once it is visible. */
  render(frame: SceneFrame): Promise<void>;
  /**
   * Moves the camera by one step, as the next frame drawn shows; until then `hasPendingInput`
   * is true.
   */
  stepCamera(step: CameraStep): void;
  resetCamera(): void;
  dispose(): void;
}

const FIELD_OF_VIEW_DEG = 42;
const NEAR_PLANE_M = 1;
const FAR_PLANE_M = 45_000;
/** Address of the detailed model of the ship, built by the asset pipeline. */
const DETAILED_SHIP_URL = '/models/ship-lod1.glb';
/**
 * Glow around the brightest lights. Only what is brighter than scene white contributes, which
 * leaves lit paint untouched and takes the lamps, the stars and the distress signals.
 */
const BLOOM_STRENGTH = 0.45;
const BLOOM_RADIUS = 0.35;
const BLOOM_THRESHOLD = 1.1;

/**
 * Creates the renderer and the scene. Rejects with a `SceneResourceError` when the star catalogue
 * cannot be loaded, before any renderer is created, and with another error when neither WebGPU
 * nor WebGL 2 is available or the scene cannot be built; what had been created by then is
 * disposed of.
 */
export async function createSceneView(options: SceneViewOptions): Promise<SceneView> {
  const stars = await loadStarCatalogue();
  const readback = options.renderer === 'webgpu-readback';
  // In read-back mode the renderer owns a canvas that is never shown, and the visible canvas is
  // painted through its 2D context.
  const renderer = new WebGPURenderer({
    ...(readback ? {} : { canvas: options.canvas }),
    antialias: true,
    forceWebGL: options.renderer === 'webgl2',
    powerPreference: 'high-performance',
  });
  // A renderer whose initialisation fails holds nothing to dispose of.
  await renderer.init();
  const resources = createDisposalStack();
  resources.defer(() => {
    Promise.resolve(renderer.dispose()).catch((error: unknown) => {
      console.warn('The renderer of the 3D scene could not be disposed of.', error);
    });
  });
  return buildOrRelease(
    resources,
    () => buildSceneView(options, renderer, stars, resources),
    (error) => console.warn('A part of the 3D scene could not be disposed of.', error),
  );
}

/**
 * Builds the scene on an initialised renderer. Everything created is registered in `resources`,
 * whose disposal is also the disposal of the view.
 */
function buildSceneView(
  options: SceneViewOptions,
  renderer: WebGPURenderer,
  stars: StarField,
  resources: DisposalStack,
): SceneView {
  const { canvas, dataset, model } = options;
  const readback = options.renderer === 'webgpu-readback';
  renderer.toneMapping = AgXToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.onDeviceLost = (info: {
    readonly reason?: string | null;
    readonly message?: string;
  }) => {
    options.onDeviceLost(info.message ?? info.reason ?? 'unknown');
  };
  const backend: RenderBackend =
    (renderer.backend as { readonly isWebGPUBackend?: boolean }).isWebGPUBackend === true
      ? 'webgpu'
      : 'webgl2';

  const seabedHeightM = -factValue(dataset.site.environment, 'depth');
  const scene = new Scene();
  const camera = new PerspectiveCamera(FIELD_OF_VIEW_DEG, 1, NEAR_PLANE_M, FAR_PLANE_M);
  const environment = resources.own(createEnvironment(scene, seabedHeightM));
  const sky = resources.own(createSkyObject(stars));
  const californianLight = resources.own(createCalifornianLightObject(dataset.site));
  const ocean = resources.own(createOceanObject(QUALITY_SETTINGS[options.quality]));
  const ship = resources.own(createShipObject(dataset));
  const boats = resources.own(createBoatsObject(dataset, createBoatPlacer(dataset, model)));
  const rockets = resources.own(createRocketsObject(dataset, model.rocketFirings));
  const iceberg = resources.own(createIcebergObject());
  scene.add(
    environment.root,
    sky.root,
    californianLight.root,
    ocean.root,
    ship.root,
    boats.root,
    rockets.root,
    iceberg.root,
  );

  const site = dataset.site.positions.find((position) => position.id === 'wreck-boiler-field');
  if (site === undefined) {
    throw new RangeError('The dataset has no foundering position.');
  }
  const skyModel = createSkyModel({
    latitudeDeg: site.latitude_deg,
    longitudeDeg: site.longitude_deg,
    headingTrueDeg: dataset.site.heading.true_deg,
    shipMinusGmtMinutes: dataset.timeReference.adopted_offset.ship_minus_gmt_min,
  });
  let skyState: SkyState = skyModel.evaluate(model.startSeconds);
  let skyTime = model.startSeconds;
  const hullForm = createHullForm(dataset.ship);
  const { bow_section: bowSection, stern_section: sternSection } = dataset.breakup;
  let viewportHeightPx = 1;

  const pipeline = resources.own(new RenderPipeline(renderer));
  const scenePass = pass(scene, camera);
  const glow = QUALITY_SETTINGS[options.quality].bloom
    ? resources.own(
        bloom(scenePass.getTextureNode('output'), BLOOM_STRENGTH, BLOOM_RADIUS, BLOOM_THRESHOLD),
      )
    : undefined;
  pipeline.outputNode =
    glow === undefined ? scenePass : scenePass.getTextureNode('output').add(glow);
  const presenter = resources.own(
    readback
      ? createReadbackPresenter(renderer, pipeline, canvas, backend === 'webgl2')
      : createCanvasPresenter(pipeline),
  );

  const input = resources.own(createCameraInput(canvas));
  const rig = createCameraRig(
    {
      breakSeconds: model.breakSeconds,
      founderingSeconds: model.founderingSeconds,
      endSeconds: model.endSeconds,
    },
    seabedHeightM,
  );

  let disposed = false;
  let redrawRequested = false;
  let assetsSettled = !QUALITY_SETTINGS[options.quality].detailedShip;
  let shipModel: ShipModelKind = 'generated';
  if (!assetsSettled) {
    loadDetailedShip(DETAILED_SHIP_URL)
      .then((detailed) => {
        if (disposed) {
          detailed.dispose();
        } else {
          ship.useDetailedModel(detailed);
          shipModel = 'detailed';
        }
      })
      .catch((error: unknown) => {
        // The generated model stays in place.
        console.warn('The detailed model of the ship could not be loaded.', error);
      })
      .finally(() => {
        assetsSettled = true;
        redrawRequested = true;
      });
  }

  const resize = (width: number, height: number, pixelRatio: number): void => {
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    presenter.resize(Math.round(width * pixelRatio), Math.round(height * pixelRatio));
    viewportHeightPx = height;
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
  };

  const render = (frame: SceneFrame): Promise<void> => {
    redrawRequested = false;
    ship.update(frame.state);
    boats.update(frame.state);
    rockets.update(frame.state, frame.timeScale);
    iceberg.update(frame.state);
    const pose = rig.update({
      state: frame.state,
      mode: frame.cameraMode,
      request: input.consume(frame.deltaSeconds),
      reducedMotion: frame.reducedMotion,
    });
    camera.position.set(pose.position[0], pose.position[1], pose.position[2]);
    camera.lookAt(pose.target[0], pose.target[1], pose.target[2]);
    environment.update(pose.position);
    if (frame.state.t !== skyTime) {
      skyTime = frame.state.t;
      skyState = skyModel.evaluate(skyTime);
    }
    sky.update({
      sky: skyState,
      cameraPosition: pose.position,
      viewportHeightPx,
      fieldOfViewDeg: FIELD_OF_VIEW_DEG,
    });
    californianLight.update({
      state: frame.state,
      cameraPosition: pose.position,
      viewportHeightPx,
      fieldOfViewDeg: FIELD_OF_VIEW_DEG,
    });
    const footprints = [
      waterlineFootprint(
        hullForm,
        frame.state.bow,
        bowSection.x_start_m,
        frame.state.intact ? sternSection.x_start_m : bowSection.x_end_m,
      ),
      waterlineFootprint(hullForm, frame.state.stern, sternSection.x_start_m, sternSection.x_end_m),
    ].filter((footprint) => footprint !== undefined);
    ocean.update({
      // With reduced motion the waves are frozen; the sea is then the same at every instant.
      timeSeconds: frame.reducedMotion ? 0 : frame.state.t,
      cameraPosition: pose.position,
      footprints,
    });
    return presenter.present();
  };

  const dispose = (): void => {
    disposed = true;
    resources.dispose();
  };

  return {
    backend,
    resize,
    hasPendingInput: () => redrawRequested || input.isActive() || rig.hasPendingStep(),
    assetsSettled: () => assetsSettled,
    shipModel: () => shipModel,
    render,
    stepCamera: (step) => rig.step(step),
    resetCamera: () => rig.reset(),
    dispose,
  };
}
