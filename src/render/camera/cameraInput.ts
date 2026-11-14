/**
 * Collects pointer, wheel, touch and keyboard input on the canvas and turns it into camera
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

export interface CameraInput {
  /** Returns the requests accumulated since the last call and resets them. */
  consume(deltaSeconds: number): CameraRequest;
  /** True while a key is held or a gesture has produced requests not yet consumed. */
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
    const request: CameraRequest = {
      rotateRightDeg,
      rotateUpDeg,
      zoomFactor,
      moveForwardM: moveForward,
      moveRightM: moveRight,
      moveUpM: moveUp,
    };
    rotateRightDeg = 0;
    rotateUpDeg = 0;
    zoomFactor = 1;
    return request;
  };

  const isActive = (): boolean =>
    heldKeys.size > 0 || rotateRightDeg !== 0 || rotateUpDeg !== 0 || zoomFactor !== 1;

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
