import { beforeEach, describe, expect, it } from 'vitest';
import { activateSceneCanvas, keepFocusThrough, replaceSceneCanvas } from './sceneCanvas.ts';

function mountCanvas(): HTMLCanvasElement {
  document.body.innerHTML =
    '<main id="main" tabindex="-1"><button id="other" type="button">Other</button>' +
    '<canvas id="scene-canvas" class="scene__canvas"></canvas></main>';
  const canvas = document.querySelector('canvas');
  if (canvas === null) {
    throw new Error('The document has no canvas.');
  }
  return canvas;
}

describe('scene canvas', () => {
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    canvas = mountCanvas();
  });

  it('is not a tab stop and claims no role until it is activated', () => {
    expect(canvas.hasAttribute('tabindex')).toBe(false);
    expect(canvas.hasAttribute('role')).toBe(false);
    activateSceneCanvas(canvas, '3D view of the ship', ['scene-description', 'camera-help']);
    expect(canvas.getAttribute('tabindex')).toBe('0');
    expect(canvas.getAttribute('role')).toBe('application');
    expect(canvas.getAttribute('aria-roledescription')).toBe('3D view');
    expect(canvas.getAttribute('aria-label')).toBe('3D view of the ship');
    expect(canvas.getAttribute('aria-describedby')).toBe('scene-description camera-help');
  });

  it('is replaced by a copy with the same attributes, in the same place', () => {
    activateSceneCanvas(canvas, '3D view of the ship', ['scene-description']);
    const fresh = replaceSceneCanvas(canvas);
    expect(fresh).not.toBe(canvas);
    expect(canvas.isConnected).toBe(false);
    expect(document.getElementById('scene-canvas')).toBe(fresh);
    expect(fresh.previousElementSibling?.id).toBe('other');
    for (const name of ['class', 'tabindex', 'role', 'aria-label', 'aria-describedby']) {
      expect(fresh.getAttribute(name), name).toBe(canvas.getAttribute(name));
    }
  });

  it('drops what the previous scene reported about its frames', () => {
    canvas.dataset['renderedTime'] = '3600';
    canvas.dataset['backend'] = 'webgl2';
    canvas.dataset['assets'] = 'ready';
    canvas.dataset['shipModel'] = 'detailed';
    const fresh = replaceSceneCanvas(canvas);
    expect(Object.keys(fresh.dataset)).toEqual([]);
  });

  it('hands the keyboard focus over to the copy when the canvas had it', () => {
    activateSceneCanvas(canvas, '3D view of the ship', []);
    canvas.focus();
    expect(document.activeElement).toBe(canvas);
    const fresh = replaceSceneCanvas(canvas);
    expect(document.activeElement).toBe(fresh);
  });

  it('leaves the focus where it is when the canvas did not have it', () => {
    activateSceneCanvas(canvas, '3D view of the ship', []);
    const other = document.getElementById('other');
    other?.focus();
    const fresh = replaceSceneCanvas(canvas);
    expect(document.activeElement).toBe(other);
    expect(document.activeElement).not.toBe(fresh);
  });

  it('moves the focus to the given element when a change hides the focused canvas', () => {
    activateSceneCanvas(canvas, '3D view of the ship', []);
    const main = document.getElementById('main');
    if (main === null) {
      throw new Error('The document has no main element.');
    }
    canvas.focus();
    let changed = false;
    keepFocusThrough(canvas, main, () => {
      changed = true;
    });
    expect(changed).toBe(true);
    expect(document.activeElement).toBe(main);
  });

  it('runs the change and leaves the focus alone when the canvas did not have it', () => {
    const main = document.getElementById('main');
    const other = document.getElementById('other');
    if (main === null || other === null) {
      throw new Error('The document lacks an element.');
    }
    other.focus();
    let changed = false;
    keepFocusThrough(canvas, main, () => {
      changed = true;
    });
    expect(changed).toBe(true);
    expect(document.activeElement).toBe(other);
  });

  it('moves the focus when it was inside the element that the change hides', () => {
    const main = document.getElementById('main');
    const other = document.getElementById('other');
    if (main === null || other === null) {
      throw new Error('The document lacks an element.');
    }
    const frame = document.createElement('div');
    main.append(frame);
    frame.append(other);
    other.focus();
    keepFocusThrough(frame, main, () => {
      frame.hidden = true;
    });
    expect(document.activeElement).toBe(main);
  });
});
