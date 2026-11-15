import { describe, expect, it } from 'vitest';
import { dataset } from '../data/dataset.ts';
import type { SiteFile } from '../data/schema/site.ts';
import { createTimelineModel } from '../sim/timelineModel.ts';
import {
  californianLightPosition,
  distantLightPosition,
  isCalifornianLightShown,
  MODELLED_ELEVATION_DEG,
} from './californianLight.ts';

const METRES_PER_NAUTICAL_MILE = 1852;
const model = createTimelineModel(dataset);

const fact = (site: SiteFile, id: string) => {
  const found = site.californian.find((candidate) => candidate.id === id);
  if (found === undefined) {
    throw new RangeError(`No fact "${id}".`);
  }
  return found;
};

/** The site with one record of the Californian replaced. */
const withFact = (id: string, changes: { value?: number; unit?: string }): SiteFile => ({
  ...dataset.site,
  californian: dataset.site.californian.map((candidate) =>
    candidate.id === id ? { ...candidate, ...changes } : candidate,
  ),
});

describe('distant light', () => {
  it('lies ahead on the bearing of the heading and to starboard a quarter turn clockwise', () => {
    const ahead = distantLightPosition(1000, 20, 20, 0);
    expect(ahead[0]).toBeCloseTo(1000, 9);
    expect(ahead[1]).toBeCloseTo(0, 9);
    expect(ahead[2]).toBeCloseTo(0, 9);
    const abeam = distantLightPosition(1000, 110, 20, 0);
    expect(abeam[0]).toBeCloseTo(0, 9);
    expect(abeam[2]).toBeCloseTo(1000, 9);
  });

  it('lies to port for a bearing anticlockwise of the heading, across north too', () => {
    const position = distantLightPosition(1000, 350, 10, 0);
    expect(position[0]).toBeCloseTo(1000 * Math.cos((20 * Math.PI) / 180), 9);
    expect(position[2]).toBeCloseTo(-1000 * Math.sin((20 * Math.PI) / 180), 9);
  });

  it('is seen from the origin at the given distance over the sea and angle above the horizon', () => {
    const position = distantLightPosition(5000, 300, 45, 1.5);
    const overSea = Math.hypot(position[0], position[2]);
    expect(overSea).toBeCloseTo(5000, 6);
    expect((Math.atan2(position[1], overSea) * 180) / Math.PI).toBeCloseTo(1.5, 9);
  });
});

describe('light of the Californian', () => {
  const distanceM = fact(dataset.site, 'californian-distance').value ?? Number.NaN;
  const bearingDeg = fact(dataset.site, 'californian-bearing').value ?? Number.NaN;
  const position = californianLightPosition(dataset.site);

  it('stands at the recorded distance, in nautical miles', () => {
    expect(fact(dataset.site, 'californian-distance').unit).toBe('nmi');
    expect(Math.hypot(position[0], position[2])).toBeCloseTo(
      distanceM * METRES_PER_NAUTICAL_MILE,
      6,
    );
  });

  it('stands on the recorded true bearing, turned by the heading of the ship', () => {
    const relativeDeg = (Math.atan2(position[2], position[0]) * 180) / Math.PI;
    const expected = ((bearingDeg - dataset.site.heading.true_deg + 540) % 360) - 180;
    expect(relativeDeg).toBeCloseTo(expected, 9);
  });

  it('stands low above the horizon: under one degree, by the modelled elevation', () => {
    const elevationDeg =
      (Math.atan2(position[1], Math.hypot(position[0], position[2])) * 180) / Math.PI;
    expect(elevationDeg).toBeCloseTo(MODELLED_ELEVATION_DEG, 9);
    expect(elevationDeg).toBeGreaterThan(0);
    expect(elevationDeg).toBeLessThan(1);
  });

  it('follows the records of the dataset', () => {
    const doubled = californianLightPosition(
      withFact('californian-distance', { value: distanceM * 2 }),
    );
    expect(doubled[0]).toBeCloseTo(position[0] * 2, 6);
    expect(doubled[2]).toBeCloseTo(position[2] * 2, 6);
    const ahead = californianLightPosition(
      withFact('californian-bearing', { value: dataset.site.heading.true_deg }),
    );
    expect(ahead[2]).toBeCloseTo(0, 6);
    expect(ahead[0]).toBeGreaterThan(0);
  });

  it('refuses a record in another unit or without a number', () => {
    expect(() =>
      californianLightPosition(withFact('californian-distance', { unit: 'km' })),
    ).toThrow(RangeError);
    expect(() =>
      californianLightPosition(withFact('californian-bearing', { unit: 'points' })),
    ).toThrow(RangeError);
    expect(() =>
      californianLightPosition({
        ...dataset.site,
        californian: dataset.site.californian.filter(
          (candidate) => candidate.id !== 'californian-bearing',
        ),
      }),
    ).toThrow(RangeError);
  });

  it('is drawn while the ship is afloat and no longer once she has foundered', () => {
    expect(isCalifornianLightShown(model.evaluate(model.startSeconds).phase, 20)).toBe(true);
    expect(isCalifornianLightShown(model.evaluate(model.founderingSeconds - 1).phase, 20)).toBe(
      true,
    );
    expect(isCalifornianLightShown(model.evaluate(model.founderingSeconds).phase, 20)).toBe(false);
    expect(isCalifornianLightShown(model.evaluate(model.endSeconds).phase, 20)).toBe(false);
  });

  it('is not drawn for a camera below the surface', () => {
    expect(isCalifornianLightShown('afloat', -5)).toBe(false);
    expect(isCalifornianLightShown('afloat', 0)).toBe(true);
  });

  it('is steady: its position and visibility depend on nothing but the phase and the camera', () => {
    for (let t = model.startSeconds; t < model.founderingSeconds; t += 97) {
      expect(isCalifornianLightShown(model.evaluate(t).phase, 30)).toBe(true);
    }
    expect(californianLightPosition(dataset.site)).toEqual(position);
  });
});
