import { describe, expect, it } from 'vitest';
import { dataset } from '../data/dataset.ts';
import { createTimelineModel } from '../sim/timelineModel.ts';
import { shipTimeToSeconds } from '../time/shipTime.ts';
import {
  describeBoats,
  describeFlooding,
  describeLighting,
  describeList,
  describeScene,
  describeTrim,
  describeWaterAboard,
} from './stateText.ts';

const model = createTimelineModel(dataset);
const at = (clock: string) => model.evaluate(shipTimeToSeconds(`1912-04-${clock}`));

describe('attitude in words', () => {
  it('describes trim by the head and by the stern', () => {
    expect(describeTrim(3.24)).toBe('3.2° by the head');
    expect(describeTrim(-0.2)).toBe('0.2° by the stern');
    expect(describeTrim(0.01)).toBe('On an even keel');
  });

  it('describes list to either side', () => {
    expect(describeList(5)).toBe('5.0° to starboard');
    expect(describeList(-10)).toBe('10.0° to port');
    expect(describeList(-0.01)).toBe('Upright');
  });
});

describe('quantities in words', () => {
  it('rounds the mass of water aboard', () => {
    expect(describeWaterAboard(16260)).toBe('About 16,300 tonnes');
    expect(describeWaterAboard(null)).toBe('Not applicable after the break-up');
  });

  it('describes the lighting', () => {
    expect(describeLighting(1)).toBe('All lights burning');
    expect(describeLighting(0.7)).toBe('Lights still on, power failing');
    expect(describeLighting(0)).toBe('Lights out');
  });

  it('counts boats and compartments', () => {
    expect(describeBoats(at('14T23:40'))).toBe('0 of 20 away');
    expect(describeBoats(at('15T00:42'))).toBe('0 of 20 away, 1 being lowered');
    expect(describeBoats(at('15T02:20'))).toBe('20 of 20 away');
    expect(describeFlooding(at('14T23:40'))).toBe('No water in the ship');
    expect(describeFlooding(at('15T01:20'))).toMatch(
      /^\d+ of 16 compartments flooded, \d+ flooding$/,
    );
  });
});

describe('scene description', () => {
  it('describes each phase of the night', () => {
    expect(describeScene(at('14T23:40'))).toContain('floats almost level');
    expect(describeScene(at('15T01:50'))).toContain('by the head');
    expect(describeScene(at('15T01:50'))).toContain('to port');
    expect(describeScene(at('15T02:18'))).toContain('parted');
    expect(describeScene(at('15T02:22'))).toContain('falling toward the seabed');
    expect(describeScene(at('15T02:26'))).toContain('wreck');
  });

  it('mentions a distress signal only while one is in the air', () => {
    expect(describeScene(at('15T00:47:05'))).toContain('distress signal');
    expect(describeScene(at('15T00:50'))).not.toContain('distress signal');
  });

  it('never dramatises: no exclamation marks', () => {
    for (let t = 0; t <= model.endSeconds; t += 300) {
      expect(describeScene(model.evaluate(t))).not.toContain('!');
    }
  });
});
