import { describe, expect, it } from 'vitest';
import { dataset } from '../data/dataset.ts';
import { shipTimeToSeconds } from '../time/shipTime.ts';
import { describeSources } from './stateSources.ts';
import { createTimelineModel } from './timelineModel.ts';

const model = createTimelineModel(dataset);
const sourcesAt = (clock: string) =>
  describeSources(dataset, model, model.evaluate(shipTimeToSeconds(`1912-04-${clock}`)));
const knownSources = new Set(dataset.sources.sources.map((source) => source.id));

describe('sources of the current state', () => {
  it('gives every statement at least one known source, a certainty and a note', () => {
    for (let t = 0; t <= model.endSeconds; t += 240) {
      for (const entry of describeSources(dataset, model, model.evaluate(t))) {
        expect(entry.sourceIds.length, `${entry.id} at ${t}`).toBeGreaterThan(0);
        expect(entry.notes.length, `${entry.id} at ${t}`).toBeGreaterThan(0);
        for (const sourceId of entry.sourceIds) {
          expect(knownSources.has(sourceId), `${sourceId} in ${entry.id}`).toBe(true);
        }
      }
    }
  });

  it('has unique identifiers at every instant', () => {
    for (let t = 0; t <= model.endSeconds; t += 240) {
      const ids = describeSources(dataset, model, model.evaluate(t)).map((entry) => entry.id);
      expect(new Set(ids).size, `at ${t}`).toBe(ids.length);
    }
  });

  it('states trim and list from the two keyframes around the instant', () => {
    const entries = sourcesAt('15T01:10');
    const trim = entries.find((entry) => entry.id === 'trim');
    expect(trim?.statement).toMatch(
      /^Trim 3\.\d° by the head, interpolated between 12:55 a\.m\. and 1:20 a\.m\.\.$/,
    );
    expect(trim?.certainty).toBe('estimated');
    expect(entries.find((entry) => entry.id === 'list')?.statement).toContain('to starboard');
  });

  it('is no more certain than its weakest record, and carries the competing positions', () => {
    const list = sourcesAt('15T02:00').find((entry) => entry.id === 'list');
    expect(list?.certainty).toBe('debated');
    expect(list?.alternatives.map((alternative) => alternative.holder)).toContain(
      'Samuel Halpern (2023)',
    );
  });

  it('lists a lifeboat for ten minutes after its launch, with its margin', () => {
    const during = sourcesAt('15T00:45').find((entry) => entry.id === 'boat-7');
    expect(during?.statement).toBe(
      'Boat No. 7 started down at about 12:40 a.m., give or take 5 minutes.',
    );
    expect(sourcesAt('15T00:39').some((entry) => entry.id === 'boat-7')).toBe(false);
    expect(sourcesAt('15T00:51').some((entry) => entry.id === 'boat-7')).toBe(false);
    expect(sourcesAt('15T00:45').some((entry) => entry.id === 'boat-sequence')).toBe(true);
  });

  it('lists the flooding compartments and the water aboard', () => {
    const entries = sourcesAt('14T23:50');
    expect(entries.some((entry) => entry.id === 'flooding-boiler-room-6')).toBe(true);
    expect(entries.some((entry) => entry.id === 'water-aboard')).toBe(true);
  });

  it('lists the distress signal in progress and the dispute about their number', () => {
    const entries = sourcesAt('15T00:48');
    expect(entries.find((entry) => entry.id === 'rocket-rocket-01')?.statement).toContain(
      '12:47 a.m.',
    );
    expect(entries.find((entry) => entry.id === 'rocket-count')?.certainty).toBe('debated');
    expect(sourcesAt('15T00:30').some((entry) => entry.topic === 'Distress signals')).toBe(false);
  });

  it('replaces trim and list by the break-up records once the hull has parted', () => {
    const entries = sourcesAt('15T02:18');
    expect(entries.some((entry) => entry.id === 'trim')).toBe(false);
    expect(entries.map((entry) => entry.id)).toEqual(
      expect.arrayContaining(['breakup-model', 'bow-section', 'stern-section', 'stern-angle']),
    );
    expect(entries.find((entry) => entry.id === 'stern-angle')?.certainty).toBe('debated');
  });

  it('always states the clock convention first', () => {
    expect(sourcesAt('14T23:40')[0]?.id).toBe('clock');
    expect(sourcesAt('15T02:26')[0]?.id).toBe('clock');
  });

  it('is a function of the state alone', () => {
    const state = model.evaluate(4000);
    expect(describeSources(dataset, model, state)).toEqual(describeSources(dataset, model, state));
  });

  it('lists the iceberg while it is near, and the state of the wreck once it is at rest', () => {
    const ids = (t: number): string[] =>
      describeSources(dataset, model, model.evaluate(t)).map((item) => item.id);
    expect(ids(0)).toContain('iceberg');
    expect(ids(1200)).not.toContain('iceberg');
    expect(ids(model.founderingSeconds)).not.toContain('wreck-bow');
    expect(ids(model.endSeconds)).toEqual(expect.arrayContaining(['wreck-bow', 'wreck-stern']));
    const iceberg = describeSources(dataset, model, model.evaluate(0)).find(
      (item) => item.id === 'iceberg',
    );
    expect(iceberg?.certainty).toBe('estimated');
    expect(iceberg?.sourceIds).toContain('brit-inquiry-testimony');
  });
});
