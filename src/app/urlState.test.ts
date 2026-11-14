import { describe, expect, it } from 'vitest';
import { clockToSeconds, formatUrlState, parseUrlState, secondsToClock } from './urlState.ts';

describe('clock conversion', () => {
  it('counts from the collision at 23:40', () => {
    expect(clockToSeconds('23:40')).toBe(0);
    expect(clockToSeconds('00:45')).toBe(65 * 60);
    expect(clockToSeconds('02:20')).toBe(9600);
    expect(clockToSeconds('02:17:30')).toBe(9450);
  });

  it('rejects malformed clocks', () => {
    expect(clockToSeconds('2:20')).toBeUndefined();
    expect(clockToSeconds('24:00')).toBeUndefined();
    expect(clockToSeconds('')).toBeUndefined();
  });

  it('round-trips', () => {
    for (const t of [0, 59, 3900, 9450, 9960]) {
      expect(clockToSeconds(secondsToClock(t))).toBe(t);
    }
  });
});

describe('parseUrlState', () => {
  it('reads time, camera, rate and renderer', () => {
    expect(parseUrlState('?t=01:40&camera=deck&rate=300&renderer=webgl2', 9960)).toEqual({
      t: 7200,
      cameraMode: 'deck',
      rate: 300,
      renderer: 'webgl2',
    });
  });

  it('ignores unknown or out-of-range values', () => {
    expect(parseUrlState('?t=12:00&camera=helicopter&rate=7', 9960)).toEqual({ renderer: 'auto' });
    expect(parseUrlState('?renderer=vulkan', 9960)).toEqual({ renderer: 'auto' });
  });
});

describe('formatUrlState', () => {
  it('writes a readable query string', () => {
    expect(formatUrlState({ t: 7200, cameraMode: 'orbit', rate: 60 }, 'auto')).toBe(
      '?t=01:40:00&camera=orbit&rate=60',
    );
    expect(formatUrlState({ t: 0, cameraMode: 'guided', rate: 1 }, 'webgl2')).toBe(
      '?t=23:40:00&camera=guided&rate=1&renderer=webgl2',
    );
  });

  it('is read back unchanged', () => {
    const state = { t: 9450, cameraMode: 'underwater' as const, rate: 600 as const };
    expect(parseUrlState(formatUrlState(state, 'webgpu-readback'), 9960)).toEqual({
      ...state,
      renderer: 'webgpu-readback',
    });
  });
});
