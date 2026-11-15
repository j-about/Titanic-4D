import { type GamepadSnapshot, gamepadCameraRequest, isGamepadActive } from './gamepad.ts';

/**
 * Collects pointer, wheel, touch, keyboard and gamepad input for the canvas and turns it into camera
 * requests, independent of the camera mode that will interpret them.
 */
export interface CameraRequest {
  /** Rotation to the right and upward, in degrees. */
  readonly rotateRightDeg: number;
  readonly rotateUpDeg: number;
  /** Multiplicative change of distance: below 1 moves closer. */
  readonly zoomFactor: number;
  /** Displacement of a free camera, in metres. */
  readonly moveForwardM: number;
  readonly moveRightM: number;
  readonly moveUpM: number;
}

/**
 * Reads the first connected gamepad with the standard mapping. Returns `undefined` when there is
 * none, or when the browser or a permissions policy does not give access to gamepads.
 */
function readGamepad(): GamepadSnapshot | undefined {
  if (typeof navigator.getGamepads !== 'function') {
    return undefined;
  }
  try {
    for (const pad of navigator.getGamepads()) {
      if (pad?.connected === true && pad.mapping === 'standard') {
        return { axes: pad.axes, buttons: pad.buttons.map((button) => button.value) };
      }
    }
  } catch {
    return undefined;
  }
  return undefined;
}

/** The request that leaves the camera where it is. */
export const NO_REQUEST: CameraRequest = {
  rotateRightDeg: 0,
  rotateUpDeg: 0,
  zoomFactor: 1,
  moveForwardM: 0,
  moveRightM: 0,
  moveUpM: 0,
};

/** Adds two requests: rotations and displacements add up, zoom factors multiply. */
export function combineRequests(first: CameraRequest, second: CameraRequest): CameraRequest {
  return {
    rotateRightDeg: first.rotateRightDeg + second.rotateRightDeg,
    rotateUpDeg: first.rotateUpDeg + second.rotateUpDeg,
    zoomFactor: first.zoomFactor * second.zoomFactor,
    moveForwardM: first.moveForwardM + second.moveForwardM,
    moveRightM: first.moveRightM + second.moveRightM,
    moveUpM: first.moveUpM + second.moveUpM,
  };
}

export interface CameraInput {
  /** Returns the requests accumulated since the last call and resets them. */
  consume(deltaSeconds: number): CameraRequest;
  /** True while a key is held, a gamepad is in use or a gesture has requests not yet consumed. */
  isActive(): boolean;
  dispose(): void;
}

const DRAG_DEGREES_PER_PIXEL = 0.25;
const WHEEL_ZOOM_PER_PIXEL = 0.0012;
const KEY_ROTATION_DEG_PER_S = 45;
const KEY_ZOOM_PER_S = 1.9;
const KEY_MOVE_M_PER_S = 30;
const FAST_MOVE_FACTOR = 5;

const ROTATE_KEYS: Readonly<Record<string, readonly [number, number]>> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, 1],
  ArrowDown: [0, -1],
};
const MOVE_KEYS: Readonly<Record<string, readonly [number, number, number]>> = {
  KeyW: [1, 0, 0],
  KeyS: [-1, 0, 0],
  KeyD: [0, 1, 0],
  KeyA: [0, -1, 0],
  KeyE: [0, 0, 1],
  KeyQ: [0, 0, -1],
};
const ZOOM_KEYS: Readonly<Record<string, number>> = {
  Equal: -1,
  NumpadAdd: -1,
  Minus: 1,
  NumpadSubtract: 1,
  PageUp: -1,
  PageDown: 1,
};

function isHandledKey(code: string): boolean {
  return code in ROTATE_KEYS || code in MOVE_KEYS || code in ZOOM_KEYS;
}

