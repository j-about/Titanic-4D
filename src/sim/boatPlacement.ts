import type { Dataset } from '../data/schema/dataset.ts';
import type { Boat, BoatId } from '../data/schema/lifeboats.ts';
import { factValue } from '../ship/particulars.ts';
import { deckHeightAt } from '../ship/sheer.ts';
import { bodyToWorld, type Pose } from './pose.ts';
import type { BoatState, ShipState, TimelineModel } from './timelineModel.ts';

/**
 * Placement of the lifeboats in the world frame.
 *
 * Stowed and lowering boats follow the dataset: station, side, davits, launch and water times.
 * Where the boats went once afloat is not recorded by the sources; they are shown moving slowly
 * away from the ship's side to a holding distance. That motion is illustrative.
 */
export interface BoatPlacement {
  readonly id: BoatId;
  readonly forward: number;
  readonly starboard: number;
  readonly up: number;
  /** Heading of the boat's bow, in degrees clockwise from the ship's heading at the break. */
  readonly yawDeg: number;
  readonly pitchDeg: number;
  readonly heelDeg: number;
}

export type BoatPlacer = (state: ShipState) => readonly BoatPlacement[];

/** Distance by which the davits carry a boat outboard of the ship's side. */
const DAVIT_OUTREACH_M = 1.6;
/** Distance of a stowed boat's centre line inboard of the ship's side. */
const STOWED_INBOARD_M = 1.7;
const COLLAPSIBLE_ON_DECK_INBOARD_M = 4.4;
const COLLAPSIBLE_ON_ROOF_OFFSET_M = 3.6;
/** Height of a stowed boat's keel above the deck it stands on. */
const CHOCK_HEIGHT_M = 0.7;
const OFFICERS_QUARTERS_ROOF_M = 2.9;
/** Speed at which boats are shown pulling away, and the distances at which they hold. */
const PULLING_SPEED_M_PER_S = 0.45;
const HOLDING_DISTANCE_MIN_M = 140;
const HOLDING_DISTANCE_RANGE_M = 220;
/** Greatest angle between a boat's track and the perpendicular to the ship's side. */
const TRACK_SPREAD_DEG = 50;

/** Deterministic value in [0, 1) derived from a boat identifier. */
function unitHash(id: string, salt: number): number {
  let hash = 2166136261 ^ salt;
  for (const character of id) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  }
  return ((hash >>> 0) % 10_000) / 10_000;
}

interface BoatGeometry {
  readonly boat: Boat;
  readonly side: 1 | -1;
  readonly inBowSection: boolean;
  readonly stowed: { readonly x: number; readonly y: number; readonly z: number };
  readonly davitHead: { readonly x: number; readonly y: number; readonly z: number };
  readonly trackDeg: number;
  readonly holdingDistance: number;
  /** World position at which the boat reached the water. */
  readonly waterPoint: { readonly forward: number; readonly starboard: number };
  readonly yawAtWater: number;
}

