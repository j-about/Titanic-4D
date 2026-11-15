import type { ShipFile } from '../data/schema/ship.ts';
import { createHullForm, type HullForm } from './hullForm.ts';
import {
  type BodyVertex,
  createMeshBuilder,
  type MeshBuilder,
  type MeshData,
  type Rgb,
} from './meshBuilder.ts';
import { deckHeightAt } from './sheer.ts';

/**
 * Level-of-detail 0 model of the ship, generated from the dataset: exact length, breadth, sheer,
 * deck heights, well decks, funnel and mast stations. Deckhouses are simple blocks whose extents
 * are modelling values that convey the massing of the Boat deck; they are not dataset records.
 */

export type SectionId = 'bow' | 'middle' | 'stern';

export interface SectionRange {
  readonly id: SectionId;
  readonly xStart: number;
  readonly xEnd: number;
}

/** A lamp visible from outside: a porthole, a window or a deck light. */
export interface LampInstance {
  readonly section: SectionId;
  readonly position: BodyVertex;
  /** Outward direction of the opening, in body coordinates. */
  readonly normal: BodyVertex;
  /** Width and height of the lit opening, in metres. */
  readonly width: number;
  readonly height: number;
}

export interface Lod0Model {
  readonly sections: Readonly<Record<SectionId, MeshData>>;
  /**
   * The after section as it lies on the seabed: the hull without the upper works, whose decks
   * collapsed on one another (record `stern-condition` of `data/site.json`). A massing, not a
   * survey of the wreck.
   */
  readonly sternWreck: MeshData;
  readonly funnels: readonly {
    readonly id: number;
    readonly section: SectionId;
    readonly mesh: MeshData;
  }[];
  readonly masts: readonly {
    readonly id: string;
    readonly section: SectionId;
    readonly mesh: MeshData;
  }[];
  readonly lamps: readonly LampInstance[];
  readonly ranges: readonly SectionRange[];
}

/** Converts an sRGB colour written as `0xRRGGBB` to linear RGB components. */
export function srgb(hex: number): Rgb {
  const channel = (value: number): number => {
    const normalised = value / 255;
    return normalised <= 0.04045 ? normalised / 12.92 : ((normalised + 0.055) / 1.055) ** 2.4;
  };
  return [channel((hex >> 16) & 0xff), channel((hex >> 8) & 0xff), channel(hex & 0xff)];
}

export const PAINT = {
  antifouling: srgb(0x6e2a22),
  hullBlack: srgb(0x15171a),
  sheerStripe: srgb(0xc9a23c),
  white: srgb(0xe6e2d6),
  deck: srgb(0x8c7a60),
  shadow: srgb(0x1b1d20),
  interior: srgb(0x0d0e10),
  funnelBuff: srgb(0xc98f52),
  funnelBlack: srgb(0x121314),
  mast: srgb(0x9a7b4f),
  boat: srgb(0xe2ded2),
} as const;

/** Height of the antifouling paint above the load waterline. */
const BOOT_TOPPING_M = 0.3;
/** Half-height of the sheer stripe painted along the line of C deck. */
const SHEER_STRIPE_HALF_HEIGHT_M = 0.12;
/** Spacing of hull stations in the parallel middle body and near the ends. */
const STATION_SPACING_M = 2.5;
const END_STATION_SPACING_M = 0.6;
const END_ZONE_LENGTH_M = 14;
/** Height of the deckhouses standing on the Boat deck. */
const DECKHOUSE_HEIGHT_M = 2.9;
const RAISED_ROOF_HEIGHT_M = 1.3;
const BULWARK_HEIGHT_M = 1.1;
const DECK_SLAB_M = 0.25;

interface Band {
  bottom(x: number): number;
  top(x: number): number;
  readonly rows: number;
  readonly color: Rgb;
}

/** Half-width of the strip of hull over which a step in the top of the plating is modelled. */
const STEP_HALF_WIDTH_M = 0.02;

/**
 * Stations at which the shell is sampled: closer together near the ends of the hull, and doubled
 * on either side of each step of the top of the plating so that the steps stay vertical.
 */
