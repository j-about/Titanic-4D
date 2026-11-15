import type { CameraMode } from '../render/camera/cameraPose.ts';
import { CAMERA_STEPS_BY_MODE, type CameraStep } from '../render/camera/cameraStep.ts';
import { QUALITY_LABELS, QUALITY_LEVELS, type QualityLevel } from '../render/quality.ts';
import { el, icon } from './dom.ts';

export interface CameraPanelActions {
  selectMode(mode: CameraMode): void;
  /** Called once for each activation of a step button. */
  step(step: CameraStep): void;
  reset(): void;
  selectQuality(quality: QualityLevel): void;
}

export interface CameraPanelOptions {
  /** Whether the help text is shown when the panel is created; the user can open and close it. */
  readonly helpOpen: boolean;
}

export interface CameraPanel {
  readonly element: HTMLElement;
  update(mode: CameraMode, quality: QualityLevel): void;
}

const CAMERA_LABELS: Readonly<Record<CameraMode, string>> = {
  guided: 'Guided tour',
  orbit: 'Around the ship',
  deck: 'On the bridge',
  underwater: 'Below the surface',
  free: 'Free camera',
};

/** Step buttons in the order they are shown, with their visible name and their icon. */
const STEP_BUTTONS: readonly {
  readonly step: CameraStep;
  readonly label: string;
  readonly iconPath: string;
}[] = [
  { step: 'turn-left', label: 'Turn left', iconPath: 'M15 5v14l-9-7z' },
  { step: 'turn-right', label: 'Turn right', iconPath: 'M9 5v14l9-7z' },
  { step: 'tilt-up', label: 'Tilt up', iconPath: 'M5 15h14l-7-9z' },
  { step: 'tilt-down', label: 'Tilt down', iconPath: 'M5 9h14l-7 9z' },
  { step: 'zoom-in', label: 'Zoom in', iconPath: 'M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z' },
  { step: 'zoom-out', label: 'Zoom out', iconPath: 'M5 11h14v2H5z' },
  { step: 'move-forward', label: 'Move forward', iconPath: 'M12 3l7 8H5zM12 12l7 8H5z' },
  { step: 'move-back', label: 'Move back', iconPath: 'M5 4h14l-7 8zM5 13h14l-7 8z' },
];

const CAMERA_HELP: Readonly<Record<CameraMode, string>> = {
  guided: 'The camera follows the night by itself.',
  orbit:
    'Drag, or use the arrow keys, to turn around the ship. Scroll, pinch, or press plus and minus, to zoom. The Turn, Tilt and Zoom buttons do the same one step at a time.',
  deck: 'Drag, or use the arrow keys, to look around from the starboard wing of the bridge. The Turn and Tilt buttons do the same one step at a time.',
  underwater:
    'Drag, or use the arrow keys, to turn around the hull below the surface. Scroll, pinch, or press plus and minus, to zoom. The Turn, Tilt and Zoom buttons do the same one step at a time.',
  free: 'Drag, or use the arrow keys, to look. Press W, A, S and D to move, Q and E to go down and up; hold Shift to move faster. The Turn, Tilt and Move buttons look around and move forward and back one step at a time.',
};

/** Added to the help of every camera that can be steered. */
const GAMEPAD_HELP =
  ' With a gamepad: right stick to turn, triggers to zoom, left stick and bumpers to move the free camera.';

/** Added to the help of every camera: the keys that move time while the 3D view has the focus. */
const TIME_KEYS_HELP =
  ' While the 3D view has the focus, Space plays or pauses, and comma and full stop step one minute back and forward.';

/** Help text shown for a camera mode. */
export function cameraHelp(mode: CameraMode): string {
  return `${CAMERA_HELP[mode]}${mode === 'guided' ? '' : GAMEPAD_HELP}${TIME_KEYS_HELP}`;
}

/**
 * Creates the choice of camera, the buttons that move the camera one step per activation, the
 * reset button, the choice of the level of detail and a disclosure holding the help text for the
 * chosen camera. The step buttons are shown for the steps that the chosen camera carries out.
 */
export function createCameraPanel(
  actions: CameraPanelActions,
  options: CameraPanelOptions,
): CameraPanel {
  const quality = el(
    'select',
    { id: 'quality-select', class: 'select' },
    QUALITY_LEVELS.map((level) => el('option', { value: level, text: QUALITY_LABELS[level] })),
  );
  quality.addEventListener('change', () => actions.selectQuality(quality.value as QualityLevel));
  const select = el(
    'select',
    { id: 'camera-select', class: 'select' },
    (Object.keys(CAMERA_LABELS) as CameraMode[]).map((mode) =>
      el('option', { value: mode, text: CAMERA_LABELS[mode] }),
    ),
  );
  const help = el('p', { id: 'camera-help', class: 'camera__help' });
  const helpBox = el('details', { class: 'camera__help-box', open: options.helpOpen }, [
    el('summary', { text: 'Controls of the 3D view' }),
    help,
  ]);
  select.setAttribute('aria-describedby', 'camera-help');
  const reset = el('button', { type: 'button', class: 'button', text: 'Reset view' });
  select.addEventListener('change', () => actions.selectMode(select.value as CameraMode));
  reset.addEventListener('click', () => actions.reset());

  const stepButtons = STEP_BUTTONS.map(({ step, label, iconPath }) => {
    const button = el('button', { type: 'button', class: 'button camera__step' }, [
      icon(iconPath),
      el('span', { class: 'visually-hidden', text: label }),
    ]);
    button.dataset['step'] = step;
    button.addEventListener('click', () => actions.step(step));
    return { step, button };
  });
  const steps = el(
    'div',
    { class: 'camera__steps', role: 'group', 'aria-label': 'Move the camera' },
    stepButtons.map(({ button }) => button),
  );

  const element = el('div', { class: 'camera' }, [
    el('div', { class: 'field' }, [
      el('label', { class: 'field__label', for: 'camera-select', text: 'View' }),
      select,
    ]),
    el('div', { class: 'field' }, [
      el('label', { class: 'field__label', for: 'quality-select', text: 'Detail' }),
      quality,
    ]),
    steps,
    reset,
    helpBox,
  ]);

  const update = (mode: CameraMode, level: QualityLevel): void => {
    if (select.value !== mode) {
      select.value = mode;
    }
    if (quality.value !== level) {
      quality.value = level;
    }
    const offered = CAMERA_STEPS_BY_MODE[mode];
    steps.hidden = offered.length === 0;
    for (const { step, button } of stepButtons) {
      button.hidden = !offered.includes(step);
    }
    const text = cameraHelp(mode);
    if (help.textContent !== text) {
      help.textContent = text;
    }
  };

  return { element, update };
}
