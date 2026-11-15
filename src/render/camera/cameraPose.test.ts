import { describe, expect, it } from 'vitest';
import { dataset } from '../../data/dataset.ts';
import { ROCKET_ASCENT_SECONDS, ROCKET_BURST_HEIGHT_M } from '../../sim/rocketAppearance.ts';
import { bodyPointToScene } from '../../sim/sceneFrame.ts';
import { createTimelineModel } from '../../sim/timelineModel.ts';
import {
  adjustLook,
  adjustOrbit,
  DEFAULT_DECK_LOOK,
  DEFAULT_ORBIT,
  DEFAULT_UNDERWATER,
  deckCameraPose,
  freeCameraPose,
  freeParametersFrom,
  guidedCameraPose,
  moveFree,
  ORBIT_LIMITS,
  orbitCameraPose,
  underwaterCameraPose,
} from './cameraPose.ts';

const model = createTimelineModel(dataset);
const seabed = -3800;
const bounds = {
  breakSeconds: model.breakSeconds,
  founderingSeconds: model.founderingSeconds,
  endSeconds: model.endSeconds,
};
const distance = (a: readonly number[], b: readonly number[]): number =>
  Math.hypot((a[0] ?? 0) - (b[0] ?? 0), (a[1] ?? 0) - (b[1] ?? 0), (a[2] ?? 0) - (b[2] ?? 0));

describe('orbit camera', () => {
  it('stays above the water at every instant, even when the ship has gone', () => {
    for (let t = 0; t <= model.endSeconds; t += 120) {
      const lowest = { ...DEFAULT_ORBIT, elevationDeg: ORBIT_LIMITS.minElevationDeg };
      const pose = orbitCameraPose(model.evaluate(t), lowest, bounds);
      expect(pose.position[1]).toBeGreaterThan(1);
      expect(pose.target[1]).toBeGreaterThan(1);
    }
  });

  it('keeps the requested distance from its focus', () => {
    const pose = orbitCameraPose(model.evaluate(0), DEFAULT_ORBIT, bounds);
    expect(distance(pose.position, pose.target)).toBeCloseTo(DEFAULT_ORBIT.distanceM, 6);
  });

  it('watches the stern once the hull has parted', () => {
    const state = model.evaluate(model.founderingSeconds - 30);
    const pose = orbitCameraPose(state, DEFAULT_ORBIT, bounds);
    expect(Math.abs(pose.target[0] - state.stern.forwardM)).toBeLessThan(20);
  });

  it('places azimuth 90° on the starboard beam', () => {
    const pose = orbitCameraPose(
      model.evaluate(0),
      { azimuthDeg: 90, elevationDeg: 10, distanceM: 300 },
      bounds,
    );
    expect(pose.position[2] - pose.target[2]).toBeGreaterThan(290);
  });
});

describe('underwater camera', () => {
  it('stays below the surface and above the seabed', () => {
    for (let t = 0; t <= model.endSeconds; t += 120) {
      const pose = underwaterCameraPose(
        model.evaluate(t),
        { ...DEFAULT_UNDERWATER, elevationDeg: 60 },
        seabed,
      );
      expect(pose.position[1]).toBeLessThan(0);
      expect(pose.position[1]).toBeGreaterThan(seabed);
    }
  });

  it('follows the forward section to the seabed', () => {
    const pose = underwaterCameraPose(model.evaluate(model.endSeconds), DEFAULT_UNDERWATER, seabed);
    expect(pose.target[1]).toBeLessThan(-3700);
  });
});

describe('deck camera', () => {
  it('stands on the Boat deck, about 20 m above the sea at the collision', () => {
    const pose = deckCameraPose(model.evaluate(0), DEFAULT_DECK_LOOK);
    expect(pose.position[1]).toBeGreaterThan(18);
    expect(pose.position[1]).toBeLessThan(22);
    expect(distance(pose.position, pose.target)).toBeCloseTo(1, 9);
  });

  it('goes down with the ship', () => {
    const early = deckCameraPose(model.evaluate(0), DEFAULT_DECK_LOOK);
    const late = deckCameraPose(model.evaluate(9200), DEFAULT_DECK_LOOK);
    expect(late.position[1]).toBeLessThan(early.position[1] - 10);
  });
});

