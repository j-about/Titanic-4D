/**
 * Appearance of a distress signal as a function of its age. The sources describe the sequence —
 * a luminous tail, a report, white stars thrown out and falling — but give no measured height
 * or duration; the figures below are illustrative.
 *
 * Brightness changes are spread over a finite rise time, and a signal is fired at most every few
 * minutes of ship's time, so the scene never produces more than one brightening per signal.
 */
export interface RocketAppearance {
  /** Height above the firing point, in metres. */
  readonly heightM: number;
  /** Radius of the light, in metres: small for the rising tail, larger for the burst of stars. */
  readonly radiusM: number;
  /** Relative brightness, from 0 to 1. */
  readonly brightness: number;
}

export const ROCKET_ASCENT_SECONDS = 4.5;
export const ROCKET_BURST_HEIGHT_M = 180;
/** Time over which the burst reaches full brightness: a ramp, never an instantaneous flash. */
export const ROCKET_BURST_RISE_SECONDS = 0.5;
const TAIL_BRIGHTNESS = 0.3;
const TAIL_RADIUS_M = 0.8;
const BURST_RADIUS_M = 16;
const STAR_FALL_SPEED_M_PER_S = 5;
const STAR_DECAY_SECONDS = 3.2;

function smoothstep(value: number): number {
  const ratio = Math.min(Math.max(value, 0), 1);
  return ratio * ratio * (3 - 2 * ratio);
}

export function rocketAppearance(ageSeconds: number): RocketAppearance {
  if (ageSeconds < ROCKET_ASCENT_SECONDS) {
    const ratio = Math.max(ageSeconds, 0) / ROCKET_ASCENT_SECONDS;
    // The signal decelerates as it climbs.
    return {
      heightM: ROCKET_BURST_HEIGHT_M * (1 - (1 - ratio) ** 2),
      radiusM: TAIL_RADIUS_M,
      brightness: TAIL_BRIGHTNESS,
    };
  }
  const sinceBurst = ageSeconds - ROCKET_ASCENT_SECONDS;
  const rise = smoothstep(sinceBurst / ROCKET_BURST_RISE_SECONDS);
  const decay = Math.exp(-Math.max(sinceBurst - ROCKET_BURST_RISE_SECONDS, 0) / STAR_DECAY_SECONDS);
  return {
    heightM: ROCKET_BURST_HEIGHT_M - STAR_FALL_SPEED_M_PER_S * sinceBurst,
    radiusM: TAIL_RADIUS_M + (BURST_RADIUS_M - TAIL_RADIUS_M) * rise,
    brightness: (TAIL_BRIGHTNESS + (1 - TAIL_BRIGHTNESS) * rise) * decay,
  };
}
