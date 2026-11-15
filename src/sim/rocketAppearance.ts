import { createSeededRandom } from '../ocean/spectrum.ts';

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
  /** Radius over which the stars are spread, in metres: nothing for the rising tail. */
  readonly radiusM: number;
  /** Relative brightness, from 0 to 1. */
  readonly brightness: number;
}

/** Time during which a distress signal is shown after it is fired: ascent, burst and falling stars. */
export const ROCKET_VISIBLE_SECONDS = 14;
export const ROCKET_ASCENT_SECONDS = 4.5;
export const ROCKET_BURST_HEIGHT_M = 180;
/** Time over which the burst reaches full brightness: a ramp, never an instantaneous flash. */
export const ROCKET_BURST_RISE_SECONDS = 0.5;
const TAIL_BRIGHTNESS = 0.3;
const TAIL_RADIUS_M = 0;
const BURST_RADIUS_M = 16;
const STAR_FALL_SPEED_M_PER_S = 5;
const STAR_DECAY_SECONDS = 3.2;

/** Number of white stars thrown out by a signal. */
const STAR_COUNT = 14;

/**
 * Positions of the stars of a burst inside a unit ball, the same for every signal. They are drawn
 * once from a seeded generator, so that a burst looks the same whenever it is shown.
 */
export const ROCKET_STAR_OFFSETS: readonly (readonly [number, number, number])[] = (() => {
  const random = createSeededRandom(1912);
  return Array.from({ length: STAR_COUNT }, (): [number, number, number] => {
    const azimuth = 2 * Math.PI * random();
    const cosine = 2 * random() - 1;
    const sine = Math.sqrt(1 - cosine * cosine);
    const distance = 0.35 + 0.65 * Math.cbrt(random());
    return [
      distance * sine * Math.cos(azimuth),
      distance * cosine,
      distance * sine * Math.sin(azimuth),
    ];
  });
})();

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

/** Shortest time for which a signal stays on screen, in seconds of real time. */
export const ROCKET_MIN_SCREEN_SECONDS = 0.9;
/** Brightness of a signal shown as a steady light during fast playback, from 0 to 1. */
const STEADY_BRIGHTNESS = 0.8;
/** Fractions of the time on screen over which a steady light comes up and starts to fade. */
const STEADY_RISE_RATIO = 0.4;
const STEADY_FADE_START_RATIO = 0.5;

/**
 * Time after its firing during which a signal is drawn, in seconds of ship's time, when time runs
 * `timeScale` times faster than real time.
 */
export function rocketDisplaySeconds(timeScale: number): number {
  return Math.max(ROCKET_VISIBLE_SECONDS, Math.abs(timeScale) * ROCKET_MIN_SCREEN_SECONDS);
}

/**
 * Appearance of a signal on screen, or `undefined` when it is not drawn. At real speed and up to
 * the speed at which the whole sequence still lasts long enough on screen, it follows
 * `rocketAppearance`. Faster than that, the signal is drawn as a light at the height
 * of the burst that comes up and fades gently over a longer span of ship's time.
 */
export function rocketDisplay(ageSeconds: number, timeScale: number): RocketAppearance | undefined {
  const duration = rocketDisplaySeconds(timeScale);
  if (ageSeconds < 0 || ageSeconds >= duration) {
    return undefined;
  }
  if (duration === ROCKET_VISIBLE_SECONDS) {
    return rocketAppearance(ageSeconds);
  }
  const ratio = ageSeconds / duration;
  const rise = smoothstep(ratio / STEADY_RISE_RATIO);
  const fade = 1 - smoothstep((ratio - STEADY_FADE_START_RATIO) / (1 - STEADY_FADE_START_RATIO));
  return {
    heightM: ROCKET_BURST_HEIGHT_M,
    radiusM: BURST_RADIUS_M,
    brightness: STEADY_BRIGHTNESS * rise * fade,
  };
}