function stationsBetween(
  xStart: number,
  xEnd: number,
  hullStart: number,
  hullEnd: number,
  steps: readonly number[],
): number[] {
  const stations = new Set<number>([xStart]);
  let x = xStart;
  while (x < xEnd - 1e-6) {
    const nearEnd = x - hullStart < END_ZONE_LENGTH_M || hullEnd - x < END_ZONE_LENGTH_M;
    x = Math.min(x + (nearEnd ? END_STATION_SPACING_M : STATION_SPACING_M), xEnd);
    stations.add(x);
  }
  for (const step of steps) {
    for (const station of [step - STEP_HALF_WIDTH_M, step + STEP_HALF_WIDTH_M]) {
      if (station > xStart && station < xEnd) {
        stations.add(station);
      }
    }
  }
  return [...stations].sort((a, b) => a - b);
}

/** Outward normal of the starboard side of the hull at a point, from finite differences. */
function sideNormal(form: HullForm, x: number, z: number): BodyVertex {
  const step = 0.2;
  const slopeX = (form.halfBreadth(x + step, z) - form.halfBreadth(x - step, z)) / (2 * step);
  const slopeZ = (form.halfBreadth(x, z + step) - form.halfBreadth(x, z - step)) / (2 * step);
  const clampSlope = (value: number): number => Math.min(Math.max(value, -4), 4);
  return { x: -clampSlope(slopeX), y: 1, z: -clampSlope(slopeZ) };
}

function mirror(vertex: BodyVertex): BodyVertex {
  return { x: vertex.x, y: -vertex.y, z: vertex.z };
}

/** Bands of paint of the shell plating, from the keel to the top of the plating. */
function paintBands(form: HullForm, ship: ShipFile): readonly Band[] {
  const paintLine = form.loadDraught + BOOT_TOPPING_M;
  const stripe = (x: number): number => deckHeightAt(ship, 'c', x);
  const aboveKeel =
    (height: (x: number) => number) =>
    (x: number): number =>
      Math.max(form.keelHeight(x), height(x));
  return [
    {
      bottom: (x) => form.keelHeight(x),
      top: aboveKeel((x) => Math.min(paintLine, form.topHeight(x))),
      rows: 9,
      color: PAINT.antifouling,
    },
    {
      bottom: aboveKeel(() => paintLine),
      top: aboveKeel((x) => stripe(x) - SHEER_STRIPE_HALF_HEIGHT_M),
      rows: 5,
      color: PAINT.hullBlack,
    },
    {
      bottom: aboveKeel((x) => stripe(x) - SHEER_STRIPE_HALF_HEIGHT_M),
      top: aboveKeel((x) => stripe(x) + SHEER_STRIPE_HALF_HEIGHT_M),
      rows: 1,
      color: PAINT.sheerStripe,
    },
    {
      bottom: aboveKeel((x) => stripe(x) + SHEER_STRIPE_HALF_HEIGHT_M),
      top: (x) => form.topHeight(x),
      rows: 2,
      color: PAINT.white,
    },
  ];
}

/** Adds the plating of both sides between two stations, one smooth quad per row of each band. */
function addSidePlating(
  builder: MeshBuilder,
  form: HullForm,
  bands: readonly Band[],
  xa: number,
  xb: number,
): void {
  const point = (x: number, z: number): BodyVertex => ({ x, y: form.halfBreadth(x, z), z });
  for (const band of bands) {
    for (let row = 0; row < band.rows; row += 1) {
      // Rows are closer together near the bottom of a band, where the bilge turns.
      const lower = (row / band.rows) ** 1.5;
      const upper = ((row + 1) / band.rows) ** 1.5;
      const heightAt = (x: number, ratio: number): number =>
        band.bottom(x) + (band.top(x) - band.bottom(x)) * ratio;
      const heights: readonly (readonly [number, number])[] = [
        [xa, heightAt(xa, lower)],
        [xa, heightAt(xa, upper)],
        [xb, heightAt(xb, upper)],
        [xb, heightAt(xb, lower)],
      ];
      const corners = heights.map(([x, z]) => point(x, z));
      if (corners.every((corner) => corner.y === 0)) {
        continue;
      }
      const normals = heights.map(([x, z]) => sideNormal(form, x, z));
      builder.addSmoothQuad(corners, normals, band.color);
      builder.addSmoothQuad(
        corners.toReversed().map(mirror),
        normals.toReversed().map(mirror),
        band.color,
      );
    }
  }
}

