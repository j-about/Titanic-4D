import { describe, expect, it } from 'vitest';
import { dataset } from '../data/dataset.ts';
import { createHullForm } from './hullForm.ts';
import { buildBoatMesh, buildLod0Model, PAINT, srgb } from './lod0.ts';
import type { MeshData } from './meshBuilder.ts';
import { factValue } from './particulars.ts';

const { ship, breakup } = dataset;
const model = buildLod0Model(ship, breakup.bow_section.x_end_m, breakup.stern_section.x_start_m);

function bounds(mesh: MeshData): { min: number[]; max: number[] } {
  const min = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY];
  const max = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY];
  for (let index = 0; index < mesh.positions.length; index += 1) {
    const axis = index % 3;
    const value = mesh.positions[index] ?? 0;
    min[axis] = Math.min(min[axis] ?? Number.POSITIVE_INFINITY, value);
    max[axis] = Math.max(max[axis] ?? Number.NEGATIVE_INFINITY, value);
  }
  return { min, max };
}

function hasFiniteValues(mesh: MeshData): boolean {
  return [mesh.positions, mesh.normals, mesh.colors].every((array) => array.every(Number.isFinite));
}

type Triple = readonly [number, number, number];

interface Vertex {
  /** Body coordinates: station, distance to starboard of the centre line, height above the keel. */
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** Normal in scene coordinates: forward, up, starboard. */
  readonly normal: Triple;
  readonly color: Triple;
}

function triple(array: Float32Array, index: number): Triple {
  return [array[index * 3] ?? 0, array[index * 3 + 1] ?? 0, array[index * 3 + 2] ?? 0];
}

function vertexAt(mesh: MeshData, index: number): Vertex {
  const [forward, up, starboard] = triple(mesh.positions, index);
  return {
    x: -forward,
    y: starboard,
    z: up,
    normal: triple(mesh.normals, index),
    color: triple(mesh.colors, index),
  };
}

function vertices(mesh: MeshData): Vertex[] {
  return Array.from({ length: mesh.positions.length / 3 }, (_unused, index) =>
    vertexAt(mesh, index),
  );
}

function hasColor(vertex: Vertex, color: Triple): boolean {
  return vertex.color.every((value, channel) => Math.abs(value - (color[channel] ?? 0)) < 1e-6);
}

/**
 * Greatest angle, in degrees, between the normal stored at a corner of a triangle and the normal
 * of the triangle itself, over a mesh. Triangles without area are left out.
 */
function greatestNormalDeviationDeg(mesh: MeshData): number {
  let greatest = 0;
  for (let index = 0; index < mesh.indices.length; index += 3) {
    const corners = [0, 1, 2].map((corner) => mesh.indices[index + corner] ?? 0);
    const [a, b, c] = corners.map((corner) => triple(mesh.positions, corner));
    if (a === undefined || b === undefined || c === undefined) {
      continue;
    }
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]] as const;
    const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]] as const;
    const face = [
      u[1] * v[2] - u[2] * v[1],
      u[2] * v[0] - u[0] * v[2],
      u[0] * v[1] - u[1] * v[0],
    ] as const;
    const length = Math.hypot(...face);
    if (length < 1e-9) {
      continue;
    }
    for (const corner of corners) {
      const normal = triple(mesh.normals, corner);
      const cosine = (normal[0] * face[0] + normal[1] * face[1] + normal[2] * face[2]) / length;
      const angle = (Math.acos(Math.min(Math.max(cosine, -1), 1)) * 180) / Math.PI;
      greatest = Math.max(greatest, angle);
    }
  }
  return greatest;
}

