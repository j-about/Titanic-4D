import type { Provenance } from '../data/provenance.ts';
import type { Alternative, Certainty } from '../data/schema/common.ts';
import type { Dataset } from '../data/schema/dataset.ts';
import { formatShipClock, shipTimeToSeconds } from '../time/shipTime.ts';
import { bracketingIndices } from './interpolation.ts';
import type { ShipState, TimelineModel } from './timelineModel.ts';

export type SourceTopic =
  | 'Time'
  | 'Trim'
  | 'List'
  | 'Hull position'
  | 'Flooding'
  | 'Lifeboats'
  | 'Distress signals'
  | 'Lighting'
  | 'Break-up'
  | 'Events'
  | 'Surroundings';

/** One statement about the current state, with the records of the dataset it derives from. */
export interface SourceEntry {
  readonly id: string;
  readonly topic: SourceTopic;
  readonly statement: string;
  readonly certainty: Certainty;
  readonly sourceIds: readonly string[];
  readonly notes: readonly string[];
  readonly alternatives: readonly Alternative[];
}

/** Lifeboats whose launch is recent enough to be listed, in seconds. */
const RECENT_BOAT_SECONDS = 600;
/** Events recent enough to be listed, in seconds, and how many of them at most. */
const RECENT_EVENT_SECONDS = 300;
const MAX_RECENT_EVENTS = 4;
/** A distress signal is listed until the next one is due. */
const RECENT_ROCKET_SECONDS = 360;

const CERTAINTY_WEAKNESS: Readonly<Record<Certainty, number>> = {
  established: 0,
  estimated: 1,
  debated: 2,
};

