/** Data attributes through which the scene reports what its latest frame shows. */
const FRAME_REPORT_ATTRIBUTES = ['renderedTime', 'backend', 'assets', 'shipModel'] as const;

/**
 * Turns the canvas of the document into the operable 3D view: a tab stop with the application
 * role, which makes assistive technology pass the arrow keys on to the camera, named and
 * described by the elements with the given ids.
 */
export function activateSceneCanvas(
  canvas: HTMLCanvasElement,
  label: string,
  descriptionIds: readonly string[],
): void {
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'application');
  canvas.setAttribute('aria-roledescription', '3D view');
  canvas.setAttribute('aria-label', label);
  canvas.setAttribute('aria-describedby', descriptionIds.join(' '));
}

/**
 * Replaces the canvas by a copy that has no rendering context yet and returns the copy. The
 * copy keeps the attributes of the canvas, except what the previous scene reported about its
 * frames, and takes the keyboard focus when the canvas had it.
 */
export function replaceSceneCanvas(current: HTMLCanvasElement): HTMLCanvasElement {
  const fresh = current.cloneNode(false) as HTMLCanvasElement;
  for (const name of FRAME_REPORT_ATTRIBUTES) {
    delete fresh.dataset[name];
  }
  const hadFocus = current.ownerDocument.activeElement === current;
  current.replaceWith(fresh);
  if (hadFocus) {
    fresh.focus({ preventScroll: true });
  }
  return fresh;
}

/**
 * Runs `change`, which may hide `element` or what it contains, and moves the keyboard focus to
 * `target` when the focus was on `element` or inside it before the change.
 */
export function keepFocusThrough(element: Element, target: HTMLElement, change: () => void): void {
  const hadFocus = element.contains(element.ownerDocument.activeElement);
  change();
  if (hadFocus) {
    target.focus({ preventScroll: true });
  }
}
