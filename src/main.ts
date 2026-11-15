import './styles/main.css';
import { createAddressWriter } from './app/addressWriter.ts';
import { type AppState, DEFAULT_RATE, type PanelTab, type SceneFailure } from './app/appState.ts';
import { advancePlayback, seekBy } from './app/playback.ts';
import { createSceneSession } from './app/sceneSession.ts';
import { createStore } from './app/store.ts';
import { formatUrlState, parseUrlState } from './app/urlState.ts';
import { dataset } from './data/dataset.ts';
import { QUALITY_SETTINGS } from './render/quality.ts';
import type { SceneView } from './render/sceneView.ts';
import { createTimelineModel, type ShipState } from './sim/timelineModel.ts';
import { createAnnouncer, instantAnnouncementText } from './ui/announcer.ts';
import { createCameraPanel } from './ui/cameraPanel.ts';
import { requireElement, setText } from './ui/dom.ts';
import { createNarrativePanel } from './ui/narrativePanel.ts';
import { createNowPanel } from './ui/nowPanel.ts';
import { activateSceneCanvas, keepFocusThrough, replaceSceneCanvas } from './ui/sceneCanvas.ts';
import { createSourcesPanel } from './ui/sourcesPanel.ts';
import { describeScene } from './ui/stateText.ts';
import { createTabs } from './ui/tabs.ts';
import { createTimelinePanel } from './ui/timelinePanel.ts';

/** Shortest time between two rewrites of the page address, in milliseconds. */
const URL_UPDATE_INTERVAL_MS = 500;
/** Delay before a position reached by seeking is announced, in milliseconds. */
const SEEK_ANNOUNCEMENT_DELAY_MS = 700;
const CANVAS_STEP_SECONDS = 60;

const LOADING_MESSAGE = 'Loading the 3D scene…';
const TEXT_ALTERNATIVE_MESSAGE =
  'The Now and Narrative tabs describe every moment of the night in words.';
const FAILURE_MESSAGES: Readonly<Record<SceneFailure, string>> = {
  renderer: `The 3D scene could not be started on this device. ${TEXT_ALTERNATIVE_MESSAGE}`,
  resources: `A file that the 3D scene needs could not be loaded. Reloading the page may help. ${TEXT_ALTERNATIVE_MESSAGE}`,
};

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
  sceneFailure: null,
  backend: null,
  quality: url.quality,
  reducedMotion: reducedMotionQuery.matches,
});

const main = requireElement('main');
const sceneFrame = requireElement<HTMLDivElement>('scene-frame');
const sceneStatus = requireElement<HTMLParagraphElement>('scene-status');
const sceneDescription = requireElement<HTMLParagraphElement>('scene-description');
const announcer = createAnnouncer(requireElement('announcer'), model.events);

let needsRender = true;

/**
 * Asks for the scene to be drawn again. The frame of the scene says, in `data-up-to-date`,
 * whether the image on the canvas shows everything asked for so far.
 */
function requestFrame(): void {
  needsRender = true;
  sceneFrame.dataset['upToDate'] = 'false';
}
/** The view that is drawing a frame, if any. */
let drawingView: SceneView | undefined;
let seekAnnouncement: number | undefined;

