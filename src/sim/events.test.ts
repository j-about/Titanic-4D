import { describe, expect, it } from 'vitest';
import { dataset } from '../data/dataset.ts';
import type { Certainty } from '../data/schema/common.ts';
import type { Dataset } from '../data/schema/dataset.ts';
import { buildTimelineEvents, lastEventIndexAt, type TimelineEvent } from './events.ts';

const events = buildTimelineEvents(dataset);
const eventById = (id: string, list: readonly TimelineEvent[] = events): TimelineEvent => {
  const event = list.find((candidate) => candidate.id === id);
  if (event === undefined) {
    throw new RangeError(`No event "${id}".`);
  }
  return event;
};

const WEAKNESS: Readonly<Record<Certainty, number>> = { established: 0, estimated: 1, debated: 2 };

/** A deep copy of the dataset that a test may modify. */
function copyOfDataset(): Dataset {
  return structuredClone(dataset);
}

describe('wireless messages', () => {
  const offset = dataset.timeReference.adopted_offset;
  const wireless = events.filter((event) => event.kind === 'wireless');

  it('are never more certain than the clock offset that gives their ship’s time', () => {
    expect(wireless).toHaveLength(dataset.signals.wireless.messages.length);
    for (const event of wireless) {
      expect(WEAKNESS[event.certainty], event.id).toBeGreaterThanOrEqual(
        WEAKNESS[offset.certainty],
      );
    }
    expect(eventById('wireless-cqd-repeated').certainty).toBe('debated');
  });

  it('take the certainty of the log entry once the clock offset is established', () => {
    const settled = copyOfDataset();
    settled.timeReference.adopted_offset.certainty = 'established';
    const rebuilt = buildTimelineEvents(settled);
    expect(eventById('wireless-cqd-repeated', rebuilt).certainty).toBe('established');
    expect(eventById('wireless-carpathia-coming', rebuilt).certainty).toBe('estimated');
    expect(eventById('wireless-virginian-faint', rebuilt).certainty).toBe('debated');
  });

  it('cite the sources of the log entry and those of the clock offset, with both notes', () => {
    for (const message of dataset.signals.wireless.messages) {
      const event = eventById(`wireless-${message.id}`);
      expect(event.sourceIds, message.id).toEqual(
        expect.arrayContaining([...message.source_ids, ...offset.source_ids]),
      );
      expect(event.note, message.id).toContain(message.note);
      expect(event.note, message.id).toContain(offset.note);
    }
  });

  it('give the time at which each of the other clock offsets puts the log entry', () => {
    const { alternatives } = eventById('wireless-cqd-repeated');
    expect(alternatives.map((alternative) => alternative.holder)).toEqual(
      dataset.timeReference.alternative_offsets.map((alternative) => alternative.holder),
    );
    expect(alternatives.map((alternative) => alternative.position)).toEqual([
      "With ship's time 1 h 33 min ahead of New York time, this log entry falls at 12:01 a.m.",
      "With ship's time 1 h 50 min ahead of New York time, this log entry falls at 12:18 a.m.",
    ]);
  });

  it('keep the positions recorded on the message beside those of the clock offsets', () => {
    const { alternatives } = eventById('wireless-first-cqd');
    expect(alternatives.map((alternative) => alternative.position)).toEqual([
      "12.15 a.m. ship's time.",
      "With ship's time 1 h 33 min ahead of New York time, this log entry falls at 11:58 p.m.",
      "With ship's time 1 h 50 min ahead of New York time, this log entry falls at 12:15 a.m.",
    ]);
  });

  it('express an offset from a log kept in GMT as time behind GMT', () => {
    const inGmt = copyOfDataset();
    const first = inGmt.signals.wireless.messages[0];
    if (first === undefined) {
      throw new RangeError('The dataset has no wireless message.');
    }
    first.logged_reference = 'gmt';
    const event = eventById(`wireless-${first.id}`, buildTimelineEvents(inGmt));
    expect(event.description).toContain('Logged at 3:25 a.m. GMT by');
    expect(event.alternatives.map((alternative) => alternative.position)).toContain(
      "With ship's time 3 h 27 min behind GMT, this log entry falls at 11:58 p.m.",
    );
  });

  it('show the margin recorded on the message, and none where none is recorded', () => {
    for (const message of dataset.signals.wireless.messages) {
      const event = eventById(`wireless-${message.id}`);
      expect(event.uncertaintyBeforeSeconds, message.id).toBe(
        (message.uncertainty?.before_min ?? 0) * 60,
      );
      expect(event.uncertaintyAfterSeconds, message.id).toBe(
        (message.uncertainty?.after_min ?? 0) * 60,
      );
    }
    expect(eventById('wireless-to-olympic-position').uncertaintyBeforeSeconds).toBe(300);
    expect(eventById('wireless-virginian-cq').uncertaintyBeforeSeconds).toBe(0);
    expect(eventById('wireless-virginian-cq').uncertaintyAfterSeconds).toBe(0);
  });

  it('state in the note of the record where each margin comes from', () => {
    for (const message of dataset.signals.wireless.messages) {
      expect(message.note, message.id).toMatch(
        message.uncertainty === undefined ? /No margin is recorded/ : /The margin of \w+ minutes/,
      );
    }
  });
});