/** Adds the bottom plating and the weather deck between two stations, closing the shell. */
function addBottomAndDeck(
  builder: MeshBuilder,
  form: HullForm,
  ship: ShipFile,
  xa: number,
  xb: number,
): void {
  const bottom = (x: number): BodyVertex => ({
    x,
    y: form.halfBreadth(x, form.keelHeight(x)),
    z: form.keelHeight(x),
  });
  builder.addQuad(
    bottom(xa),
    bottom(xb),
    mirror(bottom(xb)),
    mirror(bottom(xa)),
    PAINT.antifouling,
  );

  const isWell = (x: number): boolean => form.topHeight(x) < deckHeightAt(ship, 'b', x) - 0.5;
  const deckHeight = (x: number): number =>
    isWell(x) ? deckHeightAt(ship, 'c', x) : form.topHeight(x);
  const edge = (x: number, z: number, side: 1 | -1): BodyVertex => ({
    x,
    y: side * form.halfBreadth(x, form.topHeight(x)),
    z,
  });
  builder.addQuad(
    edge(xa, deckHeight(xa), -1),
    edge(xb, deckHeight(xb), -1),
    edge(xb, deckHeight(xb), 1),
    edge(xa, deckHeight(xa), 1),
    PAINT.deck,
  );

  if (isWell(xa) && isWell(xb)) {
    // Inner faces of the bulwark enclosing a well deck.
    builder.addQuad(
      edge(xa, deckHeight(xa), 1),
      edge(xb, deckHeight(xb), 1),
      edge(xb, form.topHeight(xb), 1),
      edge(xa, form.topHeight(xa), 1),
      PAINT.white,
    );
    builder.addQuad(
      edge(xa, form.topHeight(xa), -1),
      edge(xb, form.topHeight(xb), -1),
      edge(xb, deckHeight(xb), -1),
      edge(xa, deckHeight(xa), -1),
      PAINT.white,
    );
  }
}

function addHullShell(
  builder: MeshBuilder,
  form: HullForm,
  ship: ShipFile,
  range: SectionRange,
  hullStart: number,
  hullEnd: number,
): void {
  const bands = paintBands(form, ship);
  const steps = ship.zones
    .filter((zone) => zone.id === 'forward-well-deck' || zone.id === 'after-well-deck')
    .flatMap((zone) => [zone.x_start_m, zone.x_end_m]);
  const stations = stationsBetween(range.xStart, range.xEnd, hullStart, hullEnd, steps);
  for (let index = 0; index < stations.length - 1; index += 1) {
    const xa = stations[index] ?? range.xStart;
    const xb = stations[index + 1] ?? range.xEnd;
    addSidePlating(builder, form, bands, xa, xb);
    addBottomAndDeck(builder, form, ship, xa, xb);
  }
}

/** Closes a section at a cut plane with a fan of triangles, facing forward or aft. */
function addSectionCap(builder: MeshBuilder, form: HullForm, x: number, facingAft: boolean): void {
  const keel = form.keelHeight(x);
  const top = form.topHeight(x);
  const steps = 14;
  const outline: BodyVertex[] = [];
  for (let step = 0; step <= steps; step += 1) {
    const z = keel + ((top - keel) * step) / steps;
    outline.push({ x, y: form.halfBreadth(x, z), z });
  }
  const centre: BodyVertex = { x, y: 0, z: (keel + top) / 2 };
  for (let step = 0; step < steps; step += 1) {
    const lower = outline[step];
    const upper = outline[step + 1];
    if (lower === undefined || upper === undefined) {
      continue;
    }
    if (facingAft) {
      builder.addTriangle(centre, lower, upper, PAINT.interior);
      builder.addTriangle(centre, mirror(upper), mirror(lower), PAINT.interior);
    } else {
      builder.addTriangle(centre, upper, lower, PAINT.interior);
      builder.addTriangle(centre, mirror(lower), mirror(upper), PAINT.interior);
    }
  }
}

