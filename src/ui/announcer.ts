import type { TimelineEvent } from '../sim/events.ts';
import { formatShipClock } from '../time/shipTime.ts';

/** Playback rate from which only key events are announced. */
const KEY_EVENTS_ONLY_FROM_RATE = 300;
/** Shortest wall-clock interval between two announcements, in milliseconds. */
export const ANNOUNCEMENT_INTERVAL_MS = 4000;

/**
 * Chooses the event to announce among those crossed between two instants of playback: a key
 * event if there is one, otherwise the most recent, and only key events at high speed.
 */
export function selectAnnouncement(
  events: readonly TimelineEvent[],
  fromSeconds: number,
  toSeconds: number,
  rate: number,
): TimelineEvent | undefined {
  const low = Math.min(fromSeconds, toSeconds);
  const high = Math.max(fromSeconds, toSeconds);
  const crossed = events.filter((event) => event.t > low && event.t <= high);
  const keyEvents = crossed.filter((event) => event.keyEvent);
  const candidates =
    rate >= KEY_EVENTS_ONLY_FROM_RATE || keyEvents.length > 0 ? keyEvents : crossed;
  return toSeconds >= fromSeconds ? candidates.at(-1) : candidates[0];
}

export function announcementText(event: TimelineEvent): string {
  return `${formatShipClock(event.t)} ${event.title}.`;
}

export interface Announcer {
  /** Reports the progress of playback; announces at most one event per interval. */
  playbackAdvanced(fromSeconds: number, toSeconds: number, rate: number, nowMs: number): void;
  /** Announces a message at once, for example after the user moves in time. */
  say(message: string): void;
}

/** Creates an announcer writing into a polite live region. */
export function createAnnouncer(region: HTMLElement, events: readonly TimelineEvent[]): Announcer {
  let lastAnnouncementMs = Number.NEGATIVE_INFINITY;
  let pendingFromSeconds: number | undefined;

  const say = (message: string): void => {
    // Clearing first makes assistive technology announce a message identical to the previous one.
    region.textContent = '';
    region.textContent = message;
  };

  return {
    playbackAdvanced(fromSeconds, toSeconds, rate, nowMs) {
      pendingFromSeconds ??= fromSeconds;
      if (nowMs - lastAnnouncementMs < ANNOUNCEMENT_INTERVAL_MS) {
        return;
      }
      const event = selectAnnouncement(events, pendingFromSeconds, toSeconds, rate);
      if (event !== undefined) {
        say(announcementText(event));
        lastAnnouncementMs = nowMs;
      }
      pendingFromSeconds = undefined;
    },
    say,
  };
}
