/** Levels of rendering quality, from the lightest to the most detailed. */
export const QUALITY_LEVELS = ['low', 'medium', 'high'] as const;
export type QualityLevel = (typeof QUALITY_LEVELS)[number];

export interface QualitySettings {
  /**
   * How the slopes of the sea are obtained: `spectral` evaluates the FFT wave field on the
   * processor at every instant, `analytic` sums a few sinusoidal waves in the shader.
   */
  readonly waves: 'spectral' | 'analytic';
  /** Size of the image of the reflected scene, as a fraction of the drawing buffer. */
  readonly reflectionResolutionScale: number;
  /** Greatest device pixel ratio used for the drawing buffer. */
  readonly maxPixelRatio: number;
  /** Whether the brightest lights of the image glow: lamps, stars and distress signals. */
  readonly bloom: boolean;
}

/** Name of each level in the interface. */
export const QUALITY_LABELS: Readonly<Record<QualityLevel, string>> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export const DEFAULT_QUALITY: QualityLevel = 'medium';

export const QUALITY_SETTINGS: Readonly<Record<QualityLevel, QualitySettings>> = {
  low: { waves: 'analytic', reflectionResolutionScale: 0.25, maxPixelRatio: 1, bloom: false },
  medium: { waves: 'spectral', reflectionResolutionScale: 0.5, maxPixelRatio: 1.5, bloom: true },
  high: { waves: 'spectral', reflectionResolutionScale: 1, maxPixelRatio: 2, bloom: true },
};

export function isQualityLevel(value: unknown): value is QualityLevel {
  return (QUALITY_LEVELS as readonly unknown[]).includes(value);
}
