import { describe, expect, it } from 'vitest';
import type { Pose } from './pose.ts';
import { bodyPointToScene, poseToMatrix } from './sceneFrame.ts';

const level: Pose = {
  pitchDeg: 0,
  heelDeg: 0,
  yawDeg: 0,
  referenceXM: 100,
  referenceZM: 10,
  forwardM: 0,
  starboardM: 0,
  upM: 0,
};

function apply(matrix: readonly number[], local: readonly [number, number, number]): number[] {
  return [0, 1, 2].map(
    (row) =>
      (matrix[row] ?? 0) * local[0] +
      (matrix[4 + row] ?? 0) * local[1] +
      (matrix[8 + row] ?? 0) * local[2] +
      (matrix[12 + row] ?? 0),
  );
}

describe('bodyPointToScene', () => {
  it('puts points forward of the reference at positive x and starboard points at positive z', () => {
    expect(bodyPointToScene(level, { x: 40, y: 5, z: 12 })).toEqual([60, 2, 5]);
  });

  it('lowers the bow when the trim is by the head', () => {
    const trimmed = { ...level, pitchDeg: 10 };
    expect(bodyPointToScene(trimmed, { x: 0, y: 0, z: 10 })[1]).toBeCloseTo(
      -100 * Math.sin(Math.PI / 18),
      9,
    );
  });

  it('lowers the starboard side when the list is to starboard', () => {
    const listed = { ...level, heelDeg: 10 };
    expect(bodyPointToScene(listed, { x: 100, y: 10, z: 10 })[1]).toBeLessThan(0);
    expect(bodyPointToScene(listed, { x: 100, y: -10, z: 10 })[1]).toBeGreaterThan(0);
  });

  it('swings the bow to starboard for a positive yaw', () => {
    const turned = { ...level, yawDeg: 90 };
    const bow = bodyPointToScene(turned, { x: 0, y: 0, z: 10 });
    expect(bow[0]).toBeCloseTo(0, 9);
    expect(bow[2]).toBeCloseTo(100, 9);
  });
});

describe('poseToMatrix', () => {
  const pose: Pose = {
    ...level,
    pitchDeg: 7,
    heelDeg: -9,
    yawDeg: 25,
    forwardM: 12,
    starboardM: -4,
    upM: -30,
  };
  const matrix = poseToMatrix(pose);

  it('agrees with bodyPointToScene for arbitrary points', () => {
    for (const point of [
      { x: 0, y: 0, z: 0 },
      { x: 250, y: -14, z: 28 },
      { x: 33.3, y: 7.5, z: 61 },
    ]) {
      const expected = bodyPointToScene(pose, point);
      const actual = apply(matrix, [-point.x, point.z, point.y]);
      actual.forEach((value, axis) => {
        expect(value).toBeCloseTo(expected[axis] ?? Number.NaN, 9);
      });
    }
  });

  it('is a rigid transformation: orthonormal axes of unit determinant', () => {
    const column = (index: number): number[] => matrix.slice(index * 4, index * 4 + 3);
    const dot = (a: number[], b: number[]): number =>
      a.reduce((sum, value, axis) => sum + value * (b[axis] ?? 0), 0);
    const [x, y, z] = [column(0), column(1), column(2)];
    expect(dot(x, x)).toBeCloseTo(1, 12);
    expect(dot(y, y)).toBeCloseTo(1, 12);
    expect(dot(z, z)).toBeCloseTo(1, 12);
    expect(dot(x, y)).toBeCloseTo(0, 12);
    expect(dot(y, z)).toBeCloseTo(0, 12);
    const cross = [
      (x[1] ?? 0) * (y[2] ?? 0) - (x[2] ?? 0) * (y[1] ?? 0),
      (x[2] ?? 0) * (y[0] ?? 0) - (x[0] ?? 0) * (y[2] ?? 0),
      (x[0] ?? 0) * (y[1] ?? 0) - (x[1] ?? 0) * (y[0] ?? 0),
    ];
    expect(dot(cross, z)).toBeCloseTo(1, 12);
  });
});
