import type { Dataset } from '../data/schema/dataset.ts';
import type { Boat, BoatId } from '../data/schema/lifeboats.ts';
import { createHullForm } from '../ship/hullForm.ts';
import { factValue } from '../ship/particulars.ts';
import { deckHeightAt } from '../ship/sheer.ts';
import { shipTimeToSeconds } from '../time/shipTime.ts';
import { type BodyPoint, bodyToWorld, type Pose, type WorldPoint } from './pose.ts';
import type { BoatState, ShipState, TimelineModel } from './timelineModel.ts';

/**
 * Placement of the lifeboats in the world frame.
 *
 * Stowed and lowering boats follow the dataset: station, side, davits, launch and water times.
 * A boat hangs under its davit head and bears against the ship's side where the list brings the
 * side under the davits. Collapsibles A and B stay on the roof of the officers' quarters until
 * the sea reaches them there.
 *
 * The order to swing the boats out is a record of the chronology (`swing-out-boats`); the moment
 * at which each boat was swung out is not recorded. The lifeboats are shown swinging out together
 * over a minute from the order. The two emergency cutters are swung out from the start, as their
 * record says they were kept. A collapsible lowered from the davits of a cutter swings out over
 * the minute before it starts down. Once afloat, a boat is shown moving slowly away from the
 * ship's side to a holding distance; that motion is illustrative too.
 */
export interface BoatPlacement {
  readonly id: BoatId;
  readonly forward: number;
  readonly starboard: number;
  /** Height of the keel of the boat above the sea. */
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
/** Time over which a boat is shown swinging out. */
const SWING_OUT_SECONDS = 60;
/** Chronology record of the order to swing the boats out. */
const SWING_OUT_EVENT_ID = 'swing-out-boats';
/** Speed at which boats are shown pulling away, and the distances at which they hold. */
const PULLING_SPEED_M_PER_S = 0.45;
const HOLDING_DISTANCE_MIN_M = 140;
const HOLDING_DISTANCE_RANGE_M = 220;
/** Greatest angle between a boat's track and the perpendicular to the ship's side. */
const TRACK_SPREAD_DEG = 50;
/** Resolution of the instants found by bisection on the timeline. */
const INSTANT_RESOLUTION_S = 1e-3;
/** Resolution of the position of the ship's side found by bisection. */
const SIDE_RESOLUTION_M = 1e-4;
/** First distance over which the ship's side is looked for outboard of a boat, and its limit. */
const SIDE_SEARCH_START_M = 1;
const SIDE_SEARCH_LIMIT_M = 64;

const RADIANS_PER_DEGREE = Math.PI / 180;

/** Deterministic value in [0, 1) derived from a boat identifier. */
function unitHash(id: string, salt: number): number {
  let hash = 2166136261 ^ salt;
  for (const character of id) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  }
  return ((hash >>> 0) % 10_000) / 10_000;
}

function mix(a: number, b: number, ratio: number): number {
  return a + (b - a) * ratio;
}

/** Transforms a point of the world frame to the body frame: the inverse of `bodyToWorld`. */
function worldToBody(pose: Pose, point: WorldPoint): BodyPoint {
  const heel = pose.heelDeg * RADIANS_PER_DEGREE;
  const pitch = pose.pitchDeg * RADIANS_PER_DEGREE;
  const yaw = pose.yawDeg * RADIANS_PER_DEGREE;

  const forward = point.forward - pose.forwardM;
  const starboard = point.starboard - pose.starboardM;
  const pitchedUp = point.up - pose.upM;

  const pitchedForward = forward * Math.cos(yaw) + starboard * Math.sin(yaw);
  const heeledStarboard = starboard * Math.cos(yaw) - forward * Math.sin(yaw);

  const levelForward = pitchedForward * Math.cos(pitch) - pitchedUp * Math.sin(pitch);
  const heeledUp = pitchedUp * Math.cos(pitch) + pitchedForward * Math.sin(pitch);

  return {
    x: pose.referenceXM - levelForward,
    y: heeledStarboard * Math.cos(heel) - heeledUp * Math.sin(heel),
    z: pose.referenceZM + heeledUp * Math.cos(heel) + heeledStarboard * Math.sin(heel),
  };
}

interface BoatGeometry {
  readonly boat: Boat;
  readonly side: 1 | -1;
  readonly inBowSection: boolean;
  /** Half the breadth of the boat. */
  readonly halfBreadth: number;
  readonly stowed: BodyPoint;
  readonly davitHead: BodyPoint;
  /** Instant at which the boat leaves its stowage on the way down; unused for a boat floated off. */
  readonly launchSeconds: number;
  /**
   * Instant at which the boat starts swinging out: before the collision for a cutter, the order
   * for a lifeboat, a minute before the launch for a collapsible; never for a boat floated off.
   */
  readonly swingOutSeconds: number;
  /**
   * Time for which a boat reported afloat stays where it is stowed: zero for a boat lowered from
   * the davits, the time the sea takes to reach the stowage for a boat floated off.
   */
  readonly releaseDelaySeconds: number;
  readonly trackDeg: number;
  readonly holdingDistance: number;
  /** World position at which the boat reached the water. */
  readonly waterPoint: { readonly forward: number; readonly starboard: number };
  readonly yawAtWater: number;
}

