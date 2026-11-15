import { SceneResourceError } from '../render/sceneResourceError.ts';
import type { RenderBackend, RendererChoice } from '../render/sceneView.ts';
import type { SceneFailure } from './appState.ts';

/** What the session needs from a view of the scene. */
export interface SessionView {
  readonly backend: RenderBackend;
  dispose(): void;
}

export type SceneSessionState =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly backend: RenderBackend }
  | { readonly status: 'failed'; readonly failure: SceneFailure };

export interface SceneSessionOptions<View extends SessionView> {
  /** Renderer asked for by the user. The session never changes it. */
  readonly requested: RendererChoice;
  /**
   * Creates a view drawn with the given renderer. `onDeviceLost` is to be called when the
   * renderer loses its graphics device, during the creation or at any time afterwards.
   */
  create(renderer: RendererChoice, onDeviceLost: () => void): Promise<View>;
  /** Called at each change of state, after the view returned by `view()` has changed. */
  onChange(state: SceneSessionState): void;
  /** Called with the reason why a start did not succeed. */
  onStartFailure(error: unknown): void;
}

export interface SceneSession<View extends SessionView> {
  /** The view in use; `undefined` while the scene is loading or has failed. */
  view(): View | undefined;
  /**
   * Starts the scene, or starts it again: the view in use is disposed of and a start still in
   * progress is abandoned, its view being disposed of as soon as it exists.
   */
  start(): void;
}

/**
 * Runs the starts of the 3D scene so that one view at most is in use and every other view is
 * disposed of. If the renderer cannot start or loses its graphics device, the scene is started
 * again with the WebGL 2 backend, which then serves the later starts too; if that fails as well,
 * or if a file that the scene needs cannot be loaded, the session ends in the `failed` state.
 */
export function createSceneSession<View extends SessionView>(
  options: SceneSessionOptions<View>,
): SceneSession<View> {
  let current: View | undefined;
  /** Renderer of the start in progress or of the view in use. */
  let effective: RendererChoice = options.requested;
  /** Number of the latest start; an earlier start finds a higher number when it completes. */
  let generation = 0;

  const release = (): void => {
    const view = current;
    current = undefined;
    try {
      view?.dispose();
    } catch (error) {
      // The view is given up whatever its disposal did; the next start must still be made.
      options.onStartFailure(error);
    }
  };

  const fail = (failure: SceneFailure): void => {
    release();
    options.onChange({ status: 'failed', failure });
  };

  const begin = (renderer: RendererChoice): void => {
    generation += 1;
    const own = generation;
    effective = renderer;
    release();
    options.onChange({ status: 'loading' });

    const fallBack = (): void => {
      if (own !== generation) {
        return;
      }
      if (renderer === 'webgl2') {
        // Ends this start: a view that it still delivers is disposed of.
        generation += 1;
        fail('renderer');
      } else {
        begin('webgl2');
      }
    };

    options.create(renderer, fallBack).then(
      (view) => {
        if (own !== generation) {
          view.dispose();
          return;
        }
        current = view;
        options.onChange({ status: 'ready', backend: view.backend });
      },
      (error: unknown) => {
        if (own !== generation) {
          return;
        }
        options.onStartFailure(error);
        if (error instanceof SceneResourceError) {
          generation += 1;
          fail('resources');
        } else {
          fallBack();
        }
      },
    );
  };

  return {
    view: () => current,
    start: () => begin(effective),
  };
}