const seek = (t: number): void => {
  store.update({ t: Math.min(Math.max(t, bounds.startSeconds), bounds.endSeconds) });
  window.clearTimeout(seekAnnouncement);
  seekAnnouncement = window.setTimeout(() => {
    if (!store.get().playing) {
      const reached = store.get().t;
      announcer.say(instantAnnouncementText(reached, describeScene(model.evaluate(reached))));
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

const nowPanel = createNowPanel(dataset, model, seek);
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
  {
    selectMode: (cameraMode) => store.update({ cameraMode }),
    step: (step) => {
      session.view()?.stepCamera(step);
      requestFrame();
    },
    reset: () => {
      session.view()?.resetCamera();
      requestFrame();
    },
    selectQuality: (quality) => store.update({ quality }),
  },
  { helpOpen: false },
);
requireElement('camera-root').replaceChildren(cameraPanel.element);

let shipState: ShipState = model.evaluate(store.get().t);

const updateInterface = (): void => {
  const app = store.get();
  timelinePanel.update(app, shipState);
  cameraPanel.update(app.cameraMode, app.quality);
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
        ? LOADING_MESSAGE
        : FAILURE_MESSAGES[app.sceneFailure ?? 'renderer'],
    );
  }
};

/** Keeps the address on the state of the page; it carries the renderer that the user asked for. */
const address = createAddressWriter({
  intervalMs: URL_UPDATE_INTERVAL_MS,
  format: () =>
    formatUrlState(store.get(), { renderer: url.renderer, quality: store.get().quality }),
  write: (query) => history.replaceState(null, '', query),
  onRefused: (error) => console.warn('The address of the page could not be updated.', error),
});

addEventListener('pagehide', () => address.flush());

store.subscribe((state, previous) => {
  if (state.t !== previous.t) {
    shipState = model.evaluate(state.t);
  }
  requestFrame();
  updateInterface();
  if (state.quality !== previous.quality) {
    // The level of detail is fixed when the scene is built.
    session.start();
  }
  address.request();
});

reducedMotionQuery.addEventListener('change', (event) =>
  store.update({ reducedMotion: event.matches }),
);

/** Replaces the canvas by a fresh one: a canvas keeps the kind of context it was first given. */
const renewCanvas = (): HTMLCanvasElement => {
  const fresh = replaceSceneCanvas(requireElement<HTMLCanvasElement>('scene-canvas'));
  attachCanvasShortcuts(fresh);
  return fresh;
};

const resizeView = (): void => {
  const canvas = requireElement<HTMLCanvasElement>('scene-canvas');
  session
    .view()
    ?.resize(
      canvas.clientWidth,
      canvas.clientHeight,
      Math.min(devicePixelRatio, QUALITY_SETTINGS[store.get().quality].maxPixelRatio),
    );
  requestFrame();
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

/** True once a start of the scene has been given the canvas of the document. */
let canvasUsed = false;

/**
 * The starts of the 3D scene. The first one draws on the canvas of the document and each later
 * one on a fresh canvas. When the scene has failed the page stays usable through its text, and
 * the focus moves from the canvas, which is then hidden, to the main content.
 */
const session = createSceneSession<SceneView>({
  requested: url.renderer,
  create: async (renderer, onDeviceLost) => {
    const canvas = canvasUsed ? renewCanvas() : requireElement<HTMLCanvasElement>('scene-canvas');
    canvasUsed = true;
    const { createSceneView } = await import('./render/sceneView.ts');
    return createSceneView({
      canvas,
      dataset,
      model,
      renderer,
      quality: store.get().quality,
      onDeviceLost,
    });
  },
  onChange: (state) => {
    if (state.status === 'ready') {
      resizeView();
      store.update({ sceneStatus: 'ready', sceneFailure: null, backend: state.backend });
    } else if (state.status === 'loading') {
      store.update({ sceneStatus: 'loading', sceneFailure: null, backend: null });
    } else {
      keepFocusThrough(sceneFrame, main, () =>
        store.update({ sceneStatus: 'failed', sceneFailure: state.failure, backend: null }),
      );
    }
  },
  onStartFailure: (error) => console.warn('The 3D scene could not start.', error),
});

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
  const view = session.view();
  if (view !== undefined && drawingView !== view && (needsRender || view.hasPendingInput())) {
    needsRender = false;
    drawingView = view;
    const renderedState = shipState;
    const current = store.get();
    // Read before the frame is drawn: the frame then shows what was loaded at that moment.
    const assetsSettled = view.assetsSettled();
    const shipModel = view.shipModel();
    void view
      .render({
        state: renderedState,
        cameraMode: current.cameraMode,
        deltaSeconds: elapsedSeconds,
        timeScale: current.playing ? current.rate : 1,
        reducedMotion: current.reducedMotion,
      })
      .then(
        () => {
          // A frame of a view that has been replaced is not on the canvas of the document.
          if (session.view() !== view) {
            return;
          }
          const canvas = requireElement<HTMLCanvasElement>('scene-canvas');
          canvas.dataset['renderedTime'] = String(Math.round(renderedState.t));
          canvas.dataset['backend'] = view.backend;
          canvas.dataset['assets'] = assetsSettled ? 'ready' : 'loading';
          canvas.dataset['shipModel'] = shipModel;
        },
        (error: unknown) => {
          // A view disposed of while it was drawing fails that frame; no one is waiting for it.
          if (session.view() === view) {
            console.error('The 3D scene could not draw a frame.', error);
          }
        },
      )
      .finally(() => {
        if (drawingView === view) {
          drawingView = undefined;
        }
        if (session.view() === view && !needsRender && !view.hasPendingInput()) {
          sceneFrame.dataset['upToDate'] = 'true';
        }
      });
  }
  requestAnimationFrame(frame);
};

const initialCanvas = requireElement<HTMLCanvasElement>('scene-canvas');
activateSceneCanvas(initialCanvas, '3D view of the ship', ['scene-description', 'camera-help']);
attachCanvasShortcuts(initialCanvas);
updateInterface();
requestAnimationFrame(frame);
session.start();
