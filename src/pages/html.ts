/**
 * Minimal builder of HTML text for the pages generated at build time. Text and attribute values
 * are escaped; only `Markup` objects, which this module produces, are inserted as they are.
 */
export interface Markup {
  readonly markup: string;
}

export type Child = Markup | string | null | undefined | false | readonly Child[];

export type Attributes = Readonly<Record<string, string | boolean | undefined>>;

const VOID_ELEMENTS: ReadonlySet<string> = new Set(['br', 'hr', 'img', 'link', 'meta']);

/** Elements that end a line in the generated text: blocks, list items, table parts and metadata. */
const LINE_ENDING_ELEMENTS: ReadonlySet<string> = new Set([
  'address',
  'article',
  'caption',
  'details',
  'div',
  'footer',
  'h1',
  'h2',
  'h3',
  'header',
  'li',
  'link',
  'meta',
  'nav',
  'ol',
  'p',
  'section',
  'summary',
  'table',
  'tbody',
  'td',
  'th',
  'thead',
  'title',
  'tr',
  'ul',
]);

const ESCAPES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (character) => ESCAPES[character] ?? character);
}

function isMarkup(child: Child): child is Markup {
  return typeof child === 'object' && child !== null && 'markup' in child;
}

function renderChild(child: Child): string {
  if (child === null || child === undefined || child === false) {
    return '';
  }
  if (typeof child === 'string') {
    return escapeHtml(child);
  }
  if (isMarkup(child)) {
    return child.markup;
  }
  return child.map(renderChild).join('');
}

/** Joins children without a wrapping element. */
export function fragment(...children: readonly Child[]): Markup {
  return { markup: children.map(renderChild).join('') };
}

/**
 * Creates an element. An attribute set to `true` is written without a value; `false` and
 * `undefined` leave it out. Block-level elements are followed by a line break, so that the
 * generated document reads line by line and its text content keeps words apart.
 */
export function h(tag: string, attributes: Attributes = {}, ...children: readonly Child[]): Markup {
  const written = Object.entries(attributes)
    .filter(([, value]) => value !== undefined && value !== false)
    .map(([name, value]) =>
      value === true ? ` ${name}` : ` ${name}="${escapeHtml(String(value))}"`,
    )
    .join('');
  const lineEnd = LINE_ENDING_ELEMENTS.has(tag) ? '\n' : '';
  if (VOID_ELEMENTS.has(tag)) {
    return { markup: `<${tag}${written}>${lineEnd}` };
  }
  return {
    markup: `<${tag}${written}>${children.map(renderChild).join('')}</${tag}>${lineEnd}`,
  };
}

/** Text of a piece of markup with the tags removed and white space collapsed, for tests. */
export function textOf(markup: Markup): string {
  return markup.markup
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
