import { lastEventIndexAt, type TimelineEvent } from '../sim/events.ts';
import type { ShipState, TimelineModel } from '../sim/timelineModel.ts';
import { formatShipClock } from '../time/shipTime.ts';
import { certaintyBadge } from './certaintyBadge.ts';
import { el, setAttribute } from './dom.ts';

export interface NarrativePanel {
  readonly element: HTMLElement;
  /** Marks the event in progress; scrolls it into view when `follow` is set. */
  update(ship: ShipState, follow: boolean): void;
}

function narrativeItem(event: TimelineEvent, onJump: (t: number) => void): HTMLElement {
  const margin = Math.round(
    Math.max(event.uncertaintyBeforeSeconds, event.uncertaintyAfterSeconds) / 60,
  );
  const clock = formatShipClock(event.t);
  const jump = el('button', { type: 'button', class: 'link-button narrative__time', text: clock });
  jump.setAttribute('aria-label', `Go to ${clock}, ${event.title}`);
  jump.addEventListener('click', () => onJump(event.t));
  const alternatives =
    event.alternatives.length === 0
      ? null
      : el('details', { class: 'narrative__alternatives' }, [
          el('summary', { text: 'Other positions' }),
          el(
            'ul',
            {},
            event.alternatives.map((alternative) =>
              el('li', {}, [
                el('strong', { text: `${alternative.holder}: ` }),
                alternative.position,
              ]),
            ),
          ),
        ]);
  return el('li', { class: 'narrative__item', 'data-event-id': event.id }, [
    el('p', { class: 'narrative__head' }, [
      jump,
      margin > 0 ? el('span', { class: 'event__margin', text: `± ${margin} min` }) : null,
      certaintyBadge(event.certainty),
    ]),
    el('h3', { class: 'narrative__title', text: event.title }),
    el('p', { class: 'narrative__description', text: event.description }),
    event.location === null
      ? null
      : el('p', { class: 'narrative__location', text: event.location }),
    alternatives,
  ]);
}

/**
 * Creates the text narrative: every event of the night in order, each with its time, margin and
 * level of certainty. It is the complete text alternative to the 3D scene and stays in step with
 * the timeline.
 */
export function createNarrativePanel(
  model: TimelineModel,
  onJump: (t: number) => void,
): NarrativePanel {
  const items = model.events.map((event) => narrativeItem(event, onJump));
  const list = el('ol', { class: 'narrative' }, items);
  const intro = el('p', {
    class: 'panel__lead',
    text: "The night in words, in ship's time. Select a time to move the scene to that moment.",
  });
  const element = el('div', { class: 'panel__content' }, [intro, list]);
  let currentIndex = Number.NaN;

  const update = (ship: ShipState, follow: boolean): void => {
    const index = lastEventIndexAt(model.events, ship.t);
    if (index === currentIndex) {
      return;
    }
    const previous = items[currentIndex];
    if (previous !== undefined) {
      setAttribute(previous, 'aria-current', null);
    }
    currentIndex = index;
    const current = items[index];
    if (current === undefined) {
      return;
    }
    setAttribute(current, 'aria-current', 'step');
    if (follow) {
      current.scrollIntoView({ block: 'nearest' });
    }
  };

  return { element, update };
}
