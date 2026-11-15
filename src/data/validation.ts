import { shipTimeToSeconds } from '../time/shipTime.ts';
import { collectProvenance } from './provenance.ts';
import type { Dataset } from './schema/dataset.ts';
import type { Source } from './schema/sources.ts';

/** Kinds of source that cannot, on their own, support a record marked `established`. */
const WEAK_SOURCE_KINDS: ReadonlySet<Source['kind']> = new Set(['reference', 'project']);

/** Ways of access that cannot, on their own, support a record marked `established`. */
const WEAK_SOURCE_ACCESSES: ReadonlySet<Source['access']> = new Set([
  'cited-through',
  'not-consulted',
]);

/**
 * Whether a source is too weak to support a record marked `established` by itself: a work of
 * reference or a derivation by the project, or a work that the project did not open.
 */
export function isWeakSource(source: Source): boolean {
  return WEAK_SOURCE_KINDS.has(source.kind) || WEAK_SOURCE_ACCESSES.has(source.access);
}

const CARPATHIA_MINUTES_BEHIND_TITANIC = 5;
const MINUTES_PER_DAY = 1440;

function duplicates(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      repeated.add(value);
    }
    seen.add(value);
  }
  return [...repeated];
}

function isStrictlyIncreasing(values: readonly number[]): boolean {
  return values.every(
    (value, index) => index === 0 || value > (values[index - 1] ?? Number.POSITIVE_INFINITY),
  );
}

function isNonDecreasing(values: readonly number[]): boolean {
  return values.every(
    (value, index) => index === 0 || value >= (values[index - 1] ?? Number.POSITIVE_INFINITY),
  );
}

