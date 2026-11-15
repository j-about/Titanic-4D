import type { Fact } from '../data/schema/facts.ts';
import type { SiteFile } from '../data/schema/site.ts';
import type { SceneVector } from '../sim/sceneFrame.ts';
import type { Phase } from '../sim/timelineModel.ts';

const METRES_PER_NAUTICAL_MILE = 1852;
const RADIANS_PER_DEGREE = Math.PI / 180;

/**
 * Modelling value, not a recorded one: angle above the horizon at which the light is drawn for
 * an eye at the level of the sea, in degrees.
 */
export const MODELLED_ELEVATION_DEG = 0.2;
/**
 * Modelling value, not a recorded one: brightness of the light, as the visual magnitude of the
 * star that the sky of the scene draws equally bright.
 */
export const MODELLED_MAGNITUDE = 2;

/** Phases during which the ship is afloat, and the light is drawn. */
const AFLOAT_PHASES: readonly Phase[] = ['afloat', 'final-plunge', 'break-up'];

/** Returns the number carried by a record, after checking the unit it is expressed in. */
function valueIn(facts: readonly Fact[], id: string, unit: string): number {
  const fact = facts.find((candidate) => candidate.id === id);
  if (fact?.value === undefined) {
    throw new RangeError(`The dataset has no numeric fact "${id}".`);
  }
  if (fact.unit !== unit) {
    throw new RangeError(`The fact "${id}" is expected in "${unit}", not in "${fact.unit}".`);
  }
  return fact.value;
}

/**
 * Scene position of a light seen from the scene origin at the given distance and true bearing,
 * for a ship heading `headingTrueDeg`. The scene frame has `x` along the heading, `y` up and `z`
 * to starboard; the light stands above the plane of the sea by the height that an eye at the
 * origin sees `elevationDeg` above the horizon.
 */
export function distantLightPosition(
  distanceM: number,
  bearingTrueDeg: number,
  headingTrueDeg: number,
  elevationDeg: number,
): SceneVector {
  const relativeBearing = (bearingTrueDeg - headingTrueDeg) * RADIANS_PER_DEGREE;
  return [
    distanceM * Math.cos(relativeBearing),
    distanceM * Math.tan(elevationDeg * RADIANS_PER_DEGREE),
    distanceM * Math.sin(relativeBearing),
  ];
}

/**
 * Scene position of the light of the SS Californian: at the distance of the record
 * `californian-distance` (nautical miles) on the bearing of the record `californian-bearing`
 * (degrees true), turned by the heading of the ship, and raised by the modelled elevation.
 */
export function californianLightPosition(site: SiteFile): SceneVector {
  return distantLightPosition(
    valueIn(site.californian, 'californian-distance', 'nmi') * METRES_PER_NAUTICAL_MILE,
    valueIn(site.californian, 'californian-bearing', 'deg'),
    site.heading.true_deg,
    MODELLED_ELEVATION_DEG,
  );
}

/**
 * Whether the light is drawn: while the ship is afloat, for a camera above the surface of the
 * sea.
 */
export function isCalifornianLightShown(phase: Phase, cameraHeightM: number): boolean {
  return AFLOAT_PHASES.includes(phase) && cameraHeightM >= 0;
}
