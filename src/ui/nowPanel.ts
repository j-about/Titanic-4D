import type { TimelineEvent } from '../sim/events.ts';
import { lastEventIndexAt } from '../sim/events.ts';
import type { ShipState, TimelineModel } from '../sim/timelineModel.ts';
import { formatShipClock } from '../time/shipTime.ts';
import { certaintyBadge } from './certaintyBadge.ts';
import { el, setText } from './dom.ts';
import {
  describeBoats,
  describeFlooding,
  describeLighting,
  describeList,
  describeScene,
  describeTrim,
  describeWaterAboard,
  PHASE_LABELS,
} from './stateText.ts';

export interface NowPanel {
  readonly element: HTMLElement;
  update(ship: ShipState): void;
}

/** Number of recent events shown. */
const RECENT_EVENT_COUNT = 4;

function term(label: string): { readonly row: HTMLElement; readonly value: HTMLElement } {
  const value = el('dd', { class: 'facts__value' });
  return {
    row: el('div', { class: 'facts__row' }, [
      el('dt', { class: 'facts__term', text: label }),
      value,
    ]),
    value,
  };
}

function eventItem(event: TimelineEvent, onJump: (t: number) => void): HTMLElement {
  const margin = Math.round(
    Math.max(event.uncertaintyBeforeSeconds, event.uncertaintyAfterSeconds) / 60,
  );
  const jump = el('button', {
    type: 'button',
    class: 'link-button',
    text: formatShipClock(event.t),
  });
  jump.setAttribute('aria-label', `Go to ${formatShipClock(event.t)}, ${event.title}`);
  jump.addEventListener('click', () => onJump(event.t));
  return el('li', { class: 'event' }, [
    el('p', { class: 'event__head' }, [
      jump,
      margin > 0 ? el('span', { class: 'event__margin', text: `± ${margin} min` }) : null,
      certaintyBadge(event.certainty),
    ]),
    el('p', { class: 'event__title', text: event.title }),
    el('p', { class: 'event__description', text: event.description }),
  ]);
}

/** Creates the summary of the current instant: phase, description, figures and recent events. */
export function createNowPanel(model: TimelineModel, onJump: (t: number) => void): NowPanel {
  const phase = el('h3', { class: 'panel__heading' });
  const description = el('p', { class: 'panel__lead' });
  const trim = term('Trim');
  const list = term('List');
  const flooding = term('Flooding');
  const water = term('Water aboard');
  const boats = term('Lifeboats');
  const signals = term('Distress signals');
  const lighting = term('Lighting');
  const facts = el('dl', { class: 'facts' }, [
    trim.row,
    list.row,
    flooding.row,
    water.row,
    boats.row,
    signals.row,
    lighting.row,
  ]);
  const recentHeading = el('h3', { class: 'panel__heading', text: 'Most recent events' });
  const recent = el('ol', { class: 'events', reversed: true });
  const empty = el('p', { class: 'panel__empty', text: 'Nothing has happened yet.' });
  const element = el('div', { class: 'panel__content' }, [
    phase,
    description,
    facts,
    recentHeading,
    recent,
    empty,
  ]);

  let shownLastIndex = Number.NaN;

  const update = (ship: ShipState): void => {
    setText(phase, PHASE_LABELS[ship.phase]);
    setText(description, describeScene(ship));
    setText(trim.value, ship.intact ? describeTrim(ship.trimDeg) : 'Hull parted');
    setText(list.value, ship.intact ? describeList(ship.heelDeg) : 'Hull parted');
    setText(flooding.value, describeFlooding(ship));
    setText(water.value, describeWaterAboard(ship.waterAboardTonnes));
    setText(boats.value, describeBoats(ship));
    setText(signals.value, `${ship.rocketsFired} fired`);
    setText(lighting.value, describeLighting(ship.lightingOutput));

    const lastIndex = lastEventIndexAt(model.events, ship.t);
    if (lastIndex !== shownLastIndex) {
      shownLastIndex = lastIndex;
      const first = Math.max(0, lastIndex - RECENT_EVENT_COUNT + 1);
      const items = model.events
        .slice(first, lastIndex + 1)
        .reverse()
        .map((event) => eventItem(event, onJump));
      recent.replaceChildren(...items);
      empty.hidden = items.length > 0;
    }
  };

  return { element, update };
}
