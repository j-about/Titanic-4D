import { describe, expect, it } from 'vitest';
import { createMeshBuilder, type MeshData } from './meshBuilder.ts';

/** Volume enclosed by a closed mesh, positive when its faces are wound outward. */
function signedVolume(mesh: MeshData): number {
  let volume = 0;
  const vertex = (index: number): [number, number, number] => [
    mesh.positions[index * 3] ?? 0,
    mesh.positions[index * 3 + 1] ?? 0,
    mesh.positions[index * 3 + 2] ?? 0,
  ];
  for (let index = 0; index < mesh.indices.length; index += 3) {
    const [ax, ay, az] = vertex(mesh.indices[index] ?? 0);
    const [bx, by, bz] = vertex(mesh.indices[index + 1] ?? 0);
    const [cx, cy, cz] = vertex(mesh.indices[index + 2] ?? 0);
    volume += (ax * (by * cz - bz * cy) + ay * (bz * cx - bx * cz) + az * (bx * cy - by * cx)) / 6;
  }
  return volume;
}

const white = [1, 1, 1] as const;

describe('mesh builder', () => {
  it('maps body coordinates to scene coordinates: forward, up, starboard', () => {
    const builder = createMeshBuilder();
    builder.addTriangle({ x: 10, y: 2, z: 5 }, { x: 11, y: 2, z: 5 }, { x: 10, y: 3, z: 5 }, white);
    expect([...builder.build().positions.slice(0, 3)]).toEqual([-10, 5, 2]);
  });

  it('builds a box wound outward with the expected volume', () => {
    const builder = createMeshBuilder();
    builder.addBox(0, 4, -1, 1, 2, 5, white);
    const mesh = builder.build();
    expect(signedVolume(mesh)).toBeCloseTo(4 * 2 * 3, 9);
    expect(mesh.indices.length).toBe(6 * 2 * 3);
  });

  it('gives every face a unit normal pointing away from the centre of a box', () => {
    const builder = createMeshBuilder();
    builder.addBox(0, 4, -1, 1, 2, 5, white);
    const mesh = builder.build();
    const centre = [-2, 3.5, 0];
    for (let index = 0; index < mesh.positions.length; index += 3) {
      const normal = [
        mesh.normals[index] ?? 0,
        mesh.normals[index + 1] ?? 0,
        mesh.normals[index + 2] ?? 0,
      ];
      const outward = [0, 1, 2].reduce(
        (sum, axis) =>
          sum + (normal[axis] ?? 0) * ((mesh.positions[index + axis] ?? 0) - (centre[axis] ?? 0)),
        0,
      );
      expect(Math.hypot(...normal)).toBeCloseTo(1, 6);
      expect(outward).toBeGreaterThan(0);
    }
  });

  it('builds a sheer block wound outward', () => {
    const builder = createMeshBuilder();
    builder.addSheerBlock({
      x0: 0,
      x1: 20,
      halfWidth: 3,
      baseHeight: () => 10,
      topHeight: (x) => 12 + x / 20,
      sideColor: white,
      topColor: white,
    });
    // The block has no bottom face; the missing face lies in the plane z = 10, so closing the
    // volume with respect to that plane leaves the divergence integral unchanged when the origin
    // is moved onto it. The expected volume is the trapezoidal prism above the base.
    const mesh = builder.build();
    const shifted: MeshData = {
      ...mesh,
      positions: mesh.positions.map((value, index) => (index % 3 === 1 ? value - 10 : value)),
    };
    expect(signedVolume(shifted)).toBeCloseTo(20 * 6 * 2.5, 3);
  });

  it('builds an elliptical tube wound outward and closed at the top', () => {
    const builder = createMeshBuilder();
    builder.addEllipticalTube({
      base: { x: 0, y: 0, z: 0 },
      top: { x: 0, y: 0, z: 10 },
      semiLengthBase: 3,
      semiLengthTop: 3,
      semiBreadthBase: 2,
      semiBreadthTop: 2,
      segments: 64,
      bands: [
        { until: 0.8, color: white },
        { until: 1, color: [0, 0, 0] },
      ],
      capColor: white,
    });
    // Open at the base, which lies in the plane z = 0 through the origin.
    expect(signedVolume(builder.build())).toBeCloseTo(Math.PI * 3 * 2 * 10, 0);
  });

  it('skips degenerate faces', () => {
    const builder = createMeshBuilder();
    const point = { x: 1, y: 1, z: 1 };
    builder.addTriangle(point, point, point, white);
    builder.addQuad(point, { x: 2, y: 1, z: 1 }, { x: 3, y: 1, z: 1 }, { x: 4, y: 1, z: 1 }, white);
    expect(builder.build().indices.length).toBe(0);
  });

  it('keeps the triangle left of a quad of which two corners coincide', () => {
    const tip = { x: 4, y: 0, z: 5 };
    for (const corners of [
      // The second and third corners coincide, then the first and second, then the last two.
      [{ x: 0, y: -1, z: 5 }, tip, tip, { x: 0, y: 1, z: 5 }],
      [tip, tip, { x: 0, y: 1, z: 5 }, { x: 0, y: -1, z: 5 }],
      [{ x: 0, y: 1, z: 5 }, { x: 0, y: -1, z: 5 }, tip, tip],
    ] as const) {
      const builder = createMeshBuilder();
      builder.addQuad(corners[0], corners[1], corners[2], corners[3], white);
      const mesh = builder.build();
      expect(mesh.indices.length).toBe(3);
      // The triangle lies in the plane z = 5 of the body frame and faces upward.
      expect(mesh.normals[0]).toBeCloseTo(0, 9);
      expect(mesh.normals[1]).toBeCloseTo(1, 9);
      expect(mesh.normals[2]).toBeCloseTo(0, 9);
      const [a, b, c] = [...mesh.indices].map((index) => [
        mesh.positions[index * 3] ?? 0,
        mesh.positions[index * 3 + 2] ?? 0,
      ]);
      const doubledArea =
        ((b?.[0] ?? 0) - (a?.[0] ?? 0)) * ((c?.[1] ?? 0) - (a?.[1] ?? 0)) -
        ((c?.[0] ?? 0) - (a?.[0] ?? 0)) * ((b?.[1] ?? 0) - (a?.[1] ?? 0));
      expect(Math.abs(doubledArea)).toBeCloseTo(8, 9);
    }
  });

  it('gives a quad that is not plane the normal of its whole outline', () => {
    const builder = createMeshBuilder();
    builder.addQuad(
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: 1, y: 1, z: 1 },
      { x: 1, y: 0, z: 0 },
      white,
    );
    const mesh = builder.build();
    expect(mesh.indices.length).toBe(6);
    // Half the cross product of the diagonals, in scene coordinates.
    const expected = [-1, -2, 1].map((value) => value / Math.sqrt(6));
    [...mesh.normals.slice(0, 3)].forEach((value, axis) => {
      expect(value).toBeCloseTo(expected[axis] ?? Number.NaN, 6);
    });
  });
});
