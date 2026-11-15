import { describe, expect, it } from 'vitest';
import { buildIcebergMesh, ICEBERG, icebergPosition } from './iceberg.ts';

const FEET = 0.3048;
const path = { speedMps: 11.3, atCollision: { forwardM: 80, starboardM: 50 } };

describe('iceberg path', () => {
  it('starts abreast of the bow and never moves sideways', () => {
    expect(icebergPosition(path, 0)).toEqual(path.atCollision);
    expect(icebergPosition(path, 120).starboardM).toBe(50);
  });

  it('moves aft at the speed of the ship at first', () => {
    const afterOneSecond = icebergPosition(path, 1);
    expect(path.atCollision.forwardM - afterOneSecond.forwardM).toBeCloseTo(11.3, 0);
  });

  it('only ever drops astern, and stays where the ship has stopped', () => {
    let previous = icebergPosition(path, 0).forwardM;
    for (let t = 1; t <= 600; t += 1) {
      const current = icebergPosition(path, t).forwardM;
      expect(current).toBeLessThanOrEqual(previous);
      previous = current;
    }
    expect(icebergPosition(path, 9000)).toEqual(icebergPosition(path, ICEBERG.coastSeconds));
    expect(path.atCollision.forwardM - previous).toBeCloseTo((11.3 * ICEBERG.coastSeconds) / 2, 6);
  });

  it('is where it was before the collision at negative times', () => {
    expect(icebergPosition(path, -5)).toEqual(path.atCollision);
  });
});

describe('iceberg shape', () => {
  const mesh = buildIcebergMesh();
  const extent = (axis: number): { min: number; max: number } => {
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (let index = axis; index < mesh.positions.length; index += 3) {
      min = Math.min(min, mesh.positions[index] ?? 0);
      max = Math.max(max, mesh.positions[index] ?? 0);
    }
    return { min, max };
  };

  it('stands between 50 and 100 ft above the sea, as the witnesses said', () => {
    const height = extent(1).max;
    expect(height).toBeGreaterThanOrEqual(50 * FEET);
    expect(height).toBeLessThanOrEqual(100 * FEET);
    expect(height).toBeLessThanOrEqual(ICEBERG.heightM + 1e-6);
  });

  it('is no longer than about 400 ft at the waterline', () => {
    const length = extent(0);
    expect(length.max - length.min).toBeGreaterThan(ICEBERG.lengthM * 0.8);
    expect(length.max - length.min).toBeLessThanOrEqual(ICEBERG.lengthM * UNDERWATER_MARGIN);
  });

  it('reaches below the surface', () => {
    expect(extent(1).min).toBeCloseTo(-ICEBERG.draughtM, 6);
  });

  it('has outward-facing surfaces above the water: its normals point away from its axis or up', () => {
    let inward = 0;
    let faces = 0;
    for (let index = 0; index < mesh.positions.length; index += 3) {
      const height = mesh.positions[index + 1] ?? 0;
      if (height <= 0) {
        continue;
      }
      const outward =
        (mesh.positions[index] ?? 0) * (mesh.normals[index] ?? 0) +
        (mesh.positions[index + 2] ?? 0) * (mesh.normals[index + 2] ?? 0);
      faces += 1;
      if ((mesh.normals[index + 1] ?? 0) < -1e-6 && outward < 0) {
        inward += 1;
      }
    }
    expect(faces).toBeGreaterThan(100);
    expect(inward).toBe(0);
  });

  it('is the same every time it is built', () => {
    expect(buildIcebergMesh().positions).toEqual(mesh.positions);
  });
});

/** The underwater body is wider than the waterline by this factor at most. */
const UNDERWATER_MARGIN = 1.22;
