import type { ShipFile } from '../data/schema/ship.ts';
import { factValue } from './particulars.ts';
import { deckHeightAt } from './sheer.ts';

/**
 * Analytic hull form of the level-of-detail 0 model.
 *
 * The principal dimensions, the sheer and the extents of the forecastle, well decks and poop come
 * from the dataset. The shape between them is a modelling choice: no table of offsets is
 * available, so the waterlines are described by a few smooth functions whose parameters are tuned
 * to reproduce the recorded block, prismatic and midship coefficients at the load draught.
 *
 * Body coordinates: `x` metres aft of the forward perpendicular, `z` metres above the keel; the
 * functions return half-breadths, in metres from the centre line.
 */
export interface HullForm {
  readonly lengthBetweenPerpendiculars: number;
  readonly halfBreadthMax: number;
  readonly loadDraught: number;
  /** Station of the stem at height `z`. */
  stemX(z: number): number;
  /** Station of the aftermost point of the hull at height `z`. */
  sternX(z: number): number;
  /** Height of the bottom of the hull at station `x`. */
  keelHeight(x: number): number;
  /** Height of the top of the shell plating at station `x`. */
  topHeight(x: number): number;
  /** Half-breadth of the hull at station `x` and height `z`; zero outside the hull. */
  halfBreadth(x: number, z: number): number;
}

/** Radius of the turn of the bilge amidships. */
const BILGE_RADIUS_M = 4.4;
/** Height at which the forward perpendicular meets the stem. */
const STEM_PERPENDICULAR_HEIGHT_M = 17.8;
/** Rake of the stem: one unit forward for twelve units up. */
const STEM_RAKE = 1 / 12;
/** Height below which the stem curves aft into the keel. */
const FOREFOOT_HEIGHT_M = 4.5;
/** Station at which the forefoot meets the keel. */
const FOREFOOT_LENGTH_M = 5.5;
/** Station from which the bottom rises toward the stern. */
const AFT_CUTAWAY_START_M = 226;
/** Height of the bottom of the hull at the after perpendicular. */
const AFT_CUTAWAY_HEIGHT_M = 7.2;
/** Height at which the counter starts to overhang the after perpendicular. */
const COUNTER_BASE_HEIGHT_M = 9.4;
/** Height at which the counter reaches its full overhang. */
const COUNTER_TOP_HEIGHT_M = 16.5;
/** Height of the bulwark enclosing the well decks. */
const WELL_DECK_BULWARK_M = 1.25;

/** Length of the entrance (bow taper) at the keel and at the top of the hull. */
const ENTRANCE_LENGTH_LOW_M = 103;
const ENTRANCE_LENGTH_HIGH_M = 58;
/** Length of the run (stern taper) at the keel and at the top of the hull. */
const RUN_LENGTH_LOW_M = 111;
const RUN_LENGTH_HIGH_M = 46;
/** Exponents shaping the waterlines: above 1 the ends are fine, below 1 they are full. */
const ENTRANCE_EXPONENT_LOW = 1.48;
const ENTRANCE_EXPONENT_HIGH = 0.78;
const RUN_EXPONENT_LOW = 1.68;
const RUN_EXPONENT_HIGH = 0.5;

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

function mix(a: number, b: number, ratio: number): number {
  return a + (b - a) * ratio;
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const ratio = clamp01((value - edge0) / (edge1 - edge0));
  return ratio * ratio * (3 - 2 * ratio);
}

