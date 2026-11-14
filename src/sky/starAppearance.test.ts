import { describe, expect, it } from 'vitest';
import { blackBodyColour, starAppearance, temperatureFromColourIndex } from './starAppearance.ts';

describe('star appearance', () => {
  it('draws brighter stars larger and more intense', () => {
    const sirius = starAppearance(-1.46, 0);
    const polaris = starAppearance(2.02, 0.6);
    const faint = starAppearance(6.5, 0.5);
    expect(sirius.radiusPx).toBeGreaterThan(polaris.radiusPx);
    expect(polaris.radiusPx).toBeGreaterThan(faint.radiusPx);
    expect(sirius.intensity).toBeGreaterThan(polaris.intensity);
    expect(polaris.intensity).toBeGreaterThan(faint.intensity);
    expect(faint.radiusPx).toBeGreaterThanOrEqual(1);
    expect(faint.intensity).toBeGreaterThan(0);
  });

  it('follows the magnitude scale between its limits: 2.5 magnitudes are a factor of ten', () => {
    expect(starAppearance(1.5, 0).intensity / starAppearance(4, 0).intensity).toBeCloseTo(10, 6);
  });

  it("gives the Sun's colour index a temperature near 5,800 K", () => {
    expect(temperatureFromColourIndex(0.65)).toBeGreaterThan(5500);
    expect(temperatureFromColourIndex(0.65)).toBeLessThan(6100);
  });

  it('tints hot stars blue and cool stars orange', () => {
    const hot = blackBodyColour(temperatureFromColourIndex(-0.2));
    const cool = blackBodyColour(temperatureFromColourIndex(1.5));
    expect(hot[2]).toBeGreaterThan(hot[0]);
    expect(cool[0]).toBeGreaterThan(cool[2]);
    expect(Math.max(...hot)).toBeCloseTo(1, 9);
    expect(Math.max(...cool)).toBeCloseTo(1, 9);
  });
});
