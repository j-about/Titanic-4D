import { describe, expect, it } from 'vitest';
import {
  ROCKET_ASCENT_SECONDS,
  ROCKET_BURST_HEIGHT_M,
  ROCKET_VISIBLE_SECONDS,
  rocketAppearance,
} from './rocketAppearance.ts';

describe('distress signal appearance', () => {
  it('rises from the bridge to its bursting height', () => {
    expect(rocketAppearance(0).heightM).toBe(0);
    expect(rocketAppearance(ROCKET_ASCENT_SECONDS / 2).heightM).toBeGreaterThan(
      ROCKET_BURST_HEIGHT_M / 2,
    );
    expect(rocketAppearance(ROCKET_ASCENT_SECONDS).heightM).toBeCloseTo(ROCKET_BURST_HEIGHT_M, 6);
  });

  it('is continuous in height, size and brightness', () => {
    const step = 1 / 60;
    for (let age = 0; age < ROCKET_VISIBLE_SECONDS; age += step) {
      const a = rocketAppearance(age);
      const b = rocketAppearance(age + step);
      expect(Math.abs(b.heightM - a.heightM)).toBeLessThan(2);
      expect(Math.abs(b.radiusM - a.radiusM)).toBeLessThan(1.2);
      expect(Math.abs(b.brightness - a.brightness)).toBeLessThan(0.06);
    }
  });

  it('brightens once and then only fades', () => {
    let peakSeen = false;
    let previous = rocketAppearance(ROCKET_ASCENT_SECONDS).brightness;
    for (let age = ROCKET_ASCENT_SECONDS; age < ROCKET_VISIBLE_SECONDS; age += 0.05) {
      const current = rocketAppearance(age).brightness;
      if (current < previous - 1e-9) {
        peakSeen = true;
      } else if (peakSeen) {
        expect(current).toBeLessThanOrEqual(previous + 1e-9);
      }
      previous = current;
    }
    expect(peakSeen).toBe(true);
  });

  it('has almost faded when the signal stops being shown', () => {
    expect(rocketAppearance(ROCKET_VISIBLE_SECONDS).brightness).toBeLessThan(0.08);
  });
});
