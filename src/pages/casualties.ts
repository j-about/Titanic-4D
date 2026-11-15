import type { Dataset } from '../data/schema/dataset.ts';

const numberFormat = new Intl.NumberFormat('en-GB');

/** Address of the table of "The night in words" that gives the count of each source. */
export const CASUALTY_COUNTS_PATH = '/narrative/#lives-lost';

/**
 * The sentence on the people who died, written from the counts of lives lost that the dataset
 * records: the lowest and the highest of them, or the single figure when they all agree.
 */
export function casualtySentence(dataset: Dataset): string {
  const lost = dataset.people.casualty_counts.map((count) => count.lost);
  const lowest = Math.min(...lost);
  const highest = Math.max(...lost);
  return lowest === highest
    ? `${numberFormat.format(lowest)} people died that night, according to every source.`
    : `Between ${numberFormat.format(lowest)} and ${numberFormat.format(highest)} people died that night, depending on the source.`;
}