/** Creates the hull form for the ship described by the dataset. */
export function createHullForm(ship: ShipFile): HullForm {
  const length = factValue(ship.particulars, 'length-between-perpendiculars');
  const halfBreadthMax = factValue(ship.particulars, 'breadth') / 2;
  const loadDraught = factValue(ship.particulars, 'load-draught');
  const sternOverhang = factValue(ship.particulars, 'stern-overhang');
  const zone = (id: string): { readonly x_start_m: number; readonly x_end_m: number } => {
    const found = ship.zones.find((candidate) => candidate.id === id);
    if (found === undefined) {
      throw new RangeError(`The dataset has no zone "${id}".`);
    }
    return found;
  };
  const forwardWell = zone('forward-well-deck');
  const afterWell = zone('after-well-deck');

  const topHeight = (x: number): number => {
    const inWell =
      (x > forwardWell.x_start_m && x < forwardWell.x_end_m) ||
      (x > afterWell.x_start_m && x < afterWell.x_end_m);
    return inWell ? deckHeightAt(ship, 'c', x) + WELL_DECK_BULWARK_M : deckHeightAt(ship, 'b', x);
  };

  const stemX = (z: number): number => {
    const raked = (STEM_PERPENDICULAR_HEIGHT_M - z) * STEM_RAKE;
    if (z >= FOREFOOT_HEIGHT_M) {
      return raked;
    }
    const depth = 1 - z / FOREFOOT_HEIGHT_M;
    const atForefoot = (STEM_PERPENDICULAR_HEIGHT_M - FOREFOOT_HEIGHT_M) * STEM_RAKE;
    return atForefoot + (FOREFOOT_LENGTH_M - atForefoot) * (1 - Math.sqrt(1 - depth * depth));
  };

  const sternX = (z: number): number =>
    length + sternOverhang * smoothstep(COUNTER_BASE_HEIGHT_M, COUNTER_TOP_HEIGHT_M, z);

  const keelHeight = (x: number): number => {
    if (x < FOREFOOT_LENGTH_M) {
      const ratio = clamp01(1 - x / FOREFOOT_LENGTH_M);
      return FOREFOOT_HEIGHT_M * (1 - Math.sqrt(1 - ratio * ratio));
    }
    if (x <= AFT_CUTAWAY_START_M) {
      return 0;
    }
    const ratio = clamp01((x - AFT_CUTAWAY_START_M) / (length - AFT_CUTAWAY_START_M));
    const below = AFT_CUTAWAY_HEIGHT_M * ratio * ratio;
    if (x <= length) {
      return below;
    }
    const overhang = clamp01((x - length) / sternOverhang);
    return mix(AFT_CUTAWAY_HEIGHT_M, COUNTER_TOP_HEIGHT_M, Math.sqrt(overhang));
  };

  /** Half-breadth of the midship section at height `z`: flat bottom, round bilge, vertical side. */
  const midshipHalfBreadth = (z: number): number => {
    if (z >= BILGE_RADIUS_M) {
      return halfBreadthMax;
    }
    const drop = BILGE_RADIUS_M - Math.max(z, 0);
    return (
      halfBreadthMax - BILGE_RADIUS_M + Math.sqrt(BILGE_RADIUS_M * BILGE_RADIUS_M - drop * drop)
    );
  };

  const halfBreadth = (x: number, z: number): number => {
    const forwardEnd = stemX(z);
    const afterEnd = sternX(z);
    if (x <= forwardEnd || x >= afterEnd || z < keelHeight(x) || z > topHeight(x) + 1e-6) {
      return 0;
    }
    const heightRatio = clamp01(z / STEM_PERPENDICULAR_HEIGHT_M);
    const entrance = mix(ENTRANCE_LENGTH_LOW_M, ENTRANCE_LENGTH_HIGH_M, heightRatio);
    const run = mix(RUN_LENGTH_LOW_M, RUN_LENGTH_HIGH_M, heightRatio);
    const entranceExponent = mix(ENTRANCE_EXPONENT_LOW, ENTRANCE_EXPONENT_HIGH, heightRatio);
    const runExponent = mix(RUN_EXPONENT_LOW, RUN_EXPONENT_HIGH, heightRatio);
    const forwardTaper =
      Math.sin((Math.PI / 2) * clamp01((x - forwardEnd) / entrance)) ** entranceExponent;
    const afterTaper = Math.sin((Math.PI / 2) * clamp01((afterEnd - x) / run)) ** runExponent;
    const section = midshipHalfBreadth(z - keelHeight(x));
    return section * Math.min(forwardTaper, afterTaper);
  };

  return {
    lengthBetweenPerpendiculars: length,
    halfBreadthMax,
    loadDraught,
    stemX,
    sternX,
    keelHeight,
    topHeight,
    halfBreadth,
  };
}

export interface HullCoefficients {
  readonly block: number;
  readonly prismatic: number;
  readonly midship: number;
  /** Displaced volume below the given draught, in cubic metres. */
  readonly volume: number;
}

/**
 * Integrates the hull form below `draught` and returns its coefficients of form, referred to the
 * length between perpendiculars, the extreme breadth and the draught.
 */
export function measureHullCoefficients(form: HullForm, draught: number): HullCoefficients {
  const stations = 520;
  const levels = 160;
  const dx = form.lengthBetweenPerpendiculars / stations;
  const dz = draught / levels;
  const sectionArea = (x: number): number => {
    let area = 0;
    for (let level = 0; level < levels; level += 1) {
      area += 2 * form.halfBreadth(x, (level + 0.5) * dz) * dz;
    }
    return area;
  };
  let volume = 0;
  for (let station = 0; station < stations; station += 1) {
    volume += sectionArea((station + 0.5) * dx) * dx;
  }
  const midshipArea = sectionArea(form.lengthBetweenPerpendiculars / 2);
  const breadth = form.halfBreadthMax * 2;
  return {
    block: volume / (form.lengthBetweenPerpendiculars * breadth * draught),
    prismatic: volume / (midshipArea * form.lengthBetweenPerpendiculars),
    midship: midshipArea / (breadth * draught),
    volume,
  };
}
