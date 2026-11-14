import { describe, expect, it } from 'vitest';
import { dataset } from '../data/dataset.ts';
import { createHullForm } from '../ship/hullForm.ts';
import { shipTimeToSeconds } from '../time/shipTime.ts';
import { createTimelineModel } from './timelineModel.ts';
import { waterlineFootprint } from './waterline.ts';

const model = createTimelineModel(dataset);
const form = createHullForm(dataset.ship);
const { bow_section: bow, stern_section: stern } = dataset.breakup;
const at = (clock: string) => model.evaluate(shipTimeToSeconds(`1912-04-${clock}`));

describe('waterline footprint', () => {
  it('runs the length of the bow section at the collision, with the full breadth of the hull', () => {
    const footprint = waterlineFootprint(form, at('14T23:40').bow, bow.x_start_m, bow.x_end_m);
    expect(footprint).toBeDefined();
    const length = Math.hypot(
      (footprint?.endForward ?? 0) - (footprint?.startForward ?? 0),
      (footprint?.endStarboard ?? 0) - (footprint?.startStarboard ?? 0),
    );
    expect(length).toBeGreaterThan(130);
    expect(footprint?.halfBreadthM).toBeCloseTo(form.halfBreadthMax, 1);
  });

  it('shortens from forward as the bow goes under', () => {
    const early = waterlineFootprint(form, at('14T23:40').bow, bow.x_start_m, bow.x_end_m);
    const late = waterlineFootprint(form, at('15T02:10').bow, bow.x_start_m, bow.x_end_m);
    expect(late).toBeDefined();
    expect(late?.startForward ?? 0).toBeLessThan((early?.startForward ?? 0) - 20);
  });

  it('exists for the stern section while it floats', () => {
    expect(
      waterlineFootprint(form, at('15T01:00').stern, stern.x_start_m, stern.x_end_m),
    ).toBeDefined();
  });

  it('disappears once a section is wholly under water', () => {
    expect(
      waterlineFootprint(form, at('15T02:19:30').bow, bow.x_start_m, bow.x_end_m),
    ).toBeUndefined();
    expect(
      waterlineFootprint(form, at('15T02:22').stern, stern.x_start_m, stern.x_end_m),
    ).toBeUndefined();
  });
});