/** Prepares the placement function. The water entry point of each boat is computed once. */
export function createBoatPlacer(dataset: Dataset, model: TimelineModel): BoatPlacer {
  const { ship, lifeboats, breakup } = dataset;
  const halfBreadth = factValue(ship.particulars, 'breadth') / 2;
  const sectionBoundary = (breakup.bow_section.x_end_m + breakup.stern_section.x_start_m) / 2;
  const waterSeconds = new Map<BoatId, number>();
  for (let index = 0; index < lifeboats.boats.length; index += 1) {
    const boat = lifeboats.boats[index];
    if (boat === undefined) {
      continue;
    }
    // The first instant at which the model reports the boat afloat is found by bisection on its
    // own state, so that the placer needs no knowledge of how lowering times are defined.
    let low = model.startSeconds;
    let high = model.endSeconds;
    while (high - low > 0.5) {
      const middle = (low + high) / 2;
      if (model.evaluate(middle).boats[index]?.status === 'afloat') {
        high = middle;
      } else {
        low = middle;
      }
    }
    waterSeconds.set(boat.id, high);
  }

  const poseFor = (state: ShipState, inBowSection: boolean): Pose =>
    inBowSection ? state.bow : state.stern;

  const geometries: readonly BoatGeometry[] = lifeboats.boats.map((boat) => {
    const side = boat.side === 'starboard' ? 1 : -1;
    const x = boat.station.x_m;
    const deck = deckHeightAt(ship, 'boat', x);
    const onRoof = boat.station.group === 'officers-quarters-roof';
    const onDeckCollapsible = boat.type === 'collapsible' && !onRoof;
    let inboard = STOWED_INBOARD_M;
    if (onRoof) {
      inboard = halfBreadth - COLLAPSIBLE_ON_ROOF_OFFSET_M;
    } else if (onDeckCollapsible) {
      inboard = COLLAPSIBLE_ON_DECK_INBOARD_M;
    }
    const stowed = {
      x,
      y: side * (halfBreadth - inboard),
      z: deck + CHOCK_HEIGHT_M + (onRoof ? OFFICERS_QUARTERS_ROOF_M : 0),
    };
    const davitHead = { x, y: side * (halfBreadth + DAVIT_OUTREACH_M), z: deck + CHOCK_HEIGHT_M };
    const inBowSection = x < sectionBoundary;
    const atWater = model.evaluate(waterSeconds.get(boat.id) ?? model.startSeconds);
    const pose = poseFor(atWater, inBowSection);
    const entry = bodyToWorld(pose, boat.launch.mode === 'floated-off' ? stowed : davitHead);
    return {
      boat,
      side,
      inBowSection,
      stowed,
      davitHead,
      trackDeg: (unitHash(boat.id, 1) * 2 - 1) * TRACK_SPREAD_DEG,
      holdingDistance: HOLDING_DISTANCE_MIN_M + unitHash(boat.id, 2) * HOLDING_DISTANCE_RANGE_M,
      waterPoint: { forward: entry.forward, starboard: entry.starboard },
      yawAtWater: pose.yawDeg,
    };
  });

  const place = (geometry: BoatGeometry, boatState: BoatState, state: ShipState): BoatPlacement => {
    const pose = poseFor(state, geometry.inBowSection);
    const id = geometry.boat.id;
    if (boatState.status === 'stowed') {
      const world = bodyToWorld(pose, geometry.stowed);
      return { id, ...world, yawDeg: pose.yawDeg, pitchDeg: pose.pitchDeg, heelDeg: pose.heelDeg };
    }
    if (boatState.status === 'lowering') {
      const head = bodyToWorld(pose, geometry.davitHead);
      const up = Math.max(head.up * (1 - boatState.loweringProgress), 0);
      return {
        id,
        forward: head.forward,
        starboard: head.starboard,
        up,
        yawDeg: pose.yawDeg,
        pitchDeg: 0,
        heelDeg: 0,
      };
    }
    // Afloat: the boat pulls away from the ship's side along a fixed track, easing to a stop.
    const distance =
      geometry.holdingDistance *
      (1 - Math.exp((-PULLING_SPEED_M_PER_S * boatState.secondsAfloat) / geometry.holdingDistance));
    const outwardDeg = geometry.yawAtWater + geometry.side * (90 + geometry.trackDeg);
    const outward = (outwardDeg * Math.PI) / 180;
    return {
      id,
      forward: geometry.waterPoint.forward + distance * Math.cos(outward),
      starboard: geometry.waterPoint.starboard + distance * Math.sin(outward),
      up: 0,
      yawDeg: outwardDeg,
      pitchDeg: 0,
      heelDeg: 0,
    };
  };

  return (state) =>
    geometries.map((geometry, index) => {
      const boatState = state.boats[index];
      if (boatState === undefined) {
        throw new RangeError(`No state for boat "${geometry.boat.id}".`);
      }
      return place(geometry, boatState, state);
    });
}
