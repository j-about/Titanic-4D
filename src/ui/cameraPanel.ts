import type { CameraMode } from '../render/camera/cameraPose.ts';
import { QUALITY_LABELS, QUALITY_LEVELS, type QualityLevel } from '../render/quality.ts';
import { el } from './dom.ts';

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

const CAMERA_HELP: Readonly<Record<CameraMode, string>> = {
  guided: 'The camera follows the night by itself.',
  orbit:
    'Drag, or use the arrow keys, to turn around the ship. Scroll, pinch, or press plus and minus, to zoom.',
  deck: 'Drag, or use the arrow keys, to look around from the starboard wing of the bridge.',
  underwater:
    'Drag, or use the arrow keys, to turn around the hull below the surface. Scroll, pinch, or press plus and minus, to zoom.',
  free: 'Drag, or use the arrow keys, to look. Press W, A, S and D to move, Q and E to go down and up; hold Shift to move faster.',
};

/** Added to the help of every camera that can be steered. */
const GAMEPAD_HELP =
  ' With a gamepad: right stick to turn, triggers to zoom, left stick and bumpers to move the free camera.';

/**
 * Creates the choice of camera, the reset button, the choice of the level of detail and the help
 * text for the chosen camera.
 */
export function createCameraPanel(
  onSelect: (mode: CameraMode) => void,
  onReset: () => void,
  onQuality: (quality: QualityLevel) => void,
): CameraPanel {
  const quality = el(
    'select',
    { id: 'quality-select', class: 'select' },
    QUALITY_LEVELS.map((level) => el('option', { value: level, text: QUALITY_LABELS[level] })),
  );
  quality.addEventListener('change', () => onQuality(quality.value as QualityLevel));
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
    el('div', { class: 'field' }, [
      el('label', { class: 'field__label', for: 'quality-select', text: 'Detail' }),
      quality,
    ]),
    help,
  ]);

  const update = (mode: CameraMode, level: QualityLevel): void => {
    if (select.value !== mode) {
      select.value = mode;
    }
    if (quality.value !== level) {
      quality.value = level;
    }
    const text = mode === 'guided' ? CAMERA_HELP[mode] : `${CAMERA_HELP[mode]}${GAMEPAD_HELP}`;
    if (help.textContent !== text) {
      help.textContent = text;
    }
  };

  return { element, update };
}
