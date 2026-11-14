/** Quantities shared by the two descriptions of the sea: the FFT field and the analytic waves. */

export const GRAVITY_M_PER_S2 = 9.80665;
/** Peak enhancement factor of the JONSWAP spectrum. */
const JONSWAP_GAMMA = 3.3;

/** Angular frequency of a deep-water wave of wave number `k`, in radians per second. */
export function deepWaterFrequency(waveNumber: number): number {
  return Math.sqrt(GRAVITY_M_PER_S2 * waveNumber);
}

/** JONSWAP spectral density as a function of angular frequency, up to a constant factor. */
export function jonswapDensity(omega: number, peakOmega: number): number {
  const sigma = omega <= peakOmega ? 0.07 : 0.09;
  const peak = Math.exp(-((omega - peakOmega) ** 2) / (2 * sigma * sigma * peakOmega * peakOmega));
  return (1 / omega ** 5) * Math.exp(-1.25 * (peakOmega / omega) ** 4) * JONSWAP_GAMMA ** peak;
}

/** Deterministic generator of uniform numbers in [0, 1) (mulberry32). */
export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Parameters of a sea state, common to both descriptions. */
export interface SeaState {
  /** Significant wave height, in metres: four times the standard deviation of the surface. */
  readonly significantHeightM: number;
  /** Wavelength at the peak of the spectrum, in metres. */
  readonly peakWavelengthM: number;
  /** Direction toward which the waves travel, in degrees clockwise from the first axis. */
  readonly directionDeg: number;
  /** Exponent of the cosine-power directional spreading: larger is narrower. */
  readonly spreading: number;
  readonly seed: number;
}

/** Sea of the night of the sinking: flat calm with a barely perceptible ripple. */
export const CALM_SEA: SeaState = {
  significantHeightM: 0.05,
  peakWavelengthM: 9,
  directionDeg: 200,
  spreading: 2,
  seed: 19_120_415,
};
