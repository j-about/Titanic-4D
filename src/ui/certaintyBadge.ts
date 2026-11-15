import type { Certainty } from '../data/schema/common.ts';
import { el } from './dom.ts';
import { CERTAINTY_DESCRIPTIONS, CERTAINTY_LABELS } from './stateText.ts';

/** Shape shown before the label, so that the level is not conveyed by colour alone. */
const CERTAINTY_SYMBOLS: Readonly<Record<Certainty, string>> = {
  established: '●',
  estimated: '◐',
  debated: '◇',
};

/** Creates a labelled badge for a level of certainty. */
export function certaintyBadge(certainty: Certainty): HTMLElement {
  return el('span', { class: `certainty certainty--${certainty}` }, [
    el('span', {
      class: 'certainty__symbol',
      'aria-hidden': 'true',
      text: CERTAINTY_SYMBOLS[certainty],
    }),
    el('span', { text: CERTAINTY_LABELS[certainty] }),
  ]);
}

/**
 * Creates a disclosure that states in words what each level of certainty means: a list pairing
 * the badge of each level with its description.
 */
export function certaintyLegend(): HTMLElement {
  const levels = Object.keys(CERTAINTY_LABELS) as Certainty[];
  return el('details', { class: 'certainty-legend' }, [
    el('summary', { text: 'What the levels of certainty mean' }),
    el(
      'dl',
      { class: 'certainty-legend__list' },
      levels.flatMap((level) => [
        el('dt', {}, [certaintyBadge(level)]),
        el('dd', { text: `${CERTAINTY_DESCRIPTIONS[level]}.` }),
      ]),
    ),
  ]);
}
