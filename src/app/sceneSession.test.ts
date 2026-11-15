import { describe, expect, it } from 'vitest';
import { SceneResourceError } from '../render/sceneResourceError.ts';
import type { RenderBackend, RendererChoice } from '../render/sceneView.ts';
import { createSceneSession, type SceneSessionState } from './sceneSession.ts';
import { formatUrlState } from './urlState.ts';

interface FakeView {
  readonly backend: RenderBackend;
  readonly id: number;
  disposed: boolean;
  dispose(): void;
}

interface Start {
  readonly renderer: RendererChoice;
  readonly loseDevice: () => void;
  /** Completes the creation with a view and returns it. */
  succeed(): FakeView;
  fail(error: unknown): void;
}

/** A session whose views are created by hand, in the order the test chooses. */
function setUp(requested: RendererChoice = 'auto') {
  const starts: Start[] = [];
  const states: SceneSessionState[] = [];
  const failures: unknown[] = [];
  const views: FakeView[] = [];
  const session = createSceneSession<FakeView>({
    requested,
    create: (renderer, loseDevice) =>
      new Promise<FakeView>((resolve, reject) => {
        starts.push({
          renderer,
          loseDevice,
          succeed() {
            const view: FakeView = {
              backend: renderer === 'webgl2' ? 'webgl2' : 'webgpu',
              id: views.length,
              disposed: false,
              dispose() {
                this.disposed = true;
              },
            };
            views.push(view);
            resolve(view);
            return view;
          },
          fail: reject,
        });
      }),
    onChange: (state) => {
      states.push(state);
    },
    onStartFailure: (error) => {
      failures.push(error);
    },
  });
  const start = (index: number): Start => {
    const found = starts[index];
    if (found === undefined) {
      throw new RangeError(`Start ${index} has not been asked for.`);
    }
    return found;
  };
  return { session, starts, start, states, failures, views };
}

/** Lets the promise reactions of the session run. */
const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

