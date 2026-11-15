import { describe, expect, it } from 'vitest';
import { dataset } from '../data/dataset.ts';
import { factValue } from '../ship/particulars.ts';
import { deckHeightAt } from '../ship/sheer.ts';
import { shipTimeToSeconds } from '../time/shipTime.ts';
import { bodyToWorld, seaLevelAboveKeel } from './pose.ts';
import { ROCKET_VISIBLE_SECONDS } from './rocketAppearance.ts';
import { createTimelineModel, type ShipState } from './timelineModel.ts';

const model = createTimelineModel(dataset);
const at = (clock: string): ShipState => model.evaluate(shipTimeToSeconds(`1912-04-${clock}`));

/** Deterministic pseudo-random sequence (mulberry32), so that failures are reproducible. */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

describe('time is the only input', () => {
  const random = createRandom(1912);
  const times = Array.from({ length: 400 }, () => random() * model.endSeconds);

  it('returns equal states for equal times', () => {
    for (const t of times.slice(0, 50)) {
      expect(model.evaluate(t)).toEqual(model.evaluate(t));
    }
  });

  it('gives the same state whether time runs forward, backward or jumps', () => {
    const ascending = [...times].sort((a, b) => a - b);
    const forward = new Map(ascending.map((t) => [t, model.evaluate(t)]));
    const backward = new Map([...ascending].reverse().map((t) => [t, model.evaluate(t)]));
    const jumping = new Map(times.map((t) => [t, model.evaluate(t)]));
    for (const t of times) {
      expect(backward.get(t)).toEqual(forward.get(t));
      expect(jumping.get(t)).toEqual(forward.get(t));
    }
  });

  it('gives the same state from an independently built model', () => {
    const other = createTimelineModel(structuredClone(dataset));
    for (const t of times.slice(0, 100)) {
      expect(other.evaluate(t)).toEqual(model.evaluate(t));
    }
  });

  it('does not modify the dataset', () => {
    const before = JSON.stringify(dataset);
    for (const t of times.slice(0, 100)) {
      model.evaluate(t);
    }
    expect(JSON.stringify(dataset)).toBe(before);
  });

  it('clamps times outside the modelled period', () => {
    expect(model.evaluate(-500)).toEqual(model.evaluate(model.startSeconds));
    expect(model.evaluate(1e9)).toEqual(model.evaluate(model.endSeconds));
  });
});

describe('modelled period', () => {
  it('runs from the collision to both sections at rest', () => {
    expect(model.startSeconds).toBe(0);
    expect(model.founderingSeconds).toBe(9600);
    expect(model.breakSeconds).toBe(shipTimeToSeconds('1912-04-15T02:17'));
    expect(model.endSeconds).toBe(shipTimeToSeconds('1912-04-15T02:26'));
  });

  it('goes through the phases in order', () => {
    expect(at('14T23:40').phase).toBe('afloat');
    expect(at('15T02:14:59').phase).toBe('afloat');
    expect(at('15T02:15').phase).toBe('final-plunge');
    expect(at('15T02:17').phase).toBe('break-up');
    expect(at('15T02:20').phase).toBe('descent');
    expect(at('15T02:26').phase).toBe('wreck');
  });
});

describe('continuity', () => {
  it('has no jump in the pose of either section', () => {
    let previous = model.evaluate(0);
    for (let t = 1; t <= model.endSeconds; t += 1) {
      const current = model.evaluate(t);
      for (const section of ['bow', 'stern'] as const) {
        expect(
          Math.abs(current[section].pitchDeg - previous[section].pitchDeg),
          `pitch at ${t}`,
        ).toBeLessThan(2);
        expect(
          Math.abs(current[section].heelDeg - previous[section].heelDeg),
          `heel at ${t}`,
        ).toBeLessThan(1);
        expect(
          Math.abs(current[section].yawDeg - previous[section].yawDeg),
          `yaw at ${t}`,
        ).toBeLessThan(3);
        expect(
          Math.abs(current[section].upM - previous[section].upM),
          `depth at ${t}`,
        ).toBeLessThan(25);
        expect(
          Math.abs(current[section].forwardM - previous[section].forwardM),
          `position at ${t}`,
        ).toBeLessThan(5);
      }
      previous = current;
    }
  });

  it('has no jump in any water level', () => {
    let previous = model.evaluate(0);
    for (let t = 1; t <= model.endSeconds; t += 1) {
      const current = model.evaluate(t);
      current.compartments.forEach((compartment, index) => {
        const before = previous.compartments[index]?.levelAboveKeelM ?? Number.NaN;
        expect(
          Math.abs(compartment.levelAboveKeelM - before),
          `${compartment.id} at ${t}`,
        ).toBeLessThan(1.5);
      });
      previous = current;
    }
  });
});