interface Block {
  readonly x0: number;
  readonly x1: number;
  readonly halfWidth: number;
  baseHeight(x: number): number;
  topHeight(x: number): number;
  readonly sideColor: Rgb;
  readonly topColor: Rgb;
}

/** Adds the part of a block that lies inside a section. */
function addClippedBlock(builder: MeshBuilder, range: SectionRange, block: Block): void {
  const x0 = Math.max(block.x0, range.xStart);
  const x1 = Math.min(block.x1, range.xEnd);
  if (x1 - x0 > 0.01) {
    builder.addSheerBlock({ ...block, x0, x1 });
  }
}

function superstructureBlocks(ship: ShipFile, form: HullForm): Block[] {
  const deck =
    (id: 'a' | 'b' | 'boat') =>
    (x: number): number =>
      deckHeightAt(ship, id, x);
  const above =
    (base: (x: number) => number, height: number) =>
    (x: number): number =>
      base(x) + height;
  const zone = (id: string): { x_start_m: number; x_end_m: number } => {
    const found = ship.zones.find((candidate) => candidate.id === id);
    if (found === undefined) {
      throw new RangeError(`The dataset has no zone "${id}".`);
    }
    return found;
  };
  const superstructure = zone('superstructure');
  const screen = zone('promenade-screen');
  const bridge = zone('navigating-bridge');
  const quarters = zone('officers-quarters');
  const boatDeck = ship.decks.find((candidate) => candidate.id === 'boat');
  if (boatDeck === undefined) {
    throw new RangeError('The dataset has no Boat deck.');
  }
  const side = form.halfBreadthMax;
  const houseRoof = above(deck('boat'), DECKHOUSE_HEIGHT_M);
  const boatDeckTop = above(deck('boat'), DECK_SLAB_M);
  const house = (x0: number, x1: number, halfWidth: number, height: number): Block => ({
    x0,
    x1,
    halfWidth,
    baseHeight: boatDeckTop,
    topHeight: above(deck('boat'), height),
    sideColor: PAINT.white,
    topColor: PAINT.shadow,
  });
  return [
    // B-deck level, flush with the ship's side, roofed by A deck.
    {
      x0: superstructure.x_start_m,
      x1: superstructure.x_end_m,
      halfWidth: side,
      baseHeight: deck('b'),
      topHeight: deck('a'),
      sideColor: PAINT.white,
      topColor: PAINT.deck,
    },
    // A deck: glazed screen forward, open promenade behind a bulwark aft of it.
    {
      x0: screen.x_start_m,
      x1: screen.x_end_m,
      halfWidth: side,
      baseHeight: deck('a'),
      topHeight: deck('boat'),
      sideColor: PAINT.white,
      topColor: PAINT.deck,
    },
    {
      x0: screen.x_end_m,
      x1: boatDeck.x_end_m,
      halfWidth: side,
      baseHeight: deck('a'),
      topHeight: above(deck('a'), BULWARK_HEIGHT_M),
      sideColor: PAINT.white,
      topColor: PAINT.deck,
    },
    {
      x0: screen.x_end_m,
      x1: boatDeck.x_end_m,
      halfWidth: side - 2.6,
      baseHeight: above(deck('a'), BULWARK_HEIGHT_M),
      topHeight: deck('boat'),
      sideColor: PAINT.shadow,
      topColor: PAINT.deck,
    },
    // Boat deck.
    {
      x0: boatDeck.x_start_m,
      x1: boatDeck.x_end_m,
      halfWidth: side,
      baseHeight: deck('boat'),
      topHeight: boatDeckTop,
      sideColor: PAINT.white,
      topColor: PAINT.deck,
    },
    // Deckhouses, from forward to aft.
    house(bridge.x_start_m, bridge.x_end_m, side - 0.4, 1.2),
    house(bridge.x_start_m + 1.4, bridge.x_end_m, 5.2, DECKHOUSE_HEIGHT_M),
    house(quarters.x_start_m, quarters.x_end_m, 6.6, DECKHOUSE_HEIGHT_M),
    house(quarters.x_end_m, 104, 8, DECKHOUSE_HEIGHT_M),
    house(106, 128, 7.4, RAISED_ROOF_HEIGHT_M),
    house(133, 152, 6.6, DECKHOUSE_HEIGHT_M),
    house(160, 192, 7.2, RAISED_ROOF_HEIGHT_M),
    house(198, boatDeck.x_end_m, 5.6, DECKHOUSE_HEIGHT_M),
    // Casings carrying the funnels above the deckhouse roofs.
    ...ship.funnels.map(
      (funnel): Block => ({
        x0: funnel.x_m - funnel.length_fore_aft_m / 2 - 0.6,
        x1: funnel.x_m + funnel.length_fore_aft_m / 2 + 0.6,
        halfWidth: funnel.breadth_m / 2 + 0.6,
        baseHeight: boatDeckTop,
        topHeight: () => Math.max(funnel.base_above_keel_m, houseRoof(funnel.x_m)),
        sideColor: PAINT.white,
        topColor: PAINT.shadow,
      }),
    ),
  ];
}

