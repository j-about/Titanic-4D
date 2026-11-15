import { CAMERA_MODES, type CameraMode } from '../render/camera/cameraPose.ts';
import { DEFAULT_QUALITY, isQualityLevel, type QualityLevel } from '../render/quality.ts';
import type { RendererChoice } from '../render/sceneView.ts';
import { clockToSeconds, secondsToClock } from '../time/shipTime.ts';
import { isPlaybackRate, type PlaybackRate } from './appState.ts';

/**
 * State carried by the address of the page, so that a moment of the night can be shared as a
 * link: `?t=01:40` (ship's time, 24-hour clock), `camera=orbit`, `rate=60`, `renderer=webgl2` or
 * `renderer=webgpu-readback` to choose how the scene is rendered, and `quality=low`, `medium` or
 * `high` to choose its level of detail.
 */
export interface UrlState {
  readonly t?: number;
  readonly cameraMode?: CameraMode;
  readonly rate?: PlaybackRate;
  readonly renderer: RendererChoice;
  readonly quality: QualityLevel;
}

/** The part of the state that selects how the scene is rendered. */
export type RenderingSelection = Pick<UrlState, 'renderer' | 'quality'>;

const RENDERER_CHOICES: readonly RendererChoice[] = ['auto', 'webgl2', 'webgpu-readback'];

export function parseUrlState(search: string, endSeconds: number): UrlState {
  const parameters = new URLSearchParams(search);
  const seconds = clockToSeconds(parameters.get('t') ?? '');
  const camera = parameters.get('camera');
  const rate = Number(parameters.get('rate'));
  const quality = parameters.get('quality');
  return {
    ...(seconds !== undefined && seconds <= endSeconds ? { t: seconds } : {}),
    ...(CAMERA_MODES.includes(camera as CameraMode) ? { cameraMode: camera as CameraMode } : {}),
    ...(isPlaybackRate(rate) ? { rate } : {}),
    renderer: RENDERER_CHOICES.find((choice) => choice === parameters.get('renderer')) ?? 'auto',
    quality: isQualityLevel(quality) ? quality : DEFAULT_QUALITY,
  };
}

/** Returns the query string for the given state; default rendering selections are left out. */
export function formatUrlState(
  state: { t: number; cameraMode: CameraMode; rate: PlaybackRate },
  rendering: RenderingSelection,
): string {
  const parameters = new URLSearchParams();
  parameters.set('t', secondsToClock(state.t));
  parameters.set('camera', state.cameraMode);
  parameters.set('rate', String(state.rate));
  if (rendering.renderer !== 'auto') {
    parameters.set('renderer', rendering.renderer);
  }
  if (rendering.quality !== DEFAULT_QUALITY) {
    parameters.set('quality', rendering.quality);
  }
  return `?${parameters.toString().replaceAll('%3A', ':')}`;
}