/**
 * Prepares the placement function. The instants at which each boat leaves its stowage and
 * reaches the water, and the point at which it reaches the water, are computed once.
 */
export function createBoatPlacer(dataset: Dataset, model: TimelineModel): BoatPlacer {
  const swingOutOrder = dataset.chronology.events.find((event) => event.id === SWING_OUT_EVENT_ID);
  if (swingOutOrder === undefined) {
    throw new RangeError(`The chronology has no event "${SWING_OUT_EVENT_ID}".`);
  }
  const swingOutOrderSeconds = shipTimeToSeconds(swingOutOrder.ats);
  const swingOutStart = (boat: Boat, launchSeconds: number): number => {
    if (boat.launch.mode !== 'lowered') {
      return Number.POSITIVE_INFINITY;
    }
    if (boat.type === 'cutter') {
      return Number.NEGATIVE_INFINITY;
    }
    return boat.type === 'collapsible' ? launchSeconds - SWING_OUT_SECONDS : swingOutOrderSeconds;
  };
  const { ship, lifeboats, breakup } = dataset;
  const form = createHullForm(ship);
  const halfBreadth = factValue(ship.particulars, 'breadth') / 2;
  const sectionBoundary = (breakup.bow_section.x_end_m + breakup.stern_section.x_start_m) / 2;

  const poseFor = (state: ShipState, inBowSection: boolean): Pose =>
    inBowSection ? state.bow : state.stern;

  /**
   * First instant from `fromSeconds` at which a condition that then stays true holds, found by
   * bisection on the states of the model; the end of the modelled period if it never holds.
   */
  const firstInstant = (
    holds: (state: ShipState) => boolean,
    fromSeconds = model.startSeconds,
  ): number => {
    let low = fromSeconds;
    let high = model.endSeconds;
    while (high - low > INSTANT_RESOLUTION_S) {
      const middle = (low + high) / 2;
      if (holds(model.evaluate(middle))) {
        high = middle;
      } else {
        low = middle;
      }
    }
    return high;
  };

  /**
   * Whether a point of the world lies inboard of the ship's side on the given side of a section.
   * Above the top of the plating the side is taken to carry on upward at the half-breadth of
   * that top, as the walls of the upper works do.
   */
  const isInboard = (pose: Pose, side: 1 | -1, point: WorldPoint): boolean => {
    const body = worldToBody(pose, point);
    const height = Math.min(body.z, form.topHeight(body.x));
    return side * body.y < form.halfBreadth(body.x, height);
  };

  /**
   * World position of the keel of a boat hanging in its falls, `progress` of the way down from
   * the davit head to the sea. The boat hangs on the vertical of the davit head unless the
   * ship's side at the height of its keel comes within half the breadth of the boat of that
   * vertical: the boat is then moved outboard, level, until it bears against the side.
   */
  const hangingPoint = (
    pose: Pose,
    side: 1 | -1,
    davitHead: BodyPoint,
    boatHalfBreadth: number,
    progress: number,
  ): WorldPoint => {
    const head = bodyToWorld(pose, davitHead);
    const up = Math.max(head.up * (1 - progress), 0);
    const yaw = pose.yawDeg * RADIANS_PER_DEGREE;
    // Horizontal direction pointing away from the ship's side.
    const outboardForward = -side * Math.sin(yaw);
    const outboardStarboard = side * Math.cos(yaw);
    const pointAt = (distance: number): WorldPoint => ({
      forward: head.forward + distance * outboardForward,
      starboard: head.starboard + distance * outboardStarboard,
      up,
    });
    // Distances are measured outboard from the vertical of the davit head. The side clears the
    // boat when the point half a breadth inboard of that vertical is already outside the hull.
    let inboard = -boatHalfBreadth;
    if (!isInboard(pose, side, pointAt(inboard))) {
      return pointAt(0);
    }
    // The side is bracketed by doubling the distance searched, then found by bisection.
    let reach = SIDE_SEARCH_START_M;
    let outboard = inboard + reach;
    while (reach < SIDE_SEARCH_LIMIT_M && isInboard(pose, side, pointAt(outboard))) {
      inboard = outboard;
      reach *= 2;
      outboard = inboard + reach;
    }
    while (outboard - inboard > SIDE_RESOLUTION_M) {
      const middle = (inboard + outboard) / 2;
      if (isInboard(pose, side, pointAt(middle))) {
        inboard = middle;
      } else {
        outboard = middle;
      }
    }
    return pointAt(outboard + boatHalfBreadth);
  };

  const geometries: readonly BoatGeometry[] = lifeboats.boats.map((boat, index) => {
    const type = lifeboats.types.find((candidate) => candidate.id === boat.type);
    if (type === undefined) {
      throw new RangeError(`The dataset has no type of boat "${boat.type}".`);
    }
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
    const boatHalfBreadth = type.breadth_m / 2;

    // The instants at which the model reports the boat under way and afloat are found on its
    // own states.
    const launchSeconds = firstInstant((state) => state.boats[index]?.status !== 'stowed');
    const afloatSeconds = firstInstant((state) => state.boats[index]?.status === 'afloat');
    // A boat floated off leaves its stowage when the sea reaches its keel there.
    const releaseSeconds =
      boat.launch.mode === 'floated-off'
        ? firstInstant(
            (state) => bodyToWorld(poseFor(state, inBowSection), stowed).up <= 0,
            afloatSeconds,
          )
        : afloatSeconds;
    const poseAtWater = poseFor(model.evaluate(releaseSeconds), inBowSection);
    const entry =
      boat.launch.mode === 'floated-off'
        ? bodyToWorld(poseAtWater, stowed)
        : hangingPoint(poseAtWater, side, davitHead, boatHalfBreadth, 1);
    return {
      boat,
      side,
      inBowSection,
      halfBreadth: boatHalfBreadth,
      stowed,
      davitHead,
      launchSeconds,
      swingOutSeconds: swingOutStart(boat, launchSeconds),
      releaseDelaySeconds: releaseSeconds - afloatSeconds,
      trackDeg: (unitHash(boat.id, 1) * 2 - 1) * TRACK_SPREAD_DEG,
      holdingDistance: HOLDING_DISTANCE_MIN_M + unitHash(boat.id, 2) * HOLDING_DISTANCE_RANGE_M,
      waterPoint: { forward: entry.forward, starboard: entry.starboard },
      yawAtWater: poseAtWater.yawDeg,
    };
  });

  /** Placement of a boat in its stowage, carried by its section of the hull. */
  const stowedPlacement = (geometry: BoatGeometry, pose: Pose): BoatPlacement => ({
    id: geometry.boat.id,
    ...bodyToWorld(pose, geometry.stowed),
    yawDeg: pose.yawDeg,
    pitchDeg: pose.pitchDeg,
    heelDeg: pose.heelDeg,
  });

  const place = (geometry: BoatGeometry, boatState: BoatState, state: ShipState): BoatPlacement => {
    const pose = poseFor(state, geometry.inBowSection);
    const { side, davitHead } = geometry;
    const id = geometry.boat.id;
    if (boatState.status === 'stowed') {
      const stowed = stowedPlacement(geometry, pose);
      const swing = (state.t - geometry.swingOutSeconds) / SWING_OUT_SECONDS;
      if (swing <= 0) {
        return stowed;
      }
      // Swinging out, then swung out: the boat moves from its chocks to the place from which it
      // starts down, coming level as the falls take its weight. The motion eases in and out.
      const ratio = Math.min(swing, 1);
      const eased = ratio * ratio * (3 - 2 * ratio);
      const swungOut = hangingPoint(pose, side, davitHead, geometry.halfBreadth, 0);
      return {
        id,
        forward: mix(stowed.forward, swungOut.forward, eased),
        starboard: mix(stowed.starboard, swungOut.starboard, eased),
        up: mix(stowed.up, swungOut.up, eased),
        yawDeg: pose.yawDeg,
        pitchDeg: mix(pose.pitchDeg, 0, eased),
        heelDeg: mix(pose.heelDeg, 0, eased),
      };
    }
    if (boatState.status === 'lowering') {
      const hanging = hangingPoint(
        pose,
        side,
        davitHead,
        geometry.halfBreadth,
        boatState.loweringProgress,
      );
      return { id, ...hanging, yawDeg: pose.yawDeg, pitchDeg: 0, heelDeg: 0 };
    }
    const secondsAway = boatState.secondsAfloat - geometry.releaseDelaySeconds;
    if (secondsAway < 0) {
      return stowedPlacement(geometry, pose);
    }
    // Afloat: the boat pulls away from the ship's side along a fixed track, easing to a stop.
    const distance =
      geometry.holdingDistance *
      (1 - Math.exp((-PULLING_SPEED_M_PER_S * secondsAway) / geometry.holdingDistance));
    const outwardDeg = geometry.yawAtWater + side * (90 + geometry.trackDeg);
    const outward = outwardDeg * RADIANS_PER_DEGREE;
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