describe('scene session', () => {
  it('starts with the requested renderer and reports the view once it is ready', async () => {
    const { session, start, starts, states } = setUp('webgpu-readback');
    session.start();
    expect(starts.map((entry) => entry.renderer)).toEqual(['webgpu-readback']);
    expect(session.view()).toBeUndefined();
    const view = start(0).succeed();
    await settle();
    expect(session.view()).toBe(view);
    expect(states).toEqual([{ status: 'loading' }, { status: 'ready', backend: 'webgpu' }]);
  });

  it('keeps the later of two starts whichever completes first, and disposes of the other', async () => {
    for (const order of [
      [0, 1],
      [1, 0],
    ] as const) {
      const { session, start, states } = setUp();
      session.start();
      session.start();
      const created = new Map<number, FakeView>();
      for (const index of order) {
        created.set(index, start(index).succeed());
        await settle();
      }
      expect(session.view()).toBe(created.get(1));
      expect(created.get(0)?.disposed).toBe(true);
      expect(created.get(1)?.disposed).toBe(false);
      expect(states.filter((state) => state.status === 'ready')).toHaveLength(1);
      expect(states.at(-1)).toEqual({ status: 'ready', backend: 'webgpu' });
    }
  });

  it('starts again even when the view in use cannot be disposed of cleanly', async () => {
    const { session, start, starts, states, failures } = setUp();
    session.start();
    const view = start(0).succeed();
    await settle();
    const refusal = new Error('dispose failed');
    view.dispose = () => {
      throw refusal;
    };
    session.start();
    expect(failures).toEqual([refusal]);
    expect(starts).toHaveLength(2);
    expect(session.view()).toBeUndefined();
    const next = start(1).succeed();
    await settle();
    expect(session.view()).toBe(next);
    expect(states.at(-1)).toEqual({ status: 'ready', backend: 'webgpu' });
  });

  it('disposes of the view in use when the scene is started again', async () => {
    const { session, start } = setUp();
    session.start();
    const first = start(0).succeed();
    await settle();
    session.start();
    expect(first.disposed).toBe(true);
    expect(session.view()).toBeUndefined();
    const second = start(1).succeed();
    await settle();
    expect(session.view()).toBe(second);
  });

  it('ignores the failure of a start that has been replaced', async () => {
    const { session, start, starts, states, failures } = setUp();
    session.start();
    session.start();
    const view = start(1).succeed();
    await settle();
    start(0).fail(new Error('first start failed late'));
    await settle();
    expect(session.view()).toBe(view);
    expect(view.disposed).toBe(false);
    expect(starts).toHaveLength(2);
    expect(failures).toEqual([]);
    expect(states.at(-1)).toEqual({ status: 'ready', backend: 'webgpu' });
  });

  it('ignores the loss of the device of a view that has been replaced', async () => {
    const { session, start, starts } = setUp();
    session.start();
    start(0).succeed();
    await settle();
    session.start();
    const view = start(1).succeed();
    await settle();
    start(0).loseDevice();
    expect(session.view()).toBe(view);
    expect(view.disposed).toBe(false);
    expect(starts).toHaveLength(2);
  });

  it('falls back to WebGL 2 when the renderer cannot start', async () => {
    const { session, start, starts, states, failures } = setUp();
    session.start();
    const error = new Error('no adapter');
    start(0).fail(error);
    await settle();
    expect(failures).toEqual([error]);
    expect(starts.map((entry) => entry.renderer)).toEqual(['auto', 'webgl2']);
    const view = start(1).succeed();
    await settle();
    expect(session.view()).toBe(view);
    expect(states).toEqual([
      { status: 'loading' },
      { status: 'loading' },
      { status: 'ready', backend: 'webgl2' },
    ]);
  });

  it('falls back to WebGL 2 when the device is lost, and disposes of the view that lost it', async () => {
    const { session, start, starts } = setUp();
    session.start();
    const first = start(0).succeed();
    await settle();
    start(0).loseDevice();
    expect(first.disposed).toBe(true);
    expect(session.view()).toBeUndefined();
    expect(starts.map((entry) => entry.renderer)).toEqual(['auto', 'webgl2']);
  });

  it('disposes of a view delivered after its device was lost during the creation', async () => {
    const { session, start } = setUp();
    session.start();
    start(0).loseDevice();
    const late = start(0).succeed();
    await settle();
    expect(late.disposed).toBe(true);
    expect(session.view()).toBeUndefined();
    const view = start(1).succeed();
    await settle();
    expect(session.view()).toBe(view);
  });

  it('fails for want of a renderer when WebGL 2 cannot start either', async () => {
    const { session, start, starts, states } = setUp();
    session.start();
    start(0).fail(new Error('no WebGPU'));
    await settle();
    start(1).fail(new Error('no WebGL 2'));
    await settle();
    expect(starts).toHaveLength(2);
    expect(session.view()).toBeUndefined();
    expect(states.at(-1)).toEqual({ status: 'failed', failure: 'renderer' });
  });

  it('fails for want of a renderer when WebGL 2 loses its device', async () => {
    const { session, start, states } = setUp('webgl2');
    session.start();
    const view = start(0).succeed();
    await settle();
    start(0).loseDevice();
    expect(view.disposed).toBe(true);
    expect(session.view()).toBeUndefined();
    expect(states.at(-1)).toEqual({ status: 'failed', failure: 'renderer' });
  });

  it('does not try another renderer when a file of the scene cannot be loaded', async () => {
    const { session, start, starts, states, failures } = setUp();
    session.start();
    const error = new SceneResourceError('The star catalogue could not be loaded (HTTP 503).');
    start(0).fail(error);
    await settle();
    expect(starts.map((entry) => entry.renderer)).toEqual(['auto']);
    expect(failures).toEqual([error]);
    expect(states.at(-1)).toEqual({ status: 'failed', failure: 'resources' });
  });

  it('tries the same renderer again after a file could not be loaded', async () => {
    const { session, start, starts } = setUp();
    session.start();
    start(0).fail(new SceneResourceError('unreachable'));
    await settle();
    session.start();
    expect(starts.map((entry) => entry.renderer)).toEqual(['auto', 'auto']);
  });

  it('stays on WebGL 2 for the later starts once it has fallen back', async () => {
    const { session, start, starts } = setUp('webgpu-readback');
    session.start();
    start(0).fail(new Error('no WebGPU'));
    await settle();
    start(1).succeed();
    await settle();
    session.start();
    expect(starts.map((entry) => entry.renderer)).toEqual(['webgpu-readback', 'webgl2', 'webgl2']);
  });

  it('leaves the requested renderer, and so the address, as they were after a fallback', async () => {
    const options = { requested: 'auto' as RendererChoice };
    const address = (): string =>
      formatUrlState(
        { t: 3600, cameraMode: 'orbit', rate: 60 },
        { renderer: options.requested, quality: 'medium' },
      );
    const before = address();
    const starts: RendererChoice[] = [];
    const session = createSceneSession({
      ...options,
      create: (renderer) => {
        starts.push(renderer);
        return renderer === 'webgl2'
          ? Promise.resolve({ backend: 'webgl2' as const, dispose: () => undefined })
          : Promise.reject(new Error('no WebGPU'));
      },
      onChange: () => undefined,
      onStartFailure: () => undefined,
    });
    session.start();
    await settle();
    await settle();
    expect(starts).toEqual(['auto', 'webgl2']);
    expect(session.view()?.backend).toBe('webgl2');
    expect(address()).toBe(before);
    expect(before).not.toContain('renderer=');
  });
});
