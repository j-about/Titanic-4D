import type { HullForm } from '../ship/hullForm.ts';
import { bodyToWorld, type Pose, seaLevelAboveKeel } from './pose.ts';

/**
 * Stretch of a hull section that cuts the sea surface, as a segment on the surface with the
 * half-breadth of the hull along it. It locates the band of disturbed water around the hull.
 */
export interface WaterlineFootprint {
  /** Ends of the segment in the world frame, on the sea surface. */
  readonly startForward: number;
  readonly startStarboard: number;
  readonly endForward: number;
  readonly endStarboard: number;
  /** Greatest half-breadth of the hull at the waterline along the segment, in metres. */
  readonly halfBreadthM: number;
}

/** Spacing of the stations sampled along a section, in metres. */
const STATION_STEP_M = 4;

/**
 * Finds where a section of the hull, in a given pose, is cut by the sea surface. Returns
 * `undefined` when the section is clear of the water or wholly under it.
 */
export function waterlineFootprint(
  form: HullForm,
  pose: Pose,
  xStart: number,
  xEnd: number,
): WaterlineFootprint | undefined {
  let first: number | undefined;
  let last: number | undefined;
  let halfBreadth = 0;
  for (let x = xStart; x <= xEnd; x += STATION_STEP_M) {
    const level = seaLevelAboveKeel(pose, x);
    if (level <= form.keelHeight(x) || level >= form.topHeight(x)) {
      continue;
    }
    const breadth = form.halfBreadth(x, level);
    if (breadth <= 0) {
      continue;
    }
    first ??= x;
    last = x;
    halfBreadth = Math.max(halfBreadth, breadth);
  }
  if (first === undefined || last === undefined || last - first < STATION_STEP_M) {
    return undefined;
  }
  const start = bodyToWorld(pose, { x: first, y: 0, z: seaLevelAboveKeel(pose, first) });
  const end = bodyToWorld(pose, { x: last, y: 0, z: seaLevelAboveKeel(pose, last) });
  return {
    startForward: start.forward,
    startStarboard: start.starboard,
    endForward: end.forward,
    endStarboard: end.starboard,
    halfBreadthM: halfBreadth,
  };
}
