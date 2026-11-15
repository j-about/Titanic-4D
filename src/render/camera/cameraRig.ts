import type { ShipState } from '../../sim/timelineModel.ts';
import { type CameraRequest, combineRequests, NO_REQUEST } from './cameraInput.ts';
import {
  adjustLook,
  adjustOrbit,
  type CameraMode,
  type CameraPose,
  DEFAULT_DECK_LOOK,
  DEFAULT_ORBIT,
  DEFAULT_UNDERWATER,
  deckCameraPose,
  type FreeParameters,
  freeCameraPose,
  freeParametersFrom,
  guidedCameraPose,
  type LookParameters,
  moveFree,
  ORBIT_LIMITS,
  type OrbitParameters,
  orbitCameraPose,
  type TimelineBounds,
  UNDERWATER_LIMITS,
  underwaterCameraPose,
} from './cameraPose.ts';
import { type CameraStep, cameraStepRequest } from './cameraStep.ts';

export interface CameraFrame {
  readonly state: ShipState;
  readonly mode: CameraMode;
  readonly request: CameraRequest;
  /** When set, the guided camera holds still within each shot. */
  readonly reducedMotion: boolean;
}

export interface CameraRig {
  /** Applies the requests to the active mode and returns where the camera stands. */
  update(frame: CameraFrame): CameraPose;
  /** Adds one step to the requests applied by the next update. */
  step(step: CameraStep): void;
  /** True while a step is waiting for the next update. */
  hasPendingStep(): boolean;
  /**
   * Restores the default view of every mode and drops the steps not yet applied. The free camera
   * starts again from the default view around the ship.
   */
  reset(): void;
}

/** Keeps the parameters of each camera mode, so that switching back to a mode restores its view. */
export function createCameraRig(bounds: TimelineBounds, seabedHeightM: number): CameraRig {
  let orbit: OrbitParameters = DEFAULT_ORBIT;
  let underwater: OrbitParameters = DEFAULT_UNDERWATER;
  let deckLook: LookParameters = DEFAULT_DECK_LOOK;
  let free: FreeParameters | null = null;
  let lastPose: CameraPose | null = null;
  let lastMode: CameraMode | null = null;
  let pendingSteps: CameraRequest | null = null;

  const update = (frame: CameraFrame): CameraPose => {
    const { state, mode } = frame;
    const request =
      pendingSteps === null ? frame.request : combineRequests(frame.request, pendingSteps);
    pendingSteps = null;
    let pose: CameraPose;
    switch (mode) {
      case 'guided':
        pose = guidedCameraPose(state, bounds, seabedHeightM, frame.reducedMotion);
        break;
      case 'orbit':
        orbit = adjustOrbit(
          orbit,
          request.rotateRightDeg,
          request.rotateUpDeg,
          request.zoomFactor,
          ORBIT_LIMITS,
        );
        pose = orbitCameraPose(state, orbit, bounds);
        break;
      case 'underwater':
        underwater = adjustOrbit(
          underwater,
          request.rotateRightDeg,
          request.rotateUpDeg,
          request.zoomFactor,
          UNDERWATER_LIMITS,
        );
        pose = underwaterCameraPose(state, underwater, seabedHeightM);
        break;
      case 'deck':
        deckLook = adjustLook(deckLook, request.rotateRightDeg, request.rotateUpDeg);
        pose = deckCameraPose(state, deckLook);
        break;
      case 'free': {
        // On entering the free mode the camera starts from the view that was on screen, or from
        // the default view around the ship when no view has been computed since the last reset.
        const start: FreeParameters =
          lastMode === 'free' && free !== null
            ? free
            : freeParametersFrom(lastPose ?? orbitCameraPose(state, orbit, bounds));
        const turned = {
          ...start,
          ...adjustLook(start, request.rotateRightDeg, request.rotateUpDeg),
        };
        const moved = moveFree(turned, request.moveForwardM, request.moveRightM, request.moveUpM);
        free = {
          ...moved,
          position: [
            moved.position[0],
            Math.max(moved.position[1], seabedHeightM + 2),
            moved.position[2],
          ],
        };
        pose = freeCameraPose(free);
        break;
      }
    }
    lastPose = pose;
    lastMode = mode;
    return pose;
  };

  const step = (requested: CameraStep): void => {
    pendingSteps = combineRequests(pendingSteps ?? NO_REQUEST, cameraStepRequest(requested));
  };

  const reset = (): void => {
    orbit = DEFAULT_ORBIT;
    underwater = DEFAULT_UNDERWATER;
    deckLook = DEFAULT_DECK_LOOK;
    free = null;
    lastPose = null;
    lastMode = null;
    pendingSteps = null;
  };

  return { update, step, hasPendingStep: () => pendingSteps !== null, reset };
}
