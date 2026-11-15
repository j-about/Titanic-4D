import { createLinearCurve, createMonotoneCurve } from '../../sim/interpolation.ts';
import type { Pose } from '../../sim/pose.ts';
import { bodyPointToScene, type SceneVector } from '../../sim/sceneFrame.ts';
import type { ShipState } from '../../sim/timelineModel.ts';

export type CameraMode = 'guided' | 'orbit' | 'deck' | 'underwater' | 'free';

export const CAMERA_MODES: readonly CameraMode[] = [
  'guided',
  'orbit',
  'deck',
  'underwater',
  'free',
];

/** Where the camera is and what it looks at, in scene coordinates. */
export interface CameraPose {
  readonly position: SceneVector;
  readonly target: SceneVector;
}

/** Camera placed on a sphere around a focus point. */
export interface OrbitParameters {
  /** Bearing of the camera from the focus, in degrees clockwise from the ship's heading. */
  readonly azimuthDeg: number;
  /** Angle of the camera above the horizontal plane through the focus, in degrees. */
  readonly elevationDeg: number;
  readonly distanceM: number;
}

/** Direction of sight of a camera standing at a fixed point. */
export interface LookParameters {
  /** Degrees clockwise from the ship's heading. */
  readonly yawDeg: number;
  /** Degrees above the horizontal. */
  readonly pitchDeg: number;
}

export interface FreeParameters extends LookParameters {
  readonly position: SceneVector;
}

export interface TimelineBounds {
  readonly breakSeconds: number;
  readonly founderingSeconds: number;
  readonly endSeconds: number;
}

const RADIANS_PER_DEGREE = Math.PI / 180;

/** Lowest height of an above-water camera and of its focus, so that the sea never hides the view. */
const MIN_SURFACE_CAMERA_HEIGHT_M = 1.5;
const MIN_SURFACE_FOCUS_HEIGHT_M = 6;
/** Greatest height of an underwater camera, and its clearance above the seabed. */
const MAX_UNDERWATER_CAMERA_HEIGHT_M = -2;
const SEABED_CLEARANCE_M = 4;
/** Body point followed by the orbit and guided cameras: amidships, a little above the waterline. */
const FOCUS_BODY_POINT = { x: 125, y: 0, z: 18 } as const;
/** Eye of the deck camera: the starboard wing of the navigating bridge, at standing height. */
const DECK_EYE_BODY_POINT = { x: 59, y: 11.5, z: 28.19 + 0.25 + 1.7 } as const;
/** Body point of the after section followed by the guided camera once the hull has parted. */
const STERN_FOCUS_BODY_POINT = { x: 215, y: 0, z: 18 } as const;
/** Time over which the guided camera shifts its focus to the after section after the break. */
const STERN_FOCUS_BLEND_SECONDS = 60;
/** Time over which the guided camera leaves the surface to follow the after section down. */
const DESCENT_BLEND_SECONDS = 30;

export const ORBIT_LIMITS = {
  minDistanceM: 40,
  maxDistanceM: 3000,
  minElevationDeg: 0.5,
  maxElevationDeg: 85,
} as const;

export const UNDERWATER_LIMITS = {
  minDistanceM: 40,
  maxDistanceM: 900,
  minElevationDeg: -70,
  maxElevationDeg: 60,
} as const;

export const DEFAULT_ORBIT: OrbitParameters = { azimuthDeg: 42, elevationDeg: 10, distanceM: 300 };
export const DEFAULT_UNDERWATER: OrbitParameters = {
  azimuthDeg: 55,
  elevationDeg: 8,
  distanceM: 260,
};
export const DEFAULT_DECK_LOOK: LookParameters = { yawDeg: -25, pitchDeg: 0 };

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const ratio = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return ratio * ratio * (3 - 2 * ratio);
}

function directionFrom(yawDeg: number, pitchDeg: number): SceneVector {
  const yaw = yawDeg * RADIANS_PER_DEGREE;
  const pitch = pitchDeg * RADIANS_PER_DEGREE;
  return [Math.cos(pitch) * Math.cos(yaw), Math.sin(pitch), Math.cos(pitch) * Math.sin(yaw)];
}

function onSphere(focus: SceneVector, parameters: OrbitParameters): SceneVector {
  const direction = directionFrom(parameters.azimuthDeg, parameters.elevationDeg);
  return [
    focus[0] + direction[0] * parameters.distanceM,
    focus[1] + direction[1] * parameters.distanceM,
    focus[2] + direction[2] * parameters.distanceM,
  ];
}

/** Section that carries the focus of the cameras: the forward one. */
function focusOnSection(pose: Pose): SceneVector {
  return bodyPointToScene(pose, FOCUS_BODY_POINT);
}

/**
 * Point watched by the cameras that follow the ship: amidships while the hull is whole, then
 * the after section, the last part to remain at the surface.
 */
