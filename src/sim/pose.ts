/**
 * Rigid-body placement of the hull, or of one of its two sections, relative to the sea.
 *
 * World frame: origin on the sea surface above the pivot of the waterline at the moment of the
 * break; `forward` along the ship's heading, `starboard` to the right of it, `up` vertical.
 * Body frame: `x` metres aft of the forward perpendicular, `y` metres to starboard of the centre
 * line, `z` metres above the keel.
 */
export interface Pose {
  /** Rotation about the transverse axis, in degrees, positive when the forward end is down. */
  readonly pitchDeg: number;
  /** Rotation about the longitudinal axis, in degrees, positive when the starboard side is down. */
  readonly heelDeg: number;
  /** Rotation about the vertical, in degrees, clockwise seen from above. */
  readonly yawDeg: number;
  /** Body station of the reference point, on the centre line. */
  readonly referenceXM: number;
  /** Height of the reference point above the keel. */
  readonly referenceZM: number;
  /** World position of the reference point. */
  readonly forwardM: number;
  readonly starboardM: number;
  readonly upM: number;
}

export interface BodyPoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface WorldPoint {
  readonly forward: number;
  readonly starboard: number;
  readonly up: number;
}

const RADIANS_PER_DEGREE = Math.PI / 180;

/** Transforms a point of the body frame to the world frame: heel, then pitch, then yaw. */
export function bodyToWorld(pose: Pose, point: BodyPoint): WorldPoint {
  const heel = pose.heelDeg * RADIANS_PER_DEGREE;
  const pitch = pose.pitchDeg * RADIANS_PER_DEGREE;
  const yaw = pose.yawDeg * RADIANS_PER_DEGREE;

  const forward = pose.referenceXM - point.x;
  const starboard = point.y;
  const up = point.z - pose.referenceZM;

  const heeledStarboard = starboard * Math.cos(heel) + up * Math.sin(heel);
  const heeledUp = up * Math.cos(heel) - starboard * Math.sin(heel);

  const pitchedForward = forward * Math.cos(pitch) + heeledUp * Math.sin(pitch);
  const pitchedUp = heeledUp * Math.cos(pitch) - forward * Math.sin(pitch);

  return {
    forward: pose.forwardM + pitchedForward * Math.cos(yaw) - heeledStarboard * Math.sin(yaw),
    starboard: pose.starboardM + pitchedForward * Math.sin(yaw) + heeledStarboard * Math.cos(yaw),
    up: pose.upM + pitchedUp,
  };
}

/**
 * Height above the keel at which the sea surface cuts the centre plane at body station `x`,
 * measured along the hull's own vertical. Values above the hull mean that the station is wholly
 * submerged; negative values mean that the keel there is out of the water.
 */
export function seaLevelAboveKeel(pose: Pose, x: number): number {
  const heel = pose.heelDeg * RADIANS_PER_DEGREE;
  const pitch = pose.pitchDeg * RADIANS_PER_DEGREE;
  const forward = pose.referenceXM - x;
  const vertical = Math.cos(heel) * Math.cos(pitch);
  return pose.referenceZM + (forward * Math.sin(pitch) - pose.upM) / vertical;
}
