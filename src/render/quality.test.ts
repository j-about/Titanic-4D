import { describe, expect, it } from 'vitest';
import {
  DEFAULT_QUALITY,
  isQualityLevel,
  QUALITY_LABELS,
  QUALITY_LEVELS,
  QUALITY_SETTINGS,
} from './quality.ts';

describe('quality levels', () => {
  it('cost more at every step', () => {
    const settings = QUALITY_LEVELS.map((level) => QUALITY_SETTINGS[level]);
    for (let index = 1; index < settings.length; index += 1) {
      const lower = settings[index - 1];
      const higher = settings[index];
      expect(higher?.maxPixelRatio).toBeGreaterThanOrEqual(lower?.maxPixelRatio ?? Number.NaN);
      expect(higher?.reflectionResolutionScale).toBeGreaterThanOrEqual(
        lower?.reflectionResolutionScale ?? Number.NaN,
      );
    }
  });

  it('make the lights glow except at the lowest level, and have a name each', () => {
    expect(QUALITY_LEVELS.map((level) => QUALITY_SETTINGS[level].bloom)).toEqual([
      false,
      true,
      true,
    ]);
    expect(QUALITY_LEVELS.map((level) => QUALITY_LABELS[level])).toEqual(['Low', 'Medium', 'High']);
  });

  it('use the analytic sea only at the lowest level', () => {
    expect(QUALITY_SETTINGS.low.waves).toBe('analytic');
    expect(QUALITY_SETTINGS.medium.waves).toBe('spectral');
    expect(QUALITY_SETTINGS.high.waves).toBe('spectral');
  });

  it('recognise their own names only', () => {
    expect(isQualityLevel(DEFAULT_QUALITY)).toBe(true);
    expect(isQualityLevel('ultra')).toBe(false);
    expect(isQualityLevel(null)).toBe(false);
  });
});
