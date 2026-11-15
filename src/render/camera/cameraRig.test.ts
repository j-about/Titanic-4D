import { describe, expect, it } from 'vitest';
import { dataset } from '../../data/dataset.ts';
import { createTimelineModel } from '../../sim/timelineModel.ts';
import { type CameraRequest, NO_REQUEST } from './cameraInput.ts';
import { CAMERA_MODES, type CameraMode, type CameraPose } from './cameraPose.ts';
import { type CameraRig, createCameraRig } from './cameraRig.ts';
import { CAMERA_STEPS_BY_MODE, type CameraStep, MOVE_STEP_M, TURN_STEP_DEG } from './cameraStep.ts';

const model = createTimelineModel(dataset);
const seabed = -3800;
const bounds = {
  breakSeconds: model.breakSeconds,
  founderingSeconds: model.founderingSeconds,
  endSeconds: model.endSeconds,
};
const state = model.evaluate(3600);
const STEERABLE_MODES = CAMERA_MODES.filter((mode) => mode !== 'guided');

const createRig = (): CameraRig => createCameraRig(bounds, seabed);
const update = (
  rig: CameraRig,
  mode: CameraMode,
  request: CameraRequest = NO_REQUEST,
): CameraPose => rig.update({ state, mode, request, reducedMotion: false });

/** Direction of sight of a pose, as degrees clockwise from the heading and above the horizontal. */
function sight(pose: CameraPose): { yawDeg: number; pitchDeg: number } {
  const dx = pose.target[0] - pose.position[0];
  const dy = pose.target[1] - pose.position[1];
  const dz = pose.target[2] - pose.position[2];
  return {
    yawDeg: (Math.atan2(dz, dx) * 180) / Math.PI,
    pitchDeg: (Math.atan2(dy, Math.hypot(dx, dz)) * 180) / Math.PI,
  };
}

const distance = (pose: CameraPose): number =>
  Math.hypot(
    pose.target[0] - pose.position[0],
    pose.target[1] - pose.position[1],
    pose.target[2] - pose.position[2],
  );

/** Smallest difference between two angles, in degrees. */
const angleBetween = (a: number, b: number): number => Math.abs(((a - b + 540) % 360) - 180);

describe('camera rig', () => {
  it('keeps the view of a mode while another mode is in use', () => {
    const rig = createRig();
    const turned = update(rig, 'orbit', { ...NO_REQUEST, rotateRightDeg: 40 });
    update(rig, 'deck');
    expect(update(rig, 'orbit')).toEqual(turned);
  });

  it('starts the free camera from the view that was on screen', () => {
    const rig = createRig();
    const orbit = update(rig, 'orbit', { ...NO_REQUEST, rotateRightDeg: 70, zoomFactor: 2 });
    const free = update(rig, 'free');
    expect(free.position).toEqual(orbit.position);
    expect(angleBetween(sight(free).yawDeg, sight(orbit).yawDeg)).toBeLessThan(1e-6);
  });

  for (const mode of STEERABLE_MODES) {
    it(`returns the ${mode} camera to the view of a fresh rig when reset`, () => {
      const fresh = update(createRig(), mode);
      const rig = createRig();
      const moved = update(rig, mode, {
        rotateRightDeg: 55,
        rotateUpDeg: 12,
        zoomFactor: 1.6,
        moveForwardM: 120,
        moveRightM: -40,
        moveUpM: 25,
      });
      expect(moved).not.toEqual(fresh);
      rig.reset();
      expect(update(rig, mode)).toEqual(fresh);
    });
  }

  it('returns the free camera to the default view around the ship when reset', () => {
    const rig = createRig();
    update(rig, 'free', { ...NO_REQUEST, moveForwardM: 500, rotateRightDeg: 90 });
    rig.reset();
    const orbit = update(createRig(), 'orbit');
    const free = update(rig, 'free');
    expect(free.position).toEqual(orbit.position);
    expect(angleBetween(sight(free).yawDeg, sight(orbit).yawDeg)).toBeLessThan(1e-6);
    expect(sight(free).pitchDeg).toBeCloseTo(sight(orbit).pitchDeg, 6);
  });
});

