import { describe, expect, it } from 'vitest';
import { combineProvenance, type Provenance, weakestCertainty } from './provenance.ts';

const log: Provenance = {
  source_ids: ['log', 'study'],
  certainty: 'established',
  note: 'As logged.',
  alternatives: [{ holder: 'Report', position: 'Earlier.', source_ids: ['report'] }],
};
const offset: Provenance = {
  source_ids: ['study', 'offset'],
  certainty: 'debated',
  note: 'Converted with the adopted offset.',
  alternatives: [
    { holder: 'Report', position: 'Earlier.', source_ids: ['report'] },
    { holder: 'Committee', position: 'Earlier still.', source_ids: ['committee'] },
  ],
};
const margin: Provenance = { source_ids: ['project'], certainty: 'estimated', note: 'As logged.' };

describe('weakest certainty', () => {
  it('is the least certain of the levels given', () => {
    expect(weakestCertainty(['established', 'estimated'])).toBe('estimated');
    expect(weakestCertainty(['estimated', 'debated', 'established'])).toBe('debated');
    expect(weakestCertainty(['established', 'established'])).toBe('established');
  });

  it('is established when no level is given', () => {
    expect(weakestCertainty([])).toBe('established');
  });
});

describe('combined provenance', () => {
  const combined = combineProvenance([log, offset, margin]);

  it('is no more certain than its weakest record', () => {
    expect(combined.certainty).toBe('debated');
    expect(combineProvenance([log, margin]).certainty).toBe('estimated');
    expect(combineProvenance([log]).certainty).toBe('established');
  });

  it('cites every source once, in order of first appearance', () => {
    expect(combined.sourceIds).toEqual(['log', 'study', 'offset', 'project']);
  });

  it('keeps each distinct note once', () => {
    expect(combined.notes).toEqual(['As logged.', 'Converted with the adopted offset.']);
  });

  it('merges the alternatives, an alternative held twice being listed once', () => {
    expect(combined.alternatives).toEqual([
      { holder: 'Report', position: 'Earlier.', source_ids: ['report'] },
      { holder: 'Committee', position: 'Earlier still.', source_ids: ['committee'] },
    ]);
    expect(combineProvenance([margin]).alternatives).toEqual([]);
  });
});