function shipFocus(state: ShipState, bounds: TimelineBounds): SceneVector {
  const forward = focusOnSection(state.bow);
  const after = bodyPointToScene(state.stern, STERN_FOCUS_BODY_POINT);
  const toStern = smoothstep(
    bounds.breakSeconds,
    bounds.breakSeconds + STERN_FOCUS_BLEND_SECONDS,
    state.t,
  );
  return [
    forward[0] + (after[0] - forward[0]) * toStern,
    forward[1] + (after[1] - forward[1]) * toStern,
    forward[2] + (after[2] - forward[2]) * toStern,
  ];
}

/** Camera circling the ship above the water. After the foundering it stays over the site. */
export function orbitCameraPose(
  state: ShipState,
  parameters: OrbitParameters,
  bounds: TimelineBounds,
): CameraPose {
  const focus = shipFocus(state, bounds);
  const target: SceneVector = [focus[0], Math.max(focus[1], MIN_SURFACE_FOCUS_HEIGHT_M), focus[2]];
  const position = onSphere(target, parameters);
  return {
    position: [position[0], Math.max(position[1], MIN_SURFACE_CAMERA_HEIGHT_M), position[2]],
    target,
  };
}

/** Camera circling the forward section below the surface, down to the seabed. */
export function underwaterCameraPose(
  state: ShipState,
  parameters: OrbitParameters,
  seabedHeightM: number,
): CameraPose {
  const focus = focusOnSection(state.bow);
  const target: SceneVector = [
    focus[0],
    Math.min(focus[1], MAX_UNDERWATER_CAMERA_HEIGHT_M - 6),
    focus[2],
  ];
  const position = onSphere(target, parameters);
  const height = clamp(
    position[1],
    seabedHeightM + SEABED_CLEARANCE_M,
    MAX_UNDERWATER_CAMERA_HEIGHT_M,
  );
  return { position: [position[0], height, position[2]], target };
}

/** Camera at standing height on the bridge wing, carried by the ship, with a level horizon. */
export function deckCameraPose(state: ShipState, look: LookParameters): CameraPose {
  const eye = bodyPointToScene(state.bow, DECK_EYE_BODY_POINT);
  const direction = directionFrom(look.yawDeg + state.bow.yawDeg, look.pitchDeg);
  return {
    position: eye,
    target: [eye[0] + direction[0], eye[1] + direction[1], eye[2] + direction[2]],
  };
}

/** Camera moved freely by the user. */
export function freeCameraPose(parameters: FreeParameters): CameraPose {
  const direction = directionFrom(parameters.yawDeg, parameters.pitchDeg);
  const [x, y, z] = parameters.position;
  return {
    position: parameters.position,
    target: [x + direction[0], y + direction[1], z + direction[2]],
  };
}

/**
 * Shots of the guided camera: orbit parameters at chosen times after the collision. They are a
 * matter of presentation, not of history, and are interpolated smoothly between the entries.
 */
const GUIDED_SHOTS: readonly (OrbitParameters & {
  readonly seconds: number;
  /** Height by which the view is raised above the ship, to keep the distress signals in frame. */
  readonly liftM: number;
})[] = [
  { seconds: 0, azimuthDeg: 38, elevationDeg: 9, distanceM: 430, liftM: 0 },
  { seconds: 1200, azimuthDeg: 62, elevationDeg: 8, distanceM: 340, liftM: 0 },
  { seconds: 3600, azimuthDeg: 108, elevationDeg: 13, distanceM: 300, liftM: 0 },
  { seconds: 4020, azimuthDeg: 124, elevationDeg: 5, distanceM: 520, liftM: 62 },
  { seconds: 6000, azimuthDeg: 205, elevationDeg: 8, distanceM: 500, liftM: 62 },
  { seconds: 7980, azimuthDeg: 298, elevationDeg: 7, distanceM: 480, liftM: 62 },
  { seconds: 8700, azimuthDeg: 332, elevationDeg: 7, distanceM: 300, liftM: 0 },
  { seconds: 9300, azimuthDeg: 378, elevationDeg: 9, distanceM: 380, liftM: 0 },
  { seconds: 9420, azimuthDeg: 418, elevationDeg: 10, distanceM: 440, liftM: 0 },
  { seconds: 9600, azimuthDeg: 440, elevationDeg: 12, distanceM: 480, liftM: 0 },
  { seconds: 9660, azimuthDeg: 425, elevationDeg: 14, distanceM: 300, liftM: 0 },
  { seconds: 9960, azimuthDeg: 400, elevationDeg: 18, distanceM: 240, liftM: 0 },
];

const shotTimes = GUIDED_SHOTS.map((shot) => shot.seconds);
const guidedAzimuth = createMonotoneCurve(
  shotTimes,
  GUIDED_SHOTS.map((shot) => shot.azimuthDeg),
);
const guidedElevation = createMonotoneCurve(
  shotTimes,
  GUIDED_SHOTS.map((shot) => shot.elevationDeg),
);
const guidedDistance = createMonotoneCurve(
  shotTimes,
  GUIDED_SHOTS.map((shot) => shot.distanceM),
);
const guidedLift = createMonotoneCurve(
  shotTimes,
  GUIDED_SHOTS.map((shot) => shot.liftM),
);
const stepToShotStart = createLinearCurve(shotTimes, shotTimes);

