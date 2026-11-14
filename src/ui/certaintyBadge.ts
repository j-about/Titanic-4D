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
  return el(
    'span',
    { class: `certainty certainty--${certainty}`, title: CERTAINTY_DESCRIPTIONS[certainty] },
    [
      el('span', {
        class: 'certainty__symbol',
        'aria-hidden': 'true',
        text: CERTAINTY_SYMBOLS[certainty],
      }),
      el('span', { text: CERTAINTY_LABELS[certainty] }),
    ],
  );
}
