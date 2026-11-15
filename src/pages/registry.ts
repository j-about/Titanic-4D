import { canonicalUrl, site } from '../config/site.ts';
import { dataset } from '../data/dataset.ts';
import { createTimelineModel } from '../sim/timelineModel.ts';
import { renderAbout } from './about.ts';
import { fragment, h, type Markup } from './html.ts';
import { renderLegalNotice } from './legalNotice.ts';
import { renderNarrative } from './narrative.ts';

/** A page generated at build time: plain HTML that needs neither scripts nor the 3D scene. */
export interface StaticPage {
  /** Root-relative address, with a trailing slash. */
  readonly path: string;
  readonly title: string;
  readonly description: string;
  render(): Markup;
}

export const staticPages: readonly StaticPage[] = [
  {
    path: '/narrative/',
    title: 'The night in words',
    description:
      'The sinking of RMS Titanic told in text, event by event, with times, levels of certainty and sources.',
    render: () => renderNarrative(dataset, createTimelineModel(dataset)),
  },
  {
    path: '/about/',
    title: `About ${site.name}`,
    description: `What ${site.name} is, how it is made from sourced records, its limits, and how to support it.`,
    render: () => renderAbout(dataset),
  },
  {
    path: '/legal-notice/',
    title: 'Legal Notice',
    description: `Owner and hosting provider of ${site.name}.`,
    render: () => renderLegalNotice(),
  },
];

/** Addresses listed in the site map: the reconstruction and every static page. */
export const sitePaths: readonly string[] = ['/', ...staticPages.map((page) => page.path)];

/** Elements of the document head that differ from page to page. */
export function renderPageHead(page: StaticPage): Markup {
  const title = `${page.title} — ${site.name}`;
  const url = canonicalUrl(page.path);
  return fragment(
    h('title', {}, title),
    h('meta', { name: 'description', content: page.description }),
    h('link', { rel: 'canonical', href: url }),
    h('meta', { property: 'og:type', content: 'website' }),
    h('meta', { property: 'og:site_name', content: site.name }),
    h('meta', { property: 'og:title', content: title }),
    h('meta', { property: 'og:description', content: page.description }),
    h('meta', { property: 'og:url', content: url }),
    h('meta', { property: 'og:locale', content: 'en_GB' }),
  );
}

/** The site map, in the format of sitemaps.org. */
export function renderSitemap(): string {
  const entries = sitePaths
    .map((path) => `  <url><loc>${canonicalUrl(path)}</loc></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}
