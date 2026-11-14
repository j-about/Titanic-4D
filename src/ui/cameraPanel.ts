import type { CameraMode } from '../render/camera/cameraPose.ts';
import { el } from './dom.ts';

export interface CameraPanel {
  readonly element: HTMLElement;
  update(mode: CameraMode): void;
}

const CAMERA_LABELS: Readonly<Record<CameraMode, string>> = {
  guided: 'Guided tour',
  orbit: 'Around the ship',
  deck: 'On the bridge',
  underwater: 'Below the surface',
  free: 'Free camera',
};

const CAMERA_HELP: Readonly<Record<CameraMode, string>> = {
  guided: 'The camera follows the night by itself.',
  orbit:
    'Drag, or use the arrow keys, to turn around the ship. Scroll, pinch, or press plus and minus, to zoom.',
  deck: 'Drag, or use the arrow keys, to look around from the starboard wing of the bridge.',
  underwater:
    'Drag, or use the arrow keys, to turn around the hull below the surface. Scroll, pinch, or press plus and minus, to zoom.',
  free: 'Drag, or use the arrow keys, to look. Press W, A, S and D to move, Q and E to go down and up; hold Shift to move faster.',
};

/** Creates the choice of camera, the reset button and the help text for the chosen camera. */
export function createCameraPanel(
  onSelect: (mode: CameraMode) => void,
  onReset: () => void,
): CameraPanel {
  const select = el(
    'select',
    { id: 'camera-select', class: 'select' },
    (Object.keys(CAMERA_LABELS) as CameraMode[]).map((mode) =>
      el('option', { value: mode, text: CAMERA_LABELS[mode] }),
    ),
  );
  const help = el('p', { id: 'camera-help', class: 'camera__help' });
  select.setAttribute('aria-describedby', 'camera-help');
  const reset = el('button', { type: 'button', class: 'button', text: 'Reset view' });
  select.addEventListener('change', () => onSelect(select.value as CameraMode));
  reset.addEventListener('click', onReset);

  const element = el('div', { class: 'camera' }, [
    el('div', { class: 'field' }, [
      el('label', { class: 'field__label', for: 'camera-select', text: 'View' }),
      select,
    ]),
    reset,
    help,
  ]);

  const update = (mode: CameraMode): void => {
    if (select.value !== mode) {
      select.value = mode;
    }
    if (help.textContent !== CAMERA_HELP[mode]) {
      help.textContent = CAMERA_HELP[mode];
    }
  };

  return { element, update };
}