/** The least certain of several levels: a statement is no stronger than its weakest record. */
function weakest(levels: readonly Certainty[]): Certainty {
  return levels.reduce<Certainty>(
    (current, level) => (CERTAINTY_WEAKNESS[level] > CERTAINTY_WEAKNESS[current] ? level : current),
    'established',
  );
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function entry(
  id: string,
  topic: SourceTopic,
  statement: string,
  records: readonly Provenance[],
): SourceEntry {
  const alternatives = new Map<string, Alternative>();
  for (const alternative of records.flatMap((record) => record.alternatives ?? [])) {
    alternatives.set(`${alternative.holder}|${alternative.position}`, alternative);
  }
  return {
    id,
    topic,
    statement,
    certainty: weakest(records.map((record) => record.certainty)),
    sourceIds: unique(records.flatMap((record) => record.source_ids)),
    notes: unique(records.map((record) => record.note)),
    alternatives: [...alternatives.values()],
  };
}

interface Keyframe extends Provenance {
  readonly ats: string;
}

/** The keyframes on either side of `t`, or the single keyframe at or beyond an end. */
function bracket<K extends Keyframe>(keyframes: readonly K[], t: number): K[] {
  const [low, high] = bracketingIndices(
    keyframes.map((keyframe) => shipTimeToSeconds(keyframe.ats)),
    t,
  );
  return unique([keyframes[low], keyframes[high]].filter((keyframe) => keyframe !== undefined));
}

function between(keyframes: readonly Keyframe[]): string {
  const clocks = keyframes.map((keyframe) => formatShipClock(shipTimeToSeconds(keyframe.ats)));
  return clocks.length === 2
    ? `interpolated between ${clocks[0]} and ${clocks[1]}`
    : `as recorded for ${clocks[0]}`;
}

const oneDecimal = new Intl.NumberFormat('en-GB', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function attitudeEntries(dataset: Dataset, state: ShipState): SourceEntry[] {
  const { attitude } = dataset;
  const trim = bracket(attitude.trim, state.t);
  const heel = bracket(attitude.heel, state.t);
  const side = state.heelDeg >= 0 ? 'starboard' : 'port';
  return [
    entry(
      'trim',
      'Trim',
      `Trim ${oneDecimal.format(Math.abs(state.trimDeg))}° by the ${state.trimDeg >= 0 ? 'head' : 'stern'}, ${between(trim)}.`,
      trim,
    ),
    entry(
      'list',
      'List',
      `List ${oneDecimal.format(Math.abs(state.heelDeg))}° to ${side}, ${between(heel)}.`,
      heel,
    ),
    entry(
      'hull-position',
      'Hull position',
      'The hull turns about a fixed point of its original waterline, which stays at sea level.',
      [attitude.waterline_pivot, attitude.initial_draught],
    ),
  ];
}

function floodingEntries(dataset: Dataset, state: ShipState): SourceEntry[] {
  const { flooding, ship } = dataset;
  const entries: SourceEntry[] = [];
  state.compartments.forEach((compartment, index) => {
    const record = flooding.compartments[index];
    const name = ship.compartments[index]?.name ?? compartment.id;
    if (record === undefined || compartment.status !== 'flooding') {
      return;
    }
    entries.push(
      entry(
        `flooding-${compartment.id}`,
        'Flooding',
        `${name}: water about ${oneDecimal.format(compartment.levelAboveKeelM)} m above the keel.`,
        [record, ...bracket(record.levels, state.t)],
      ),
    );
  });
  if (state.waterAboardTonnes !== null) {
    const keyframes = bracket(flooding.water_aboard, state.t);
    entries.push(
      entry(
        'water-aboard',
        'Flooding',
        `About ${new Intl.NumberFormat('en-GB').format(Math.round(state.waterAboardTonnes / 100) * 100)} tonnes of water aboard, ${between(keyframes)}.`,
        keyframes,
      ),
    );
  }
  return entries;
}

function boatEntries(dataset: Dataset, state: ShipState): SourceEntry[] {
  const { lifeboats } = dataset;
  const entries: SourceEntry[] = [];
  for (const boat of lifeboats.boats) {
    const launch = shipTimeToSeconds(boat.launch.ats);
    if (state.t < launch || state.t - launch > RECENT_BOAT_SECONDS) {
      continue;
    }
    const name =
      boat.type === 'collapsible' ? `Collapsible ${boat.id.toUpperCase()}` : `Boat No. ${boat.id}`;
    const verb = boat.launch.mode === 'floated-off' ? 'floated off' : 'started down';
    const margin = boat.launch.uncertainty.before_min;
    entries.push(
      entry(
        `boat-${boat.id}`,
        'Lifeboats',
        `${name} ${verb} at about ${formatShipClock(launch)}, give or take ${margin} minutes.`,
        [boat.launch, boat.station],
      ),
    );
  }
  if (entries.length > 0) {
    const debate = lifeboats.facts.find((fact) => fact.id === 'launch-sequence-debate');
    if (debate !== undefined) {
      entries.push(entry('boat-sequence', 'Lifeboats', debate.summary, [debate]));
    }
  }
  return entries;
}

function rocketEntries(dataset: Dataset, state: ShipState): SourceEntry[] {
  const { rockets } = dataset.signals;
  const fired = rockets.firings.filter((firing) => shipTimeToSeconds(firing.ats) <= state.t);
  const last = fired.at(-1);
  if (last === undefined || state.t - shipTimeToSeconds(last.ats) > RECENT_ROCKET_SECONDS) {
    return [];
  }
  const count = rockets.facts.find((fact) => fact.id === 'rocket-count');
  return [
    entry(
      `rocket-${last.id}`,
      'Distress signals',
      `Distress signal ${fired.length} of the ${rockets.firings.length} shown, at ${formatShipClock(shipTimeToSeconds(last.ats))}.`,
      [last],
    ),
    ...(count === undefined
      ? []
      : [entry('rocket-count', 'Distress signals', count.summary, [count])]),
  ];
}

function lightingEntries(dataset: Dataset, state: ShipState): SourceEntry[] {
  const keyframes = bracket(dataset.lighting.output, state.t);
  const percent = Math.round(state.lightingOutput * 100);
  return [
    entry(
      'lighting',
      'Lighting',
      `Electric lighting at ${percent} % of normal, ${between(keyframes)}.`,
      keyframes,
    ),
  ];
}

function breakupEntries(dataset: Dataset, model: TimelineModel, state: ShipState): SourceEntry[] {
  const { breakup } = dataset;
  if (state.t < model.finalPlungeSeconds) {
    return [];
  }
  const entries = [
    entry('breakup-model', 'Break-up', breakup.reference_model.summary, [
      breakup.reference_model,
      breakup.break,
    ]),
  ];
  if (!state.intact) {
    entries.push(
      entry('bow-section', 'Break-up', 'Position of the bow section.', [
        breakup.bow_section,
        ...bracket(breakup.bow_section.keyframes, state.t),
      ]),
      entry('stern-section', 'Break-up', 'Position of the stern section.', [
        breakup.stern_section,
        ...bracket(breakup.stern_section.keyframes, state.t),
      ]),
    );
    const angle = breakup.facts.find((fact) => fact.id === 'stern-angle');
    if (angle !== undefined) {
      entries.push(entry('stern-angle', 'Break-up', angle.summary, [angle]));
    }
  }
  return entries;
}

function eventEntries(model: TimelineModel, state: ShipState): SourceEntry[] {
  return model.events
    .filter((event) => event.kind !== 'lifeboat' && event.kind !== 'rocket')
    .filter((event) => event.t <= state.t && state.t - event.t <= RECENT_EVENT_SECONDS)
    .slice(-MAX_RECENT_EVENTS)
    .map((event) =>
      entry(`event-${event.id}`, 'Events', `${formatShipClock(event.t)}: ${event.title}.`, [
        {
          source_ids: event.sourceIds,
          certainty: event.certainty,
          note: event.note,
          ...(event.alternatives.length > 0 ? { alternatives: event.alternatives } : {}),
        },
      ]),
    );
}

/** Time after the collision during which the iceberg is listed: it is then left far astern. */
const ICEBERG_LISTED_SECONDS = 600;

function icebergEntries(dataset: Dataset, state: ShipState): SourceEntry[] {
  if (state.t > ICEBERG_LISTED_SECONDS) {
    return [];
  }
  const facts = dataset.site.iceberg.filter((fact) =>
    ['iceberg-size', 'iceberg-appearance', 'iceberg-passage'].includes(fact.id),
  );
  return facts.length === 0
    ? []
    : [
        entry(
          'iceberg',
          'Surroundings',
          'The iceberg is a generic shape of the reported size, left astern as the ship runs on.',
          facts,
        ),
      ];
}

function wreckEntries(dataset: Dataset, state: ShipState): SourceEntry[] {
  const find = (id: string) => dataset.site.wreck.find((fact) => fact.id === id);
  const entries: SourceEntry[] = [];
  const bow = find('bow-condition');
  const foremast = find('foremast-condition');
  const funnels = find('funnels-lost');
  const stern = find('stern-condition');
  if (state.wreck.bowAtRest && bow !== undefined) {
    const records = [bow, foremast, funnels].filter((fact) => fact !== undefined);
    entries.push(
      entry(
        'wreck-bow',
        'Break-up',
        `${bow.summary} ${foremast?.summary ?? ''} ${funnels?.summary ?? ''}`.trim(),
        records,
      ),
    );
  }
  if (state.wreck.sternAtRest && stern !== undefined) {
    entries.push(
      entry(
        'wreck-stern',
        'Break-up',
        `${stern.summary} The scene shows its hull without the upper works, as a massing only.`,
        [stern],
      ),
    );
  }
  return entries;
}

function surroundingsEntries(dataset: Dataset): SourceEntry[] {
  const { site, timeReference } = dataset;
  const find = (id: string) => site.environment.find((fact) => fact.id === id);
  const weather = find('weather');
  const sea = find('sea-state');
  return [
    entry(
      'clock',
      'Time',
      "Times are ship's time, 2 h 02 min ahead of New York time and 2 h 58 min behind GMT.",
      [timeReference.adopted_offset, timeReference.collision],
    ),
    ...(weather === undefined || sea === undefined
      ? []
      : [entry('weather', 'Surroundings', `${weather.summary} ${sea.summary}`, [weather, sea])]),
    entry('heading', 'Surroundings', 'The ship lies heading about north-north-west.', [
      site.heading,
    ]),
  ];
}

/**
 * Lists the records of the dataset from which the state at this instant derives, as statements
 * grouped by topic. A pure function of the state.
 */
export function describeSources(
  dataset: Dataset,
  model: TimelineModel,
  state: ShipState,
): SourceEntry[] {
  const intactEntries = state.intact ? attitudeEntries(dataset, state) : [];
  return [
    ...surroundingsEntries(dataset).slice(0, 1),
    ...intactEntries,
    ...breakupEntries(dataset, model, state),
    ...wreckEntries(dataset, state),
    ...floodingEntries(dataset, state),
    ...boatEntries(dataset, state),
    ...rocketEntries(dataset, state),
    ...lightingEntries(dataset, state),
    ...eventEntries(model, state),
    ...icebergEntries(dataset, state),
    ...surroundingsEntries(dataset).slice(1),
  ];
}
