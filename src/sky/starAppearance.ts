/**
 * How a star of a given magnitude and colour index is drawn. These mappings are a matter of
 * display: they compress a range of brightness of more than a thousand to one into what a
 * screen can show, while keeping brighter stars both larger and more intense.
 */
export interface StarAppearance {
  /** Radius of the drawn disc, in CSS pixels. */
  readonly radiusPx: number;
  /** Intensity relative to scene white, before tone mapping. */
  readonly intensity: number;
  /** Linear RGB colour, normalised so that its largest component is 1. */
  readonly colour: readonly [number, number, number];
}

const MIN_RADIUS_PX = 1.0;
const EXTRA_RADIUS_PX = 2.4;
/** Magnitude drawn at unit intensity. */
const REFERENCE_MAGNITUDE = 1.5;
const MIN_INTENSITY = 0.03;
const MAX_INTENSITY = 7;
/** Share of the star's own colour kept: night vision perceives little colour. */
const COLOUR_SATURATION = 0.45;

/** Effective temperature of a star from its B−V colour index (Ballesteros, 2012), in kelvins. */
export function temperatureFromColourIndex(colourIndex: number): number {
  const bv = Math.min(Math.max(colourIndex, -0.4), 2);
  return 4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62));
}

/** Approximate linear RGB of a black body, normalised to its largest component. */
export function blackBodyColour(temperatureK: number): [number, number, number] {
  const t = Math.min(Math.max(temperatureK, 1000), 40_000) / 100;
  const red = t <= 66 ? 255 : 329.698727446 * (t - 60) ** -0.1332047592;
  const green =
    t <= 66
      ? 99.4708025861 * Math.log(t) - 161.1195681661
      : 288.1221695283 * (t - 60) ** -0.0755148492;
  let blue = 255;
  if (t < 66) {
    blue = t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  }
  const toLinear = (value: number): number => (Math.min(Math.max(value, 0), 255) / 255) ** 2.2;
  const linear: [number, number, number] = [toLinear(red), toLinear(green), toLinear(blue)];
  const largest = Math.max(...linear);
  return [linear[0] / largest, linear[1] / largest, linear[2] / largest];
}

export function starAppearance(magnitude: number, colourIndex: number): StarAppearance {
  const flux = 10 ** (-0.4 * (magnitude - REFERENCE_MAGNITUDE));
  const body = blackBodyColour(temperatureFromColourIndex(colourIndex));
  const mixed = body.map((component) => 1 + (component - 1) * COLOUR_SATURATION) as [
    number,
    number,
    number,
  ];
  return {
    radiusPx: MIN_RADIUS_PX + EXTRA_RADIUS_PX * Math.exp(-0.45 * (magnitude + 1.5)),
    intensity: Math.min(Math.max(flux, MIN_INTENSITY), MAX_INTENSITY),
    colour: mixed,
  };
}
