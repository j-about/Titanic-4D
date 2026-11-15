import {
  createSeededRandom,
  deepWaterFrequency,
  jonswapDensity,
  type SeaState,
} from './spectrum.ts';

/**
 * Surface of the sea as a short sum of sinusoidal waves, the first-order form of Gerstner's
 * trochoidal waves. It stands in for the FFT field at the lowest quality level: the slope of
 * the surface is a closed expression of position and time that a shader evaluates directly.
 *
 * The wavelengths are spaced geometrically around the peak of the same JONSWAP spectrum as the
 * FFT field, each wave carrying the energy of its band; directions and initial phases are drawn
 * from a seeded generator. Like the field, the surface is a deterministic function of the instant.
 */
export interface WaveComponent {
  /** Components of the wave vector, in radians per metre. */
  readonly kx: number;
  readonly kz: number;
  /** Angular frequency, in radians per second. */
  readonly omega: number;
  /** Amplitude, in metres. */
  readonly amplitudeM: number;
  /** Phase at the origin at time zero, in radians. */
  readonly phase: number;
}

export interface AnalyticWavesOptions extends SeaState {
  /** Number of waves summed. */
  readonly count: number;
  /** Shortest and longest wavelengths, in metres. */
  readonly shortestWavelengthM: number;
  readonly longestWavelengthM: number;
}

/** Draws an offset from the mean direction, in radians, distributed as a power of its cosine. */
function drawDirectionOffset(random: () => number, spreading: number): number {
  for (;;) {
    const offset = (random() - 0.5) * Math.PI;
    if (random() <= Math.cos(offset) ** spreading) {
      return offset;
    }
  }
}

/** Creates the waves of a sea state. */
export function createAnalyticWaves(options: AnalyticWavesOptions): readonly WaveComponent[] {
  const { count, shortestWavelengthM, longestWavelengthM } = options;
  if (!Number.isInteger(count) || count < 2) {
    throw new RangeError('The sea needs at least two waves.');
  }
  if (!(shortestWavelengthM > 0 && longestWavelengthM > shortestWavelengthM)) {
    throw new RangeError('The wavelengths of the sea must be positive and increasing.');
  }
  const random = createSeededRandom(options.seed);
  const direction = (options.directionDeg * Math.PI) / 180;
  const peakOmega = deepWaterFrequency((2 * Math.PI) / options.peakWavelengthM);
  // Successive wavelengths differ by a constant ratio; each wave stands for the band of
  // frequencies reaching half-way, on that scale, to its neighbours.
  const ratio = (shortestWavelengthM / longestWavelengthM) ** (1 / (count - 1));
  const frequencyAt = (step: number): number =>
    deepWaterFrequency((2 * Math.PI) / (longestWavelengthM * ratio ** step));

  const waves: WaveComponent[] = [];
  let variance = 0;
  for (let index = 0; index < count; index += 1) {
    const omega = frequencyAt(index);
    const bandwidth = frequencyAt(index + 0.5) - frequencyAt(index - 0.5);
    const waveNumber = (2 * Math.PI) / (longestWavelengthM * ratio ** index);
    const heading = direction + drawDirectionOffset(random, options.spreading);
    // A wave of amplitude a carries the variance a² / 2.
    const amplitudeM = Math.sqrt(2 * jonswapDensity(omega, peakOmega) * bandwidth);
    variance += (amplitudeM * amplitudeM) / 2;
    waves.push({
      kx: waveNumber * Math.cos(heading),
      kz: waveNumber * Math.sin(heading),
      omega,
      amplitudeM,
      phase: 2 * Math.PI * random(),
    });
  }
  // Scales the amplitudes so that the surface has the requested significant wave height.
  const scale = Math.sqrt((options.significantHeightM / 4) ** 2 / variance);
  return waves.map((wave) => ({ ...wave, amplitudeM: wave.amplitudeM * scale }));
}

/**
 * Phase of a wave at the origin at `timeSeconds`, reduced to [0, 2π) so that single-precision
 * arithmetic keeps its accuracy however long the time.
 */
export function wavePhaseAt(wave: WaveComponent, timeSeconds: number): number {
  const turn = 2 * Math.PI;
  return (((wave.phase - wave.omega * timeSeconds) % turn) + turn) % turn;
}

/** Height of the surface at a point and a time, in metres. */
export function analyticHeight(
  waves: readonly WaveComponent[],
  x: number,
  z: number,
  timeSeconds: number,
): number {
  let height = 0;
  for (const wave of waves) {
    height +=
      wave.amplitudeM * Math.cos(wave.kx * x + wave.kz * z + wavePhaseAt(wave, timeSeconds));
  }
  return height;
}

/** Slope of the surface along the first and second axes at a point and a time. */
export function analyticSlope(
  waves: readonly WaveComponent[],
  x: number,
  z: number,
  timeSeconds: number,
): readonly [number, number] {
  let slopeX = 0;
  let slopeZ = 0;
  for (const wave of waves) {
    const steepness =
      -wave.amplitudeM * Math.sin(wave.kx * x + wave.kz * z + wavePhaseAt(wave, timeSeconds));
    slopeX += steepness * wave.kx;
    slopeZ += steepness * wave.kz;
  }
  return [slopeX, slopeZ];
}

/** Waves standing in for the FFT field of the calm sea. */
export const CALM_SEA_WAVES = {
  count: 12,
  shortestWavelengthM: 0.75,
  longestWavelengthM: 18,
} as const;