export function createCameraInput(element: HTMLElement): CameraInput {
  const pointers = new Map<number, { x: number; y: number }>();
  const heldKeys = new Set<string>();
  let fast = false;
  let rotateRightDeg = 0;
  let rotateUpDeg = 0;
  let zoomFactor = 1;
  let pinchDistance = 0;

  const pointerDistance = (): number => {
    const [first, second] = [...pointers.values()];
    return first === undefined || second === undefined
      ? 0
      : Math.hypot(first.x - second.x, first.y - second.y);
  };

  const onPointerDown = (event: PointerEvent): void => {
    element.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    pinchDistance = pointerDistance();
  };

  const onPointerMove = (event: PointerEvent): void => {
    const previous = pointers.get(event.pointerId);
    if (previous === undefined) {
      return;
    }
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 1) {
      // Dragging turns the view the way a hand would turn the scene.
      rotateRightDeg -= (event.clientX - previous.x) * DRAG_DEGREES_PER_PIXEL;
      rotateUpDeg += (event.clientY - previous.y) * DRAG_DEGREES_PER_PIXEL;
    } else if (pointers.size === 2) {
      const distance = pointerDistance();
      if (pinchDistance > 0 && distance > 0) {
        zoomFactor *= pinchDistance / distance;
      }
      pinchDistance = distance;
    }
  };

  const onPointerEnd = (event: PointerEvent): void => {
    pointers.delete(event.pointerId);
    pinchDistance = pointerDistance();
  };

  const onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    zoomFactor *= Math.exp(event.deltaY * WHEEL_ZOOM_PER_PIXEL);
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    fast = event.shiftKey;
    if (isHandledKey(event.code) && !event.ctrlKey && !event.metaKey && !event.altKey) {
      heldKeys.add(event.code);
      event.preventDefault();
    }
  };

  const onKeyUp = (event: KeyboardEvent): void => {
    fast = event.shiftKey;
    heldKeys.delete(event.code);
  };

  const onBlur = (): void => {
    heldKeys.clear();
  };

  element.addEventListener('pointerdown', onPointerDown);
  element.addEventListener('pointermove', onPointerMove);
  element.addEventListener('pointerup', onPointerEnd);
  element.addEventListener('pointercancel', onPointerEnd);
  element.addEventListener('wheel', onWheel, { passive: false });
  element.addEventListener('keydown', onKeyDown);
  element.addEventListener('keyup', onKeyUp);
  element.addEventListener('blur', onBlur);

  const consume = (deltaSeconds: number): CameraRequest => {
    let moveForward = 0;
    let moveRight = 0;
    let moveUp = 0;
    for (const code of heldKeys) {
      const rotation = ROTATE_KEYS[code];
      if (rotation !== undefined) {
        rotateRightDeg += rotation[0] * KEY_ROTATION_DEG_PER_S * deltaSeconds;
        rotateUpDeg += rotation[1] * KEY_ROTATION_DEG_PER_S * deltaSeconds;
      }
      const zoom = ZOOM_KEYS[code];
      if (zoom !== undefined) {
        zoomFactor *= KEY_ZOOM_PER_S ** (zoom * deltaSeconds);
      }
      const move = MOVE_KEYS[code];
      if (move !== undefined) {
        const speed = KEY_MOVE_M_PER_S * (fast ? FAST_MOVE_FACTOR : 1) * deltaSeconds;
        moveForward += move[0] * speed;
        moveRight += move[1] * speed;
        moveUp += move[2] * speed;
      }
    }
    const pad = readGamepad();
    const request = combineRequests(
      {
        rotateRightDeg,
        rotateUpDeg,
        zoomFactor,
        moveForwardM: moveForward,
        moveRightM: moveRight,
        moveUpM: moveUp,
      },
      pad === undefined ? NO_REQUEST : gamepadCameraRequest(pad, deltaSeconds),
    );
    rotateRightDeg = 0;
    rotateUpDeg = 0;
    zoomFactor = 1;
    return request;
  };

  const isActive = (): boolean => {
    if (heldKeys.size > 0 || rotateRightDeg !== 0 || rotateUpDeg !== 0 || zoomFactor !== 1) {
      return true;
    }
    const pad = readGamepad();
    return pad !== undefined && isGamepadActive(pad);
  };

  const dispose = (): void => {
    element.removeEventListener('pointerdown', onPointerDown);
    element.removeEventListener('pointermove', onPointerMove);
    element.removeEventListener('pointerup', onPointerEnd);
    element.removeEventListener('pointercancel', onPointerEnd);
    element.removeEventListener('wheel', onWheel);
    element.removeEventListener('keydown', onKeyDown);
    element.removeEventListener('keyup', onKeyUp);
    element.removeEventListener('blur', onBlur);
  };

  return { consume, isActive, dispose };
}
