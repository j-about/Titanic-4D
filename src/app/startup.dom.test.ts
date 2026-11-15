// @vitest-environment-options { "url": "https://www.titanic-4d.org/?t=01:00&camera=orbit" }
import { beforeAll, describe, expect, it, vi } from 'vitest';
import indexHtml from '../../index.html?raw';
import type { CameraStep } from '../render/camera/cameraStep.ts';
import { SceneResourceError } from '../render/sceneResourceError.ts';
import type { SceneFrame, SceneView, SceneViewOptions } from '../render/sceneView.ts';

/** A view that draws nothing and records what the application asks of it. */
interface FakeView extends SceneView {
  readonly steps: CameraStep[];
  readonly frames: SceneFrame[];
  disposed: boolean;
}

interface FakeStart {
  readonly options: SceneViewOptions;
  succeed(): FakeView;
  fail(error: unknown): void;
}

const { starts } = vi.hoisted(() => ({ starts: [] as FakeStart[] }));

vi.mock('../render/sceneView.ts', () => ({
  createSceneView: (options: SceneViewOptions) =>
    new Promise<SceneView>((resolve, reject) => {
      starts.push({
        options,
        succeed() {
          const view: FakeView = {
            backend: options.renderer === 'webgl2' ? 'webgl2' : 'webgpu',
            steps: [],
            frames: [],
            disposed: false,
            resize: () => undefined,
            hasPendingInput: () => false,
            assetsSettled: () => true,
            shipModel: () => 'generated',
            render(frame) {
              this.frames.push(frame);
              return Promise.resolve();
            },
            stepCamera(step) {
              this.steps.push(step);
            },
            resetCamera: () => undefined,
            dispose() {
              this.disposed = true;
            },
          };
          resolve(view);
          return view;
        },
        fail: reject,
      });
    }),
}));

const wait = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

/** Waits until the condition holds, checking every few milliseconds. */
async function until(condition: () => boolean, what: string): Promise<void> {
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    if (condition()) {
      return;
    }
    await wait(5);
  }
  throw new Error(`Timed out waiting until ${what}.`);
}

function element<T extends HTMLElement = HTMLElement>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (found === null) {
    throw new Error(`The document has no element matching "${selector}".`);
  }
  return found;
}

const start = (index: number): FakeStart => {
  const found = starts[index];
  if (found === undefined) {
    throw new RangeError(`Start ${index} has not been asked for.`);
  }
  return found;
};

const button = (name: string): HTMLButtonElement => {
  const found = [...document.querySelectorAll('button')].find(
    (candidate) => candidate.textContent?.trim() === name,
  );
  if (found === undefined) {
    throw new Error(`The document has no button "${name}".`);
  }
  return found;
};

const canvas = (): HTMLCanvasElement => element<HTMLCanvasElement>('#scene-canvas');
const clock = (): string => element('.clock__time').textContent ?? '';
const frameStatus = (): string | undefined => element('#scene-frame').dataset['status'];

function chooseDetail(level: string): void {
  const detail = element<HTMLSelectElement>('#quality-select');
  detail.value = level;
  detail.dispatchEvent(new Event('change'));
}

describe('document before the script runs', () => {
  beforeAll(() => {
    const parsed = new DOMParser().parseFromString(indexHtml, 'text/html');
    document.body.innerHTML = parsed.body.innerHTML;
  });

  it('announces no loading', () => {
    const status = element('#scene-status');
    expect(status.hidden).toBe(true);
    expect(status.textContent).toBe('');
    expect(document.body.textContent).not.toContain('Loading');
  });

  it('offers no 3D view to operate and no empty toolbar content', () => {
    for (const name of ['tabindex', 'role', 'aria-roledescription', 'aria-describedby']) {
      expect(canvas().hasAttribute(name), name).toBe(false);
    }
    expect(element('#camera-root').childNodes).toHaveLength(0);
  });
});

