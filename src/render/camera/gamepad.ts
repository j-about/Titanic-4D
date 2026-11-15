import type { CameraRequest } from './cameraInput.ts';

/** State of a gamepad with the standard mapping: stick axes from −1 to 1, buttons from 0 to 1. */
export interface GamepadSnapshot {
  readonly axes: readonly number[];
  readonly buttons: readonly number[];
}

/** Stick deflection below which a stick is taken to be at rest. */
export const STICK_DEADZONE = 0.15;
const ROTATION_DEG_PER_S = 70;
const ZOOM_PER_S = 1.9;
const MOVE_M_PER_S = 30;

/** Indices of the standard gamepad mapping. */
const LEFT_STICK_X = 0;
const LEFT_STICK_Y = 1;
const RIGHT_STICK_X = 2;
const RIGHT_STICK_Y = 3;
const LEFT_BUMPER = 4;
const RIGHT_BUMPER = 5;
const LEFT_TRIGGER = 6;
const RIGHT_TRIGGER = 7;

/** Deflection of a stick axis with the dead zone removed and the rest rescaled to −1…1. */
function stick(value: number | undefined): number {
  const deflection = value ?? 0;
  const magnitude = Math.abs(deflection);
  if (magnitude < STICK_DEADZONE) {
    return 0;
  }
  return (Math.sign(deflection) * (magnitude - STICK_DEADZONE)) / (1 - STICK_DEADZONE);
}

/** Vertical stick axis with its sign turned, so that pushing the stick away is positive. */
function awayFromPlayer(value: number | undefined): number {
  return value === undefined || value === 0 ? 0 : -value;
}

function button(value: number | undefined): number {
  return Math.min(Math.max(value ?? 0, 0), 1);
}

/** True when a stick is deflected or a trigger or bumper is pressed. */
export function isGamepadActive(pad: GamepadSnapshot): boolean {
  return (
    [LEFT_STICK_X, LEFT_STICK_Y, RIGHT_STICK_X, RIGHT_STICK_Y].some(
      (axis) => stick(pad.axes[axis]) !== 0,
    ) ||
    [LEFT_BUMPER, RIGHT_BUMPER, LEFT_TRIGGER, RIGHT_TRIGGER].some(
      (index) => button(pad.buttons[index]) > 0,
    )
  );
}

/**
 * Camera request produced by a gamepad held for `deltaSeconds`: the right stick turns the view,
 * the triggers zoom (right closer, left away), the left stick moves the free camera forward and
 * sideways and the bumpers move it down and up.
 */
export function gamepadCameraRequest(pad: GamepadSnapshot, deltaSeconds: number): CameraRequest {
  const zoom = button(pad.buttons[LEFT_TRIGGER]) - button(pad.buttons[RIGHT_TRIGGER]);
  const distance = MOVE_M_PER_S * deltaSeconds;
  return {
    rotateRightDeg: stick(pad.axes[RIGHT_STICK_X]) * ROTATION_DEG_PER_S * deltaSeconds,
    rotateUpDeg: stick(awayFromPlayer(pad.axes[RIGHT_STICK_Y])) * ROTATION_DEG_PER_S * deltaSeconds,
    zoomFactor: ZOOM_PER_S ** (zoom * deltaSeconds),
    moveForwardM: stick(awayFromPlayer(pad.axes[LEFT_STICK_Y])) * distance,
    moveRightM: stick(pad.axes[LEFT_STICK_X]) * distance,
    moveUpM: (button(pad.buttons[RIGHT_BUMPER]) - button(pad.buttons[LEFT_BUMPER])) * distance,
  };
}