describe('distress signals', () => {
  it('show the margin recorded on each firing', () => {
    const changed = copyOfDataset();
    const second = changed.signals.rockets.firings[1];
    if (second === undefined) {
      throw new RangeError('The dataset has fewer than two firings.');
    }
    second.uncertainty = { before_min: 1, after_min: 2 };
    const event = eventById(second.id, buildTimelineEvents(changed));
    expect(event.uncertaintyBeforeSeconds).toBe(60);
    expect(event.uncertaintyAfterSeconds).toBe(120);
  });

  it('carry a margin whose origin the note of the record states', () => {
    for (const firing of dataset.signals.rockets.firings) {
      const event = eventById(firing.id);
      expect(event.uncertaintyBeforeSeconds, firing.id).toBe(firing.uncertainty.before_min * 60);
      expect(event.uncertaintyAfterSeconds, firing.id).toBe(firing.uncertainty.after_min * 60);
      expect(firing.note, firing.id).toMatch(/The margin /);
      expect(event.note, firing.id).toBe(firing.note);
    }
  });
});

describe('lifeboats', () => {
  const types = new Map(dataset.lifeboats.types.map((type) => [type.id, type]));

  it('cite every record from which their text is written', () => {
    for (const boat of dataset.lifeboats.boats) {
      const event = eventById(`boat-${boat.id}`);
      const records = [boat.launch, boat.occupancy, boat.in_charge, boat.remark].filter(
        (record) => record !== null,
      );
      for (const record of records) {
        expect(event.sourceIds, boat.id).toEqual(expect.arrayContaining([...record.source_ids]));
        expect(event.note, boat.id).toContain(record.note);
        expect(WEAKNESS[event.certainty], boat.id).toBeGreaterThanOrEqual(
          WEAKNESS[record.certainty],
        );
        for (const alternative of record.alternatives ?? []) {
          expect(event.alternatives, boat.id).toContainEqual(alternative);
        }
      }
    }
  });

  it('cite the record of the capacity wherever the text gives it', () => {
    for (const boat of dataset.lifeboats.boats) {
      const event = eventById(`boat-${boat.id}`);
      const type = types.get(boat.type);
      if (type !== undefined && event.description.includes(`could hold ${type.capacity}`)) {
        expect(event.sourceIds, boat.id).toEqual(expect.arrayContaining([...type.source_ids]));
        expect(event.note, boat.id).toContain(type.note);
      }
    }
  });

  it('word the figure of a boat lowered from the davits as an attribution', () => {
    const event = eventById('boat-7');
    expect(event.description).toBe(
      'Lifeboat No. 7 begins lowering from the starboard side, forward group of davits. In charge: Lookout George Hogg. About 28 people are attributed to this boat, which could hold 65. First boat away.',
    );
    expect(event.sourceIds).toEqual(
      expect.arrayContaining(['halpern-centennial-reappraisal-2011', 'wikipedia-titanic']),
    );
    expect(event.alternatives.map((alternative) => alternative.position)).toContain('27 persons.');
  });

  it('does not present the people who reached collapsibles A and B as aboard at the float-off', () => {
    for (const id of ['a', 'b']) {
      const { description } = eventById(`boat-${id}`);
      expect(description, id).toMatch(/About \d+ people reached this boat from the water\./);
      expect(description, id).not.toMatch(/capacity|could hold|attributed/);
    }
  });

  it('is no more certain than the weakest record behind the text', () => {
    expect(eventById('boat-7').certainty).toBe('estimated');
    expect(eventById('boat-12').certainty).toBe('debated');
  });

  it('leaves out what the dataset does not record', () => {
    const bare = copyOfDataset();
    const first = bare.lifeboats.boats[0];
    if (first === undefined) {
      throw new RangeError('The dataset has no boat.');
    }
    first.in_charge = null;
    first.remark = null;
    first.occupancy.persons = null;
    const event = eventById(`boat-${first.id}`, buildTimelineEvents(bare));
    expect(event.description).toBe(
      'Lifeboat No. 7 begins lowering from the starboard side, forward group of davits.',
    );
    expect(event.sourceIds).toEqual(first.launch.source_ids);
    expect(event.note).toBe(first.launch.note);
  });
});

describe('order of the events', () => {
  it('is chronological, and the last event at an instant is found by its time', () => {
    const times = events.map((event) => event.t);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    expect(lastEventIndexAt(events, -1)).toBe(-1);
    expect(lastEventIndexAt(events, 0)).toBeGreaterThanOrEqual(0);
    expect(lastEventIndexAt(events, 1e9)).toBe(events.length - 1);
  });
});