describe('application', () => {
  const replaceState = vi.spyOn(history, 'replaceState');
  /** The view that the application draws with, once a start has delivered one. */
  let inUse: FakeView | undefined;
  const viewInUse = (): FakeView => {
    if (inUse === undefined) {
      throw new Error('No view is in use.');
    }
    return inUse;
  };

  beforeAll(async () => {
    await import('../main.ts');
  });

  it('turns the canvas into the 3D view and says that the scene is loading', () => {
    expect(canvas().getAttribute('role')).toBe('application');
    expect(canvas().getAttribute('tabindex')).toBe('0');
    expect(canvas().getAttribute('aria-describedby')).toBe('scene-description camera-help');
    expect(document.getElementById('camera-help')).not.toBeNull();
    expect(element('#scene-status').hidden).toBe(false);
    expect(element('#scene-status').textContent).toBe('Loading the 3D scene…');
    expect(frameStatus()).toBe('loading');
  });

  it('starts the scene once, with the renderer of the address, on the canvas of the document', async () => {
    await until(() => starts.length === 1, 'the first start is asked for');
    expect(start(0).options.renderer).toBe('auto');
    expect(start(0).options.canvas).toBe(canvas());
  });

  it('falls back to WebGL 2 on a fresh canvas that keeps the focus', async () => {
    const first = canvas();
    first.focus();
    start(0).fail(new Error('no WebGPU'));
    await until(() => starts.length === 2, 'the second start is asked for');
    expect(start(1).options.renderer).toBe('webgl2');
    expect(start(1).options.canvas).toBe(canvas());
    expect(canvas()).not.toBe(first);
    expect(first.isConnected).toBe(false);
    expect(document.activeElement).toBe(canvas());
    expect(frameStatus()).toBe('loading');
  });

  it('draws with the view once it is ready and reports its frame on the canvas', async () => {
    inUse = start(1).succeed();
    await until(() => frameStatus() === 'ready', 'the scene is ready');
    expect(element('#scene-status').hidden).toBe(true);
    await until(() => canvas().dataset['renderedTime'] === '4800', 'the frame is reported');
    expect(canvas().dataset['backend']).toBe('webgl2');
    expect(viewInUse().frames.at(-1)?.cameraMode).toBe('orbit');
  });

  it('leaves the renderer of the fallback out of the address', async () => {
    await until(
      () => location.search === '?t=01:00:00&camera=orbit&rate=60',
      'the address is written',
    );
    await wait(600);
    expect(location.search).toBe('?t=01:00:00&camera=orbit&rate=60');
  });

  it('keeps the keys of the 3D view working on the fresh canvas', () => {
    canvas().dispatchEvent(new KeyboardEvent('keydown', { code: 'Period', bubbles: true }));
    expect(clock()).toBe('1:01 a.m.');
    canvas().dispatchEvent(new KeyboardEvent('keydown', { code: 'Comma', bubbles: true }));
    expect(clock()).toBe('1:00 a.m.');
  });

  it('writes the address a few times during a long run of seeks and ends on the last instant', async () => {
    await wait(600);
    replaceState.mockClear();
    for (let step = 0; step < 240; step += 1) {
      button('Back 1 min').click();
    }
    for (let step = 0; step < 30; step += 1) {
      button('Forward 1 min').click();
    }
    expect(clock()).toBe('12:10 a.m.');
    await until(() => location.search.startsWith('?t=00:10:00'), 'the last instant is written');
    await wait(600);
    expect(replaceState.mock.calls.length).toBeLessThanOrEqual(3);
    expect(location.search).toBe('?t=00:10:00&camera=orbit&rate=60');
  });

  it('keeps seeking, announcing and playing when the browser refuses to write the address', async () => {
    await wait(600);
    replaceState.mockImplementation(() => {
      throw new DOMException('Too many calls to history.replaceState.', 'SecurityError');
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      for (let step = 0; step < 5; step += 1) {
        button('Forward 1 min').click();
      }
      expect(clock()).toBe('12:15 a.m.');
      expect(replaceState).toHaveBeenCalled();
      await until(
        () => (element('#announcer').textContent ?? '').startsWith('12:15 a.m.'),
        'the instant reached by seeking is announced',
      );
      button('Play').click();
      await until(() => clock() !== '12:15 a.m.', 'time moves');
      await wait(700);
      button('Pause').click();
      const paused = clock();
      expect(paused).not.toBe('12:15 a.m.');
      expect(warn).toHaveBeenCalledWith(
        'The address of the page could not be updated.',
        expect.any(DOMException),
      );
    } finally {
      replaceState.mockRestore();
      warn.mockRestore();
    }
  });

  it('passes one step to the view per click of a step button and draws a frame', async () => {
    const view = viewInUse();
    const frames = view.frames.length;
    button('Turn right').click();
    button('Zoom in').click();
    expect(view.steps).toEqual(['turn-right', 'zoom-in']);
    await until(() => view.frames.length > frames, 'a frame is drawn');
  });

  it('uses the last of two starts whichever is ready first, and disposes of the other views', async () => {
    const previous = viewInUse();
    chooseDetail('low');
    chooseDetail('high');
    await until(() => starts.length === 4, 'both starts are asked for');
    expect(previous.disposed).toBe(true);
    expect(start(2).options.renderer).toBe('webgl2');
    expect(start(3).options.renderer).toBe('webgl2');
    expect(start(3).options.canvas).toBe(canvas());
    expect(start(2).options.canvas).not.toBe(canvas());
    const last = start(3).succeed();
    inUse = last;
    await until(() => frameStatus() === 'ready', 'the scene is ready again');
    const stale = start(2).succeed();
    await until(() => stale.disposed, 'the view of the abandoned start is disposed of');
    expect(last.disposed).toBe(false);
    expect(frameStatus()).toBe('ready');
    button('Turn left').click();
    expect(last.steps).toEqual(['turn-left']);
    expect(stale.steps).toEqual([]);
    await until(() => location.search.endsWith('&quality=high'), 'the address carries the detail');
    expect(location.search).not.toContain('renderer=');
  });

  it('says that a file is missing, tries no other renderer and moves the focus to the main content', async () => {
    const previous = viewInUse();
    chooseDetail('medium');
    await until(() => starts.length === 5, 'the next start is asked for');
    expect(previous.disposed).toBe(true);
    canvas().focus();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      start(4).fail(new SceneResourceError('The star catalogue could not be loaded (HTTP 503).'));
      await until(() => frameStatus() === 'failed', 'the scene has failed');
    } finally {
      warn.mockRestore();
    }
    const status = element('#scene-status');
    expect(status.hidden).toBe(false);
    expect(status.textContent).toContain('A file that the 3D scene needs could not be loaded.');
    expect(status.textContent).not.toContain('on this device');
    expect(document.activeElement).toBe(element('#main'));
    await wait(50);
    expect(starts).toHaveLength(5);
  });
});
