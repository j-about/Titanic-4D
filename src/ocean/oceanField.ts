import { inverseFft2d, isPowerOfTwo } from './fft.ts';
import {
  createSeededRandom,
  deepWaterFrequency,
  jonswapDensity,
  type SeaState,
} from './spectrum.ts';

/**
 * Surface of the sea as a sum of sinusoidal waves with a JONSWAP-shaped spectrum, evaluated on a
 * periodic square patch by inverse fast Fourier transform (Tessendorf's method).
 *
 * The amplitudes are drawn once from a seeded generator and only the phases depend on time, so
 * the surface is a deterministic function of the instant: the same time always gives the same
 * sea. The spectrum is scaled to a chosen significant wave height, here a few centimetres, for
 * the flat calm of that night.
 */
export interface OceanFieldOptions extends SeaState {
  /** Number of samples along each side of the patch; a power of two. */
  readonly size: number;
  /** Length of the side of the patch, in metres. */
  readonly patchLengthM: number;
}

export interface OceanSample {
  /** Height of the surface at each sample, row by row, in metres. */
  readonly heights: Float32Array;
  /** Slope of the surface along the first and second axes, interleaved, per sample. */
  readonly slopes: Float32Array;
}

export interface OceanField {
  readonly size: number;
  readonly patchLengthM: number;
  /** Fills and returns the surface at `timeSeconds`. The returned arrays are reused by each call. */
  evaluate(timeSeconds: number): OceanSample;
}

/** Two independent standard normal deviates (Box–Muller). */
function gaussianPair(random: () => number): [number, number] {
  const radius = Math.sqrt(-2 * Math.log(Math.max(random(), 1e-12)));
  const angle = 2 * Math.PI * random();
  return [radius * Math.cos(angle), radius * Math.sin(angle)];
}

export function createOceanField(options: OceanFieldOptions): OceanField {
  const { size, patchLengthM } = options;
  if (!isPowerOfTwo(size)) {
    throw new RangeError('The size of the ocean patch must be a power of two.');
  }
  const count = size * size;
  const random = createSeededRandom(options.seed);
  const direction = (options.directionDeg * Math.PI) / 180;
  const peakOmega = deepWaterFrequency((2 * Math.PI) / options.peakWavelengthM);

  const waveX = new Float32Array(count);
  const waveZ = new Float32Array(count);
  const omega = new Float32Array(count);
  const amplitudeReal = new Float32Array(count);
  const amplitudeImaginary = new Float32Array(count);

  // Each grid cell holds one travelling wave: amplitude from the spectrum, random initial phase.
  let variance = 0;
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      const index = row * size + column;
      const kx = ((column < size / 2 ? column : column - size) * 2 * Math.PI) / patchLengthM;
      const kz = ((row < size / 2 ? row : row - size) * 2 * Math.PI) / patchLengthM;
      const k = Math.hypot(kx, kz);
      const [normalA, normalB] = gaussianPair(random);
      // The mean level carries no wave, and a wave at the Nyquist wave number has no defined
      // direction of travel on the grid: both are left out.
      if (k === 0 || column === size / 2 || row === size / 2) {
        continue;
      }
      const frequency = deepWaterFrequency(k);
      const alignment = Math.max((kx * Math.cos(direction) + kz * Math.sin(direction)) / k, 0);
      // Converting the frequency spectrum to wavenumber space divides by k and by the group speed.
      const density =
        (jonswapDensity(frequency, peakOmega) * alignment ** options.spreading) /
        (k * Math.sqrt(k));
      const amplitude = Math.sqrt(density);
      waveX[index] = kx;
      waveZ[index] = kz;
      omega[index] = frequency;
      amplitudeReal[index] = amplitude * normalA;
      amplitudeImaginary[index] = amplitude * normalB;
      variance += density;
    }
  }
  // Scales the amplitudes so that the surface has the requested significant wave height. The
  // expected variance of the real part of the sum of the waves is half the sum of |amplitude|².
  const targetVariance = (options.significantHeightM / 4) ** 2;
  const scale = variance > 0 ? Math.sqrt(targetVariance / variance) : 0;
  for (let index = 0; index < count; index += 1) {
    amplitudeReal[index] = (amplitudeReal[index] as number) * scale;
    amplitudeImaginary[index] = (amplitudeImaginary[index] as number) * scale;
  }

  const real = new Float32Array(count);
  const imaginary = new Float32Array(count);
  const heights = new Float32Array(count);
  const slopes = new Float32Array(count * 2);

  /** Writes into `real` and `imaginary` the spectrum of the waves at a time, times a factor. */
  const fillSpectrum = (
    timeSeconds: number,
    factor: (index: number) => readonly [number, number],
  ): void => {
    for (let index = 0; index < count; index += 1) {
      const phase = -(omega[index] as number) * timeSeconds;
      const cos = Math.cos(phase);
      const sin = Math.sin(phase);
      const waveReal =
        (amplitudeReal[index] as number) * cos - (amplitudeImaginary[index] as number) * sin;
      const waveImaginary =
        (amplitudeReal[index] as number) * sin + (amplitudeImaginary[index] as number) * cos;
      const [factorReal, factorImaginary] = factor(index);
      real[index] = waveReal * factorReal - waveImaginary * factorImaginary;
      imaginary[index] = waveReal * factorImaginary + waveImaginary * factorReal;
    }
  };

  const evaluate = (timeSeconds: number): OceanSample => {
    fillSpectrum(timeSeconds, () => [1, 0]);
    inverseFft2d(real, imaginary, size);
    heights.set(real);
    // The derivative of exp(i k·x) along an axis multiplies the spectrum by i k.
    fillSpectrum(timeSeconds, (index) => [0, waveX[index] as number]);
    inverseFft2d(real, imaginary, size);
    for (let index = 0; index < count; index += 1) {
      slopes[index * 2] = real[index] as number;
    }
    fillSpectrum(timeSeconds, (index) => [0, waveZ[index] as number]);
    inverseFft2d(real, imaginary, size);
    for (let index = 0; index < count; index += 1) {
      slopes[index * 2 + 1] = real[index] as number;
    }
    return { heights, slopes };
  };

  return { size, patchLengthM, evaluate };
}

/** Length of the side of the periodic patch on which the calm sea is evaluated, in metres. */
export const CALM_SEA_PATCH_LENGTH_M = 96;
