import { type AppState, PLAYBACK_RATES, type PlaybackRate } from '../app/appState.ts';
import type { TimelineEvent } from '../sim/events.ts';
import type { ShipState, TimelineModel } from '../sim/timelineModel.ts';
import { formatElapsed, formatShipClock, formatShipDate } from '../time/shipTime.ts';
import { el, icon, setAttribute, setText } from './dom.ts';
import { PHASE_LABELS } from './stateText.ts';

export interface TimelineActions {
  seek(t: number): void;
  seekBy(deltaSeconds: number): void;
  togglePlaying(): void;
  setDirection(direction: 1 | -1): void;
  setRate(rate: PlaybackRate): void;
}

export interface TimelinePanel {
  readonly element: HTMLElement;
  update(app: AppState, ship: ShipState): void;
}

const ICONS = {
  play: 'M8 5v14l11-7z',
  pause: 'M6 5h4v14H6zM14 5h4v14h-4z',
  start: 'M6 5h2v14H6zM20 5v14L9 12z',
  end: 'M16 5h2v14h-2zM4 5v14l11-7z',
  back: 'M11 5v14L2 12zM21 5v14l-9-7z',
  forward: 'M13 5v14l9-7zM3 5v14l9-7z',
  reverse: 'M12 5V2L7 6l5 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z',
} as const;

const STEP_SECONDS = 60;
const SCRUBBER_STEP_SECONDS = 15;
const SCRUBBER_PAGE_SECONDS = 300;

const RATE_LABELS: Readonly<Record<PlaybackRate, string>> = {
  1: '×1 (real time)',
  10: '×10',
  60: '×60',
  300: '×300',
  600: '×600',
};

function button(label: string, iconPath: string, className = ''): HTMLButtonElement {
  return el('button', { type: 'button', class: `button ${className}`.trim() }, [
    icon(iconPath),
    el('span', { class: 'button__label', text: label }),
  ]);
}

/** Position of an instant along the scrubber, as a percentage. */
function percentOf(t: number, model: TimelineModel): string {
  return `${((t - model.startSeconds) / (model.endSeconds - model.startSeconds)) * 100}%`;
}

function bookmarkLabel(event: TimelineEvent): string {
  return `${formatShipClock(event.t)} ${event.title}`;
}

/**
 * Brings a key moment wholly inside its list, once, when it shows the keyboard focus: the browser
 * leaves the list where it is when part of the button already shows. A press of the pointer does
 * not match `:focus-visible`, so the list never moves under the pointer; the first key pressed
 * afterwards makes the ring appear without a new focus event, hence the second listener. Later
 * keys are left to scroll the list and the page.
 */
function keepFocusedBookmarkWhole(list: HTMLElement): void {
  let revealed: HTMLElement | null = null;
  const reveal = (event: Event): void => {
    const bookmark =
      event.target instanceof Element ? event.target.closest<HTMLElement>('.bookmark') : null;
    if (bookmark === null || bookmark === revealed || !bookmark.matches(':focus-visible')) {
      return;
    }
    revealed = bookmark;
    bookmark.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };
  list.addEventListener('focusin', reveal);
  list.addEventListener('keydown', reveal);
  list.addEventListener('focusout', () => {
    revealed = null;
  });
}

