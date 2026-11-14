import { describe, expect, it } from 'vitest';
import { dataset } from '../data/dataset.ts';
import { shipTimeToSeconds } from '../time/shipTime.ts';
import { createBoatPlacer } from './boatPlacement.ts';
import { createTimelineModel } from './timelineModel.ts';

const model = createTimelineModel(dataset);
const placeBoats = createBoatPlacer(dataset, model);
const placedAt = (clock: string) => {
  const state = model.evaluate(shipTimeToSeconds(`1912-04-${clock}`));
  return new Map(placeBoats(state).map((placement) => [placement.id, placement]));
};

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

  it('carries a lowering boat outboard and down toward the water', () => {
    const start = placedAt('15T00:40');
    const halfway = placedAt('15T00:42:30');
    const end = placedAt('15T00:45');
    expect(start.get('7')?.starboard).toBeGreaterThan(15);
    expect(halfway.get('7')?.up).toBeLessThan(start.get('7')?.up ?? 0);
    expect(halfway.get('7')?.up).toBeGreaterThan(0);
    expect(end.get('7')?.up).toBe(0);
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

  it('is a function of the state alone', () => {
    const state = model.evaluate(5000);
    expect(placeBoats(state)).toEqual(placeBoats(state));
    expect(createBoatPlacer(dataset, model)(state)).toEqual(placeBoats(state));
  });
});
