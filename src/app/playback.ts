export interface PlaybackBounds {
  readonly startSeconds: number;
  readonly endSeconds: number;
}

export interface PlaybackStep {
  readonly t: number;
  /** False when playback has reached an end of the timeline and must stop. */
  readonly playing: boolean;
}

/** Longest wall-clock interval credited to one frame, so that a stalled tab does not jump ahead. */
const MAX_FRAME_SECONDS = 0.25;

/**
 * Advances the simulation time by one frame of playback. Time moves by the elapsed wall-clock
 * time multiplied by the rate, in the given direction, and stops at either end of the timeline.
 */
export function advancePlayback(
  t: number,
  elapsedSeconds: number,
  rate: number,
  direction: 1 | -1,
  bounds: PlaybackBounds,
): PlaybackStep {
  const elapsed = Math.min(Math.max(elapsedSeconds, 0), MAX_FRAME_SECONDS);
  const next = t + direction * rate * elapsed;
  if (next >= bounds.endSeconds) {
    return { t: bounds.endSeconds, playing: false };
  }
  if (next <= bounds.startSeconds) {
    return { t: bounds.startSeconds, playing: false };
  }
  return { t: next, playing: true };
}

/** Moves the simulation time by a fixed amount, within the timeline. */
export function seekBy(t: number, deltaSeconds: number, bounds: PlaybackBounds): number {
  return Math.min(Math.max(t + deltaSeconds, bounds.startSeconds), bounds.endSeconds);
}
