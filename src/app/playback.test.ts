import { describe, expect, it } from 'vitest';
import { advancePlayback, seekBy } from './playback.ts';

const bounds = { startSeconds: 0, endSeconds: 9960 };

describe('advancePlayback', () => {
  it('moves time by the elapsed time multiplied by the rate', () => {
    expect(advancePlayback(100, 0.016, 60, 1, bounds)).toEqual({ t: 100 + 0.96, playing: true });
  });

  it('runs backward', () => {
    expect(advancePlayback(100, 0.1, 600, -1, bounds)).toEqual({ t: 40, playing: true });
  });

  it('stops at the end and at the start of the timeline', () => {
    expect(advancePlayback(9950, 0.1, 600, 1, bounds)).toEqual({ t: 9960, playing: false });
    expect(advancePlayback(5, 0.1, 600, -1, bounds)).toEqual({ t: 0, playing: false });
  });

  it('limits the time credited to one frame', () => {
    expect(advancePlayback(0, 30, 1, 1, bounds).t).toBe(0.25);
  });

  it('retraces its steps exactly when the direction is reversed', () => {
    let t = 1000;
    const frames = [0.016, 0.02, 0.033, 0.016];
    for (const frame of frames) {
      t = advancePlayback(t, frame, 60, 1, bounds).t;
    }
    for (const frame of frames.toReversed()) {
      t = advancePlayback(t, frame, 60, -1, bounds).t;
    }
    expect(t).toBeCloseTo(1000, 9);
  });
});

describe('seekBy', () => {
  it('moves within the timeline', () => {
    expect(seekBy(100, 60, bounds)).toBe(160);
    expect(seekBy(100, -500, bounds)).toBe(0);
    expect(seekBy(9900, 500, bounds)).toBe(9960);
  });
});
