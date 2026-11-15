import { createMeshBuilder, type MeshData, type Rgb } from '../ship/meshBuilder.ts';

/**
 * The iceberg of the collision: a generic shape within the range of sizes given by the witnesses
 * (record `iceberg-size` of `data/site.json`), and its path past the ship (record
 * `iceberg-passage`). Neither is a portrait: no photograph of the iceberg is verified.
 */
export const ICEBERG = {
  /** Length and breadth at the waterline, and height of the summit above the sea, in metres. */
  lengthM: 122,
  breadthM: 64,
  heightM: 21,
  /** Depth to which the underwater body is drawn, in metres. */
  draughtM: 60,
  /** Time over which the ship loses her way after the collision, in seconds. */
  coastSeconds: 240,
  /** Gap between the ship's side and the ice above the water as it passes, in metres. */
  clearanceM: 3,
} as const;

export interface IcebergPosition {
  /** Position of the centre of the iceberg in the world frame, in metres. */
  readonly forwardM: number;
  readonly starboardM: number;
}

export interface IcebergPathOptions {
  /** Speed of the ship at the collision, in metres per second. */
  readonly speedMps: number;
  /** World position of the centre of the iceberg at the collision. */
  readonly atCollision: IcebergPosition;
}

/**
 * Position of the iceberg `t` seconds after the collision, relative to a ship that is drawn at
 * rest: the iceberg moves aft by the distance the ship has run, her speed falling evenly to zero.
 */
export function icebergPosition(options: IcebergPathOptions, t: number): IcebergPosition {
  const elapsed = Math.min(Math.max(t, 0), ICEBERG.coastSeconds);
  const run = options.speedMps * (elapsed - (elapsed * elapsed) / (2 * ICEBERG.coastSeconds));
  return {
    forwardM: options.atCollision.forwardM - run,
    starboardM: options.atCollision.starboardM,
  };
}

/** Colours of the ice above and below the surface: a dark mass by starlight, as the lookouts saw it. */
const ICE: Rgb = [0.06, 0.078, 0.1];
const ICE_BELOW: Rgb = [0.03, 0.055, 0.07];
const SECTORS = 40;
const RINGS = 7;
/** Height of the ice cliff at the waterline, as a fraction of the summit. */
const EDGE_HEIGHT_RATIO = 0.16;
/** How much wider the underwater body is than the waterline. */
const UNDERWATER_SPREAD = 1.22;

/** Outline of the waterline: an ellipse with a few lobes, as a radius for each direction. */
function outlineRadius(angle: number): number {
  const a = ICEBERG.lengthM / 2;
  const b = ICEBERG.breadthM / 2;
  const ellipse = (a * b) / Math.hypot(b * Math.cos(angle), a * Math.sin(angle));
  const lobes = 1 + 0.07 * Math.sin(3 * angle + 0.6) + 0.04 * Math.sin(7 * angle + 2.1);
  // The lobes only cut into the ellipse, so that the stated length and breadth are not exceeded.
  return (ellipse * lobes) / 1.11;
}

/** Height of the ice above the sea at a fraction `ratio` of the way from the centre to the edge. */
function iceHeight(ratio: number, angle: number): number {
  // Two summits of unequal height, joined by a saddle.
  const ridge = 0.72 + 0.28 * Math.cos(angle - 0.5) * (1 - ratio) + 0.1 * Math.sin(2 * angle + 1.3);
  const dome = (1 - ratio ** 2.4) ** 0.7;
  const rough = 1 + 0.08 * Math.sin(5 * angle + 9 * ratio);
  const shape = Math.min(dome * ridge * rough, 1);
  return ICEBERG.heightM * (EDGE_HEIGHT_RATIO + (1 - EDGE_HEIGHT_RATIO) * shape);
}

/**
 * Builds the iceberg in its own frame: `x` along its length, `y` across, `z` above the sea. The
 * faces are flat, which gives the broken look of ice.
 */
export function buildIcebergMesh(): MeshData {
  const builder = createMeshBuilder();
  const point = (ratio: number, sector: number) => {
    const angle = (2 * Math.PI * sector) / SECTORS;
    const radius = outlineRadius(angle) * ratio;
    return { x: radius * Math.cos(angle), y: radius * Math.sin(angle), z: iceHeight(ratio, angle) };
  };
  const summit = { x: 0, y: 0, z: iceHeight(0, 0) };
  for (let sector = 0; sector < SECTORS; sector += 1) {
    const next = sector + 1;
    builder.addTriangle(summit, point(1 / RINGS, sector), point(1 / RINGS, next), ICE);
    for (let ring = 1; ring < RINGS; ring += 1) {
      const inner = ring / RINGS;
      const outer = (ring + 1) / RINGS;
      builder.addQuad(
        point(inner, sector),
        point(outer, sector),
        point(outer, next),
        point(inner, next),
        ICE,
      );
    }
    // The cliff from the edge of the top down to the sea, then the body under water.
    const top = point(1, sector);
    const topNext = point(1, next);
    const below = (vertex: { x: number; y: number }, spread: number, z: number) => ({
      x: vertex.x * spread,
      y: vertex.y * spread,
      z,
    });
    builder.addQuad(top, below(top, 1, 0), below(topNext, 1, 0), topNext, ICE);
    builder.addQuad(
      below(top, 1, 0),
      below(top, UNDERWATER_SPREAD, -ICEBERG.draughtM * 0.4),
      below(topNext, UNDERWATER_SPREAD, -ICEBERG.draughtM * 0.4),
      below(topNext, 1, 0),
      ICE_BELOW,
    );
    builder.addQuad(
      below(top, UNDERWATER_SPREAD, -ICEBERG.draughtM * 0.4),
      below(top, 0.5, -ICEBERG.draughtM),
      below(topNext, 0.5, -ICEBERG.draughtM),
      below(topNext, UNDERWATER_SPREAD, -ICEBERG.draughtM * 0.4),
      ICE_BELOW,
    );
    builder.addTriangle(
      { x: 0, y: 0, z: -ICEBERG.draughtM },
      below(topNext, 0.5, -ICEBERG.draughtM),
      below(top, 0.5, -ICEBERG.draughtM),
      ICE_BELOW,
    );
  }
  return builder.build();
}
