import { describe, expect, it } from 'vitest';
import { supportLinks } from '../config/support.ts';
import { dataset } from '../data/dataset.ts';
import { renderAbout, renderSupport } from './about.ts';
import { textOf } from './html.ts';

const EXPECTED_LINKS = [
  ['€3', 'https://buy.stripe.com/dRm8wO0NGaUTd1e8XW6Ri08'],
  ['€5', 'https://buy.stripe.com/14A8wO0NG6ED7GU3DC6Ri09'],
  ['€10', 'https://buy.stripe.com/28E5kC3ZSfb98KY2zy6Ri0a'],
  ['Custom amount', 'https://buy.stripe.com/aFa5kCcwo1kjbXa2zy6Ri0b'],
] as const;

/** Anchors of a piece of markup, as their opening tag and their content. */
function anchors(markup: string): { readonly tag: string; readonly content: string }[] {
  return [...markup.matchAll(/<a ([^>]*)>(.*?)<\/a>/g)].map((match) => ({
    tag: match[1] ?? '',
    content: match[2] ?? '',
  }));
}

describe('support links', () => {
  it('are the four payment links, in order, with their labels', () => {
    expect(supportLinks.map((link) => [link.label, link.url])).toEqual(EXPECTED_LINKS);
  });

  it('are rendered as plain links that open a new tab without access to the opener', () => {
    const rendered = anchors(renderSupport().markup);
    expect(rendered).toHaveLength(EXPECTED_LINKS.length);
    rendered.forEach((anchor, index) => {
      const [label, url] = EXPECTED_LINKS[index] ?? ['', ''];
      expect(anchor.tag).toContain(`href="${url}"`);
      expect(anchor.tag).toContain('target="_blank"');
      expect(anchor.tag).toContain('rel="noopener"');
      expect(anchor.content.startsWith(label)).toBe(true);
      expect(anchor.content).toContain('opens in a new tab');
    });
  });

  it('say what a donation pays for and what it is not', () => {
    const text = textOf(renderSupport());
    expect(text).toContain('hosting and its further development');
    expect(text).toContain('not a charitable gift');
    expect(text).toContain('no part of it goes to the families');
  });

  it('load nothing from the payment provider', () => {
    const { markup } = renderSupport();
    expect(markup).not.toMatch(/<script|<iframe|<img|<form/);
  });
});

describe('About page', () => {
  const page = renderAbout(dataset);

  it('has one main heading and carries the support section and the contact address', () => {
    expect(page.markup.match(/<h1[ >]/g)).toHaveLength(1);
    expect(page.markup).toContain('id="support"');
    expect(page.markup).toContain('href="mailto:contact@titanic-4d.org"');
  });

  it('states the number of sources of the dataset', () => {
    expect(textOf(page)).toContain(`draws on ${dataset.sources.sources.length} sources`);
  });
});
