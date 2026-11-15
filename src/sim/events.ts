import { combineProvenance, type Provenance } from '../data/provenance.ts';
import type { EventCategory } from '../data/schema/chronology.ts';
import type { Alternative, Certainty } from '../data/schema/common.ts';
import type { Dataset } from '../data/schema/dataset.ts';
import type { Boat, BoatType } from '../data/schema/lifeboats.ts';
import type { WirelessMessage } from '../data/schema/signals.ts';
import type { TimeReferenceFile } from '../data/schema/time.ts';
import {
  formatElapsed,
  formatOffsetClock,
  formatShipClock,
  shipTimeToSeconds,
} from '../time/shipTime.ts';

export type TimelineEventKind = 'chronology' | 'lifeboat' | 'rocket' | 'wireless';

/** One dated entry of the narrative, whatever file of the dataset it comes from. */
export interface TimelineEvent {
  readonly id: string;
  /** Seconds since the collision. */
  readonly t: number;
  /** Margin recorded by the dataset on either side of `t`, in seconds; zero when it records none. */
  readonly uncertaintyBeforeSeconds: number;
  readonly uncertaintyAfterSeconds: number;
  readonly kind: TimelineEventKind;
  readonly category: EventCategory;
  readonly title: string;
  readonly description: string;
  readonly location: string | null;
  /** Key events are offered as bookmarks on the timeline. */
  readonly keyEvent: boolean;
  readonly certainty: Certainty;
  readonly sourceIds: readonly string[];
  readonly note: string;
  readonly alternatives: readonly Alternative[];
}

const SECONDS_PER_MINUTE = 60;

/** Boats and messages that mark a turning point of the night and are offered as bookmarks. */
const KEY_BOAT_IDS: ReadonlySet<string> = new Set(['7', 'd']);
const KEY_ROCKET_IDS: ReadonlySet<string> = new Set(['rocket-01']);
const KEY_MESSAGE_IDS: ReadonlySet<string> = new Set(['first-cqd']);

function boatName(boat: Boat): string {
  if (boat.type === 'collapsible') {
    return `Collapsible ${boat.id.toUpperCase()}`;
  }
  return boat.type === 'cutter' ? `Emergency boat No. ${boat.id}` : `Lifeboat No. ${boat.id}`;
}

/** The fields of a provenance record, joined into those of one event. */
function eventProvenance(
  records: readonly Provenance[],
): Pick<TimelineEvent, 'certainty' | 'sourceIds' | 'note' | 'alternatives'> {
  const combined = combineProvenance(records);
  return {
    certainty: combined.certainty,
    sourceIds: combined.sourceIds,
    note: combined.notes.join(' '),
    alternatives: combined.alternatives,
  };
}

/**
 * Sentence on the people counted for a boat, worded after the basis of the count: people who
 * reached a boat from the water are not set against its capacity.
 */
function describeOccupancy(boat: Boat, type: BoatType): string {
  const { persons, basis } = boat.occupancy;
  if (persons === null) {
    return '';
  }
  return basis === 'reached-from-water'
    ? ` About ${persons} people reached this boat from the water.`
    : ` About ${persons} people are attributed to this boat, which could hold ${type.capacity}.`;
}

function describeBoat(boat: Boat, type: BoatType): string {
  const station =
    boat.station.group === 'officers-quarters-roof'
      ? `the roof of the officers' quarters, ${boat.side} side`
      : `the ${boat.side} side, ${boat.station.group} group of davits`;
  const action =
    boat.launch.mode === 'floated-off'
      ? `${boatName(boat)} floats off from ${station}.`
      : `${boatName(boat)} begins lowering from ${station}.`;
  const charge = boat.in_charge === null ? '' : ` In charge: ${boat.in_charge.value}.`;
  const remark = boat.remark === null ? '' : ` ${boat.remark.value}`;
  return `${action}${charge}${describeOccupancy(boat, type)}${remark}`;
}

/** The records from which the text of a lifeboat event is written. */
function boatRecords(boat: Boat, type: BoatType): Provenance[] {
  const occupancy =
    boat.occupancy.persons === null
      ? []
      : [boat.occupancy, ...(boat.occupancy.basis === 'attributed' ? [type] : [])];
  return [
    boat.launch,
    ...(boat.in_charge === null ? [] : [boat.in_charge]),
    ...occupancy,
    ...(boat.remark === null ? [] : [boat.remark]),
  ];
}

function boatEvents(dataset: Dataset): TimelineEvent[] {
  const types = new Map(dataset.lifeboats.types.map((type) => [type.id, type]));
  return dataset.lifeboats.boats.map((boat) => {
    const type = types.get(boat.type);
    if (type === undefined) {
      throw new RangeError(`Unknown boat type "${boat.type}".`);
    }
    return {
      id: `boat-${boat.id}`,
      t: shipTimeToSeconds(boat.launch.ats),
      uncertaintyBeforeSeconds: boat.launch.uncertainty.before_min * SECONDS_PER_MINUTE,
      uncertaintyAfterSeconds: boat.launch.uncertainty.after_min * SECONDS_PER_MINUTE,
      kind: 'lifeboat',
      category: 'lifeboat',
      title:
        boat.launch.mode === 'floated-off'
          ? `${boatName(boat)} floats off`
          : `${boatName(boat)} lowered`,
      description: describeBoat(boat, type),
      location: `Boat deck, ${boat.side} side`,
      keyEvent: KEY_BOAT_IDS.has(boat.id),
      ...eventProvenance(boatRecords(boat, type)),
    };
  });
}

