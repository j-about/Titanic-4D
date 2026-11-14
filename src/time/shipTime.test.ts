import { describe, expect, it } from 'vitest';
import {
  formatElapsed,
  formatOffsetClock,
  formatShipClock,
  formatShipDate,
  secondsToShipTime,
  shipTimeToSeconds,
  toUtcDate,
} from './shipTime.ts';

describe('shipTimeToSeconds', () => {
  it('places the collision at the origin of the simulation clock', () => {
    expect(shipTimeToSeconds('1912-04-14T23:40')).toBe(0);
  });

  it('counts two hours and forty minutes to the foundering', () => {
    expect(shipTimeToSeconds('1912-04-15T02:20')).toBe(9600);
  });

  it('accepts seconds and crosses midnight', () => {
    expect(shipTimeToSeconds('1912-04-15T00:00:30')).toBe(20 * 60 + 30);
  });

  it('rejects malformed values', () => {
    expect(() => shipTimeToSeconds('1912-04-16T00:00')).toThrow(RangeError);
    expect(() => shipTimeToSeconds('02:20')).toThrow(RangeError);
  });

  it('round-trips through secondsToShipTime', () => {
    for (const t of [0, 59, 1200, 4321, 9600, 9960]) {
      expect(shipTimeToSeconds(secondsToShipTime(t))).toBe(t);
    }
  });
});

describe('clock formatting', () => {
  it('uses the 12-hour clock with a.m. and p.m.', () => {
    expect(formatShipClock(0)).toBe('11:40 p.m.');
    expect(formatShipClock(20 * 60)).toBe('12:00 a.m.');
    expect(formatShipClock(65 * 60)).toBe('12:45 a.m.');
    expect(formatShipClock(9600)).toBe('2:20 a.m.');
  });

  it('shows seconds on request', () => {
    expect(formatShipClock(9420 + 30, { seconds: true })).toBe('2:17:30 a.m.');
  });

  it('gives the date on the ship before and after midnight', () => {
    expect(formatShipDate(0)).toBe('14 April 1912');
    expect(formatShipDate(20 * 60)).toBe('15 April 1912');
  });

  it('formats elapsed time since the collision', () => {
    expect(formatElapsed(0)).toBe('0 min');
    expect(formatElapsed(45 * 60)).toBe('45 min');
    expect(formatElapsed(9600)).toBe('2 h 40 min');
  });
});

describe('conversion to other clocks', () => {
  const shipMinusNewYork = 122;
  const shipMinusGmt = -178;

  it('puts the foundering at 12:18 a.m. New York time with the adopted offset', () => {
    expect(formatOffsetClock(9600, shipMinusNewYork)).toBe('12:18 a.m.');
  });

  it('puts the first distress call, 12:27 a.m. on board, at 10:25 p.m. New York time', () => {
    expect(formatOffsetClock(shipTimeToSeconds('1912-04-15T00:27'), shipMinusNewYork)).toBe(
      '10:25 p.m.',
    );
  });

  it('converts the collision to 02:38 GMT on 15 April 1912', () => {
    expect(toUtcDate(0, shipMinusGmt).toISOString()).toBe('1912-04-15T02:38:00.000Z');
  });

  it('converts the foundering to 05:18 GMT, not the 05:47 of the 1912 message', () => {
    expect(toUtcDate(9600, shipMinusGmt).toISOString()).toBe('1912-04-15T05:18:00.000Z');
    expect(toUtcDate(9600, -207).toISOString()).toBe('1912-04-15T05:47:00.000Z');
  });
});
