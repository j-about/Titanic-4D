import { describe, expect, it } from 'vitest';
import { dataset } from '../data/dataset.ts';
import { buildBoatMesh, buildLod0Model, srgb } from './lod0.ts';
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