describe('level-of-detail 0 model', () => {
  const all = [model.sections.bow, model.sections.middle, model.sections.stern];

  it('produces finite, indexed geometry for the three parts of the hull', () => {
    for (const mesh of all) {
      expect(mesh.indices.length).toBeGreaterThan(300);
      expect(mesh.positions.length).toBe(mesh.normals.length);
      expect(mesh.positions.length).toBe(mesh.colors.length);
      expect(hasFiniteValues(mesh)).toBe(true);
      expect(Math.max(...mesh.indices)).toBeLessThan(mesh.positions.length / 3);
    }
  });

  it('spans the recorded length overall and extreme breadth', () => {
    const boxes = all.map(bounds);
    const forward = Math.max(...boxes.map((box) => box.max[0] ?? 0));
    const aft = Math.min(...boxes.map((box) => box.min[0] ?? 0));
    const starboard = Math.max(...boxes.map((box) => box.max[2] ?? 0));
    const port = Math.min(...boxes.map((box) => box.min[2] ?? 0));
    expect(forward - aft).toBeCloseTo(factValue(ship.particulars, 'length-overall'), 0);
    expect(starboard - port).toBeCloseTo(factValue(ship.particulars, 'breadth'), 2);
  });

  it('rests on the keel and carries its deckhouses above the Boat deck', () => {
    const box = bounds(model.sections.bow);
    expect(box.min[1]).toBeCloseTo(0, 6);
    expect(box.max[1]).toBeGreaterThan(factValue(ship.particulars, 'boat-deck-height') + 2);
  });

  it('cuts the hull where the wreck parted', () => {
    expect(model.ranges.map((range) => range.id)).toEqual(['bow', 'middle', 'stern']);
    expect(-(bounds(model.sections.bow).min[0] ?? 0)).toBeCloseTo(breakup.bow_section.x_end_m, 3);
    expect(-(bounds(model.sections.stern).max[0] ?? 0)).toBeCloseTo(
      breakup.stern_section.x_start_m,
      3,
    );
  });

  it('gives the top row of the plating amidships horizontal normals pointing outboard', () => {
    const form = createHullForm(ship);
    // Stations of the parallel middle body, clear of the ends of the section and of the blocks.
    const topEdge = vertices(model.sections.bow).filter(
      (vertex) =>
        vertex.x > 95 &&
        vertex.x < 135 &&
        hasColor(vertex, PAINT.white) &&
        Math.abs(vertex.z - form.topHeight(vertex.x)) < 1e-3 &&
        Math.abs(Math.abs(vertex.y) - form.halfBreadthMax) < 1e-3,
    );
    // Two sides, sixteen stations, each shared by the rows of plating forward and aft of it.
    expect(topEdge.length).toBeGreaterThanOrEqual(64);
    for (const vertex of topEdge) {
      const [forward, up, starboard] = vertex.normal;
      expect(Math.abs(forward)).toBeLessThan(1e-6);
      expect(Math.abs(up)).toBeLessThan(1e-6);
      expect(starboard * Math.sign(vertex.y)).toBeCloseTo(1, 6);
    }
  });

  it('turns the normals of the top row of the plating toward the ends of the hull', () => {
    const form = createHullForm(ship);
    const atTop = (mesh: MeshData, x: number): Vertex[] =>
      vertices(mesh).filter(
        (vertex) =>
          hasColor(vertex, PAINT.white) &&
          Math.abs(vertex.x - x) < 1e-3 &&
          Math.abs(vertex.z - form.topHeight(x)) < 1e-3,
      );
    const stem = atTop(model.sections.bow, model.ranges[0]?.xStart ?? Number.NaN);
    const stern = atTop(model.sections.stern, model.ranges[2]?.xEnd ?? Number.NaN);
    expect(stem.length).toBeGreaterThanOrEqual(2);
    expect(stern.length).toBeGreaterThanOrEqual(2);
    for (const vertex of stem) {
      expect(vertex.normal[0]).toBeGreaterThan(0.5);
      expect(Math.abs(vertex.normal[1])).toBeLessThan(0.2);
    }
    for (const vertex of stern) {
      expect(vertex.normal[0]).toBeLessThan(-0.9);
      expect(Math.abs(vertex.normal[1])).toBeLessThan(0.2);
    }
  });

  it('keeps every normal within 60 degrees of the faces that carry it', () => {
    for (const mesh of [...all, model.sternWreck]) {
      expect(greatestNormalDeviationDeg(mesh)).toBeLessThan(60);
    }
  });

  it('carries the weather deck and the bottom to the after end of the hull', () => {
    const hullEnd = model.ranges[2]?.xEnd ?? Number.NaN;
    // A triangle of the given paint that reaches the end of the hull from both sides of the
    // centre line, facing upward or downward.
    const closesTheEnd = (color: Triple, facing: 1 | -1): boolean => {
      const mesh = model.sections.stern;
      for (let index = 0; index < mesh.indices.length; index += 3) {
        const corners = [0, 1, 2].map((corner) =>
          vertexAt(mesh, mesh.indices[index + corner] ?? 0),
        );
        if (
          corners.every((corner) => hasColor(corner, color) && corner.normal[1] * facing > 0.2) &&
          corners.some((corner) => Math.abs(corner.x - hullEnd) < 1e-3) &&
          corners.some((corner) => corner.y > 0.1) &&
          corners.some((corner) => corner.y < -0.1)
        ) {
          return true;
        }
      }
      return false;
    };
    expect(closesTheEnd(PAINT.deck, 1)).toBe(true);
    expect(closesTheEnd(PAINT.antifouling, -1)).toBe(true);
  });

  it('has four raked funnels reaching the recorded height', () => {
    expect(model.funnels).toHaveLength(4);
    for (const funnel of model.funnels) {
      const record = ship.funnels.find((candidate) => candidate.id === funnel.id);
      const box = bounds(funnel.mesh);
      expect(box.max[1]).toBeCloseTo(record?.top_above_keel_m ?? Number.NaN, 3);
      expect(-(box.min[0] ?? 0)).toBeGreaterThan((record?.x_m ?? 0) + 3);
    }
    expect(model.funnels.map((funnel) => funnel.section)).toEqual([
      'bow',
      'bow',
      'middle',
      'stern',
    ]);
  });

  it('has two masts', () => {
    expect(model.masts.map((mast) => [mast.id, mast.section])).toEqual([
      ['foremast', 'bow'],
      ['mainmast', 'stern'],
    ]);
  });

  it('lights the windows of the upper works as well as the portholes of the hull', () => {
    const form = createHullForm(dataset.ship);
    const above = model.lamps.filter((lamp) => lamp.position.z > form.topHeight(lamp.position.x));
    // B deck and the enclosed promenade on the ship's side, the open promenade inboard of it.
    const onTheSide = above.filter((lamp) => Math.abs(lamp.position.y) > form.halfBreadthMax - 0.5);
    expect(onTheSide.length).toBeGreaterThan(150);
    expect(above.length).toBeGreaterThan(onTheSide.length);
    for (const lamp of onTheSide) {
      expect(lamp.normal.z).toBe(0);
      expect(Math.abs(lamp.position.y)).toBeLessThanOrEqual(form.halfBreadthMax);
    }
  });

  it("places lamps symmetrically on the ship's sides, above the keel", () => {
    expect(model.lamps.length).toBeGreaterThan(600);
    const starboard = model.lamps.filter((lamp) => lamp.position.y > 0).length;
    expect(starboard * 2).toBe(model.lamps.length);
    for (const lamp of model.lamps) {
      expect(Math.abs(lamp.position.y)).toBeLessThanOrEqual(
        factValue(ship.particulars, 'breadth') / 2 + 1e-6,
      );
      expect(lamp.position.z).toBeGreaterThan(factValue(ship.particulars, 'load-draught'));
      expect(Math.sign(lamp.normal.y)).toBe(Math.sign(lamp.position.y));
    }
  });

  it('is identical when built twice', () => {
    const again = buildLod0Model(
      ship,
      breakup.bow_section.x_end_m,
      breakup.stern_section.x_start_m,
    );
    expect(again.sections.bow.positions).toEqual(model.sections.bow.positions);
    expect(again.lamps).toEqual(model.lamps);
  });
});

describe('boat mesh', () => {
  it('has the requested dimensions', () => {
    const box = bounds(buildBoatMesh(9.14, 2.77, 1.22));
    expect((box.max[0] ?? 0) - (box.min[0] ?? 0)).toBeCloseTo(9.14, 6);
    expect((box.max[2] ?? 0) - (box.min[2] ?? 0)).toBeCloseTo(2.77, 2);
    expect(box.max[1]).toBeCloseTo(1.22, 6);
  });
});

describe('srgb', () => {
  it('converts sRGB hexadecimal colours to linear components', () => {
    expect(srgb(0x000000)).toEqual([0, 0, 0]);
    expect(srgb(0xffffff)).toEqual([1, 1, 1]);
    expect(srgb(0x808080)[0]).toBeCloseTo(0.2159, 3);
  });
});
