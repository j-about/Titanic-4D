import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { parseArgs } from 'node:util';
import { datasetSchemas } from '../src/data/schema/dataset.ts';
import { createHullForm, type HullForm } from '../src/ship/hullForm.ts';
import { buildLod0Model, sectionRanges } from '../src/ship/lod0.ts';
import { factValue } from '../src/ship/particulars.ts';
import { deckHeightAt } from '../src/ship/sheer.ts';

/**
 * Writes the table of offsets consumed by the asset pipeline of `assets/`.
 *
 * The table samples the analytic hull form of `src/ship/hullForm.ts`: half-breadths on a grid of
 * stations and waterlines, the stem and stern profiles, the bottom and the top of the plating at
 * every station, and the half-breadths at a few small heights above the bottom, where the bilge
 * turns. It also carries the dataset values the model is built from and the lamps of the
 * level-of-detail 0 model. Lengths are in metres, in body coordinates, rounded to the micrometre.
 */

const repositoryRoot = join(import.meta.dirname, '..');

const { values } = parseArgs({
  options: {
    out: { type: 'string', default: join(repositoryRoot, 'assets', 'build', 'hull-offsets.json') },
  },
});

/** Spacing of the stations over the whole hull and near its two ends. */
const STATION_SPACING_M = 0.25;
const END_STATION_SPACING_M = 0.05;
const END_ZONE_LENGTH_M = 6.5;
/** Number of stations placed at squared distances from each end, and the unit of that distance. */
const END_SQUARED_STEPS = 15;
const END_SQUARED_UNIT_M = 0.1;
/** Spacing of the waterlines. */
const WATERLINE_SPACING_M = 0.2;
/** Heights above the bottom of the hull at which every station is sampled as well. */
const BOTTOM_OFFSETS_M = [
  0.005, 0.02, 0.05, 0.1, 0.15, 0.3, 0.6, 0.9, 1.3, 1.7, 2.2, 2.7, 3.3, 3.8, 4.4, 5,
] as const;
/** Decks whose height is tabulated at every station. */
const TABULATED_DECKS = ['boat', 'a', 'b', 'c'] as const;
/** Particulars copied to the table. */
const PARTICULAR_IDS = [
  'length-overall',
  'length-between-perpendiculars',
  'breadth',
  'load-draught',
  'stem-overhang',
  'stern-overhang',
  'crows-nest-height',
  'wing-propeller-diameter',
  'centre-propeller-diameter',
  'rudder-height',
] as const;

function round(value: number): number {
  const rounded = Math.round(value * 1e6) / 1e6;
  return rounded === 0 ? 0 : rounded;
}

async function readDataFile(name: string): Promise<unknown> {
  return JSON.parse(await readFile(join(repositoryRoot, 'data', `${name}.json`), 'utf8'));
}

/** Multiples of `spacing` lying strictly between `start` and `end`. */
function multiplesBetween(start: number, end: number, spacing: number): number[] {
  const result: number[] = [];
  for (let index = Math.ceil(start / spacing); index * spacing < end; index += 1) {
    if (index * spacing > start) {
      result.push(index * spacing);
    }
  }
  return result;
}

/**
 * Lowest height at which station `x` lies inside the hull: the keel where the station is between
 * the feet of the stem and of the stern, otherwise the height at which the stem or the stern
 * profile crosses the station, found by bisection.
 */
function bottomHeight(form: HullForm, x: number): number {
  const inside = (z: number): boolean => form.stemX(z) <= x && form.sternX(z) >= x;
  const keel = form.keelHeight(x);
  if (inside(keel)) {
    return keel;
  }
  let low = keel;
  let high = form.topHeight(x);
  for (let step = 0; step < 60; step += 1) {
    const middle = (low + high) / 2;
    if (inside(middle)) {
      high = middle;
    } else {
      low = middle;
    }
  }
  return high;
}

const ship = datasetSchemas.ship.parse(await readDataFile('ship'));
const breakup = datasetSchemas.breakup.parse(await readDataFile('breakup'));
const lifeboats = datasetSchemas.lifeboats.parse(await readDataFile('lifeboats'));

const form = createHullForm(ship);
const ranges = sectionRanges(form, breakup.bow_section.x_end_m, breakup.stern_section.x_start_m);
const hullStart = round(Math.min(...ranges.map((range) => range.xStart)));
const hullEnd = round(Math.max(...ranges.map((range) => range.xEnd)));

const stationSet = new Set<number>([hullStart, hullEnd]);
for (const x of multiplesBetween(hullStart, hullEnd, STATION_SPACING_M)) {
  stationSet.add(round(x));
}
for (const x of multiplesBetween(hullStart, hullStart + END_ZONE_LENGTH_M, END_STATION_SPACING_M)) {
  stationSet.add(round(x));
}
for (const x of multiplesBetween(hullEnd - END_ZONE_LENGTH_M, hullEnd, END_STATION_SPACING_M)) {
  stationSet.add(round(x));
}
for (let step = 1; step <= END_SQUARED_STEPS; step += 1) {
  const distance = (step * END_SQUARED_UNIT_M) ** 2;
  stationSet.add(round(hullStart + distance));
  stationSet.add(round(hullEnd - distance));
}
const recordedStations = [
  form.lengthBetweenPerpendiculars,
  form.stemX(0),
  ...ranges.flatMap((range) => [range.xStart, range.xEnd]),
  ...ship.zones.flatMap((zone) => [zone.x_start_m, zone.x_end_m]),
  ...ship.decks.flatMap((deck) => [deck.x_start_m, deck.x_end_m]),
  ...ship.funnels.map((funnel) => funnel.x_m),
  ...ship.masts.map((mast) => mast.x_m),
];
for (const x of recordedStations) {
  if (x >= hullStart && x <= hullEnd) {
    stationSet.add(round(x));
  }
}
const stations = [...stationSet].sort((a, b) => a - b);