describe('state at the collision', () => {
  const state = at('14T23:40');

  it('floats at the recorded draughts, slightly by the stern', () => {
    expect(state.draught?.forwardM).toBeCloseTo(9.37, 1);
    expect(state.draught?.aftM).toBeCloseTo(10.29, 1);
    expect(state.trimDeg).toBeCloseTo(-0.2, 6);
    expect(state.heelDeg).toBe(0);
  });

  it('is intact, dry, lit, with every boat stowed and every funnel standing', () => {
    expect(state.intact).toBe(true);
    expect(state.compartments.every((compartment) => compartment.status === 'dry')).toBe(true);
    expect(state.waterAboardTonnes).toBe(0);
    expect(state.lightingOutput).toBe(1);
    expect(state.boats.every((boat) => boat.status === 'stowed')).toBe(true);
    expect(state.funnelsStanding).toEqual([true, true, true, true]);
    expect(state.rocketsFired).toBe(0);
  });
});

describe('agreement with the observations behind the curves', () => {
  const { ship } = dataset;

  it('keeps the forecastle above water at 1:35 a.m. (Lee)', () => {
    const state = at('15T01:35');
    expect(seaLevelAboveKeel(state.bow, 0)).toBeLessThan(deckHeightAt(ship, 'b', 0));
  });

  it('has the forward well deck awash at 1:50 a.m. (Phillips)', () => {
    const state = at('15T01:50');
    const station = 45;
    expect(
      Math.abs(seaLevelAboveKeel(state.bow, station) - deckHeightAt(ship, 'c', station)),
    ).toBeLessThan(2);
    expect(state.heelDeg).toBeCloseTo(-10, 6);
  });

  it('has the forecastle head going under at 2:05 a.m. (Bright)', () => {
    const state = at('15T02:05');
    expect(seaLevelAboveKeel(state.bow, 0)).toBeGreaterThan(deckHeightAt(ship, 'b', 0));
  });

  it('brings the sea to A deck on the port side at collapsible D at 2:05 a.m. (Lightoller)', () => {
    const state = at('15T02:05');
    const station = 70.1;
    const portEdge = bodyToWorld(state.bow, {
      x: station,
      y: -factValue(ship.particulars, 'breadth') / 2,
      z: deckHeightAt(ship, 'a', station),
    });
    expect(Math.abs(portEdge.up)).toBeLessThan(2.5);
  });

  it("puts the crow's nest about level with the sea at 2:15 a.m. (Lightoller)", () => {
    const state = at('15T02:15');
    const foremast = ship.masts.find((mast) => mast.id === 'foremast');
    const crowsNest = bodyToWorld(state.bow, {
      x: foremast?.x_m ?? Number.NaN,
      y: 0,
      z: factValue(ship.particulars, 'crows-nest-height'),
    });
    expect(Math.abs(crowsNest.up)).toBeLessThan(5);
  });

  it('matches the last Hackett and Bedford condition at the break', () => {
    const state = model.evaluate(model.breakSeconds);
    expect(state.trimDeg).toBeCloseTo(16, 6);
    expect(state.draught?.forwardM).toBeGreaterThan(59);
    expect(state.draught?.forwardM).toBeLessThan(64);
    expect(state.draught?.aftM).toBeGreaterThan(-15);
    expect(state.draught?.aftM).toBeLessThan(-11);
  });

  it('never trims by more than the 17° of the reference break-up model while intact', () => {
    for (let t = 0; t <= model.breakSeconds; t += 30) {
      expect(model.evaluate(t).trimDeg).toBeLessThanOrEqual(17);
    }
  });
});