function buildFunnel(ship: ShipFile, id: number): MeshData {
  const funnel = ship.funnels.find((candidate) => candidate.id === id);
  if (funnel === undefined) {
    throw new RangeError(`The dataset has no funnel ${id}.`);
  }
  const builder = createMeshBuilder();
  const height = funnel.top_above_keel_m - funnel.base_above_keel_m;
  const rake = Math.tan((funnel.rake_deg * Math.PI) / 180);
  builder.addEllipticalTube({
    base: { x: funnel.x_m, y: 0, z: funnel.base_above_keel_m },
    top: { x: funnel.x_m + height * rake, y: 0, z: funnel.top_above_keel_m },
    semiLengthBase: funnel.length_fore_aft_m / 2,
    semiLengthTop: funnel.length_fore_aft_m / 2,
    semiBreadthBase: funnel.breadth_m / 2,
    semiBreadthTop: funnel.breadth_m / 2,
    segments: 28,
    bands: [
      { until: 0.78, color: PAINT.funnelBuff },
      { until: 1, color: PAINT.funnelBlack },
    ],
    capColor: PAINT.interior,
  });
  return builder.build();
}

function buildMast(ship: ShipFile, id: 'foremast' | 'mainmast'): MeshData {
  const mast = ship.masts.find((candidate) => candidate.id === id);
  if (mast === undefined) {
    throw new RangeError(`The dataset has no mast "${id}".`);
  }
  const builder = createMeshBuilder();
  const height = mast.top_above_keel_m - mast.base_above_keel_m;
  const rake = Math.tan((mast.rake_deg * Math.PI) / 180);
  builder.addEllipticalTube({
    base: { x: mast.x_m, y: 0, z: mast.base_above_keel_m },
    top: { x: mast.x_m + height * rake, y: 0, z: mast.top_above_keel_m },
    semiLengthBase: 0.45,
    semiLengthTop: 0.16,
    semiBreadthBase: 0.45,
    semiBreadthTop: 0.16,
    segments: 10,
    bands: [{ until: 1, color: PAINT.mast }],
    capColor: PAINT.mast,
  });
  return builder.build();
}

interface LampRow {
  readonly xStart: number;
  readonly xEnd: number;
  readonly spacing: number;
  height(x: number): number;
  /** Half-breadth at which the lamps sit; defaults to the hull side at their height. */
  readonly halfWidth?: number;
  /**
   * True for a row of windows of the upper works, above the shell plating: its lamps sit on the
   * wall that carries the ship's side upward, at the half-breadth of the top of the plating.
   */
  readonly onUpperWorks?: boolean;
  readonly width: number;
  readonly lampHeight: number;
}

