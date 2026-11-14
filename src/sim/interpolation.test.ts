import { describe, expect, it } from 'vitest';
import { bracketingIndices, createLinearCurve, createMonotoneCurve } from './interpolation.ts';

const xs = [0, 10, 30, 60];
const ys = [0, 5, 5, 20];

describe.each([
  ['linear', createLinearCurve],
  ['monotone cubic', createMonotoneCurve],
] as const)('%s curve', (_name, create) => {
  const curve = create(xs, ys);

  it('passes through every sample', () => {
    xs.forEach((x, index) => {
      expect(curve(x)).toBeCloseTo(ys[index] ?? Number.NaN, 12);
    });
  });

  it('holds the end values outside the samples', () => {
    expect(curve(-100)).toBe(0);
    expect(curve(1000)).toBe(20);
  });

  it('never leaves the interval of the two samples around a point', () => {
    for (let x = 0; x <= 60; x += 0.25) {
      const [low, high] = bracketingIndices(xs, x);
      const a = ys[low] ?? Number.NaN;
      const b = ys[high] ?? Number.NaN;
      expect(curve(x)).toBeGreaterThanOrEqual(Math.min(a, b) - 1e-9);
      expect(curve(x)).toBeLessThanOrEqual(Math.max(a, b) + 1e-9);
    }
  });

  it('is continuous', () => {
    for (let x = 0; x < 60; x += 0.01) {
      expect(Math.abs(curve(x + 0.01) - curve(x))).toBeLessThan(0.05);
    }
  });

  it('rejects unordered samples', () => {
    expect(() => create([0, 0], [1, 2])).toThrow(RangeError);
    expect(() => create([], [])).toThrow(RangeError);
  });
});

describe('monotone cubic curve', () => {
  it('stays flat across a plateau instead of overshooting', () => {
    const curve = createMonotoneCurve(xs, ys);
    for (let x = 10; x <= 30; x += 0.5) {
      expect(curve(x)).toBeCloseTo(5, 9);
    }
  });

  it('is constant for a single sample', () => {
    expect(createMonotoneCurve([3], [7])(100)).toBe(7);
  });
});

describe('bracketingIndices', () => {
  it('returns the two neighbours of an interior point', () => {
    expect(bracketingIndices(xs, 15)).toEqual([1, 2]);
  });

  it('returns a single index on a sample and beyond the ends', () => {
    expect(bracketingIndices(xs, 10)).toEqual([1, 1]);
    expect(bracketingIndices(xs, -5)).toEqual([0, 0]);
    expect(bracketingIndices(xs, 99)).toEqual([3, 3]);
  });
});