function clockMinutes(clock: string): number {
  const [hours, minutes] = clock.split(':').map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

function shipTimeMinuteOfDay(shipTime: string): number {
  const minutes = Math.round(shipTimeToSeconds(shipTime) / 60) + 23 * 60 + 40;
  return ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

function checkProvenance(dataset: Dataset, issues: string[]): void {
  const knownSources = new Set(dataset.sources.sources.map((source) => source.id));
  const weakSources = new Set(
    dataset.sources.sources.filter(isWeakSource).map((source) => source.id),
  );
  const citedSources = new Set<string>();
  for (const { path, provenance } of collectProvenance(dataset, '')) {
    const cited = [
      ...provenance.source_ids,
      ...(provenance.alternatives ?? []).flatMap((alternative) => alternative.source_ids),
    ];
    for (const sourceId of cited) {
      citedSources.add(sourceId);
      if (!knownSources.has(sourceId)) {
        issues.push(`${path}: unknown source "${sourceId}".`);
      }
    }
    if (
      provenance.certainty === 'established' &&
      provenance.source_ids.every((sourceId) => weakSources.has(sourceId))
    ) {
      issues.push(
        `${path}: an established record needs a source that the project opened and that is neither a work of reference nor its own derivation.`,
      );
    }
  }
  for (const sourceId of knownSources) {
    if (!citedSources.has(sourceId)) {
      issues.push(`sources: "${sourceId}" is never cited.`);
    }
  }
}

function checkUniqueIds(dataset: Dataset, issues: string[]): void {
  const collections: Record<string, readonly string[]> = {
    'sources.sources': dataset.sources.sources.map((item) => item.id),
    'ship.particulars': dataset.ship.particulars.map((item) => item.id),
    'ship.decks': dataset.ship.decks.map((item) => item.id),
    'ship.bulkheads': dataset.ship.bulkheads.map((item) => item.id),
    'ship.compartments': dataset.ship.compartments.map((item) => item.id),
    'ship.zones': dataset.ship.zones.map((item) => item.id),
    'chronology.events': dataset.chronology.events.map((item) => item.id),
    'lifeboats.boats': dataset.lifeboats.boats.map((item) => item.id),
    'signals.rockets.firings': dataset.signals.rockets.firings.map((item) => item.id),
    'signals.wireless.messages': dataset.signals.wireless.messages.map((item) => item.id),
    'site.positions': dataset.site.positions.map((item) => item.id),
    'people.casualty_counts': dataset.people.casualty_counts.map((item) => item.id),
    'people.rescue': dataset.people.rescue.map((item) => item.id),
  };
  for (const [name, ids] of Object.entries(collections)) {
    for (const id of duplicates(ids)) {
      issues.push(`${name}: duplicate id "${id}".`);
    }
  }
}

function checkShipGeometry(dataset: Dataset, issues: string[]): void {
  const { compartments, bulkheads } = dataset.ship;
  for (const [index, compartment] of compartments.entries()) {
    const next = compartments[index + 1];
    if (next !== undefined && next.x_start_m !== compartment.x_end_m) {
      issues.push(`ship.compartments: "${compartment.id}" does not end where "${next.id}" starts.`);
    }
    const bulkhead = bulkheads[index];
    if (bulkhead !== undefined && bulkhead.x_m !== compartment.x_end_m) {
      issues.push(
        `ship.bulkheads: bulkhead "${bulkhead.id}" is not at the end of "${compartment.id}".`,
      );
    }
  }
  if (!isStrictlyIncreasing(dataset.ship.funnels.map((funnel) => funnel.x_m))) {
    issues.push('ship.funnels: funnels must be ordered from forward to aft.');
  }
}

function checkKeyframeOrder(dataset: Dataset, issues: string[]): void {
  const series: Record<string, readonly string[]> = {
    'chronology.events': dataset.chronology.events.map((event) => event.ats),
    'attitude.trim': dataset.attitude.trim.map((keyframe) => keyframe.ats),
    'attitude.heel': dataset.attitude.heel.map((keyframe) => keyframe.ats),
    'flooding.water_aboard': dataset.flooding.water_aboard.map((keyframe) => keyframe.ats),
    'lighting.output': dataset.lighting.output.map((keyframe) => keyframe.ats),
    'signals.rockets.firings': dataset.signals.rockets.firings.map((firing) => firing.ats),
    'signals.wireless.messages': dataset.signals.wireless.messages.map((message) => message.ats),
    'breakup.bow_section.keyframes': dataset.breakup.bow_section.keyframes.map((k) => k.ats),
    'breakup.stern_section.keyframes': dataset.breakup.stern_section.keyframes.map((k) => k.ats),
    'people.rescue': dataset.people.rescue.map((event) => event.ats),
  };
  for (const flooding of dataset.flooding.compartments) {
    series[`flooding.compartments.${flooding.compartment_id}`] = flooding.levels.map(
      (keyframe) => keyframe.ats,
    );
  }
  for (const [name, times] of Object.entries(series)) {
    const seconds = times.map(shipTimeToSeconds);
    const ordered =
      name === 'chronology.events' ? isNonDecreasing(seconds) : isStrictlyIncreasing(seconds);
    if (!ordered) {
      issues.push(`${name}: times are not in chronological order.`);
    }
  }
  const breakSeconds = shipTimeToSeconds(dataset.breakup.break.ats);
  for (const [name, section] of [
    ['bow_section', dataset.breakup.bow_section],
    ['stern_section', dataset.breakup.stern_section],
  ] as const) {
    const first = section.keyframes[0];
    if (first !== undefined && shipTimeToSeconds(first.ats) <= breakSeconds) {
      issues.push(`breakup.${name}: keyframes must start after the break.`);
    }
  }
}

function checkFlooding(dataset: Dataset, issues: string[]): void {
  const shipIds = dataset.ship.compartments.map((compartment) => compartment.id);
  const floodingIds = dataset.flooding.compartments.map((flooding) => flooding.compartment_id);
  if (shipIds.join() !== floodingIds.join()) {
    issues.push(
      'flooding.compartments: must list the compartments of ship.json in the same order.',
    );
  }
  for (const flooding of dataset.flooding.compartments) {
    const last = flooding.levels.at(-1);
    if (
      flooding.equalised_from !== null &&
      last !== undefined &&
      shipTimeToSeconds(flooding.equalised_from) <= shipTimeToSeconds(last.ats)
    ) {
      issues.push(
        `flooding.compartments.${flooding.compartment_id}: equalised_from must follow the last level.`,
      );
    }
  }
  if (!isNonDecreasing(dataset.flooding.water_aboard.map((keyframe) => keyframe.tonnes))) {
    issues.push('flooding.water_aboard: the mass of water aboard cannot decrease.');
  }
}

function checkRocketMargins(dataset: Dataset, issues: string[]): void {
  const { facts, firings } = dataset.signals.rockets;
  const interval = facts.find((fact) => fact.id === 'rocket-interval')?.value;
  if (interval === undefined) {
    issues.push('signals.rockets.facts: the fact "rocket-interval" must carry a value.');
    return;
  }
  for (const firing of firings) {
    if (Math.max(firing.uncertainty.before_min, firing.uncertainty.after_min) > interval / 2) {
      issues.push(
        `signals.rockets.firings.${firing.id}: the margin exceeds half the interval between signals.`,
      );
    }
  }
}

function checkLifeboats(dataset: Dataset, issues: string[]): void {
  for (const type of dataset.lifeboats.types) {
    const count = dataset.lifeboats.boats.filter((boat) => boat.type === type.id).length;
    if (count !== type.count) {
      issues.push(`lifeboats.types.${type.id}: ${count} boats listed, ${type.count} expected.`);
    }
  }
  for (const boat of dataset.lifeboats.boats) {
    const reached = boat.launch.reached_water_ats;
    if (reached !== undefined && shipTimeToSeconds(reached) <= shipTimeToSeconds(boat.launch.ats)) {
      issues.push(
        `lifeboats.boats.${boat.id}: the boat reaches the water after it starts lowering.`,
      );
    }
    if (boat.launch.mode === 'floated-off' && boat.type !== 'collapsible') {
      issues.push(`lifeboats.boats.${boat.id}: only collapsibles floated off.`);
    }
    if ((boat.launch.mode === 'floated-off') !== (boat.occupancy.basis === 'reached-from-water')) {
      issues.push(
        `lifeboats.boats.${boat.id}: the occupancy of a boat that floated off, and of no other, counts the people who reached it from the water.`,
      );
    }
  }
}

function checkClockConversions(dataset: Dataset, issues: string[]): void {
  const offset = dataset.timeReference.adopted_offset;
  if (offset.ship_minus_new_york_min - offset.ship_minus_gmt_min !== 300) {
    issues.push('time-reference.adopted_offset: New York time must be five hours behind GMT.');
  }
  for (const alternative of dataset.timeReference.alternative_offsets) {
    if (alternative.ship_minus_new_york_min - alternative.ship_minus_gmt_min !== 300) {
      issues.push(
        `time-reference.alternative_offsets.${alternative.id}: New York time must be five hours behind GMT.`,
      );
    }
  }
  for (const message of dataset.signals.wireless.messages) {
    const shipMinusLog =
      message.logged_reference === 'new-york'
        ? offset.ship_minus_new_york_min
        : offset.ship_minus_gmt_min;
    const expected =
      (((clockMinutes(message.logged_time) + shipMinusLog) % MINUTES_PER_DAY) + MINUTES_PER_DAY) %
      MINUTES_PER_DAY;
    if (shipTimeMinuteOfDay(message.ats) !== expected) {
      issues.push(
        `signals.wireless.messages.${message.id}: ship's time does not match the logged time and the adopted offset.`,
      );
    }
  }
  for (const event of dataset.people.rescue) {
    const expected = clockMinutes(event.carpathia_time) + CARPATHIA_MINUTES_BEHIND_TITANIC;
    const actual = shipTimeMinuteOfDay(event.ats);
    if (event.id !== 'carpathia-turns' && actual !== expected) {
      issues.push(
        `people.rescue.${event.id}: ship's time must be Carpathia's time plus five minutes.`,
      );
    }
  }
}

function checkCasualtyCounts(dataset: Dataset, issues: string[]): void {
  for (const count of dataset.people.casualty_counts) {
    if (
      count.aboard !== null &&
      count.saved !== null &&
      count.aboard - count.saved !== count.lost
    ) {
      issues.push(`people.casualty_counts.${count.id}: lost must equal aboard minus saved.`);
    }
    if (count.breakdown === undefined) {
      continue;
    }
    for (const key of ['aboard', 'saved', 'lost'] as const) {
      const sum = count.breakdown.reduce((total, group) => total + group[key], 0);
      if (count[key] !== null && sum !== count[key]) {
        issues.push(
          `people.casualty_counts.${count.id}: breakdown of "${key}" sums to ${sum}, not ${count[key]}.`,
        );
      }
    }
  }
}

/**
 * Checks the consistency of the dataset across files, beyond what the per-file schemas express.
 * Returns one message per problem; an empty array means the dataset is consistent.
 */
export function findDatasetIssues(dataset: Dataset): string[] {
  const issues: string[] = [];
  checkProvenance(dataset, issues);
  checkUniqueIds(dataset, issues);
  checkShipGeometry(dataset, issues);
  checkKeyframeOrder(dataset, issues);
  checkFlooding(dataset, issues);
  checkLifeboats(dataset, issues);
  checkRocketMargins(dataset, issues);
  checkClockConversions(dataset, issues);
  checkCasualtyCounts(dataset, issues);
  return issues;
}