/** Depth below the top of the plating at which the side of the upper works is measured. */
const UPPER_WORKS_SAMPLE_DEPTH_M = 0.3;

/** Outward direction of the opening of a lamp of the given row. */
function lampNormal(
  form: HullForm,
  row: LampRow,
  x: number,
  z: number,
  platingTop: number,
): BodyVertex {
  if (row.halfWidth !== undefined) {
    return { x: 0, y: 1, z: 0 };
  }
  if (row.onUpperWorks === true) {
    // The walls of the upper works are vertical: only the taper of the plan turns the normal.
    return { ...sideNormal(form, x, platingTop), z: 0 };
  }
  return sideNormal(form, x, z);
}

function sectionOf(ranges: readonly SectionRange[], x: number): SectionId {
  return ranges.find((range) => x >= range.xStart && x < range.xEnd)?.id ?? 'stern';
}

function buildLamps(
  ship: ShipFile,
  form: HullForm,
  ranges: readonly SectionRange[],
): LampInstance[] {
  const deck =
    (id: 'a' | 'b' | 'c' | 'd' | 'e' | 'f', lift: number) =>
    (x: number): number =>
      deckHeightAt(ship, id, x) + lift;
  const superstructure = ship.zones.find((zone) => zone.id === 'superstructure');
  const screen = ship.zones.find((zone) => zone.id === 'promenade-screen');
  const boatDeck = ship.decks.find((candidate) => candidate.id === 'boat');
  if (superstructure === undefined || screen === undefined || boatDeck === undefined) {
    throw new RangeError('The dataset lacks the zones needed to place the lamps.');
  }
  const porthole = { width: 0.42, lampHeight: 0.42 };
  const rows: readonly LampRow[] = [
    { xStart: 8, xEnd: 262, spacing: 2.6, height: deck('c', 1.35), ...porthole },
    { xStart: 12, xEnd: 256, spacing: 2.6, height: deck('d', 1.35), ...porthole },
    { xStart: 18, xEnd: 250, spacing: 2.6, height: deck('e', 1.35), ...porthole },
    { xStart: 30, xEnd: 238, spacing: 3.2, height: deck('f', 1.3), ...porthole },
    {
      xStart: superstructure.x_start_m + 2,
      xEnd: superstructure.x_end_m - 2,
      spacing: 2.2,
      height: deck('b', 1.45),
      onUpperWorks: true,
      width: 0.8,
      lampHeight: 1.0,
    },
    {
      xStart: screen.x_start_m + 1.5,
      xEnd: screen.x_end_m - 1,
      spacing: 2.4,
      height: deck('a', 1.55),
      onUpperWorks: true,
      width: 0.9,
      lampHeight: 1.1,
    },
    {
      xStart: screen.x_end_m + 2,
      xEnd: boatDeck.x_end_m - 2,
      spacing: 4.2,
      height: deck('a', 2.1),
      halfWidth: form.halfBreadthMax - 2.6,
      width: 1.1,
      lampHeight: 0.7,
    },
  ];
  const lamps: LampInstance[] = [];
  for (const row of rows) {
    const count = Math.floor((row.xEnd - row.xStart) / row.spacing);
    for (let index = 0; index <= count; index += 1) {
      const x = row.xStart + index * row.spacing;
      const z = row.height(x);
      const platingTop = form.topHeight(x) - UPPER_WORKS_SAMPLE_DEPTH_M;
      const halfWidth =
        row.halfWidth ?? form.halfBreadth(x, row.onUpperWorks === true ? platingTop : z);
      if (halfWidth < 1.5) {
        continue;
      }
      const normal = lampNormal(form, row, x, z, platingTop);
      const section = sectionOf(ranges, x);
      for (const side of [1, -1] as const) {
        lamps.push({
          section,
          position: { x, y: side * halfWidth, z },
          normal: { x: normal.x, y: side * normal.y, z: normal.z },
          width: row.width,
          height: row.lampHeight,
        });
      }
    }
  }
  return lamps;
}

