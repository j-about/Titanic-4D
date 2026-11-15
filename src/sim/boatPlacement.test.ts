import { describe, expect, it } from 'vitest';
import { dataset } from '../data/dataset.ts';
import type { Boat } from '../data/schema/lifeboats.ts';
import { createHullForm } from '../ship/hullForm.ts';
import { shipTimeToSeconds } from '../time/shipTime.ts';
import { type BoatPlacement, createBoatPlacer } from './boatPlacement.ts';
import { bodyToWorld, type Pose, type WorldPoint } from './pose.ts';
import { createTimelineModel, type ShipState } from './timelineModel.ts';

const model = createTimelineModel(dataset);
const placeBoats = createBoatPlacer(dataset, model);
const form = createHullForm(dataset.ship);
const { boats, types } = dataset.lifeboats;

const placedAt = (clock: string) => {
  const state = model.evaluate(shipTimeToSeconds(`1912-04-${clock}`));
  return new Map(placeBoats(state).map((placement) => [placement.id, placement]));
};

function placementOf(boat: Boat, state: ShipState): BoatPlacement {
  const placement = placeBoats(state).find((candidate) => candidate.id === boat.id);
  if (placement === undefined) {
    throw new RangeError(`Boat "${boat.id}" is not placed.`);
  }
  return placement;
}

function statusOf(boat: Boat, state: ShipState): string | undefined {
  return state.boats.find((candidate) => candidate.id === boat.id)?.status;
}

function sideOf(boat: Boat): 1 | -1 {
  return boat.side === 'starboard' ? 1 : -1;
}

function halfBreadthOf(boat: Boat): number {
  return (types.find((type) => type.id === boat.type)?.breadth_m ?? Number.NaN) / 2;
}

/** Pose of the section of the hull that carries a boat. */
function poseOf(boat: Boat, state: ShipState): Pose {
  const { bow_section, stern_section } = dataset.breakup;
  const boundary = (bow_section.x_end_m + stern_section.x_start_m) / 2;
  return boat.station.x_m < boundary ? state.bow : state.stern;
}

/**
 * Point of the ship's side abreast of a point of the world, at the same height: the station and
 * the height above the keel of the point of the shell that has the forward coordinate and the
 * height of the target are found by successive bisections, with the forward transform alone.
 * Above the top of the plating the side carries on upward, as the walls of the upper works do.
 */
function shipSideAbreast(
  pose: Pose,
  side: 1 | -1,
  station: number,
  target: WorldPoint,
): WorldPoint {
  const shell = (x: number, z: number): WorldPoint =>
    bodyToWorld(pose, {
      x,
      y: side * form.halfBreadth(x, Math.min(z, form.topHeight(x))),
      z,
    });
  let x = station;
  let point = shell(x, 0);
  for (let pass = 0; pass < 20; pass += 1) {
    // Above the turn of the bilge the height of the shell in the world rises with `z`.
    let low = form.keelHeight(x) + 5;
    let high = 60;
    for (let step = 0; step < 60; step += 1) {
      const middle = (low + high) / 2;
      if (shell(x, middle).up < target.up) {
        low = middle;
      } else {
        high = middle;
      }
    }
    point = shell(x, high);
    x -= (target.forward - point.forward) / Math.cos((pose.pitchDeg * Math.PI) / 180);
  }
  expect(point.up).toBeCloseTo(target.up, 6);
  expect(point.forward).toBeCloseTo(target.forward, 6);
  return point;
}

/** Distance from the ship's side to the centre line of a boat, positive outboard. */
function clearanceFromSide(boat: Boat, state: ShipState): number {
  const placement = placementOf(boat, state);
  const side = shipSideAbreast(poseOf(boat, state), sideOf(boat), boat.station.x_m, placement);
  return sideOf(boat) * (placement.starboard - side.starboard);
}

/** Seconds at which a boat lowered from the davits starts down and reaches the water. */
function loweringSpan(boat: Boat): { launch: number; water: number } {
  const launch = shipTimeToSeconds(boat.launch.ats);
  let water = launch;
  while (statusOf(boat, model.evaluate(water)) !== 'afloat') {
    water += 1;
  }
  return { launch, water };
}

const loweredBoats = boats.filter((boat) => boat.launch.mode === 'lowered');
const floatedOffBoats = boats.filter((boat) => boat.launch.mode === 'floated-off');