describe('flooding', () => {
  it('follows the recorded depths in the first minutes', () => {
    const state = at('14T23:50');
    const level = (id: string): number =>
      state.compartments.find((compartment) => compartment.id === id)?.levelAboveKeelM ??
      Number.NaN;
    expect(level('hold-1')).toBeCloseTo(3.7, 6);
    expect(level('boiler-room-6')).toBeCloseTo(4.0, 6);
    expect(level('boiler-room-4')).toBe(0);
  });

  it('keeps boiler rooms 3 to 1 and the engine rooms dry at 1:20 a.m. (Dillon)', () => {
    const state = at('15T01:20');
    for (const id of [
      'boiler-room-3',
      'boiler-room-2',
      'boiler-room-1',
      'reciprocating-engine-room',
      'turbine-engine-room',
    ]) {
      expect(state.compartments.find((compartment) => compartment.id === id)?.status, id).toBe(
        'dry',
      );
    }
    expect(
      state.compartments.find((compartment) => compartment.id === 'boiler-room-6')?.status,
    ).toBe('flooded');
  });

  it('never lowers a water level while the hull is intact', () => {
    let previous = model.evaluate(0);
    for (let t = 30; t <= model.breakSeconds; t += 30) {
      const current = model.evaluate(t);
      current.compartments.forEach((compartment, index) => {
        const before = previous.compartments[index]?.levelAboveKeelM ?? Number.NaN;
        expect(compartment.levelAboveKeelM, `${compartment.id} at ${t}`).toBeGreaterThanOrEqual(
          before - 1e-6,
        );
      });
      previous = current;
    }
  });

  it('never puts the water inside higher than the sea outside', () => {
    for (let t = 0; t <= model.breakSeconds; t += 60) {
      const state = model.evaluate(t);
      state.compartments.forEach((compartment, index) => {
        const record = dataset.ship.compartments[index];
        const midX = ((record?.x_start_m ?? 0) + (record?.x_end_m ?? 0)) / 2;
        expect(compartment.levelAboveKeelM, `${compartment.id} at ${t}`).toBeLessThanOrEqual(
          Math.max(0, seaLevelAboveKeel(state.bow, midX)) + 1e-6,
        );
      });
    }
  });

  it('has every compartment flooded once the wreck is at rest', () => {
    expect(model.evaluate(model.endSeconds).compartments.every((c) => c.status === 'flooded')).toBe(
      true,
    );
  });

  it('reports the mass of water aboard only while the hull is intact', () => {
    expect(at('15T00:20').waterAboardTonnes).toBeCloseTo(16260, 0);
    expect(at('15T02:18').waterAboardTonnes).toBeNull();
  });
});

describe('lifeboats', () => {
  const afloat = (state: ShipState): string[] =>
    state.boats.filter((boat) => boat.status === 'afloat').map((boat) => boat.id);

  it('has no boat away before 12:40 a.m.', () => {
    expect(at('15T00:39:59').boats.every((boat) => boat.status === 'stowed')).toBe(true);
  });

  it('lowers boat No. 7 first', () => {
    const state = at('15T00:42');
    const lowering = state.boats
      .filter((boat) => boat.status === 'lowering')
      .map((boat) => boat.id);
    expect(lowering).toEqual(['7']);
    expect(state.boats.find((boat) => boat.id === '7')?.loweringProgress).toBeCloseTo(0.4, 6);
  });

  it('takes the recorded ten minutes for boats 1 and 6 to reach the water', () => {
    expect(at('15T01:14:59').boats.find((boat) => boat.id === '1')?.status).toBe('lowering');
    expect(at('15T01:15').boats.find((boat) => boat.id === '1')?.status).toBe('afloat');
    expect(at('15T01:19:59').boats.find((boat) => boat.id === '6')?.status).toBe('lowering');
  });

  it('floats collapsibles A and B off at 2:15 a.m. without lowering them', () => {
    expect(afloat(at('15T02:14:59'))).not.toContain('a');
    expect(afloat(at('15T02:15'))).toEqual(expect.arrayContaining(['a', 'b']));
  });

  it('has all twenty boats on the water when the ship founders', () => {
    expect(afloat(at('15T02:20'))).toHaveLength(20);
  });
});

