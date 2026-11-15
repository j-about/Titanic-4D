import { describe, expect, it } from 'vitest';
import { dataset } from './dataset.ts';
import { collectProvenance } from './provenance.ts';
import { datasetSchemas } from './schema/dataset.ts';
import { findDatasetIssues, isWeakSource } from './validation.ts';

const files = {
  sources: dataset.sources,
  'time-reference': dataset.timeReference,
  ship: dataset.ship,
  chronology: dataset.chronology,
  attitude: dataset.attitude,
  flooding: dataset.flooding,
  lifeboats: dataset.lifeboats,
  signals: dataset.signals,
  lighting: dataset.lighting,
  breakup: dataset.breakup,
  site: dataset.site,
  people: dataset.people,
} as const;

describe('dataset files', () => {
  it.each(Object.keys(datasetSchemas) as (keyof typeof datasetSchemas)[])(
    '%s.json matches its schema',
    (name) => {
      const result = datasetSchemas[name].safeParse(files[name]);
      expect(result.error?.issues ?? []).toEqual([]);
    },
  );

  it('is consistent across files', () => {
    expect(findDatasetIssues(dataset)).toEqual([]);
  });
});

describe('provenance', () => {
  const records = [...collectProvenance(dataset, '')];

  it('is carried by several hundred records', () => {
    expect(records.length).toBeGreaterThan(300);
  });

  it('gives every record at least one source, a certainty and a note', () => {
    for (const { path, provenance } of records) {
      expect(provenance.source_ids.length, path).toBeGreaterThan(0);
      expect(['established', 'estimated', 'debated'], path).toContain(provenance.certainty);
      expect(provenance.note.trim().length, path).toBeGreaterThan(0);
    }
  });
});

describe('reported inconsistencies', () => {
  it('flags an unknown source', () => {
    const broken = structuredClone(dataset) as {
      chronology: { events: { source_ids: string[] }[] };
    };
    broken.chronology.events[0]?.source_ids.push('no-such-source');
    expect(findDatasetIssues(broken as unknown as typeof dataset)).toContain(
      'chronology.events[0]: unknown source "no-such-source".',
    );
  });

  it('flags a wireless time that contradicts the adopted clock offset', () => {
    const broken = structuredClone(dataset) as {
      signals: { wireless: { messages: { ats: string }[] } };
    };
    const first = broken.signals.wireless.messages[0];
    if (first !== undefined) {
      first.ats = '1912-04-15T00:15';
    }
    expect(findDatasetIssues(broken as unknown as typeof dataset).join('\n')).toContain(
      "signals.wireless.messages.first-cqd: ship's time does not match",
    );
  });
});

describe('records marked established', () => {
  const sources = new Map(dataset.sources.sources.map((source) => [source.id, source]));
  const established = [...collectProvenance(dataset, '')].filter(
    ({ provenance }) => provenance.certainty === 'established',
  );

  it('never rest only on works of reference, derivations or works that were not opened', () => {
    expect(established.length).toBeGreaterThan(100);
    for (const { path, provenance } of established) {
      const strong = provenance.source_ids.filter((id) => {
        const source = sources.get(id);
        return (
          source !== undefined &&
          source.kind !== 'reference' &&
          source.kind !== 'project' &&
          source.access !== 'cited-through' &&
          source.access !== 'not-consulted'
        );
      });
      expect(strong.length, path).toBeGreaterThan(0);
    }
  });

  it('treats Wikipedia, Britannica, Encyclopedia Titanica and the project itself as weak', () => {
    const weak = dataset.sources.sources.filter(isWeakSource).map((source) => source.id);
    expect(weak).toEqual(
      expect.arrayContaining([
        'wikipedia-titanic',
        'britannica-titanic',
        'encyclopedia-titanica-statistics',
        'model-monkey-funnels',
        'project-derivation',
        'halpern-centennial-reappraisal-2011',
        'ballard-1987',
      ]),
    );
    expect(weak).not.toContain('brit-inquiry-report');
    expect(weak).not.toContain('bbc-2023-scan');
  });

  it('flags an established record that cites only a work of reference', () => {
    const broken = structuredClone(dataset);
    const bow = broken.site.positions.find((position) => position.id === 'wreck-bow');
    expect(bow?.source_ids).toEqual(['britannica-titanic']);
    expect(bow?.certainty).toBe('estimated');
    if (bow !== undefined) {
      bow.certainty = 'established';
    }
    expect(findDatasetIssues(broken).join('\n')).toMatch(
      /^site\.positions\[2\]: an established record needs a source that the project opened/m,
    );
  });

  it('flags an established record that cites only a work known through another', () => {
    const broken = structuredClone(dataset);
    const collision = broken.timeReference.collision;
    collision.source_ids = ['ballard-1987', 'project-derivation'];
    expect(findDatasetIssues(broken).join('\n')).toMatch(
      /^timeReference\.collision: an established record needs a source/m,
    );
  });

  it('keeps the count of Encyclopedia Titanica, read through an extract, below established', () => {
    const count = dataset.people.casualty_counts.find(
      (candidate) => candidate.id === 'encyclopedia-titanica',
    );
    expect(count?.certainty).toBe('estimated');
  });
});

