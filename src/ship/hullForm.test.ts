import { describe, expect, it } from 'vitest';
import { dataset } from '../data/dataset.ts';
import { createHullForm, measureHullCoefficients } from './hullForm.ts';
import { factValue } from './particulars.ts';

const { ship } = dataset;
const form = createHullForm(ship);
const coefficients = measureHullCoefficients(form, form.loadDraught);

describe('hull form against the recorded particulars', () => {
  it('reproduces the block coefficient within 1 %', () => {
    const recorded = factValue(ship.particulars, 'block-coefficient');
    expect(Math.abs(coefficients.block - recorded) / recorded).toBeLessThan(0.01);
  });

  it('reproduces the prismatic coefficient within 1.5 %', () => {
    const recorded = factValue(ship.particulars, 'prismatic-coefficient');
    expect(Math.abs(coefficients.prismatic - recorded) / recorded).toBeLessThan(0.015);
  });

  it('reproduces the midship coefficient within 1 %', () => {
    const recorded = factValue(ship.particulars, 'midship-coefficient');
    expect(Math.abs(coefficients.midship - recorded) / recorded).toBeLessThan(0.01);
  });

  it('displaces the recorded mass of sea water at the load draught within 2 %', () => {
    const seaWaterDensity = 1.025;
    const recorded = factValue(ship.particulars, 'displacement-load');
    expect(Math.abs(coefficients.volume * seaWaterDensity - recorded) / recorded).toBeLessThan(
      0.02,
    );
  });

  it('has the recorded extreme breadth amidships', () => {
    const midship = form.lengthBetweenPerpendiculars / 2;
    expect(2 * form.halfBreadth(midship, form.loadDraught)).toBeCloseTo(
      factValue(ship.particulars, 'breadth'),
      6,
    );
  });

  it('has the recorded length overall', () => {
    const top = form.topHeight(0);
    const overall = form.sternX(top) - form.stemX(top);
    expect(overall).toBeCloseTo(factValue(ship.particulars, 'length-overall'), 0);
  });
});

describe('hull form shape', () => {
  it('is closed at the stem and at the stern', () => {
    for (const z of [1, 5, 10, 15, 20]) {
      expect(form.halfBreadth(form.stemX(z), z)).toBe(0);
      expect(form.halfBreadth(form.sternX(z), z)).toBe(0);
    }
  });

  it('meets the stem at the forward perpendicular at the level of E deck', () => {
    expect(form.stemX(17.8)).toBeCloseTo(0, 6);
    expect(form.stemX(form.topHeight(0))).toBeLessThan(0);
  });

  it('never exceeds the extreme breadth and never goes negative', () => {
    for (let x = -1; x <= 269; x += 3) {
      for (let z = 0; z <= 27; z += 1.5) {
        const value = form.halfBreadth(x, z);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(form.halfBreadthMax + 1e-9);
      }
    }
  });

  it('widens monotonically from the stem to amidships on every waterline', () => {
    for (const z of [3, 8, 12, 18]) {
      let previous = 0;
      for (let x = 0; x <= form.lengthBetweenPerpendiculars / 2; x += 2) {
        const value = form.halfBreadth(x, z);
        expect(value).toBeGreaterThanOrEqual(previous - 1e-9);
        previous = value;
      }
    }
  });

  it('lowers the top of the shell plating in the two well decks', () => {
    expect(form.topHeight(45)).toBeLessThan(form.topHeight(30));
    expect(form.topHeight(228)).toBeLessThan(form.topHeight(240));
  });

  it('overhangs the after perpendicular only above the waterline', () => {
    expect(form.sternX(5)).toBeCloseTo(form.lengthBetweenPerpendiculars, 6);
    expect(form.sternX(20)).toBeCloseTo(
      form.lengthBetweenPerpendiculars + factValue(ship.particulars, 'stern-overhang'),
      6,
    );
  });
});
