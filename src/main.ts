import './styles/main.css';
import { type AppState, DEFAULT_RATE, type PanelTab } from './app/appState.ts';
import { advancePlayback, seekBy } from './app/playback.ts';
import { createStore } from './app/store.ts';
import { formatUrlState, parseUrlState } from './app/urlState.ts';
import { dataset } from './data/dataset.ts';
import type { RendererChoice, SceneView } from './render/sceneView.ts';
import { createTimelineModel, type ShipState } from './sim/timelineModel.ts';
import { formatShipClock } from './time/shipTime.ts';
import { createAnnouncer } from './ui/announcer.ts';
import { createCameraPanel } from './ui/cameraPanel.ts';
import { requireElement, setText } from './ui/dom.ts';
import { createNarrativePanel } from './ui/narrativePanel.ts';
import { createNowPanel } from './ui/nowPanel.ts';
import { createSourcesPanel } from './ui/sourcesPanel.ts';
import { describeScene } from './ui/stateText.ts';
import { createTabs } from './ui/tabs.ts';
import { createTimelinePanel } from './ui/timelinePanel.ts';

/** Greatest device pixel ratio used for the drawing buffer. */
const MAX_PIXEL_RATIO = 2;
/** Interval between rewrites of the page address while time is moving, in milliseconds. */
const URL_UPDATE_INTERVAL_MS = 500;
/** Delay before a position reached by seeking is announced, in milliseconds. */
const SEEK_ANNOUNCEMENT_DELAY_MS = 700;
const CANVAS_STEP_SECONDS = 60;

const model = createTimelineModel(dataset);
const bounds = { startSeconds: model.startSeconds, endSeconds: model.endSeconds };
const url = parseUrlState(location.search, model.endSeconds);
const reducedMotionQuery = matchMedia('(prefers-reduced-motion: reduce)');

const store = createStore<AppState>({
  t: url.t ?? model.startSeconds,
  playing: false,
  rate: url.rate ?? DEFAULT_RATE,
  direction: 1,
  cameraMode: url.cameraMode ?? 'guided',
  panelTab: 'now',
  sceneStatus: 'loading',
  backend: null,
  reducedMotion: reducedMotionQuery.matches,
});

const sceneFrame = requireElement<HTMLDivElement>('scene-frame');
const sceneStatus = requireElement<HTMLParagraphElement>('scene-status');
const sceneDescription = requireElement<HTMLParagraphElement>('scene-description');
const announcer = createAnnouncer(requireElement('announcer'), model.events);

let view: SceneView | undefined;
let rendererChoice: RendererChoice = url.renderer;
let needsRender = true;
let rendering = false;
let seekAnnouncement: number | undefined;

const seek = (t: number): void => {
  store.update({ t: Math.min(Math.max(t, bounds.startSeconds), bounds.endSeconds) });
  window.clearTimeout(seekAnnouncement);
  seekAnnouncement = window.setTimeout(() => {
    if (!store.get().playing) {
      announcer.say(
        `${formatShipClock(store.get().t)}. ${describeScene(model.evaluate(store.get().t))}`,
      );
    }
  }, SEEK_ANNOUNCEMENT_DELAY_MS);
};

const togglePlaying = (): void => {
  const state = store.get();
  const atEnd =
    state.direction === 1 ? state.t >= bounds.endSeconds : state.t <= bounds.startSeconds;
  if (!state.playing && atEnd) {
    // Playing from an end of the timeline starts again from the other end.
    store.update({
      t: state.direction === 1 ? bounds.startSeconds : bounds.endSeconds,
      playing: true,
    });
    return;
  }
  store.update({ playing: !state.playing });
};

const timelinePanel = createTimelinePanel(model, {
  seek,
  seekBy: (delta) => seek(seekBy(store.get().t, delta, bounds)),
  togglePlaying,
  setDirection: (direction) => store.update({ direction }),
  setRate: (rate) => store.update({ rate }),
});
requireElement('timeline-root').replaceChildren(timelinePanel.element);

const nowPanel = createNowPanel(model, seek);
const sourcesPanel = createSourcesPanel(dataset, model);
const narrativePanel = createNarrativePanel(model, seek);
const tabs = createTabs<PanelTab>(
  'panel',
  'Description of the scene',
  [
    { id: 'now', label: 'Now', panel: nowPanel.element },
    { id: 'sources', label: 'Sources', panel: sourcesPanel.element },
    { id: 'narrative', label: 'Narrative', panel: narrativePanel.element },
  ],
  (panelTab) => store.update({ panelTab }),
);
requireElement('panel-root').replaceChildren(tabs.element);
tabs.select(store.get().panelTab);

const cameraPanel = createCameraPanel(
  (cameraMode) => store.update({ cameraMode }),
  () => {
    view?.resetCamera();
    needsRender = true;
  },
);
requireElement('camera-root').replaceChildren(cameraPanel.element);

let shipState: ShipState = model.evaluate(store.get().t);