/** Creates the clock, the playback controls, the scrubber and the bookmarks of key moments. */
export function createTimelinePanel(model: TimelineModel, actions: TimelineActions): TimelinePanel {
  const clockTime = el('span', { class: 'clock__time' });
  const clockDate = el('span', { class: 'clock__date' });
  const clockElapsed = el('span', { class: 'clock__elapsed' });
  const clockPhase = el('span', { class: 'clock__phase' });
  const clock = el('p', { class: 'clock' }, [
    clockTime,
    el('span', { class: 'clock__label', text: "ship's time" }),
    clockDate,
    clockElapsed,
    clockPhase,
  ]);

  const toStart = button('Collision', ICONS.start);
  toStart.setAttribute('aria-label', 'Go to the collision, 11:40 p.m.');
  const stepBack = button('Back 1 min', ICONS.back);
  const playToggle = button('Play', ICONS.play, 'button--primary');
  const stepForward = button('Forward 1 min', ICONS.forward);
  const toEnd = button('Wreck', ICONS.end);
  toEnd.setAttribute('aria-label', 'Go to the wreck on the seabed');
  const reverse = button('Backward', ICONS.reverse);
  reverse.setAttribute('aria-pressed', 'false');
  reverse.setAttribute('aria-label', 'Run time backward');

  const rateSelect = el(
    'select',
    { id: 'rate-select', class: 'select' },
    PLAYBACK_RATES.map((rate) => el('option', { value: rate, text: RATE_LABELS[rate] })),
  );
  const rateField = el('div', { class: 'field' }, [
    el('label', { class: 'field__label', for: 'rate-select', text: 'Speed' }),
    rateSelect,
  ]);

  const transport = el('div', { class: 'transport', role: 'group', 'aria-label': 'Playback' }, [
    toStart,
    stepBack,
    playToggle,
    stepForward,
    toEnd,
    reverse,
    rateField,
  ]);

  const scrubber = el('input', {
    type: 'range',
    id: 'scrubber',
    class: 'scrubber__input',
    min: model.startSeconds,
    max: model.endSeconds,
    step: SCRUBBER_STEP_SECONDS,
    value: model.startSeconds,
    'aria-label': "Time of the night, ship's time",
  });
  const keyEvents = model.events.filter((event) => event.keyEvent);
  const marks = el(
    'div',
    { class: 'scrubber__marks', 'aria-hidden': 'true' },
    keyEvents.map((event) => {
      const mark = el('span', { class: 'scrubber__mark' });
      mark.style.insetInlineStart = percentOf(event.t, model);
      return mark;
    }),
  );
  const scrubberRow = el('div', { class: 'scrubber' }, [
    el('span', {
      class: 'scrubber__end',
      'aria-hidden': 'true',
      text: formatShipClock(model.startSeconds),
    }),
    el('div', { class: 'scrubber__track' }, [scrubber, marks]),
    el('span', {
      class: 'scrubber__end',
      'aria-hidden': 'true',
      text: formatShipClock(model.endSeconds),
    }),
  ]);

  const bookmarkButtons = keyEvents.map((event) => {
    const item = el('button', { type: 'button', class: 'bookmark' }, [
      el('span', { class: 'bookmark__time', text: formatShipClock(event.t) }),
      el('span', { class: 'bookmark__title', text: event.title }),
    ]);
    item.setAttribute('aria-label', `Go to ${bookmarkLabel(event)}`);
    item.addEventListener('click', () => actions.seek(event.t));
    return item;
  });
  const bookmarkList = el(
    'ul',
    { class: 'bookmarks__list' },
    bookmarkButtons.map((item) => el('li', {}, [item])),
  );
  keepFocusedBookmarkWhole(bookmarkList);
  const bookmarks = el('nav', { class: 'bookmarks', 'aria-label': 'Key moments' }, [bookmarkList]);

  toStart.addEventListener('click', () => actions.seek(model.startSeconds));
  toEnd.addEventListener('click', () => actions.seek(model.endSeconds));
  stepBack.addEventListener('click', () => actions.seekBy(-STEP_SECONDS));
  stepForward.addEventListener('click', () => actions.seekBy(STEP_SECONDS));
  playToggle.addEventListener('click', () => actions.togglePlaying());
  let direction: 1 | -1 = 1;
  reverse.addEventListener('click', () => actions.setDirection(direction === 1 ? -1 : 1));
  rateSelect.addEventListener('change', () =>
    actions.setRate(Number(rateSelect.value) as PlaybackRate),
  );
  scrubber.addEventListener('input', () => actions.seek(Number(scrubber.value)));
  scrubber.addEventListener('keydown', (event) => {
    if (event.key === 'PageUp' || event.key === 'PageDown') {
      event.preventDefault();
      actions.seekBy(event.key === 'PageUp' ? SCRUBBER_PAGE_SECONDS : -SCRUBBER_PAGE_SECONDS);
    }
  });

  const element = el('div', { class: 'timeline__content' }, [
    clock,
    transport,
    scrubberRow,
    bookmarks,
  ]);
  const playLabel = playToggle.querySelector('.button__label');
  const playIcon = playToggle.querySelector('path');

  const elapsedText = (t: number): string =>
    t < 30 ? 'at the collision' : `${formatElapsed(t)} after the collision`;

  const updateClock = (app: AppState, ship: ShipState): void => {
    setText(clockTime, formatShipClock(app.t, { seconds: app.rate <= 10 }));
    setText(clockDate, formatShipDate(app.t));
    setText(clockElapsed, elapsedText(app.t));
    setText(clockPhase, PHASE_LABELS[ship.phase]);
  };

  const updateTransport = (app: AppState): void => {
    direction = app.direction;
    if (playLabel !== null && playIcon !== null) {
      setText(playLabel, app.playing ? 'Pause' : 'Play');
      setAttribute(playIcon, 'd', app.playing ? ICONS.pause : ICONS.play);
    }
    setAttribute(reverse, 'aria-pressed', String(app.direction === -1));
    if (rateSelect.value !== String(app.rate)) {
      rateSelect.value = String(app.rate);
    }
  };

  const updateScrubber = (app: AppState): void => {
    // While the user holds the thumb, its value is left alone unless time has moved away from it.
    const focused = document.activeElement === scrubber;
    const drifted = Math.abs(Number(scrubber.value) - app.t) > SCRUBBER_STEP_SECONDS;
    if (!focused || drifted) {
      scrubber.value = String(Math.round(app.t));
    }
    setAttribute(scrubber, 'aria-valuetext', `${formatShipClock(app.t)}, ${elapsedText(app.t)}`);
    scrubber.style.setProperty('--progress', percentOf(app.t, model));
  };

  const updateBookmarks = (app: AppState): void => {
    const current = keyEvents.findLastIndex((event) => event.t <= app.t);
    bookmarkButtons.forEach((item, index) => {
      setAttribute(item, 'aria-current', index === current ? 'true' : null);
    });
  };

  const update = (app: AppState, ship: ShipState): void => {
    updateClock(app, ship);
    updateTransport(app);
    updateScrubber(app);
    updateBookmarks(app);
  };

  return { element, update };
}