describe('distress signals, lights and funnels', () => {
  it('shows a signal only for a few seconds after it is fired', () => {
    const first = shipTimeToSeconds('1912-04-15T00:47');
    expect(model.evaluate(first - 1).rockets).toEqual([]);
    expect(model.evaluate(first + 5).rockets).toEqual([{ id: 'rocket-01', ageSeconds: 5 }]);
    expect(model.evaluate(first + ROCKET_VISIBLE_SECONDS).rockets).toEqual([]);
    expect(model.evaluate(first + 5).rocketsFired).toBe(1);
  });

  it('has fired every listed signal by 1:54 a.m.', () => {
    expect(at('15T01:54').rocketsFired).toBe(dataset.signals.rockets.firings.length);
  });

  it('keeps the lights burning until about 2:17 a.m.', () => {
    expect(at('15T01:00').lightingOutput).toBe(1);
    expect(at('15T02:15').lightingOutput).toBeCloseTo(0.75, 6);
    expect(at('15T02:16:30').lightingOutput).toBeGreaterThan(0.5);
    expect(at('15T02:17').lightingOutput).toBe(0);
    expect(at('15T02:19').lightingOutput).toBe(0);
  });

  it('fells the funnels between 2:16 and 2:18 a.m.', () => {
    expect(at('15T02:15:59').funnelsStanding).toEqual([true, true, true, true]);
    expect(at('15T02:16').funnelsStanding).toEqual([false, true, true, true]);
    expect(at('15T02:18').funnelsStanding).toEqual([false, false, false, false]);
  });
});

describe('break-up, foundering and wreck', () => {
  const { ship, breakup } = dataset;
  const sternTop = {
    x: breakup.stern_section.x_end_m,
    y: 0,
    z: deckHeightAt(ship, 'b', breakup.stern_section.x_end_m),
  };

  it('keeps the two sections together until the break', () => {
    const state = model.evaluate(model.breakSeconds);
    expect(state.intact).toBe(true);
    const point = { x: 150, y: 0, z: 20 };
    const fromBow = bodyToWorld(state.bow, point);
    const fromStern = bodyToWorld(state.stern, point);
    expect(fromBow.forward).toBeCloseTo(fromStern.forward, 6);
    expect(fromBow.up).toBeCloseTo(fromStern.up, 6);
    expect(model.evaluate(model.breakSeconds + 1).intact).toBe(false);
  });

  it('lets the stern settle back, then rise to at most the 30° shown', () => {
    expect(at('15T02:17:20').stern.pitchDeg).toBeCloseTo(6, 6);
    let steepest = 0;
    for (let t = model.breakSeconds; t <= model.founderingSeconds; t += 1) {
      steepest = Math.max(steepest, model.evaluate(t).stern.pitchDeg);
    }
    expect(steepest).toBeCloseTo(30, 6);
  });

  it('never reproduces the 45° of the 1997 film while any part is at the surface', () => {
    for (let t = 0; t <= model.founderingSeconds; t += 1) {
      const state = model.evaluate(t);
      expect(state.bow.pitchDeg).toBeLessThan(45);
      expect(state.stern.pitchDeg).toBeLessThan(45);
    }
  });

  it('takes the stern under at 2:20 a.m.', () => {
    expect(bodyToWorld(at('15T02:19:30').stern, sternTop).up).toBeGreaterThan(0);
    expect(bodyToWorld(at('15T02:20').stern, sternTop).up).toBeLessThanOrEqual(1);
    expect(bodyToWorld(at('15T02:20:10').stern, sternTop).up).toBeLessThan(0);
  });

  it('has the bow section wholly under by 2:18:30 a.m.', () => {
    const state = at('15T02:18:30');
    const afterEnd = { x: breakup.bow_section.x_end_m, y: 0, z: deckHeightAt(ship, 'boat', 143) };
    expect(bodyToWorld(state.bow, afterEnd).up).toBeLessThan(0);
  });

  it('brings the stern section to the seabed rudder first', () => {
    const { x_start_m: forwardEndX, x_end_m: afterEndX } = breakup.stern_section;
    const rest = shipTimeToSeconds(breakup.stern_section.keyframes.at(-1)?.ats ?? '');
    const keelUp = (t: number, x: number): number =>
      bodyToWorld(model.evaluate(t).stern, { x, y: 0, z: 0 }).up;
    const restingKeelUp = keelUp(rest, afterEndX);
    for (let t = shipTimeToSeconds('1912-04-15T02:22'); t < rest; t += 1) {
      expect(model.evaluate(t).stern.pitchDeg, `pitch at ${t}`).toBeLessThan(0);
      expect(keelUp(t, afterEndX), `after end at ${t}`).toBeLessThan(keelUp(t, forwardEndX));
      expect(keelUp(t, afterEndX), `seabed at ${t}`).toBeGreaterThan(restingKeelUp);
    }
    expect(keelUp(rest, forwardEndX)).toBeCloseTo(restingKeelUp, 6);
  });

  it('rests both sections about 3,800 m down and about 600 m apart', () => {
    const state = model.evaluate(model.endSeconds);
    const depth = factValue(dataset.site.environment, 'depth');
    for (const section of [state.bow, state.stern]) {
      const keel = bodyToWorld(section, { x: section.referenceXM, y: 0, z: 0 });
      expect(Math.abs(-keel.up - depth)).toBeLessThan(25);
      expect(Math.abs(section.heelDeg)).toBeLessThan(1);
    }
    const separation = Math.hypot(
      state.bow.forwardM - state.stern.forwardM,
      state.bow.starboardM - state.stern.starboardM,
    );
    expect(Math.abs(separation - factValue(dataset.site.wreck, 'two-sections'))).toBeLessThan(100);
  });
});