describe('camera steps', () => {
  it('waits for the next update and is applied once', () => {
    const rig = createRig();
    const before = update(rig, 'orbit');
    expect(rig.hasPendingStep()).toBe(false);
    rig.step('turn-right');
    expect(rig.hasPendingStep()).toBe(true);
    const after = update(rig, 'orbit');
    expect(rig.hasPendingStep()).toBe(false);
    expect(after).not.toEqual(before);
    expect(update(rig, 'orbit')).toEqual(after);
  });

  it('does what the same request from the keyboard or the pointer does', () => {
    for (const mode of STEERABLE_MODES) {
      const stepped = createRig();
      stepped.step('turn-left');
      stepped.step('tilt-up');
      const requested = createRig();
      expect(update(stepped, mode)).toEqual(
        update(requested, mode, {
          ...NO_REQUEST,
          rotateRightDeg: -TURN_STEP_DEG,
          rotateUpDeg: TURN_STEP_DEG,
        }),
      );
    }
  });

  it('adds up the steps asked for between two updates, and the request of the frame', () => {
    const rig = createRig();
    rig.step('turn-right');
    rig.step('turn-right');
    const expected = update(createRig(), 'deck', {
      ...NO_REQUEST,
      rotateRightDeg: 2 * TURN_STEP_DEG + 5,
    });
    expect(update(rig, 'deck', { ...NO_REQUEST, rotateRightDeg: 5 })).toEqual(expected);
  });

  it('turns the deck camera by one step to each side and back', () => {
    const rig = createRig();
    const start = sight(update(rig, 'deck'));
    rig.step('turn-right');
    const right = sight(update(rig, 'deck'));
    expect(angleBetween(right.yawDeg, start.yawDeg + TURN_STEP_DEG)).toBeLessThan(1e-6);
    rig.step('turn-left');
    expect(angleBetween(sight(update(rig, 'deck')).yawDeg, start.yawDeg)).toBeLessThan(1e-6);
    rig.step('tilt-up');
    expect(sight(update(rig, 'deck')).pitchDeg).toBeCloseTo(start.pitchDeg + TURN_STEP_DEG, 6);
    rig.step('tilt-down');
    expect(sight(update(rig, 'deck')).pitchDeg).toBeCloseTo(start.pitchDeg, 6);
  });

  it('brings the orbit and underwater cameras closer and farther', () => {
    for (const mode of ['orbit', 'underwater'] as const) {
      const rig = createRig();
      const start = distance(update(rig, mode));
      rig.step('zoom-in');
      const near = distance(update(rig, mode));
      expect(near).toBeLessThan(start);
      rig.step('zoom-out');
      rig.step('zoom-out');
      expect(distance(update(rig, mode))).toBeGreaterThan(start);
    }
  });

  it('moves the free camera along its line of sight', () => {
    const rig = createRig();
    const start = update(rig, 'free');
    rig.step('move-forward');
    const forward = update(rig, 'free');
    const moved = Math.hypot(
      forward.position[0] - start.position[0],
      forward.position[2] - start.position[2],
    );
    expect(moved).toBeCloseTo(MOVE_STEP_M, 6);
    rig.step('move-back');
    const back = update(rig, 'free');
    expect(back.position[0]).toBeCloseTo(start.position[0], 6);
    expect(back.position[2]).toBeCloseTo(start.position[2], 6);
  });

  it('changes the view with every step offered for a mode, and offers none in the guided mode', () => {
    expect(CAMERA_STEPS_BY_MODE.guided).toEqual([]);
    for (const mode of STEERABLE_MODES) {
      expect(CAMERA_STEPS_BY_MODE[mode].length).toBeGreaterThan(0);
      for (const step of CAMERA_STEPS_BY_MODE[mode]) {
        const rig = createRig();
        const before = update(rig, mode);
        rig.step(step);
        expect(update(rig, mode), `${step} in ${mode}`).not.toEqual(before);
      }
    }
  });

  it('leaves the guided camera where the tour puts it', () => {
    const rig = createRig();
    const before = update(rig, 'guided');
    const steps: readonly CameraStep[] = ['turn-left', 'zoom-in', 'move-forward'];
    for (const step of steps) {
      rig.step(step);
    }
    expect(update(rig, 'guided')).toEqual(before);
  });

  it('drops the steps not yet applied when reset', () => {
    const rig = createRig();
    const fresh = update(rig, 'orbit');
    rig.step('turn-right');
    rig.reset();
    expect(rig.hasPendingStep()).toBe(false);
    expect(update(rig, 'orbit')).toEqual(fresh);
  });
});
