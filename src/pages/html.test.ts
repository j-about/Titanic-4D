import { describe, expect, it } from 'vitest';
import { escapeHtml, fragment, h, textOf } from './html.ts';

describe('HTML builder', () => {
  it('escapes text and attribute values', () => {
    expect(h('p', { title: 'a "b" <c>' }, '1 < 2 & 3').markup).toBe(
      '<p title="a &quot;b&quot; &lt;c&gt;">1 &lt; 2 &amp; 3</p>\n',
    );
    expect(escapeHtml("it's")).toBe('it&#39;s');
  });

  it('inserts markup as it is and flattens lists of children', () => {
    const items = ['a', 'b'].map((label) => h('li', {}, label));
    expect(h('ul', {}, items, null, false).markup).toBe('<ul><li>a</li>\n<li>b</li>\n</ul>\n');
    expect(fragment(h('b', {}, 'x'), ' y').markup).toBe('<b>x</b> y');
  });

  it('writes boolean attributes without a value and omits absent ones', () => {
    expect(h('span', { hidden: true, inert: false, id: undefined }).markup).toBe(
      '<span hidden></span>',
    );
  });

  it('does not close void elements', () => {
    expect(h('meta', { charset: 'utf-8' }).markup).toBe('<meta charset="utf-8">\n');
    expect(h('br').markup).toBe('<br>');
  });

  it('gives the text of a piece of markup', () => {
    expect(textOf(h('p', {}, 'Tom ', h('em', {}, '& Jerry')))).toBe('Tom & Jerry');
  });
});