function rocketEvents(dataset: Dataset): TimelineEvent[] {
  return dataset.signals.rockets.firings.map((firing, index) => ({
    id: firing.id,
    t: shipTimeToSeconds(firing.ats),
    uncertaintyBeforeSeconds: firing.uncertainty.before_min * SECONDS_PER_MINUTE,
    uncertaintyAfterSeconds: firing.uncertainty.after_min * SECONDS_PER_MINUTE,
    kind: 'rocket',
    category: 'signal',
    title: index === 0 ? 'First distress signal fired' : 'Distress signal fired',
    description:
      'A white distress signal is fired from the starboard side of the bridge: it rises, bursts with a report and throws out white stars.',
    location: 'Starboard side of the bridge',
    keyEvent: KEY_ROCKET_IDS.has(firing.id),
    certainty: firing.certainty,
    sourceIds: firing.source_ids,
    note: firing.note,
    alternatives: firing.alternatives ?? [],
  }));
}

type ClockOffset = TimeReferenceFile['adopted_offset'];

/** Name of the clock in which the log of a message was kept. */
function logClockName(message: WirelessMessage): string {
  return message.logged_reference === 'new-york' ? 'New York time' : 'GMT';
}

/** Minutes by which ship's time differs from the clock of the log of a message, for one offset. */
function shipMinusLogMinutes(message: WirelessMessage, offset: ClockOffset): number {
  return message.logged_reference === 'new-york'
    ? offset.ship_minus_new_york_min
    : offset.ship_minus_gmt_min;
}

/**
 * The other clock offsets of the dataset, each as a position on the ship's time of a message:
 * the offset as its holder states it, and the time at which it puts the log entry.
 */
function offsetAlternatives(
  message: WirelessMessage,
  timeReference: TimeReferenceFile,
): Alternative[] {
  const t = shipTimeToSeconds(message.ats);
  const adopted = shipMinusLogMinutes(message, timeReference.adopted_offset);
  return timeReference.alternative_offsets.map((offset) => {
    const minutes = shipMinusLogMinutes(message, offset);
    const difference = formatElapsed(Math.abs(minutes) * SECONDS_PER_MINUTE);
    const side = minutes >= 0 ? 'ahead of' : 'behind';
    const clock = formatShipClock(t + (minutes - adopted) * SECONDS_PER_MINUTE);
    return {
      holder: offset.holder,
      position: `With ship's time ${difference} ${side} ${logClockName(message)}, this log entry falls at ${clock}`,
      source_ids: offset.source_ids,
    };
  });
}

/**
 * Provenance of the ship's time of a message: the log entry, the adopted clock offset with which
 * it is converted, and the other offsets as competing positions.
 */
function wirelessRecords(message: WirelessMessage, timeReference: TimeReferenceFile): Provenance[] {
  const offset = timeReference.adopted_offset;
  return [
    message,
    {
      source_ids: offset.source_ids,
      certainty: offset.certainty,
      note: offset.note,
      alternatives: offsetAlternatives(message, timeReference),
    },
  ];
}

function wirelessEvents(dataset: Dataset): TimelineEvent[] {
  const { timeReference } = dataset;
  return dataset.signals.wireless.messages.map((message) => {
    const t = shipTimeToSeconds(message.ats);
    const logged = formatOffsetClock(t, shipMinusLogMinutes(message, timeReference.adopted_offset));
    return {
      id: `wireless-${message.id}`,
      t,
      uncertaintyBeforeSeconds: (message.uncertainty?.before_min ?? 0) * SECONDS_PER_MINUTE,
      uncertaintyAfterSeconds: (message.uncertainty?.after_min ?? 0) * SECONDS_PER_MINUTE,
      kind: 'wireless',
      category: 'wireless',
      title: `Wireless: ${message.sender}`,
      description: `${message.summary} Logged at ${logged} ${logClockName(message)} by ${message.heard_by.join(', ')}.`,
      location: 'Marconi room',
      keyEvent: KEY_MESSAGE_IDS.has(message.id),
      ...eventProvenance(wirelessRecords(message, timeReference)),
    };
  });
}

function chronologyEvents(dataset: Dataset): TimelineEvent[] {
  return dataset.chronology.events.map((event) => ({
    id: event.id,
    t: shipTimeToSeconds(event.ats),
    uncertaintyBeforeSeconds: event.uncertainty.before_min * SECONDS_PER_MINUTE,
    uncertaintyAfterSeconds: event.uncertainty.after_min * SECONDS_PER_MINUTE,
    kind: 'chronology',
    category: event.category,
    title: event.title,
    description: event.description,
    location: event.location,
    keyEvent: event.key_event,
    certainty: event.certainty,
    sourceIds: event.source_ids,
    note: event.note,
    alternatives: event.alternatives ?? [],
  }));
}

const KIND_ORDER: Readonly<Record<TimelineEventKind, number>> = {
  chronology: 0,
  lifeboat: 1,
  rocket: 2,
  wireless: 3,
};

/**
 * Merges the chronology, the lifeboat launches, the distress signals and the wireless messages
 * into one list ordered by time, then by kind; entries that tie keep the order of the dataset.
 */
export function buildTimelineEvents(dataset: Dataset): readonly TimelineEvent[] {
  return [
    ...chronologyEvents(dataset),
    ...boatEvents(dataset),
    ...rocketEvents(dataset),
    ...wirelessEvents(dataset),
  ].sort((a, b) => a.t - b.t || KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);
}

/** Index of the last event at or before `t`, or -1 when none has happened yet. */
export function lastEventIndexAt(events: readonly TimelineEvent[], t: number): number {
  let low = -1;
  let high = events.length;
  while (high - low > 1) {
    const middle = (low + high) >> 1;
    if ((events[middle]?.t ?? Number.POSITIVE_INFINITY) <= t) {
      low = middle;
    } else {
      high = middle;
    }
  }
  return low;
}