describe('lifeboats', () => {
  const { boats, facts } = dataset.lifeboats;
  const position = (boatId: string, holder: string): string | undefined =>
    boats
      .find((boat) => boat.id === boatId)
      ?.launch.alternatives?.find((alternative) => alternative.holder.startsWith(holder))?.position;

  it('summarises the launching sequence as the positions attached to collapsibles C and D have it', () => {
    const summary = facts.find((fact) => fact.id === 'launch-sequence-debate')?.summary ?? '';
    expect(boats.find((boat) => boat.id === 'c')?.launch.ats).toBe('1912-04-15T02:00');
    expect(position('c', 'Samuel Halpern')).toBe('2:00 a.m.');
    expect(position('c', 'Ioannis Georgiou')).toBe('2:00 a.m.');
    expect(position('c', 'British Inquiry')).toBe('1:40 a.m.');
    expect(boats.find((boat) => boat.id === 'd')?.launch.ats).toBe('1912-04-15T02:05');
    expect(position('d', 'Samuel Halpern')).toBe('2:05 a.m.');
    expect(position('d', 'Ioannis Georgiou')).toBe('2:10 a.m.');
    expect(position('d', 'British Inquiry')).toBe('2:05 a.m.');
    expect(summary).toContain(
      'The three modern reconstructions put collapsible C at 2:00 and collapsible D at 2:05 to 2:10; the 1912 table puts C at 1:40 and D at 2:05.',
    );
    expect(summary).not.toMatch(/agree[^.]*collapsibles C and D/);
  });

  it('puts No. 7 first, at 12:40 to 12:45, in every reconstruction recorded', () => {
    const seven = boats.find((boat) => boat.id === '7');
    expect(seven?.launch.ats).toBe('1912-04-15T00:40');
    expect(seven?.launch.alternatives?.map((alternative) => alternative.position)).toEqual([
      '12:40 a.m.',
      '12:45 a.m.',
      '12:40 a.m.',
    ]);
  });

  it('states in the occupancy notes the sum that the twenty figures really make', () => {
    const sum = boats.reduce((total, boat) => total + (boat.occupancy.persons ?? 0), 0);
    const saved = dataset.people.casualty_counts.flatMap((count) => count.saved ?? []);
    for (const boat of boats.filter((candidate) => candidate.occupancy.basis === 'attributed')) {
      expect(boat.occupancy.note, boat.id).toContain(
        `The twenty figures add up to ${sum}, close to the number of people saved (${Math.min(...saved)} to ${Math.max(...saved)} depending on the source)`,
      );
    }
  });

  it('gives the person in charge and the remark of each boat their own provenance', () => {
    for (const boat of boats) {
      for (const statement of [boat.in_charge, boat.remark]) {
        if (statement !== null) {
          expect(statement.value.length, boat.id).toBeGreaterThan(0);
          expect(statement.source_ids.length, boat.id).toBeGreaterThan(0);
          expect(statement.note.length, boat.id).toBeGreaterThan(0);
        }
      }
    }
    expect(boats.filter((boat) => boat.in_charge !== null)).toHaveLength(18);
  });

  it('flags a boat lowered from the davits whose figure counts people from the water', () => {
    const broken = structuredClone(dataset);
    const first = broken.lifeboats.boats[0];
    if (first !== undefined) {
      first.occupancy.basis = 'reached-from-water';
    }
    expect(findDatasetIssues(broken).join('\n')).toContain(
      'lifeboats.boats.7: the occupancy of a boat that floated off, and of no other, counts',
    );
  });
});

describe('margins of the distress signals', () => {
  it('flags a margin wider than half the interval between signals', () => {
    const broken = structuredClone(dataset);
    const second = broken.signals.rockets.firings[1];
    if (second !== undefined) {
      second.uncertainty = { before_min: 4, after_min: 3 };
    }
    expect(findDatasetIssues(broken)).toContain(
      'signals.rockets.firings.rocket-02: the margin exceeds half the interval between signals.',
    );
  });
});

describe('figures the owner asked to be shown as distinct counts', () => {
  const lost = Object.fromEntries(
    dataset.people.casualty_counts.map((count) => [count.id, count.lost]),
  );

  it('keeps the count of each source separate', () => {
    expect(lost).toEqual({
      'british-inquiry-1912': 1490,
      'us-senate-1912': 1517,
      'encyclopedia-titanica': 1496,
      'board-of-trade-1503': 1503,
    });
  });
});