const highestTop = Math.max(...stations.map((x) => form.topHeight(x)));
const waterlines: number[] = [];
for (let index = 0; (index - 1) * WATERLINE_SPACING_M < highestTop; index += 1) {
  waterlines.push(round(index * WATERLINE_SPACING_M));
}

const wellDeck = ship.zones.find((zone) => zone.id === 'forward-well-deck');
if (wellDeck === undefined) {
  throw new RangeError('The dataset has no zone "forward-well-deck".');
}
const wellMiddle = (wellDeck.x_start_m + wellDeck.x_end_m) / 2;
const wellBulwarkHeight = form.topHeight(wellMiddle) - deckHeightAt(ship, 'c', wellMiddle);

const bottoms = stations.map((x) => bottomHeight(form, x));
const tops = stations.map((x) => form.topHeight(x));

const model = buildLod0Model(ship, breakup.bow_section.x_end_m, breakup.stern_section.x_start_m);

const table = {
  frame:
    'x metres aft of the forward perpendicular, y metres to starboard of the centre line, z metres above the keel',
  particulars: Object.fromEntries(
    PARTICULAR_IDS.map((id) => [id.replaceAll('-', '_'), factValue(ship.particulars, id)]),
  ),
  sheer: {
    rise_at_bow_m: ship.sheer.rise_at_bow_m,
    rise_at_stern_m: ship.sheer.rise_at_stern_m,
  },
  decks: ship.decks.map((deck) => ({
    id: deck.id,
    height_amidships_m: deck.height_amidships_m,
    x_start_m: deck.x_start_m,
    x_end_m: deck.x_end_m,
  })),
  zones: ship.zones.map((zone) => ({
    id: zone.id,
    x_start_m: zone.x_start_m,
    x_end_m: zone.x_end_m,
  })),
  funnels: ship.funnels.map((funnel) => ({
    id: funnel.id,
    x_m: funnel.x_m,
    base_above_keel_m: funnel.base_above_keel_m,
    top_above_keel_m: funnel.top_above_keel_m,
    length_fore_aft_m: funnel.length_fore_aft_m,
    breadth_m: funnel.breadth_m,
    rake_deg: funnel.rake_deg,
    exhausts_boilers: funnel.exhausts_boilers,
    section: model.funnels.find((candidate) => candidate.id === funnel.id)?.section,
  })),
  masts: ship.masts.map((mast) => ({
    id: mast.id,
    x_m: mast.x_m,
    base_above_keel_m: mast.base_above_keel_m,
    top_above_keel_m: mast.top_above_keel_m,
    rake_deg: mast.rake_deg,
    section: model.masts.find((candidate) => candidate.id === mast.id)?.section,
  })),
  sections: ranges.map((range) => ({
    id: range.id,
    x_start_m: round(range.xStart),
    x_end_m: round(range.xEnd),
  })),
  boats: lifeboats.boats.map((boat) => {
    const type = lifeboats.types.find((candidate) => candidate.id === boat.type);
    return {
      id: boat.id,
      type: boat.type,
      side: boat.side,
      group: boat.station.group,
      x_m: boat.station.x_m,
      length_m: type?.length_m,
      breadth_m: type?.breadth_m,
      depth_m: type?.depth_m,
    };
  }),
  lamps: model.lamps.map((lamp) => ({
    section: lamp.section,
    position_m: [round(lamp.position.x), round(lamp.position.y), round(lamp.position.z)],
    normal: [round(lamp.normal.x), round(lamp.normal.y), round(lamp.normal.z)],
    width_m: lamp.width,
    height_m: lamp.height,
  })),
  hull: {
    start_x_m: hullStart,
    end_x_m: hullEnd,
    well_bulwark_height_m: round(wellBulwarkHeight),
    stations_m: stations,
    waterlines_m: waterlines,
    bottom_offsets_m: BOTTOM_OFFSETS_M,
    stem_x_m: waterlines.map((z) => round(form.stemX(z))),
    stern_x_m: waterlines.map((z) => round(form.sternX(z))),
    keel_height_m: stations.map((x) => round(form.keelHeight(x))),
    bottom_height_m: bottoms.map(round),
    top_height_m: tops.map(round),
    half_breadth_at_bottom_m: stations.map((x, index) =>
      round(form.halfBreadth(x, bottoms[index] ?? 0)),
    ),
    half_breadth_at_top_m: stations.map((x, index) => round(form.halfBreadth(x, tops[index] ?? 0))),
    half_breadths_above_bottom_m: stations.map((x, index) =>
      BOTTOM_OFFSETS_M.map((offset) => round(form.halfBreadth(x, (bottoms[index] ?? 0) + offset))),
    ),
    half_breadths_m: stations.map((x) => waterlines.map((z) => round(form.halfBreadth(x, z)))),
    deck_heights_m: Object.fromEntries(
      TABULATED_DECKS.map((id) => [id, stations.map((x) => round(deckHeightAt(ship, id, x)))]),
    ),
  },
};

await mkdir(dirname(values.out), { recursive: true });
await writeFile(values.out, `${JSON.stringify(table)}\n`);
console.log(
  `Wrote ${values.out}: ${stations.length} stations, ${waterlines.length} waterlines, ${table.lamps.length} lamps`,
);
