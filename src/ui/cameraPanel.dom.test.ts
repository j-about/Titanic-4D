import { describe, expect, it } from 'vitest';
import { CAMERA_MODES, type CameraMode } from '../render/camera/cameraPose.ts';
import { CAMERA_STEPS_BY_MODE, type CameraStep } from '../render/camera/cameraStep.ts';
import type { QualityLevel } from '../render/quality.ts';
import { cameraHelp, createCameraPanel } from './cameraPanel.ts';

function setUp(helpOpen = true) {
  const steps: CameraStep[] = [];
  const modes: CameraMode[] = [];
  const qualities: QualityLevel[] = [];
  let resets = 0;
  const panel = createCameraPanel(
    {
      selectMode: (mode) => modes.push(mode),
      step: (step) => steps.push(step),
      reset: () => {
        resets += 1;
      },
      selectQuality: (quality) => qualities.push(quality),
    },
    { helpOpen },
  );
  document.body.replaceChildren(panel.element);
  const group = panel.element.querySelector<HTMLElement>('.camera__steps');
  if (group === null) {
    throw new Error('The panel has no group of step buttons.');
  }
  const stepButtons = [...group.querySelectorAll<HTMLButtonElement>('button')];
  const shown = (): string[] =>
    group.hidden
      ? []
      : stepButtons
          .filter((button) => !button.hidden)
          .map((button) => button.dataset['step'] ?? '');
  return { panel, group, stepButtons, shown, steps, modes, qualities, resets: () => resets };
}

describe('camera panel', () => {
  it('offers no step button for the guided tour and those of the camera for every other view', () => {
    const { panel, group, shown } = setUp();
    for (const mode of CAMERA_MODES) {
      panel.update(mode, 'medium');
      expect(shown(), mode).toEqual([...CAMERA_STEPS_BY_MODE[mode]]);
      expect(group.hidden).toBe(mode === 'guided');
    }
  });

  it('offers turning, tilting and zooming around the ship with one button each', () => {
    const { panel, stepButtons } = setUp();
    panel.update('orbit', 'medium');
    const names = stepButtons
      .filter((button) => !button.hidden)
      .map((button) => button.textContent);
    expect(names).toEqual([
      'Turn left',
      'Turn right',
      'Tilt up',
      'Tilt down',
      'Zoom in',
      'Zoom out',
    ]);
  });

  it('builds the step buttons as native buttons named by their text, in a named group', () => {
    const { group, stepButtons } = setUp();
    expect(group.getAttribute('role')).toBe('group');
    expect(group.getAttribute('aria-label')).toBe('Move the camera');
    expect(stepButtons).toHaveLength(8);
    for (const button of stepButtons) {
      expect(button.tagName).toBe('BUTTON');
      expect(button.type).toBe('button');
      expect(button.hasAttribute('aria-label')).toBe(false);
      expect(button.textContent?.trim()).not.toBe('');
      expect(button.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('asks for one step per click', () => {
    const { panel, stepButtons, steps } = setUp();
    panel.update('free', 'medium');
    for (const button of stepButtons.filter((candidate) => !candidate.hidden)) {
      button.click();
    }
    expect(steps).toEqual([...CAMERA_STEPS_BY_MODE.free]);
    stepButtons[0]?.click();
    stepButtons[0]?.click();
    expect(steps.slice(-2)).toEqual(['turn-left', 'turn-left']);
  });

  it('passes on the choice of view, the choice of detail and the reset', () => {
    const { panel, modes, qualities, resets } = setUp();
    const view = panel.element.querySelector<HTMLSelectElement>('#camera-select');
    const detail = panel.element.querySelector<HTMLSelectElement>('#quality-select');
    if (view === null || detail === null) {
      throw new Error('The panel lacks a select.');
    }
    view.value = 'deck';
    view.dispatchEvent(new Event('change'));
    detail.value = 'low';
    detail.dispatchEvent(new Event('change'));
    [...panel.element.querySelectorAll('button')]
      .find((button) => button.textContent === 'Reset view')
      ?.click();
    expect(modes).toEqual(['deck']);
    expect(qualities).toEqual(['low']);
    expect(resets()).toBe(1);
  });

  it('keeps the help in a disclosure that is in the document whether open or closed', () => {
    for (const helpOpen of [true, false]) {
      const { panel } = setUp(helpOpen);
      panel.update('orbit', 'medium');
      const box = panel.element.querySelector('details');
      expect(box?.open).toBe(helpOpen);
      expect(box?.querySelector('summary')?.textContent).toBe('Controls of the 3D view');
      const help = box?.querySelector('#camera-help');
      expect(help?.textContent).toBe(cameraHelp('orbit'));
      expect(help?.classList.contains('visually-hidden')).toBe(false);
      expect(panel.element.querySelector('#camera-select')?.getAttribute('aria-describedby')).toBe(
        'camera-help',
      );
    }
  });

  it('names the keys that move time in the help of every view', () => {
    for (const mode of CAMERA_MODES) {
      const help = cameraHelp(mode);
      expect(help, mode).toContain('Space plays or pauses');
      expect(help, mode).toContain('comma and full stop step one minute');
    }
  });

  it('names the step buttons in the help of every view that has them', () => {
    expect(cameraHelp('guided')).not.toContain('buttons');
    expect(cameraHelp('orbit')).toContain('The Turn, Tilt and Zoom buttons');
    expect(cameraHelp('underwater')).toContain('The Turn, Tilt and Zoom buttons');
    expect(cameraHelp('deck')).toContain('The Turn and Tilt buttons');
    expect(cameraHelp('free')).toContain('The Turn, Tilt and Move buttons');
  });
});
