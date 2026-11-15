import type { Certainty } from '../data/schema/common.ts';
import type { Dataset } from '../data/schema/dataset.ts';
import type { TimelineEvent } from '../sim/events.ts';
import type { TimelineModel } from '../sim/timelineModel.ts';
import { formatShipClock, secondsToClock } from '../time/shipTime.ts';
import { CERTAINTY_DESCRIPTIONS, CERTAINTY_LABELS } from '../ui/stateText.ts';
import { h, type Markup } from './html.ts';

const CERTAINTIES: readonly Certainty[] = ['established', 'estimated', 'debated'];

const numberFormat = new Intl.NumberFormat('en-GB');

function count(value: number | null): string {
  return value === null ? 'Not stated' : numberFormat.format(value);
}

/** Address of the reconstruction at the instant of an event. */
function sceneLink(event: TimelineEvent): string {
  return `/?t=${secondsToClock(event.t)}`;
}

function sourceList(dataset: Dataset, sourceIds: readonly string[]): Markup {
  return h(
    'ul',
    { class: 'event-sources' },
    sourceIds.map((id) => {
      const source = dataset.sources.sources.find((candidate) => candidate.id === id);
      if (source === undefined) {
        return null;
      }
      const label = `${source.title} (${source.year})`;
      return h('li', {}, source.url === undefined ? label : h('a', { href: source.url }, label));
    }),
  );
}

function eventItem(dataset: Dataset, event: TimelineEvent): Markup {
  const clock = formatShipClock(event.t);
  const margin = Math.round(
    Math.max(event.uncertaintyBeforeSeconds, event.uncertaintyAfterSeconds) / 60,
  );
  return h(
    'li',
    { class: 'chronicle__item', id: `event-${event.id}` },
    h('h3', {}, h('span', { class: 'chronicle__time' }, clock), ' ', event.title),
    h('p', {}, event.description),
    event.location === null ? null : h('p', { class: 'chronicle__meta' }, event.location),
    h(
      'p',
      { class: 'chronicle__meta' },
      `${CERTAINTY_LABELS[event.certainty]}`,
      margin > 0 ? `, give or take ${margin} min` : '',
      '. ',
      h(
        'a',
        { href: sceneLink(event) },
        'Show this moment',
        h(
          'span',
          { class: 'visually-hidden' },
          ` (${clock}, ${event.title}) in the 3D reconstruction`,
        ),
      ),
    ),
    event.alternatives.length === 0
      ? null
      : h(
          'ul',
          { class: 'chronicle__alternatives' },
          event.alternatives.map((alternative) =>
            h('li', {}, h('strong', {}, `${alternative.holder}: `), alternative.position),
          ),
        ),
    h(
      'details',
      {},
      h(
        'summary',
        {},
        'Sources',
        h('span', { class: 'visually-hidden' }, ` of ${clock}, ${event.title}`),
      ),
      sourceList(dataset, event.sourceIds),
    ),
  );
}

function casualtyTable(dataset: Dataset): Markup {
  return h(
    'table',
    { class: 'data-table' },
    h('caption', {}, 'People aboard, saved and lost, according to each source'),
    h(
      'thead',
      {},
      h(
        'tr',
        {},
        h('th', { scope: 'col' }, 'Source'),
        h('th', { scope: 'col', class: 'data-table__number' }, 'Aboard'),
        h('th', { scope: 'col', class: 'data-table__number' }, 'Saved'),
        h('th', { scope: 'col', class: 'data-table__number' }, 'Lost'),
      ),
    ),
    h(
      'tbody',
      {},
      dataset.people.casualty_counts.map((entry) =>
        h(
          'tr',
          {},
          h('th', { scope: 'row' }, entry.holder),
          h('td', { class: 'data-table__number' }, count(entry.aboard)),
          h('td', { class: 'data-table__number' }, count(entry.saved)),
          h('td', { class: 'data-table__number' }, count(entry.lost)),
        ),
      ),
    ),
  );
}

/**
 * Renders the night as text: every dated event in order, with its time, its level of certainty,
 * the positions that differ and its sources. It is the complete text alternative to the 3D scene.
 */
export function renderNarrative(dataset: Dataset, model: TimelineModel): Markup {
  return h(
    'article',
    { class: 'prose' },
    h('h1', {}, 'The night in words'),
    h(
      'p',
      {},
      'The sinking of RMS Titanic, from the collision at 11:40 p.m. on 14 April 1912 to the two ',
      "sections of the wreck at rest on the seabed, in ship's time. This page says in text ",
      'everything that the 3D reconstruction shows.',
    ),
    h('h2', {}, 'How to read it'),
    h(
      'ul',
      {},
      CERTAINTIES.map((level) =>
        h(
          'li',
          {},
          h('strong', {}, CERTAINTY_LABELS[level]),
          `: ${CERTAINTY_DESCRIPTIONS[level].toLowerCase()}.`,
        ),
      ),
    ),
    h('h2', {}, 'Lives lost'),
    h(
      'p',
      {},
      'The sources do not agree on the number of people aboard or lost. Their counts are given ',
      'separately; none is preferred.',
    ),
    casualtyTable(dataset),
    h('h2', {}, 'Chronology'),
    h(
      'ol',
      { class: 'chronicle' },
      model.events.map((event) => eventItem(dataset, event)),
    ),
  );
}