describe('boat placement', () => {
  it('stows odd-numbered boats to starboard and even-numbered boats to port, on the Boat deck', () => {
    const placed = placedAt('14T23:40');
    expect(placed.get('7')?.starboard).toBeGreaterThan(10);
    expect(placed.get('8')?.starboard).toBeLessThan(-10);
    expect(placed.get('7')?.up).toBeGreaterThan(17);
    expect(placed.get('7')?.up).toBeLessThan(21);
  });

  it('stows collapsibles A and B higher than the boats on deck', () => {
    const placed = placedAt('14T23:40');
    expect((placed.get('a')?.up ?? 0) - (placed.get('c')?.up ?? 0)).toBeGreaterThan(2);
  });

  it('swings the lifeboats out over the minute that follows the order', () => {
    const stowed = placedAt('15T00:11:59').get('7');
    const halfway = placedAt('15T00:12:30').get('7');
    const swungOut = placedAt('15T00:13').get('7');
    const beforeLaunch = placedAt('15T00:39:59').get('7');
    if (
      stowed === undefined ||
      halfway === undefined ||
      swungOut === undefined ||
      beforeLaunch === undefined
    ) {
      throw new RangeError('Boat 7 is not placed.');
    }
    // From 1.7 m inboard of the ship's side to 1.6 m outboard of it, at the height of the chocks.
    expect(swungOut.starboard - stowed.starboard).toBeCloseTo(3.3, 1);
    expect(halfway.starboard).toBeCloseTo((stowed.starboard + swungOut.starboard) / 2, 1);
    expect(Math.abs(halfway.up - stowed.up)).toBeLessThan(0.5);
    expect(swungOut.starboard).toBeGreaterThan(15);
    // Carried by the hull in its chocks, level once it hangs in the falls.
    const state = model.evaluate(shipTimeToSeconds('1912-04-15T00:11:59'));
    expect(stowed.heelDeg).toBe(state.bow.heelDeg);
    expect(stowed.pitchDeg).toBe(state.bow.pitchDeg);
    expect(swungOut.heelDeg).toBe(0);
    expect(swungOut.pitchDeg).toBe(0);
    // It stays swung out until it starts down.
    expect(beforeLaunch.starboard).toBeGreaterThan(15);
    expect(beforeLaunch.heelDeg).toBe(0);
  });

  it('keeps the cutters swung out from the start and swings a collapsible out before it starts down', () => {
    const halfBreadth = createHullForm(dataset.ship).halfBreadthMax;
    const atCollision = placedAt('14T23:40');
    expect(atCollision.get('1')?.starboard ?? 0).toBeGreaterThan(halfBreadth);
    expect(atCollision.get('2')?.starboard ?? 0).toBeLessThan(-halfBreadth);
    expect(Math.abs(atCollision.get('7')?.starboard ?? 0)).toBeLessThan(halfBreadth);

    const collapsible = dataset.lifeboats.boats.find((boat) => boat.id === 'c');
    if (collapsible === undefined) {
      throw new RangeError('The dataset has no collapsible C.');
    }
    const launch = model.events.find(
      (event) => event.id.endsWith('-c') && event.kind === 'lifeboat',
    );
    expect(launch).toBeDefined();
    const launchSeconds = launch?.t ?? 0;
    const side = collapsible.side === 'starboard' ? 1 : -1;
    const inboard = placeBoats(model.evaluate(launchSeconds - 61)).find((boat) => boat.id === 'c');
    const outboard = placeBoats(model.evaluate(launchSeconds - 0.5)).find(
      (boat) => boat.id === 'c',
    );
    // The list moves the whole side; the boat itself travels outboard by about three metres.
    expect(side * ((outboard?.starboard ?? 0) - (inboard?.starboard ?? 0))).toBeGreaterThan(2.5);
  });

  it('carries a lowering boat outboard and down toward the water', () => {
    const start = placedAt('15T00:40');
    const halfway = placedAt('15T00:42:30');
    const end = placedAt('15T00:45');
    expect(start.get('7')?.starboard).toBeGreaterThan(15);
    expect(halfway.get('7')?.up).toBeLessThan(start.get('7')?.up ?? 0);
    expect(halfway.get('7')?.up).toBeGreaterThan(0);
    expect(end.get('7')?.up).toBe(0);
  });

  it("keeps every boat lowered from the davits clear of the ship's side, down to the water", () => {
    expect(loweredBoats).toHaveLength(18);
    for (const boat of loweredBoats) {
      const { launch, water } = loweringSpan(boat);
      const instants = [water, water + 1];
      for (let t = launch; t < water; t += 10) {
        instants.push(t);
      }
      for (const t of instants) {
        const clearance = clearanceFromSide(boat, model.evaluate(t));
        expect(clearance, `boat ${boat.id} at ${t} s`).toBeGreaterThanOrEqual(
          halfBreadthOf(boat) - 0.002,
        );
      }
    }
  });

  it('lets a boat bear against the side where the list brings the side under the davits', () => {
    // Boats 13 and 15 lay against the starboard side (list keyframe of `data/attitude.json`).
    for (const id of ['13', '15']) {
      const boat = boats.find((candidate) => candidate.id === id);
      if (boat === undefined) {
        throw new RangeError(`The dataset has no boat "${id}".`);
      }
      const { water } = loweringSpan(boat);
      expect(clearanceFromSide(boat, model.evaluate(water))).toBeCloseTo(halfBreadthOf(boat), 2);
    }
  });

  it('hangs a boat under its davit head where the side is clear of it', () => {
    const boat = boats.find((candidate) => candidate.id === '7');
    if (boat === undefined) {
      throw new RangeError('The dataset has no boat "7".');
    }
    const { launch } = loweringSpan(boat);
    const state = model.evaluate(launch);
    // The davit head is 1.6 m outboard of the side, measured across the heeled deck.
    const heel = (state.bow.heelDeg * Math.PI) / 180;
    expect(clearanceFromSide(boat, state)).toBeCloseTo(1.6 / Math.cos(heel), 2);
    expect(clearanceFromSide(boat, state)).toBeGreaterThan(halfBreadthOf(boat) + 0.1);
  });

  it('keeps boats afloat on the surface, moving away from their side of the ship', () => {
    const placed = placedAt('15T02:10');
    for (const placement of placed.values()) {
      if (['a', 'b'].includes(placement.id)) {
        continue;
      }
      expect(placement.up, placement.id).toBe(0);
    }
    expect(placed.get('7')?.starboard).toBeGreaterThan(60);
    expect(placed.get('8')?.starboard).toBeLessThan(-60);
  });

  it('never lets a boat pass through the water entry point on the way out', () => {
    let previous = placedAt('15T00:45').get('7')?.starboard ?? 0;
    for (const clock of ['15T00:50', '15T01:00', '15T01:30', '15T02:20']) {
      const current = placedAt(clock).get('7')?.starboard ?? 0;
      expect(current).toBeGreaterThanOrEqual(previous);
      previous = current;
    }
  });

  it('leaves collapsibles A and B on the roof until the sea reaches them there', () => {
    expect(floatedOffBoats.map((boat) => boat.id)).toEqual(['a', 'b']);
    for (const boat of floatedOffBoats) {
      const floatedOff = shipTimeToSeconds(boat.launch.ats);
      const atFloatOff = model.evaluate(floatedOff);
      expect(statusOf(boat, atFloatOff)).toBe('afloat');
      // Still carried by the forward section, above the sea, at the recorded time.
      const carried = placementOf(boat, atFloatOff);
      expect(carried.up).toBeGreaterThan(1);
      expect(carried.pitchDeg).toBe(atFloatOff.bow.pitchDeg);
      expect(carried.heelDeg).toBe(atFloatOff.bow.heelDeg);

      let released = floatedOff;
      while (placementOf(boat, model.evaluate(released)).up > 0) {
        released += 1;
      }
      expect(released).toBeLessThan(model.breakSeconds);
      const before = placementOf(boat, model.evaluate(released - 1));
      const after = placementOf(boat, model.evaluate(released));
      expect(before.up).toBeLessThan(0.5);
      expect(after.up).toBe(0);
      expect(
        Math.hypot(after.forward - before.forward, after.starboard - before.starboard),
      ).toBeLessThan(0.6);
      // From then on the boat stays on the surface and moves away.
      const later = placementOf(boat, model.evaluate(released + 120));
      expect(later.up).toBe(0);
      expect(
        Math.hypot(later.forward - after.forward, later.starboard - after.starboard),
      ).toBeGreaterThan(30);
    }
  });

  it('moves no boat by more than a metre from one second to the next', () => {
    let previous = placeBoats(model.evaluate(model.startSeconds));
    let greatest = 0;
    for (let t = model.startSeconds + 1; t <= model.endSeconds; t += 1) {
      const current = placeBoats(model.evaluate(t));
      current.forEach((placement, index) => {
        const before = previous[index];
        if (before === undefined) {
          throw new RangeError(`Boat "${placement.id}" was not placed a second earlier.`);
        }
        const moved = Math.hypot(
          placement.forward - before.forward,
          placement.starboard - before.starboard,
          placement.up - before.up,
        );
        if (moved > 1) {
          throw new Error(`Boat ${placement.id} moves ${moved.toFixed(2)} m at ${t} s.`);
        }
        greatest = Math.max(greatest, moved);
      });
      previous = current;
    }
    expect(greatest).toBeGreaterThan(0);
    expect(greatest).toBeLessThan(1);
  });

  it('is a function of the state alone', () => {
    for (const t of [3570, 5000, 7300, 9330]) {
      const state = model.evaluate(t);
      expect(placeBoats(state)).toEqual(placeBoats(state));
      expect(createBoatPlacer(dataset, model)(state)).toEqual(placeBoats(state));
    }
    // Reaching an instant from either side gives the same placements.
    const forward = [7299, 7300].map((t) => placeBoats(model.evaluate(t)))[1];
    const backward = [7301, 7300].map((t) => placeBoats(model.evaluate(t)))[1];
    expect(forward).toEqual(backward);
  });
});
