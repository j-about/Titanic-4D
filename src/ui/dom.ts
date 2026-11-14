/** Attributes and properties accepted when creating an element. */
export type ElementOptions = Readonly<Record<string, string | number | boolean | undefined>>;

type Child = Node | string | null | undefined;

/**
 * Creates an element. Options are set as attributes; `true` sets an empty attribute and `false`
 * or `undefined` leaves it out. The `text` option sets the text content.
 */
export function el<Tag extends keyof HTMLElementTagNameMap>(
  tag: Tag,
  options: ElementOptions = {},
  children: readonly Child[] = [],
): HTMLElementTagNameMap[Tag] {
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(options)) {
    if (value === undefined || value === false) {
      continue;
    }
    if (name === 'text') {
      element.textContent = String(value);
    } else {
      element.setAttribute(name, value === true ? '' : String(value));
    }
  }
  for (const child of children) {
    if (child !== null && child !== undefined) {
      element.append(child);
    }
  }
  return element;
}

/** Sets the text of an element only when it differs, to avoid needless layout and announcements. */
export function setText(element: Element, text: string): void {
  if (element.textContent !== text) {
    element.textContent = text;
  }
}

/** Sets or removes an attribute only when its value differs. */
export function setAttribute(element: Element, name: string, value: string | null): void {
  if (element.getAttribute(name) !== value) {
    if (value === null) {
      element.removeAttribute(name);
    } else {
      element.setAttribute(name, value);
    }
  }
}

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

/** Creates a decorative 24×24 icon from SVG path data. */
export function icon(pathData: string): SVGSVGElement {
  const svg = document.createElementNS(SVG_NAMESPACE, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.classList.add('icon');
  const path = document.createElementNS(SVG_NAMESPACE, 'path');
  path.setAttribute('d', pathData);
  path.setAttribute('fill', 'currentColor');
  svg.append(path);
  return svg;
}

/** Returns the element with the given id, or throws if the document does not contain it. */
export function requireElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (element === null) {
    throw new Error(`The document has no element with id "${id}".`);
  }
  return element as T;
}
