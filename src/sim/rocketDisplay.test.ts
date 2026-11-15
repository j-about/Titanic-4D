import { describe, expect, it } from 'vitest';
import { PLAYBACK_RATES } from '../app/appState.ts';
import { dataset } from '../data/dataset.ts';
import {
  ROCKET_BURST_HEIGHT_M,
  ROCKET_MIN_SCREEN_SECONDS,
  ROCKET_VISIBLE_SECONDS,
  rocketAppearance,
  rocketDisplay,
  rocketDisplaySeconds,
} from './rocketAppearance.ts';
import { createTimelineModel } from './timelineModel.ts';

const model = createTimelineModel(dataset);
const firings = model.rocketFirings.map((firing) => firing.seconds);
/** Frames per second at which the brightness on screen is sampled. */
const FRAME_RATE = 120;
/** Change of brightness that counts as one half of a flash (WCAG: 10 % of the maximum). */
const FLASH_STEP = 0.1;

/** Brightness of the signals on screen at ship's time `t`, when time runs `rate` times faster. */
function brightnessAt(t: number, rate: number): number {
  let total = 0;
  for (const fired of firings) {
    total += rocketDisplay(t - fired, rate)?.brightness ?? 0;
  }
  return Math.min(total, 1);
}

/** Real times, in seconds, at which the brightness on screen has risen and fallen back. */
function flashTimes(rate: number): number[] {
  const first = firings[0] ?? 0;
  const last = firings.at(-1) ?? 0;
  const end = last + rocketDisplaySeconds(rate) + 60;
  const flashes: number[] = [];
  let low = 0;
  let high = 0;
  let rising = false;
  for (let frame = 0; ; frame += 1) {
    const t = first - 30 + (frame * rate) / FRAME_RATE;
    if (t > end) {
      break;
    }
    const value = brightnessAt(t, rate);
    if (!rising) {
      low = Math.min(low, value);
      if (value - low >= FLASH_STEP) {
        rising = true;
        high = value;
      }
    } else {
      high = Math.max(high, value);
      if (high - value >= FLASH_STEP) {
        flashes.push(frame / FRAME_RATE);
        rising = false;
        low = value;
      }
    }
  }
  return flashes;
}

describe('distress signals on screen', () => {
  it('follow the physical sequence at real speed and when paused', () => {
    for (const age of [0, 2, 4.5, 6, 13.9]) {
      expect(rocketDisplay(age, 1)).toEqual(rocketAppearance(age));
    }
    expect(rocketDisplay(ROCKET_VISIBLE_SECONDS, 1)).toBeUndefined();
    expect(rocketDisplay(-1, 1)).toBeUndefined();
  });

  it('stay on screen for at least the minimum time at every speed', () => {
    for (const rate of PLAYBACK_RATES) {
      expect(rocketDisplaySeconds(rate) / rate).toBeGreaterThanOrEqual(
        Math.min(ROCKET_MIN_SCREEN_SECONDS, ROCKET_VISIBLE_SECONDS / rate) - 1e-9,
      );
    }
    expect(rocketDisplaySeconds(-600)).toBe(rocketDisplaySeconds(600));
  });

  it('become a steady light at the height of the burst during fast playback', () => {
    const duration = rocketDisplaySeconds(600);
    expect(duration).toBeGreaterThan(ROCKET_VISIBLE_SECONDS);
    expect(rocketDisplay(0, 600)?.brightness).toBe(0);
    expect(rocketDisplay(duration * 0.45, 600)?.brightness).toBeGreaterThan(0.7);
    expect(rocketDisplay(duration * 0.999, 600)?.brightness).toBeLessThan(0.01);
    expect(rocketDisplay(duration / 2, 600)?.heightM).toBe(ROCKET_BURST_HEIGHT_M);
  });

  it('change gently from frame to frame once they are steady lights', () => {
    for (const rate of PLAYBACK_RATES) {
      const duration = rocketDisplaySeconds(rate);
      if (duration === ROCKET_VISIBLE_SECONDS) {
        continue;
      }
      let previous = 0;
      for (let frame = 0; (frame * rate) / 60 < duration; frame += 1) {
        const value = rocketDisplay((frame * rate) / 60, rate)?.brightness ?? 0;
        expect(Math.abs(value - previous)).toBeLessThan(0.08);
        previous = value;
      }
    }
  });

  for (const rate of PLAYBACK_RATES) {
    it(`flash at most twice in any second at ×${rate}, within the WCAG limit of three`, () => {
      const flashes = flashTimes(rate);
      expect(flashes.length).toBeGreaterThan(0);
      for (const start of flashes) {
        const inOneSecond = flashes.filter((time) => time >= start && time < start + 1).length;
        expect(inOneSecond).toBeLessThanOrEqual(2);
      }
    });
  }
});
