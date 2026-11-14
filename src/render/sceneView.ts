import { pass } from 'three/tsl';
import {
  AgXToneMapping,
  PerspectiveCamera,
  RenderPipeline,
  Scene,
  WebGPURenderer,
} from 'three/webgpu';
import type { Dataset } from '../data/schema/dataset.ts';
import { factValue } from '../ship/particulars.ts';
import { createBoatPlacer } from '../sim/boatPlacement.ts';
import type { ShipState, TimelineModel } from '../sim/timelineModel.ts';
import { createBoatsObject } from './boatsObject.ts';
import { createCameraInput } from './camera/cameraInput.ts';
import type { CameraMode } from './camera/cameraPose.ts';
import { createCameraRig } from './camera/cameraRig.ts';
import { createEnvironment } from './environment.ts';
import { createCanvasPresenter, createReadbackPresenter } from './presenter.ts';
import { createRocketsObject } from './rocketsObject.ts';
import { createShipObject } from './shipObject.ts';

export type RenderBackend = 'webgpu' | 'webgl2';

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
  /** Called when the graphics device is lost and the view can no longer draw. */
  onDeviceLost(reason: string): void;
}

export interface SceneFrame {
  readonly state: ShipState;
  readonly cameraMode: CameraMode;
  /** Wall-clock time since the previous frame, in seconds. */
  readonly deltaSeconds: number;
  readonly reducedMotion: boolean;
}

export interface SceneView {
  readonly backend: RenderBackend;
  /** Sets the size of the drawing buffer, in CSS pixels and device pixel ratio. */
  resize(width: number, height: number, pixelRatio: number): void;
  /** True while user input on the canvas calls for a new frame. */
  hasPendingInput(): boolean;
  /** Renders a frame; resolves once it is visible. */
  render(frame: SceneFrame): Promise<void>;
  resetCamera(): void;
  dispose(): void;
}

const FIELD_OF_VIEW_DEG = 42;
const NEAR_PLANE_M = 0.6;
const FAR_PLANE_M = 45_000;

/** Creates the renderer and the scene. Rejects when neither WebGPU nor WebGL 2 is available. */
export async function createSceneView(options: SceneViewOptions): Promise<SceneView> {
  const { canvas, dataset, model } = options;
  const readback = options.renderer === 'webgpu-readback';
  // In read-back mode the renderer owns a canvas that is never shown, and the visible canvas is
  // painted through its 2D context.
  const renderer = new WebGPURenderer({
    ...(readback ? {} : { canvas }),
    antialias: true,
    forceWebGL: options.renderer === 'webgl2',
    logarithmicDepthBuffer: true,
    powerPreference: 'high-performance',
  });
  await renderer.init();
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
  const environment = createEnvironment(scene, seabedHeightM);
  const ship = createShipObject(dataset);
  const boats = createBoatsObject(dataset, createBoatPlacer(dataset, model));
  const rockets = createRocketsObject(dataset);
  scene.add(environment.root, ship.root, boats.root, rockets.root);

  const pipeline = new RenderPipeline(renderer);
  pipeline.outputNode = pass(scene, camera);
  const presenter = readback
    ? createReadbackPresenter(renderer, pipeline, canvas, backend === 'webgl2')
    : createCanvasPresenter(pipeline);

  const input = createCameraInput(canvas);
  const rig = createCameraRig(
    {
      breakSeconds: model.breakSeconds,
      founderingSeconds: model.founderingSeconds,
      endSeconds: model.endSeconds,
    },
    seabedHeightM,
  );

  const resize = (width: number, height: number, pixelRatio: number): void => {
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    presenter.resize(Math.round(width * pixelRatio), Math.round(height * pixelRatio));
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
  };

  const render = (frame: SceneFrame): Promise<void> => {
    ship.update(frame.state);
    boats.update(frame.state);
    rockets.update(frame.state);
    const pose = rig.update({
      state: frame.state,
      mode: frame.cameraMode,
      request: input.consume(frame.deltaSeconds),
      reducedMotion: frame.reducedMotion,
    });
    camera.position.set(pose.position[0], pose.position[1], pose.position[2]);
    camera.lookAt(pose.target[0], pose.target[1], pose.target[2]);
    environment.update(pose.position);
    return presenter.present();
  };

  const dispose = (): void => {
    input.dispose();
    ship.dispose();
    boats.dispose();
    rockets.dispose();
    environment.dispose();
    presenter.dispose();
    pipeline.dispose();
    renderer.dispose();
  };

  return {
    backend,
    resize,
    hasPendingInput: () => input.isActive(),
    render,
    resetCamera: () => rig.reset(),
    dispose,
  };
}
