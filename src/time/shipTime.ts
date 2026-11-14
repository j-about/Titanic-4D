/**
 * Time handling for the reconstruction.
 *
 * The simulation clock `t` counts seconds from the collision, 11:40 p.m. on 14 April 1912 in
 * Titanic's ship's time (Apparent Time Ship). Dataset times are local date-times on board; they
 * are converted to `t` here and nowhere else.
 */

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_DAY = 86_400;

/** Ship's time of the collision, the origin of the simulation clock. */
export const COLLISION_SHIP_TIME = '1912-04-14T23:40';

const SHIP_TIME_PATTERN = /^1912-04-(1[45])T(\d{2}):(\d{2})(?::(\d{2}))?$/;

/** Seconds elapsed since 00:00 on 14 April 1912, ship's time. */
function secondsSinceFourteenth(shipTime: string): number {
  const match = SHIP_TIME_PATTERN.exec(shipTime);
  if (match === null) {
    throw new RangeError(`Invalid ship's time: "${shipTime}".`);
  }
  const [, day, hours, minutes, seconds] = match;
  return (
    (Number(day) - 14) * SECONDS_PER_DAY +
    Number(hours) * SECONDS_PER_HOUR +
    Number(minutes) * SECONDS_PER_MINUTE +
    Number(seconds ?? 0)
  );
}

const COLLISION_OFFSET_SECONDS = secondsSinceFourteenth(COLLISION_SHIP_TIME);

/** Converts a ship's time of the dataset to seconds since the collision. */
export function shipTimeToSeconds(shipTime: string): number {
  return secondsSinceFourteenth(shipTime) - COLLISION_OFFSET_SECONDS;
}

/** Converts seconds since the collision to a ship's time string with second precision. */
export function secondsToShipTime(t: number): string {
  const total = Math.round(t) + COLLISION_OFFSET_SECONDS;
  const day = 14 + Math.floor(total / SECONDS_PER_DAY);
  const secondsOfDay = ((total % SECONDS_PER_DAY) + SECONDS_PER_DAY) % SECONDS_PER_DAY;
  const hours = Math.floor(secondsOfDay / SECONDS_PER_HOUR);
  const minutes = Math.floor((secondsOfDay % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
  const seconds = secondsOfDay % SECONDS_PER_MINUTE;
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `1912-04-${pad(day)}T${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export interface ClockFormatOptions {
  /** Shows seconds, as in `2:17:30 a.m.`. */
  readonly seconds?: boolean;
}

/** Formats a second of the day as a 12-hour clock time in British usage, such as `11:40 p.m.`. */
function formatSecondOfDay(secondOfDay: number, options: ClockFormatOptions): string {
  const hours24 = Math.floor(secondOfDay / SECONDS_PER_HOUR);
  const minutes = Math.floor((secondOfDay % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
  const seconds = secondOfDay % SECONDS_PER_MINUTE;
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const meridiem = hours24 < 12 ? 'a.m.' : 'p.m.';
  const pad = (value: number): string => String(value).padStart(2, '0');
  const clock =
    options.seconds === true
      ? `${hours12}:${pad(minutes)}:${pad(seconds)}`
      : `${hours12}:${pad(minutes)}`;
  return `${clock} ${meridiem}`;
}

function secondOfDay(totalSeconds: number): number {
  return ((Math.floor(totalSeconds) % SECONDS_PER_DAY) + SECONDS_PER_DAY) % SECONDS_PER_DAY;
}

/** Formats the simulation clock as ship's time, for example `12:45 a.m.`. */
export function formatShipClock(t: number, options: ClockFormatOptions = {}): string {
  return formatSecondOfDay(secondOfDay(t + COLLISION_OFFSET_SECONDS), options);
}

/**
 * Formats the simulation clock on another clock that differs from ship's time by a fixed number
 * of minutes (`shipMinusOtherMinutes` = ship's time minus the other clock).
 */
export function formatOffsetClock(
  t: number,
  shipMinusOtherMinutes: number,
  options: ClockFormatOptions = {},
): string {
  const seconds = t + COLLISION_OFFSET_SECONDS - shipMinusOtherMinutes * SECONDS_PER_MINUTE;
  return formatSecondOfDay(secondOfDay(seconds), options);
}

/** Date of the day shown on the ship's clocks, `14 April 1912` or `15 April 1912`. */
export function formatShipDate(t: number): string {
  const day = 14 + Math.floor((t + COLLISION_OFFSET_SECONDS) / SECONDS_PER_DAY);
  return `${day} April 1912`;
}

/**
 * Converts the simulation clock to an absolute instant, given the difference between ship's
 * time and Greenwich Mean Time in minutes (negative when the ship's clocks are behind GMT).
 */
export function toUtcDate(t: number, shipMinusGmtMinutes: number): Date {
  const midnightFourteenthUtcMs = Date.UTC(1912, 3, 14, 0, 0, 0);
  const gmtSeconds = t + COLLISION_OFFSET_SECONDS - shipMinusGmtMinutes * SECONDS_PER_MINUTE;
  return new Date(midnightFourteenthUtcMs + gmtSeconds * 1000);
}

/** Formats a duration since the collision as `2 h 40 min`. */
export function formatElapsed(t: number): string {
  const totalMinutes = Math.floor(Math.max(0, t) / SECONDS_PER_MINUTE);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours === 0 ? `${minutes} min` : `${hours} h ${String(minutes).padStart(2, '0')} min`;
}
