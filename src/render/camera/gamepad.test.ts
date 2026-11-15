import { describe, expect, it } from 'vitest';
import { gamepadCameraRequest, isGamepadActive, STICK_DEADZONE } from './gamepad.ts';

const rest = { axes: [0, 0, 0, 0], buttons: [0, 0, 0, 0, 0, 0, 0, 0] };
const pad = (axes: number[], buttons: Record<number, number> = {}) => ({
  axes,
  buttons: rest.buttons.map((value, index) => buttons[index] ?? value),
});

describe('gamepad', () => {
  it('asks for nothing at rest, even with sticks that do not centre exactly', () => {
    const drifting = pad([0.08, -0.1, STICK_DEADZONE - 0.01, 0.05]);
    expect(isGamepadActive(rest)).toBe(false);
    expect(isGamepadActive(drifting)).toBe(false);
    expect(gamepadCameraRequest(drifting, 0.016)).toEqual({
      rotateRightDeg: 0,
      rotateUpDeg: 0,
      zoomFactor: 1,
      moveForwardM: 0,
      moveRightM: 0,
      moveUpM: 0,
    });
  });

  it('turns the view with the right stick, upward when it is pushed away', () => {
    const request = gamepadCameraRequest(pad([0, 0, 1, -1]), 1);
    expect(request.rotateRightDeg).toBeCloseTo(70, 9);
    expect(request.rotateUpDeg).toBeCloseTo(70, 9);
    expect(isGamepadActive(pad([0, 0, 1, -1]))).toBe(true);
  });

  it('moves the free camera with the left stick and the bumpers', () => {
    const request = gamepadCameraRequest(pad([-1, -1, 0, 0], { 5: 1 }), 0.5);
    expect(request.moveForwardM).toBeCloseTo(15, 9);
    expect(request.moveRightM).toBeCloseTo(-15, 9);
    expect(request.moveUpM).toBeCloseTo(15, 9);
  });

  it('zooms in with the right trigger and out with the left, in proportion to the pressure', () => {
    expect(gamepadCameraRequest(pad([0, 0, 0, 0], { 7: 1 }), 1).zoomFactor).toBeCloseTo(1 / 1.9, 9);
    expect(gamepadCameraRequest(pad([0, 0, 0, 0], { 6: 1 }), 1).zoomFactor).toBeCloseTo(1.9, 9);
    expect(gamepadCameraRequest(pad([0, 0, 0, 0], { 6: 0.5 }), 1).zoomFactor).toBeCloseTo(
      1.9 ** 0.5,
      9,
    );
  });

  it('scales with the time elapsed and starts gently past the dead zone', () => {
    const half = gamepadCameraRequest(pad([0, 0, 1, 0]), 0.5).rotateRightDeg;
    expect(half).toBeCloseTo(35, 9);
    const justPast = gamepadCameraRequest(pad([0, 0, STICK_DEADZONE + 0.01, 0]), 1).rotateRightDeg;
    expect(justPast).toBeGreaterThan(0);
    expect(justPast).toBeLessThan(2);
  });

  it('tolerates a pad that reports fewer axes or buttons', () => {
    expect(gamepadCameraRequest({ axes: [], buttons: [] }, 1).zoomFactor).toBe(1);
  });
});