describe('narrative events', () => {
  it('are ordered in time and uniquely identified', () => {
    const times = model.events.map((event) => event.t);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    expect(new Set(model.events.map((event) => event.id)).size).toBe(model.events.length);
  });

  it('begin with the collision and cover every boat, signal and message', () => {
    expect(model.events[0]?.id).toBe('collision');
    const count = (kind: string): number =>
      model.events.filter((event) => event.kind === kind).length;
    expect(count('lifeboat')).toBe(20);
    expect(count('rocket')).toBe(dataset.signals.rockets.firings.length);
    expect(count('wireless')).toBe(dataset.signals.wireless.messages.length);
    expect(count('chronology')).toBe(dataset.chronology.events.length);
  });

  it('carry sources and a certainty', () => {
    for (const event of model.events) {
      expect(event.sourceIds.length, event.id).toBeGreaterThan(0);
      expect(['established', 'estimated', 'debated'], event.id).toContain(event.certainty);
    }
  });

  it('offer the turning points as bookmarks', () => {
    const keys = model.events.filter((event) => event.keyEvent).map((event) => event.id);
    expect(keys).toEqual(
      expect.arrayContaining([
        'collision',
        'boat-7',
        'rocket-01',
        'wireless-first-cqd',
        'hull-breaks',
        'stern-disappears',
      ]),
    );
  });
});

describe('iceberg and wreck', () => {
  it('has the iceberg abreast of the starboard bow at the collision, clear of the hull', () => {
    const { iceberg, bow } = model.evaluate(0);
    expect(iceberg.starboardM).toBeGreaterThan(factValue(dataset.ship.particulars, 'breadth') / 2);
    expect(iceberg.forwardM).toBeGreaterThan(bow.forwardM);
  });

  it('leaves the iceberg more than a kilometre astern within minutes, then at rest', () => {
    const start = model.evaluate(0).iceberg.forwardM;
    const later = model.evaluate(600).iceberg;
    expect(start - later.forwardM).toBeGreaterThan(1000);
    expect(model.evaluate(9000).iceberg).toEqual(later);
  });

  it('marks each section at rest only once it has reached the seabed', () => {
    expect(model.evaluate(model.founderingSeconds).wreck).toEqual({
      bowAtRest: false,
      sternAtRest: false,
    });
    expect(model.evaluate(model.endSeconds).wreck).toEqual({ bowAtRest: true, sternAtRest: true });
    const bowRest = shipTimeToSeconds(dataset.breakup.bow_section.keyframes.at(-1)?.ats ?? '');
    expect(model.evaluate(bowRest - 1).wreck.bowAtRest).toBe(false);
    expect(model.evaluate(bowRest).wreck.bowAtRest).toBe(true);
  });

  it('lists the distress signals in the order they were fired', () => {
    const times = model.rocketFirings.map((firing) => firing.seconds);
    expect(times).toHaveLength(dataset.signals.rockets.firings.length);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });
});
