import { describe, expect, it } from 'vitest';
import { dataset } from '../data/dataset.ts';
import { CASUALTY_COUNTS_PATH, casualtySentence } from './casualties.ts';

describe('sentence on the people who died', () => {
  it('gives the lowest and the highest count of the dataset', () => {
    const lost = dataset.people.casualty_counts.map((count) => count.lost);
    expect(Math.min(...lost)).toBe(1490);
    expect(Math.max(...lost)).toBe(1517);
    expect(casualtySentence(dataset)).toBe(
      'Between 1,490 and 1,517 people died that night, depending on the source.',
    );
  });

  it('does not depend on the order of the counts', () => {
    const reversed = structuredClone(dataset);
    reversed.people.casualty_counts.reverse();
    expect(casualtySentence(reversed)).toBe(casualtySentence(dataset));
  });

  it('gives one figure when every source agrees', () => {
    const agreed = structuredClone(dataset);
    for (const count of agreed.people.casualty_counts) {
      count.lost = 1496;
    }
    expect(casualtySentence(agreed)).toBe(
      '1,496 people died that night, according to every source.',
    );
  });

  it('points to the table of the counts', () => {
    expect(CASUALTY_COUNTS_PATH).toBe('/narrative/#lives-lost');
  });
});
