import { describe, expect, it } from 'vitest';
import { dataset } from '../data/dataset.ts';
import { createTimelineModel } from '../sim/timelineModel.ts';
import { shipTimeToSeconds } from '../time/shipTime.ts';
import { announcementText, selectAnnouncement } from './announcer.ts';

const { events } = createTimelineModel(dataset);
const seconds = (clock: string): number => shipTimeToSeconds(`1912-04-${clock}`);

describe('selectAnnouncement', () => {
  it('announces nothing when no event is crossed', () => {
    expect(
      selectAnnouncement(events, seconds('14T23:41'), seconds('14T23:41:30'), 60),
    ).toBeUndefined();
  });

  it('announces the most recent event crossed at normal speed', () => {
    const event = selectAnnouncement(events, seconds('14T23:41'), seconds('14T23:42:30'), 60);
    expect(event?.id).toBe('engines-stopped');
  });

  it('prefers a key event among those crossed', () => {
    const event = selectAnnouncement(events, seconds('15T00:36'), seconds('15T00:44'), 60);
    expect(event?.id).toBe('boat-7');
  });

  it('announces only key events at high speed', () => {
    expect(
      selectAnnouncement(events, seconds('14T23:41'), seconds('14T23:43'), 600),
    ).toBeUndefined();
    expect(selectAnnouncement(events, seconds('15T02:16:30'), seconds('15T02:21'), 600)?.id).toBe(
      'stern-disappears',
    );
  });

  it('announces the earliest event crossed when time runs backward', () => {
    const event = selectAnnouncement(events, seconds('15T02:21'), seconds('15T02:16:30'), 600);
    expect(event?.id).toBe('lights-out');
  });
});

describe('announcementText', () => {
  it("gives the ship's time and the title", () => {
    const collision = events.find((event) => event.id === 'collision');
    expect(collision === undefined ? '' : announcementText(collision)).toBe(
      '11:40 p.m. Collision with the iceberg.',
    );
  });
});