/** Extents of the three parts of the hull: the two sections of the wreck and the zone between them. */
export function sectionRanges(
  form: HullForm,
  bowEndX: number,
  sternStartX: number,
): readonly SectionRange[] {
  const top = form.topHeight(0);
  return [
    { id: 'bow', xStart: form.stemX(top), xEnd: bowEndX },
    { id: 'middle', xStart: bowEndX, xEnd: sternStartX },
    { id: 'stern', xStart: sternStartX, xEnd: form.sternX(top) },
  ];
}

/**
 * Builds the model. `bowEndX` and `sternStartX` are the stations at which the hull parted, taken
 * from the break-up data, so that each part of the wreck is a separate mesh.
 */
export function buildLod0Model(ship: ShipFile, bowEndX: number, sternStartX: number): Lod0Model {
  const form = createHullForm(ship);
  const ranges = sectionRanges(form, bowEndX, sternStartX);
  const hullStart = ranges[0]?.xStart ?? 0;
  const hullEnd = ranges.at(-1)?.xEnd ?? form.lengthBetweenPerpendiculars;
  const blocks = superstructureBlocks(ship, form);

  const buildSection = (range: SectionRange, upperWorks = true): MeshData => {
    const builder = createMeshBuilder();
    addHullShell(builder, form, ship, range, hullStart, hullEnd);
    if (range.xStart > hullStart + 1) {
      addSectionCap(builder, form, range.xStart, false);
    }
    if (range.xEnd < hullEnd - 1) {
      addSectionCap(builder, form, range.xEnd, true);
    }
    for (const block of upperWorks ? blocks : []) {
      addClippedBlock(builder, range, block);
    }
    return builder.build();
  };
  const sternRange = ranges[2] ?? { id: 'stern', xStart: sternStartX, xEnd: hullEnd };

  const sections = {
    bow: buildSection(ranges[0] ?? { id: 'bow', xStart: hullStart, xEnd: bowEndX }),
    middle: buildSection(ranges[1] ?? { id: 'middle', xStart: bowEndX, xEnd: sternStartX }),
    stern: buildSection(sternRange),
  };

  return {
    sections,
    sternWreck: buildSection(sternRange, false),
    funnels: ship.funnels.map((funnel) => ({
      id: funnel.id,
      section: sectionOf(ranges, funnel.x_m),
      mesh: buildFunnel(ship, funnel.id),
    })),
    masts: ship.masts.map((mast) => ({
      id: mast.id,
      section: sectionOf(ranges, mast.x_m),
      mesh: buildMast(ship, mast.id),
    })),
    lamps: buildLamps(ship, form, ranges),
    ranges,
  };
}

/** Builds the open boat used for the lifeboats, in its own frame: bow toward −x, keel at z = 0. */
export function buildBoatMesh(length: number, breadth: number, depth: number): MeshData {
  const builder = createMeshBuilder();
  const stations = 12;
  const halfBreadth = (ratio: number): number => (breadth / 2) * (1 - (2 * ratio - 1) ** 2) ** 0.55;
  const point = (ratio: number, y: number, z: number): BodyVertex => ({
    x: (ratio - 0.5) * length,
    y,
    z,
  });
  for (let station = 0; station < stations; station += 1) {
    const a = station / stations;
    const b = (station + 1) / stations;
    const ya = halfBreadth(a);
    const yb = halfBreadth(b);
    for (const side of [1, -1] as const) {
      const quad = [
        point(a, 0, 0),
        point(a, side * ya, depth),
        point(b, side * yb, depth),
        point(b, 0, 0),
      ];
      const [p, q, r, s] = side === 1 ? quad : [...quad].reverse();
      if (p !== undefined && q !== undefined && r !== undefined && s !== undefined) {
        builder.addQuad(p, q, r, s, PAINT.boat);
      }
    }
    const floor = 0.8;
    builder.addQuad(
      point(a, -ya * floor, depth * floor),
      point(b, -yb * floor, depth * floor),
      point(b, yb * floor, depth * floor),
      point(a, ya * floor, depth * floor),
      PAINT.shadow,
    );
  }
  return builder.build();
}
