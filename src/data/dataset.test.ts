import { describe, expect, it } from 'vitest';
import { dataset } from './dataset.ts';
import { collectProvenance } from './provenance.ts';
import { datasetSchemas } from './schema/dataset.ts';
import { findDatasetIssues } from './validation.ts';

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
