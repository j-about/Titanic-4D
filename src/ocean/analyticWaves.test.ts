import { describe, expect, it } from 'vitest';
import {
  analyticHeight,
  analyticSlope,
  CALM_SEA_WAVES,
  createAnalyticWaves,
  wavePhaseAt,
} from './analyticWaves.ts';
import { CALM_SEA_PATCH_LENGTH_M, createOceanField } from './oceanField.ts';
import { CALM_SEA, GRAVITY_M_PER_S2 } from './spectrum.ts';

const waves = createAnalyticWaves({ ...CALM_SEA, ...CALM_SEA_WAVES });

describe('analytic waves', () => {
  it('are the same for the same seed and differ for another', () => {
    expect(createAnalyticWaves({ ...CALM_SEA, ...CALM_SEA_WAVES })).toEqual(waves);
    expect(createAnalyticWaves({ ...CALM_SEA, ...CALM_SEA_WAVES, seed: 7 })).not.toEqual(waves);
  });

  it('carry the variance of the requested significant wave height', () => {
    const variance = waves.reduce((sum, wave) => sum + wave.amplitudeM ** 2 / 2, 0);
    expect(4 * Math.sqrt(variance)).toBeCloseTo(CALM_SEA.significantHeightM, 9);
  });

  it('span the requested wavelengths and obey the deep-water dispersion relation', () => {
    const lengths = waves.map((wave) => (2 * Math.PI) / Math.hypot(wave.kx, wave.kz));
    expect(lengths[0]).toBeCloseTo(CALM_SEA_WAVES.longestWavelengthM, 9);
    expect(lengths.at(-1)).toBeCloseTo(CALM_SEA_WAVES.shortestWavelengthM, 9);
    for (const wave of waves) {
      expect(wave.omega ** 2).toBeCloseTo(GRAVITY_M_PER_S2 * Math.hypot(wave.kx, wave.kz), 9);
    }
  });

  it('travel within a quarter turn of the mean direction', () => {
    const direction = (CALM_SEA.directionDeg * Math.PI) / 180;
    for (const wave of waves) {
      expect(wave.kx * Math.cos(direction) + wave.kz * Math.sin(direction)).toBeGreaterThan(0);
    }
  });

  it('put most of their energy near the peak wavelength', () => {
    const strongest = waves.reduce((best, wave) =>
      wave.amplitudeM > best.amplitudeM ? wave : best,
    );
    const length = (2 * Math.PI) / Math.hypot(strongest.kx, strongest.kz);
    expect(length).toBeGreaterThan(CALM_SEA.peakWavelengthM * 0.7);
    expect(length).toBeLessThan(CALM_SEA.peakWavelengthM * 1.4);
  });

  it('have a slope equal to the derivative of the height', () => {
    const step = 1e-4;
    for (const [x, z, t] of [
      [0, 0, 0],
      [12.5, -40.25, 3900],
      [-310, 95, 9450.5],
    ] as const) {
      const [slopeX, slopeZ] = analyticSlope(waves, x, z, t);
      const alongX =
        (analyticHeight(waves, x + step, z, t) - analyticHeight(waves, x - step, z, t)) /
        (2 * step);
      const alongZ =
        (analyticHeight(waves, x, z + step, t) - analyticHeight(waves, x, z - step, t)) /
        (2 * step);
      expect(slopeX).toBeCloseTo(alongX, 6);
      expect(slopeZ).toBeCloseTo(alongZ, 6);
    }
  });

  it('move with time and repeat nothing between distant instants', () => {
    expect(analyticSlope(waves, 3, 4, 100)).toEqual(analyticSlope(waves, 3, 4, 100));
    expect(analyticSlope(waves, 3, 4, 100)).not.toEqual(analyticSlope(waves, 3, 4, 101));
  });

  it('keep their phase within one turn', () => {
    for (const wave of waves) {
      for (const t of [0, 1, 9960, -250]) {
        const phase = wavePhaseAt(wave, t);
        expect(phase).toBeGreaterThanOrEqual(0);
        expect(phase).toBeLessThan(2 * Math.PI);
      }
    }
  });

  it('are about as steep as the FFT field they stand in for', () => {
    const field = createOceanField({
      ...CALM_SEA,
      patchLengthM: CALM_SEA_PATCH_LENGTH_M,
      size: 128,
    });
    const { slopes } = field.evaluate(600);
    const fieldSteepness = Math.sqrt(
      slopes.reduce((sum, value) => sum + value * value, 0) / (slopes.length / 2),
    );
    let total = 0;
    let samples = 0;
    for (let x = 0; x < 96; x += 1.5) {
      for (let z = 0; z < 96; z += 1.5) {
        const [slopeX, slopeZ] = analyticSlope(waves, x, z, 600);
        total += slopeX * slopeX + slopeZ * slopeZ;
        samples += 1;
      }
    }
    const analyticSteepness = Math.sqrt(total / samples);
    expect(analyticSteepness).toBeGreaterThan(fieldSteepness * 0.5);
    expect(analyticSteepness).toBeLessThan(fieldSteepness * 2);
  });

  it('reject impossible descriptions', () => {
    expect(() => createAnalyticWaves({ ...CALM_SEA, ...CALM_SEA_WAVES, count: 1 })).toThrow(
      RangeError,
    );
    expect(() =>
      createAnalyticWaves({ ...CALM_SEA, ...CALM_SEA_WAVES, shortestWavelengthM: 20 }),
    ).toThrow(RangeError);
  });
});
