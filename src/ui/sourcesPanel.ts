import type { Dataset } from '../data/schema/dataset.ts';
import type { Source } from '../data/schema/sources.ts';
import { describeSources, type SourceEntry } from '../sim/stateSources.ts';
import type { ShipState, TimelineModel } from '../sim/timelineModel.ts';
import { certaintyBadge } from './certaintyBadge.ts';
import { el } from './dom.ts';

export interface SourcesPanel {
  readonly element: HTMLElement;
  update(ship: ShipState): void;
}

const ACCESS_LABELS: Readonly<Record<Source['access'], string>> = {
  read: 'consulted',
  'read-in-part': 'consulted in part',
  'cited-through': 'cited through another source',
  'not-consulted': 'not consulted',
};

function sourceItem(source: Source | undefined, id: string): HTMLElement {
  if (source === undefined) {
    return el('li', { text: id });
  }
  const authors = source.authors.join(', ');
  const title =
    source.url === undefined
      ? el('cite', { text: source.title })
      : el('a', { href: source.url, rel: 'noopener noreferrer external' }, [
          el('cite', { text: source.title }),
        ]);
  return el('li', { class: 'source' }, [
    title,
    el('span', { text: ` — ${authors}, ${source.year} (${ACCESS_LABELS[source.access]})` }),
  ]);
}

function entryItem(entry: SourceEntry, sources: ReadonlyMap<string, Source>): HTMLElement {
  const details = el('details', { class: 'source-entry__details' }, [
    el('summary', { text: `Sources and notes (${entry.sourceIds.length})` }),
    ...entry.notes.map((note) => el('p', { class: 'source-entry__note', text: note })),
    el(
      'ul',
      { class: 'source-entry__sources' },
      entry.sourceIds.map((id) => sourceItem(sources.get(id), id)),
    ),
    entry.alternatives.length === 0
      ? null
      : el('div', { class: 'source-entry__alternatives' }, [
          el('p', { class: 'source-entry__alternatives-title', text: 'Other positions' }),
          el(
            'ul',
            {},
            entry.alternatives.map((alternative) =>
              el('li', {}, [
                el('strong', { text: `${alternative.holder}: ` }),
                alternative.position,
              ]),
            ),
          ),
        ]),
  ]);
  return el('li', { class: 'source-entry' }, [
    el('p', { class: 'source-entry__head' }, [
      el('span', { class: 'source-entry__topic', text: entry.topic }),
      certaintyBadge(entry.certainty),
    ]),
    el('p', { class: 'source-entry__statement', text: entry.statement }),
    details,
  ]);
}

/**
 * Creates the list of the dataset records behind the current state. The list is rebuilt only
 * when the set of statements changes, and keeps open the details that the user has opened.
 */
export function createSourcesPanel(dataset: Dataset, model: TimelineModel): SourcesPanel {
  const sources = new Map(dataset.sources.sources.map((source) => [source.id, source]));
  const intro = el('p', {
    class: 'panel__lead',
    text: 'Every element of the scene derives from a record of the dataset. These are the records in use at this instant, with their level of certainty.',
  });
  const list = el('ul', { class: 'source-entries' });
  const element = el('div', { class: 'panel__content' }, [intro, list]);
  const items = new Map<string, { readonly statement: string; readonly element: HTMLElement }>();

  const update = (ship: ShipState): void => {
    const entries = describeSources(dataset, model, ship);
    const ordered: HTMLElement[] = [];
    const seen = new Set<string>();
    for (const entry of entries) {
      seen.add(entry.id);
      const existing = items.get(entry.id);
      if (existing !== undefined && existing.statement === entry.statement) {
        ordered.push(existing.element);
        continue;
      }
      const created = entryItem(entry, sources);
      const wasOpen = existing?.element.querySelector('details')?.open === true;
      const details = created.querySelector('details');
      if (details !== null) {
        details.open = wasOpen;
      }
      items.set(entry.id, { statement: entry.statement, element: created });
      ordered.push(created);
    }
    for (const id of items.keys()) {
      if (!seen.has(id)) {
        items.delete(id);
      }
    }
    const unchanged =
      ordered.length === list.children.length &&
      ordered.every((item, index) => list.children[index] === item);
    if (!unchanged) {
      list.replaceChildren(...ordered);
    }
  };

  return { element, update };
}