/** Start time of the guided shot in progress at `t`. */
function shotStart(t: number): number {
  let start = shotTimes[0] ?? 0;
  for (const seconds of shotTimes) {
    if (seconds <= t) {
      start = seconds;
    }
  }
  return stepToShotStart(start);
}

/**
 * Camera that follows a prepared sequence of views. It is a function of the simulation time only,
 * so it retraces its path when time runs backward. It watches the whole ship until the hull
 * parts, then the after section, which it follows below the surface down to the seabed. With
 * `still` set, the camera holds the first view of each shot instead of moving between shots.
 */
export function guidedCameraPose(
  state: ShipState,
  bounds: TimelineBounds,
  seabedHeightM: number,
  still: boolean,
): CameraPose {
  const shotTime = still ? shotStart(state.t) : state.t;
  const parameters: OrbitParameters = {
    azimuthDeg: guidedAzimuth(shotTime),
    elevationDeg: guidedElevation(shotTime),
    distanceM: guidedDistance(shotTime),
  };
  const forward = focusOnSection(state.bow);
  const after = bodyPointToScene(state.stern, STERN_FOCUS_BODY_POINT);
  const toStern = smoothstep(
    bounds.breakSeconds,
    bounds.breakSeconds + STERN_FOCUS_BLEND_SECONDS,
    state.t,
  );
  const focus: SceneVector = [
    forward[0] + (after[0] - forward[0]) * toStern,
    forward[1] + (after[1] - forward[1]) * toStern,
    forward[2] + (after[2] - forward[2]) * toStern,
  ];
  const submerging = smoothstep(
    bounds.founderingSeconds,
    bounds.founderingSeconds + DESCENT_BLEND_SECONDS,
    state.t,
  );
  const surfaceHeight = Math.max(focus[1], MIN_SURFACE_FOCUS_HEIGHT_M) + guidedLift(shotTime);
  const target: SceneVector = [
    focus[0],
    surfaceHeight + (focus[1] - surfaceHeight) * submerging,
    focus[2],
  ];
  const position = onSphere(target, parameters);
  const lowest = submerging > 0 ? seabedHeightM + SEABED_CLEARANCE_M : MIN_SURFACE_CAMERA_HEIGHT_M;
  return { position: [position[0], Math.max(position[1], lowest), position[2]], target };
}

/** Applies a rotation and zoom request to orbit parameters, within the given limits. */
export function adjustOrbit(
  parameters: OrbitParameters,
  deltaAzimuthDeg: number,
  deltaElevationDeg: number,
  zoomFactor: number,
  limits: typeof ORBIT_LIMITS | typeof UNDERWATER_LIMITS,
): OrbitParameters {
  return {
    azimuthDeg: (((parameters.azimuthDeg + deltaAzimuthDeg) % 360) + 360) % 360,
    elevationDeg: clamp(
      parameters.elevationDeg + deltaElevationDeg,
      limits.minElevationDeg,
      limits.maxElevationDeg,
    ),
    distanceM: clamp(parameters.distanceM * zoomFactor, limits.minDistanceM, limits.maxDistanceM),
  };
}

/** Applies a rotation request to a direction of sight. */
export function adjustLook(
  look: LookParameters,
  deltaYawDeg: number,
  deltaPitchDeg: number,
): LookParameters {
  return {
    yawDeg: (((look.yawDeg + deltaYawDeg) % 360) + 360) % 360,
    pitchDeg: clamp(look.pitchDeg + deltaPitchDeg, -85, 85),
  };
}

/** Orbit parameters and look direction that reproduce a camera pose, to hand over between modes. */
export function freeParametersFrom(pose: CameraPose): FreeParameters {
  const dx = pose.target[0] - pose.position[0];
  const dy = pose.target[1] - pose.position[1];
  const dz = pose.target[2] - pose.position[2];
  const horizontal = Math.hypot(dx, dz);
  return {
    position: pose.position,
    yawDeg: Math.atan2(dz, dx) / RADIANS_PER_DEGREE,
    pitchDeg: Math.atan2(dy, horizontal) / RADIANS_PER_DEGREE,
  };
}

/** Moves a free camera along its own axes: forward, to the right and up. */
export function moveFree(
  parameters: FreeParameters,
  forwardM: number,
  rightM: number,
  upM: number,
): FreeParameters {
  const yaw = parameters.yawDeg * RADIANS_PER_DEGREE;
  const [x, y, z] = parameters.position;
  return {
    ...parameters,
    position: [
      x + forwardM * Math.cos(yaw) - rightM * Math.sin(yaw),
      y + upM,
      z + forwardM * Math.sin(yaw) + rightM * Math.cos(yaw),
    ],
  };
}
