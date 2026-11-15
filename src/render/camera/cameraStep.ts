import { type CameraRequest, NO_REQUEST } from './cameraInput.ts';
import type { CameraMode } from './cameraPose.ts';

/**
 * One step of the camera asked for by a single activation of a control: the counterpart, without
 * dragging, pinching or holding, of the gestures collected by `cameraInput.ts`.
 */
export type CameraStep =
  | 'turn-left'
  | 'turn-right'
  | 'tilt-up'
  | 'tilt-down'
  | 'zoom-in'
  | 'zoom-out'
  | 'move-forward'
  | 'move-back';

/** Rotation of one turn or tilt step, in degrees. */
export const TURN_STEP_DEG = 15;
/** Ratio between the distances of the camera before and after one zoom step. */
export const ZOOM_STEP_FACTOR = 1.25;
/** Displacement of the free camera by one move step, in metres. */
export const MOVE_STEP_M = 30;

const STEP_REQUESTS: Readonly<Record<CameraStep, Partial<CameraRequest>>> = {
  'turn-left': { rotateRightDeg: -TURN_STEP_DEG },
  'turn-right': { rotateRightDeg: TURN_STEP_DEG },
  'tilt-up': { rotateUpDeg: TURN_STEP_DEG },
  'tilt-down': { rotateUpDeg: -TURN_STEP_DEG },
  'zoom-in': { zoomFactor: 1 / ZOOM_STEP_FACTOR },
  'zoom-out': { zoomFactor: ZOOM_STEP_FACTOR },
  'move-forward': { moveForwardM: MOVE_STEP_M },
  'move-back': { moveForwardM: -MOVE_STEP_M },
};

/** The camera request that carries out one step, in the terms used by every other input. */
export function cameraStepRequest(step: CameraStep): CameraRequest {
  return { ...NO_REQUEST, ...STEP_REQUESTS[step] };
}

const TURN_STEPS: readonly CameraStep[] = ['turn-left', 'turn-right', 'tilt-up', 'tilt-down'];

/**
 * Steps that change the view in each camera mode: none in the guided mode, turning and tilting
 * in every other mode, zooming for the cameras that circle the ship and moving along the line of
 * sight for the free camera.
 */
export const CAMERA_STEPS_BY_MODE: Readonly<Record<CameraMode, readonly CameraStep[]>> = {
  guided: [],
  orbit: [...TURN_STEPS, 'zoom-in', 'zoom-out'],
  deck: TURN_STEPS,
  underwater: [...TURN_STEPS, 'zoom-in', 'zoom-out'],
  free: [...TURN_STEPS, 'move-forward', 'move-back'],
};
