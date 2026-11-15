import type { CameraMode } from '../render/camera/cameraPose.ts';
import type { QualityLevel } from '../render/quality.ts';

/** Playback speeds offered, as multiples of real time. */
export const PLAYBACK_RATES = [1, 10, 60, 300, 600] as const;
export type PlaybackRate = (typeof PLAYBACK_RATES)[number];

export type SceneStatus = 'loading' | 'ready' | 'failed';
/**
 * What kept the scene from starting: `renderer` when no renderer could start or keep its
 * graphics device, `resources` when a file that the scene needs could not be loaded.
 */
export type SceneFailure = 'renderer' | 'resources';
export type PanelTab = 'now' | 'sources' | 'narrative';

export interface AppState {
  /** Simulation time, in seconds since the collision. */
  readonly t: number;
  readonly playing: boolean;
  readonly rate: PlaybackRate;
  /** 1 when time runs forward, −1 when it runs backward. */
  readonly direction: 1 | -1;
  readonly cameraMode: CameraMode;
  readonly panelTab: PanelTab;
  readonly sceneStatus: SceneStatus;
  /** Why the scene has failed; `null` unless `sceneStatus` is `failed`. */
  readonly sceneFailure: SceneFailure | null;
  /** Rendering backend in use once the scene is ready. */
  readonly backend: 'webgpu' | 'webgl2' | null;
  /** Level of detail of the 3D scene. */
  readonly quality: QualityLevel;
  /** True when the user asks for reduced motion. */
  readonly reducedMotion: boolean;
}

export const DEFAULT_RATE: PlaybackRate = 60;

export function isPlaybackRate(value: number): value is PlaybackRate {
  return (PLAYBACK_RATES as readonly number[]).includes(value);
}
