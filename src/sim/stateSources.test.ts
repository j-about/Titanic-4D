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

describe('elements of the scene that are neither the hull nor an event', () => {
  const find = (clock: string, id: string) => sourcesAt(clock).find((entry) => entry.id === id);

  it('lists the computed sky at every instant, no more certain than the clock offset', () => {
    const offset = dataset.timeReference.adopted_offset;
    for (let t = 0; t <= model.endSeconds; t += 240) {
      const sky = describeSources(dataset, model, model.evaluate(t)).find(
        (entry) => entry.id === 'sky',
      );
      expect(sky?.topic, `at ${t}`).toBe('Sky');
      expect(sky?.certainty, `at ${t}`).toBe(offset.certainty);
      expect(sky?.sourceIds, `at ${t}`).toEqual(
        expect.arrayContaining(['yale-bsc5', 'astronomy-engine', ...offset.source_ids]),
      );
    }
    const sky = find('15T01:00', 'sky');
    expect(sky?.statement).toContain('computed from a star catalogue and an ephemeris');
    expect(sky?.statement).toContain('No Moon was in the sky');
    expect(sky?.notes).toContain(offset.note);
  });

  it('lists the haze of the horizon with the positions on it', () => {
    const haze = find('15T01:00', 'haze');
    expect(haze?.certainty).toBe('debated');
    expect(haze?.statement).toContain('the officers saw none');
    expect(haze?.alternatives.map((alternative) => alternative.holder)).toEqual([
      'Tim Maltin',
      'Samuel Halpern',
    ]);
  });

  it('lists each funnel from the moment the scene no longer shows it', () => {
    expect(sourcesAt('15T02:15:59').some((entry) => entry.topic === 'Funnels')).toBe(false);
    expect(find('15T02:16', 'funnel-1')?.statement).toBe(
      'From 2:16 a.m. the scene no longer shows funnel No. 1, counted from forward.',
    );
    const during = sourcesAt('15T02:17:20');
    expect(during.filter((entry) => entry.topic === 'Funnels').map((entry) => entry.id)).toEqual([
      'funnel-1',
      'funnel-2',
      'funnel-3',
    ]);
    const second = during.find((entry) => entry.id === 'funnel-2');
    expect(second?.statement).toBe(
      'From 2:17:15 a.m. the scene no longer shows funnel No. 2, counted from forward.',
    );
    expect(second?.certainty).toBe('estimated');
    expect(second?.sourceIds).toEqual(['project-derivation']);
    expect(second?.notes.join(' ')).toContain('No testimony on its fall was found');
    expect(find('15T02:26', 'funnel-4')?.sourceIds).toEqual(['halpern-chronology-2023']);
  });

  it('agrees with the funnels that the state shows standing', () => {
    for (let t = model.finalPlungeSeconds; t <= model.endSeconds; t += 5) {
      const state = model.evaluate(t);
      const listed = describeSources(dataset, model, state)
        .filter((entry) => entry.topic === 'Funnels')
        .map((entry) => entry.id);
      const fallen = dataset.ship.funnels
        .filter((_, index) => state.funnelsStanding[index] === false)
        .map((funnel) => `funnel-${funnel.id}`);
      expect(listed, `at ${t}`).toEqual(fallen);
    }
  });

  it('lists the depth of the seabed once the ship has foundered', () => {
    expect(find('15T02:19:59', 'seabed')).toBeUndefined();
    const seabed = find('15T02:20', 'seabed');
    expect(seabed?.statement).toBe('The seabed is shown 3,800 m below the surface.');
    const depth = dataset.site.environment.find((fact) => fact.id === 'depth');
    expect(seabed?.certainty).toBe(depth?.certainty);
    expect(seabed?.sourceIds).toEqual(depth?.source_ids);
    expect(find('15T02:26', 'seabed')).toBeDefined();
  });

  it('lists the light of the Californian while the ship is afloat, with the competing distances', () => {
    const distance = dataset.site.californian.find((fact) => fact.id === 'californian-distance');
    const bearing = dataset.site.californian.find((fact) => fact.id === 'californian-bearing');
    for (const clock of ['14T23:40', '15T01:00', '15T02:19:59']) {
      const light = find(clock, 'californian-light');
      expect(light?.topic, clock).toBe('Surroundings');
      expect(light?.certainty, clock).toBe('debated');
      expect(light?.statement, clock).toBe(`${distance?.summary} ${bearing?.summary}`);
      expect(light?.notes, clock).toEqual([distance?.note, bearing?.note]);
      expect(light?.alternatives, clock).toEqual([
        ...(distance?.alternatives ?? []),
        ...(bearing?.alternatives ?? []),
      ]);
    }
    const positions = find('15T01:00', 'californian-light')?.alternatives.map(
      (alternative) => alternative.position,
    );
    expect(positions).toEqual(
      expect.arrayContaining([
        '19 to 19½ miles.',
        '17 to 20 miles, most likely about 18; Titanic probably not seen.',
        '5 to 10 miles, probably nearer five.',
        '12 to at most about 14 nautical miles.',
      ]),
    );
    expect(find('15T02:20', 'californian-light')).toBeUndefined();
    expect(find('15T02:26', 'californian-light')).toBeUndefined();
  });

  it('keeps the entries of one topic together at every instant', () => {
    for (let t = 0; t <= model.endSeconds; t += 120) {
      const topics = describeSources(dataset, model, model.evaluate(t)).map((item) => item.topic);
      const runs = topics.filter((topic, index) => topic !== topics[index - 1]);
      // The clock offset opens the list on its own; every other topic forms a single run.
      const afterTime = runs.slice(1);
      expect(new Set(afterTime).size, `at ${t}: ${runs.join(', ')}`).toBe(afterTime.length);
    }
  });
});
