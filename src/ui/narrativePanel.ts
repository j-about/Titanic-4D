import { lastEventIndexAt, type TimelineEvent } from '../sim/events.ts';
import type { ShipState, TimelineModel } from '../sim/timelineModel.ts';
import { formatShipClock } from '../time/shipTime.ts';
import { certaintyBadge } from './certaintyBadge.ts';
import { el, setAttribute } from './dom.ts';
import { scrollDistanceToReveal } from './scrollReveal.ts';

export interface NarrativePanel {
  readonly element: HTMLElement;
  /**
   * Marks the event in progress. When `follow` is set, brings it into view inside the box that
   * scrolls around it, if there is one; the page itself is never scrolled.
   */
  update(ship: ShipState, follow: boolean): void;
}

/** The nearest ancestor that scrolls its own content vertically, if there is one. */
function scrollingAncestor(element: HTMLElement): HTMLElement | null {
  for (let node = element.parentElement; node !== null; node = node.parentElement) {
    const overflow = getComputedStyle(node).overflowY;
    if ((overflow === 'auto' || overflow === 'scroll') && node.scrollHeight > node.clientHeight) {
      return node;
    }
  }
  return null;
}

/** A CSS length of a computed style, in pixels; zero when the property has no length. */
function pixels(length: string): number {
  return Number.parseFloat(length) || 0;
}

/**
 * Brings an item into view by scrolling the box that scrolls around it, by the shortest distance
 * and keeping the scroll margin of the item clear. Where no box scrolls around the item, the page
 * is the only thing that scrolls and it stays where the user put it.
 */
function revealInScrollingAncestor(item: HTMLElement): void {
  const scroller = scrollingAncestor(item);
  if (scroller === null) {
    return;
  }
  const box = item.getBoundingClientRect();
  const margins = getComputedStyle(item);
  const frameStart = scroller.getBoundingClientRect().top + scroller.clientTop;
  scroller.scrollTop += scrollDistanceToReveal(
    box.top - pixels(margins.scrollMarginTop),
    box.bottom + pixels(margins.scrollMarginBottom),
    frameStart,
    frameStart + scroller.clientHeight,
  );
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
      revealInScrollingAncestor(current);
    }
  };

  return { element, update };
}
