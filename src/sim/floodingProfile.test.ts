import { describe, expect, it } from 'vitest';
import { dataset } from '../data/dataset.ts';
import { createFloodingProfile } from './floodingProfile.ts';
import { createTimelineModel } from './timelineModel.ts';

const model = createTimelineModel(dataset);
const profile = createFloodingProfile(dataset);

describe('flooding profile', () => {
  it('outlines the whole hull, from the stem to the overhanging stern', () => {
    const stations = profile.outline.map(([x]) => x);
    expect(Math.min(...stations)).toBeCloseTo(profile.xForward, 6);
    expect(Math.max(...stations)).toBeCloseTo(profile.xAft, 6);
    expect(profile.xAft - profile.xForward).toBeGreaterThan(268);
    expect(profile.xAft - profile.xForward).toBeLessThan(270);
    expect(Math.min(...profile.outline.map(([, z]) => z))).toBe(0);
  });

  it('has the sixteen compartments end to end and the fifteen bulkheads between them', () => {
    expect(profile.compartments).toHaveLength(16);
    expect(profile.bulkheads).toHaveLength(15);
    profile.bulkheads.forEach((bulkhead, index) => {
      expect(bulkhead.x).toBeCloseTo(profile.compartments[index]?.xEnd ?? Number.NaN, 6);
      expect(bulkhead.topZ).toBeGreaterThan(10);
    });
  });

  it('is dry at the collision and shows the sea at the load draught', () => {
    const state = model.evaluate(0);
    for (const water of profile.water(state)) {
      expect(water.depthM).toBeLessThan(0.1);
    }
    const sea = profile.seaLine(state);
    expect(sea?.forwardZ).toBeGreaterThan(9);
    expect(sea?.aftZ).toBeLessThan(12);
  });

  it('fills the forward compartments first and keeps the water inside the hull', () => {
    const state = model.evaluate(3600);
    const water = profile.water(state);
    expect(water[1]?.depthM).toBeGreaterThan(5);
    expect(water[12]?.depthM).toBeLessThan(0.1);
    water.forEach((entry, index) => {
      const compartment = profile.compartments[index];
      expect(entry.waterZ).toBeGreaterThanOrEqual(compartment?.floorZ ?? Number.NaN);
      expect(entry.waterZ).toBeLessThanOrEqual(compartment?.topZ ?? Number.NaN);
    });
  });

  it('shows the sea higher at the bow than at the stern as the ship trims by the head', () => {
    const sea = profile.seaLine(model.evaluate(8400));
    expect(sea).not.toBeNull();
    expect(sea?.forwardZ ?? 0).toBeGreaterThan((sea?.aftZ ?? 0) + 15);
  });

  it('gives no sea line once the hull has parted', () => {
    expect(profile.seaLine(model.evaluate(model.breakSeconds + 30))).toBeNull();
  });
});
