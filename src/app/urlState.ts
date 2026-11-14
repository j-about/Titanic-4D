import { CAMERA_MODES, type CameraMode } from '../render/camera/cameraPose.ts';
import type { RendererChoice } from '../render/sceneView.ts';
import { isPlaybackRate, type PlaybackRate } from './appState.ts';

/**
 * State carried by the address of the page, so that a moment of the night can be shared as a
 * link: `?t=01:40` (ship's time, 24-hour clock), `camera=orbit`, `rate=60`, and `renderer=webgl2`
 * or `renderer=webgpu-readback` to choose how the scene is rendered.
 */
export interface UrlState {
  readonly t?: number;
  readonly cameraMode?: CameraMode;
  readonly rate?: PlaybackRate;
  readonly renderer: RendererChoice;
}

const RENDERER_CHOICES: readonly RendererChoice[] = ['auto', 'webgl2', 'webgpu-readback'];

const SECONDS_PER_DAY = 86_400;
const COLLISION_SECOND_OF_DAY = 23 * 3600 + 40 * 60;
const CLOCK_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

/** Converts a 24-hour ship's clock time to seconds since the collision. */
export function clockToSeconds(clock: string): number | undefined {
  const match = CLOCK_PATTERN.exec(clock);
  if (match === null) {
    return undefined;
  }
  const secondOfDay = Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3] ?? 0);
  // Times before 11:40 p.m. belong to the morning of 15 April.
  return (secondOfDay - COLLISION_SECOND_OF_DAY + SECONDS_PER_DAY) % SECONDS_PER_DAY;
}

/** Converts seconds since the collision to a 24-hour ship's clock time, `HH:MM:SS`. */
export function secondsToClock(t: number): string {
  const secondOfDay =
    (((Math.round(t) + COLLISION_SECOND_OF_DAY) % SECONDS_PER_DAY) + SECONDS_PER_DAY) %
    SECONDS_PER_DAY;
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${pad(Math.floor(secondOfDay / 3600))}:${pad(Math.floor((secondOfDay % 3600) / 60))}:${pad(secondOfDay % 60)}`;
}

export function parseUrlState(search: string, endSeconds: number): UrlState {
  const parameters = new URLSearchParams(search);
  const seconds = clockToSeconds(parameters.get('t') ?? '');
  const camera = parameters.get('camera');
  const rate = Number(parameters.get('rate'));
  return {
    ...(seconds !== undefined && seconds <= endSeconds ? { t: seconds } : {}),
    ...(CAMERA_MODES.includes(camera as CameraMode) ? { cameraMode: camera as CameraMode } : {}),
    ...(isPlaybackRate(rate) ? { rate } : {}),
    renderer: RENDERER_CHOICES.find((choice) => choice === parameters.get('renderer')) ?? 'auto',
  };
}

/** Returns the query string for the given state, preserving the renderer selection. */
export function formatUrlState(
  state: { t: number; cameraMode: CameraMode; rate: PlaybackRate },
  renderer: RendererChoice,
): string {
  const parameters = new URLSearchParams();
  parameters.set('t', secondsToClock(state.t));
  parameters.set('camera', state.cameraMode);
  parameters.set('rate', String(state.rate));
  if (renderer !== 'auto') {
    parameters.set('renderer', renderer);
  }
  return `?${parameters.toString().replaceAll('%3A', ':')}`;
}