const updateInterface = (): void => {
  const app = store.get();
  timelinePanel.update(app, shipState);
  cameraPanel.update(app.cameraMode);
  setText(sceneDescription, describeScene(shipState));
  if (app.panelTab === 'now') {
    nowPanel.update(shipState);
  } else if (app.panelTab === 'sources') {
    sourcesPanel.update(shipState);
  } else {
    narrativePanel.update(shipState, app.playing);
  }
  sceneFrame.dataset['status'] = app.sceneStatus;
  sceneFrame.dataset['reducedMotion'] = String(app.reducedMotion);
  if (app.sceneStatus === 'ready') {
    sceneStatus.hidden = true;
  } else {
    sceneStatus.hidden = false;
    setText(
      sceneStatus,
      app.sceneStatus === 'loading'
        ? 'Loading the 3D scene…'
        : 'The 3D scene could not be started on this device. The Now and Narrative tabs describe every moment of the night in words.',
    );
  }
};

let lastUrlUpdateMs = 0;
const updateAddress = (nowMs: number, force: boolean): void => {
  if (!force && nowMs - lastUrlUpdateMs < URL_UPDATE_INTERVAL_MS) {
    return;
  }
  lastUrlUpdateMs = nowMs;
  history.replaceState(null, '', formatUrlState(store.get(), rendererChoice));
};

store.subscribe((state, previous) => {
  if (state.t !== previous.t) {
    shipState = model.evaluate(state.t);
  }
  needsRender = true;
  updateInterface();
  const moving = state.playing && previous.playing;
  updateAddress(performance.now(), !moving);
});

reducedMotionQuery.addEventListener('change', (event) =>
  store.update({ reducedMotion: event.matches }),
);

/** Replaces the canvas by a fresh one: a canvas keeps the kind of context it was first given. */
const renewCanvas = (): HTMLCanvasElement => {
  const current = requireElement<HTMLCanvasElement>('scene-canvas');
  const fresh = current.cloneNode(false) as HTMLCanvasElement;
  current.replaceWith(fresh);
  attachCanvasShortcuts(fresh);
  return fresh;
};

const resizeView = (): void => {
  const canvas = requireElement<HTMLCanvasElement>('scene-canvas');
  view?.resize(
    canvas.clientWidth,
    canvas.clientHeight,
    Math.min(devicePixelRatio, MAX_PIXEL_RATIO),
  );
  needsRender = true;
};

/** Keys handled while the 3D view has the focus, besides those of the camera. */
function attachCanvasShortcuts(canvas: HTMLCanvasElement): void {
  canvas.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }
    if (event.code === 'Space') {
      event.preventDefault();
      togglePlaying();
    } else if (event.code === 'Comma' || event.code === 'Period') {
      event.preventDefault();
      seek(
        seekBy(
          store.get().t,
          event.code === 'Comma' ? -CANVAS_STEP_SECONDS : CANVAS_STEP_SECONDS,
          bounds,
        ),
      );
    }
  });
}

/**
 * Starts the 3D scene. If the chosen renderer cannot start or loses its graphics device, the
 * scene is started again with the WebGL 2 backend; if that fails too, the page stays usable
 * through its text.
 */
async function startScene(choice: RendererChoice, canvas: HTMLCanvasElement): Promise<void> {
  rendererChoice = choice;
  const fallBack = (): void => {
    view?.dispose();
    view = undefined;
    if (choice === 'webgl2') {
      store.update({ sceneStatus: 'failed', backend: null });
    } else {
      store.update({ sceneStatus: 'loading', backend: null });
      void startScene('webgl2', renewCanvas());
    }
  };
  try {
    const { createSceneView } = await import('./render/sceneView.ts');
    view = await createSceneView({
      canvas,
      dataset,
      model,
      renderer: choice,
      onDeviceLost: fallBack,
    });
    resizeView();
    store.update({ sceneStatus: 'ready', backend: view.backend });
  } catch (error) {
    console.warn('The 3D scene could not start with this renderer.', error);
    fallBack();
  }
}

new ResizeObserver(resizeView).observe(sceneFrame);

let lastFrameMs = performance.now();
const frame = (nowMs: number): void => {
  const elapsedSeconds = (nowMs - lastFrameMs) / 1000;
  lastFrameMs = nowMs;
  const app = store.get();
  if (app.playing) {
    const step = advancePlayback(app.t, elapsedSeconds, app.rate, app.direction, bounds);
    announcer.playbackAdvanced(app.t, step.t, app.rate, nowMs);
    store.update({ t: step.t, playing: step.playing });
  }
  if (view !== undefined && !rendering && (needsRender || view.hasPendingInput())) {
    needsRender = false;
    rendering = true;
    const renderedState = shipState;
    const current = store.get();
    void view
      .render({
        state: renderedState,
        cameraMode: current.cameraMode,
        deltaSeconds: elapsedSeconds,
        reducedMotion: current.reducedMotion,
      })
      .then(() => {
        const canvas = requireElement<HTMLCanvasElement>('scene-canvas');
        canvas.dataset['renderedTime'] = String(Math.round(renderedState.t));
        canvas.dataset['backend'] = view?.backend ?? '';
      })
      .finally(() => {
        rendering = false;
      });
  }
  requestAnimationFrame(frame);
};

attachCanvasShortcuts(requireElement<HTMLCanvasElement>('scene-canvas'));
updateInterface();
requestAnimationFrame(frame);
void startScene(url.renderer, requireElement<HTMLCanvasElement>('scene-canvas'));