describe('guided camera', () => {
  it('is a function of time alone', () => {
    const state = model.evaluate(4321);
    expect(guidedCameraPose(state, bounds, seabed, false)).toEqual(
      guidedCameraPose(state, bounds, seabed, false),
    );
  });

  it('moves continuously', () => {
    let previous = guidedCameraPose(model.evaluate(0), bounds, seabed, false);
    for (let t = 1; t <= model.endSeconds; t += 1) {
      const current = guidedCameraPose(model.evaluate(t), bounds, seabed, false);
      expect(distance(current.position, previous.position), `at ${t}`).toBeLessThan(40);
      previous = current;
    }
  });

  it('stays above the water until the ship has foundered, then follows the stern down', () => {
    for (let t = 0; t <= model.founderingSeconds; t += 60) {
      expect(
        guidedCameraPose(model.evaluate(t), bounds, seabed, false).position[1],
      ).toBeGreaterThan(1);
    }
    expect(
      guidedCameraPose(model.evaluate(model.endSeconds), bounds, seabed, false).position[1],
    ).toBeLessThan(-3600);
  });

  it('keeps the burst of every distress signal in frame', () => {
    const halfFieldOfViewDeg = 21;
    for (const firing of model.rocketFirings) {
      const state = model.evaluate(firing.seconds + ROCKET_ASCENT_SECONDS + 1);
      const pose = guidedCameraPose(state, bounds, seabed, false);
      const bridge = bodyPointToScene(state.bow, { x: 59, y: 13.6, z: 29.4 });
      const burst = [bridge[0], bridge[1] + ROCKET_BURST_HEIGHT_M, bridge[2]];
      const view = pose.target.map((value, axis) => value - (pose.position[axis] ?? 0));
      const toBurst = burst.map((value, axis) => value - (pose.position[axis] ?? 0));
      const cosine =
        view.reduce((sum, value, axis) => sum + value * (toBurst[axis] ?? 0), 0) /
        (Math.hypot(...view) * Math.hypot(...toBurst));
      const angleDeg = (Math.acos(cosine) * 180) / Math.PI;
      expect(angleDeg, `signal at ${firing.seconds}`).toBeLessThan(halfFieldOfViewDeg * 0.9);
    }
  });

  it('holds still within a shot when motion is reduced', () => {
    const a = guidedCameraPose(model.evaluate(1300), bounds, seabed, true);
    const b = guidedCameraPose(model.evaluate(1500), bounds, seabed, true);
    const offset = (pose: typeof a): number[] =>
      pose.position.map((value, axis) => value - (pose.target[axis] ?? 0));
    offset(a).forEach((value, axis) => {
      expect(value).toBeCloseTo(offset(b)[axis] ?? Number.NaN, 6);
    });
  });
});

describe('camera adjustments', () => {
  it('wraps the azimuth and clamps elevation and distance', () => {
    const adjusted = adjustOrbit(DEFAULT_ORBIT, 400, 200, 1000, ORBIT_LIMITS);
    expect(adjusted.azimuthDeg).toBeCloseTo((DEFAULT_ORBIT.azimuthDeg + 40) % 360, 9);
    expect(adjusted.elevationDeg).toBe(ORBIT_LIMITS.maxElevationDeg);
    expect(adjusted.distanceM).toBe(ORBIT_LIMITS.maxDistanceM);
  });

  it('clamps the pitch of a look direction', () => {
    expect(adjustLook({ yawDeg: 0, pitchDeg: 0 }, -10, 200)).toEqual({ yawDeg: 350, pitchDeg: 85 });
  });

  it('hands a pose over to the free camera without moving it', () => {
    const pose = orbitCameraPose(model.evaluate(3000), DEFAULT_ORBIT, bounds);
    const free = freeCameraPose(freeParametersFrom(pose));
    expect(free.position).toEqual(pose.position);
    const toTarget = pose.target.map((value, axis) => value - (pose.position[axis] ?? 0));
    const length = Math.hypot(...toTarget);
    free.target.forEach((value, axis) => {
      expect(value - (free.position[axis] ?? 0)).toBeCloseTo((toTarget[axis] ?? 0) / length, 9);
    });
  });

  it('moves the free camera along its own axes', () => {
    const start = { position: [0, 10, 0] as const, yawDeg: 90, pitchDeg: 0 };
    const moved = moveFree(start, 5, 2, 1);
    expect(moved.position[0]).toBeCloseTo(-2, 9);
    expect(moved.position[1]).toBeCloseTo(11, 9);
    expect(moved.position[2]).toBeCloseTo(5, 9);
  });
});
