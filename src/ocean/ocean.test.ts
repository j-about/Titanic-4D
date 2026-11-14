import { describe, expect, it } from 'vitest';
import { fft, inverseFft2d, isPowerOfTwo } from './fft.ts';
import { CALM_SEA_PATCH_LENGTH_M, createOceanField } from './oceanField.ts';
import { CALM_SEA } from './spectrum.ts';

describe('fast Fourier transform', () => {
  it('matches the direct discrete Fourier transform', () => {
    const size = 16;
    const input = Array.from(
      { length: size },
      (_unused, index) => Math.sin(index * 0.7) + 0.3 * index,
    );
    const real = new Float32Array(input);
    const imaginary = new Float32Array(size);
    fft(real, imaginary, 0, 1, size, false);
    for (let k = 0; k < size; k += 1) {
      let sumReal = 0;
      let sumImaginary = 0;
      input.forEach((value, n) => {
        sumReal += value * Math.cos((2 * Math.PI * k * n) / size);
        sumImaginary -= value * Math.sin((2 * Math.PI * k * n) / size);
      });
      expect(real[k]).toBeCloseTo(sumReal, 3);
      expect(imaginary[k]).toBeCloseTo(sumImaginary, 3);
    }
  });

  it('returns the input, times its length, after a forward and an inverse transform', () => {
    const size = 32;
    const input = Array.from({ length: size }, (_unused, index) => Math.cos(index) * index);
    const real = new Float32Array(input);
    const imaginary = new Float32Array(size);
    fft(real, imaginary, 0, 1, size, false);
    fft(real, imaginary, 0, 1, size, true);
    input.forEach((value, index) => {
      expect((real[index] ?? 0) / size).toBeCloseTo(value, 3);
      expect((imaginary[index] ?? 0) / size).toBeCloseTo(0, 3);
    });
  });

  it('turns a single spectral line into a plane wave in two dimensions', () => {
    const size = 8;
    const real = new Float32Array(size * size);
    const imaginary = new Float32Array(size * size);
    real[1 * size + 2] = 1;
    inverseFft2d(real, imaginary, size);
    for (let row = 0; row < size; row += 1) {
      for (let column = 0; column < size; column += 1) {
        const phase = (2 * Math.PI * (2 * column + row)) / size;
        expect(real[row * size + column]).toBeCloseTo(Math.cos(phase), 5);
        expect(imaginary[row * size + column]).toBeCloseTo(Math.sin(phase), 5);
      }
    }
  });

  it('recognises powers of two', () => {
    expect([1, 2, 64, 128].every(isPowerOfTwo)).toBe(true);
    expect([0, 3, 100, 2.5].some(isPowerOfTwo)).toBe(false);
  });
});

describe('ocean field', () => {
  const field = createOceanField({ ...CALM_SEA, patchLengthM: CALM_SEA_PATCH_LENGTH_M, size: 64 });

  function statistics(values: Float32Array): { mean: number; deviation: number } {
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
    return { mean, deviation: Math.sqrt(variance) };
  }

  it('has the significant wave height it was asked for, within sampling error', () => {
    const { mean, deviation } = statistics(field.evaluate(0).heights);
    expect(mean).toBeCloseTo(0, 4);
    expect(4 * deviation).toBeGreaterThan(CALM_SEA.significantHeightM * 0.6);
    expect(4 * deviation).toBeLessThan(CALM_SEA.significantHeightM * 1.4);
  });

  it('is a flat calm: heights of centimetres and slopes of about a degree at most', () => {
    const sample = field.evaluate(120);
    expect(Math.max(...sample.heights.map(Math.abs))).toBeLessThan(0.08);
    expect(Math.max(...sample.slopes.map(Math.abs))).toBeLessThan(0.06);
  });

  it('gives slopes that are the exact derivatives of the heights', () => {
    // The heights are band-limited, so differentiating their Fourier series along a row gives
    // the derivative exactly: transform the row, multiply each term by i·k, transform back.
    const { size, patchLengthM } = field;
    const sample = field.evaluate(37);
    const real = new Float32Array(size);
    const imaginary = new Float32Array(size);
    let largestSlope = 0;
    let largestError = 0;
    for (let row = 0; row < size; row += 1) {
      real.set(sample.heights.subarray(row * size, (row + 1) * size));
      imaginary.fill(0);
      fft(real, imaginary, 0, 1, size, false);
      for (let column = 0; column < size; column += 1) {
        const k = ((column < size / 2 ? column : column - size) * 2 * Math.PI) / patchLengthM;
        const termReal = real[column] ?? 0;
        real[column] = -k * (imaginary[column] ?? 0);
        imaginary[column] = k * termReal;
      }
      fft(real, imaginary, 0, 1, size, true);
      for (let column = 0; column < size; column += 1) {
        const slope = sample.slopes[(row * size + column) * 2] ?? 0;
        largestSlope = Math.max(largestSlope, Math.abs(slope));
        largestError = Math.max(largestError, Math.abs((real[column] ?? 0) / size - slope));
      }
    }
    expect(largestSlope).toBeGreaterThan(0.001);
    expect(largestError / largestSlope).toBeLessThan(0.01);
  });

  it('is the same sea at the same instant, whatever was computed before', () => {
    const first = Float32Array.from(field.evaluate(500).slopes);
    field.evaluate(9000);
    field.evaluate(12);
    expect(Float32Array.from(field.evaluate(500).slopes)).toEqual(first);
    const other = createOceanField({
      ...CALM_SEA,
      patchLengthM: CALM_SEA_PATCH_LENGTH_M,
      size: 64,
    });
    expect(Float32Array.from(other.evaluate(500).slopes)).toEqual(first);
  });

  it('changes with time', () => {
    const first = Float32Array.from(field.evaluate(0).heights);
    const later = field.evaluate(3).heights;
    expect(later.some((value, index) => Math.abs(value - (first[index] ?? 0)) > 1e-4)).toBe(true);
  });

  it('rejects a size that is not a power of two', () => {
    expect(() =>
      createOceanField({ ...CALM_SEA, patchLengthM: CALM_SEA_PATCH_LENGTH_M, size: 100 }),
    ).toThrow(RangeError);
  });
});
