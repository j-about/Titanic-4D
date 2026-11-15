import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LEGAL_NOTICE_PATH, navigation } from '../config/navigation.ts';
import { SUPPORT_PATH } from '../config/support.ts';
import { renderSiteFooter, renderSiteHeader } from './layout.ts';
import { renderPageHead, renderSitemap, sitePaths, staticPages } from './registry.ts';

const root = join(import.meta.dirname, '..', '..');

describe('static pages', () => {
  it('each have a document, a title, a description and a canonical address', () => {
    for (const page of staticPages) {
      expect(existsSync(join(root, page.path, 'index.html')), page.path).toBe(true);
      const head = renderPageHead(page).markup;
      expect(head).toContain(`<title>${page.title} — Titanic 4D</title>`);
      expect(head).toContain(
        `<link rel="canonical" href="https://www.titanic-4d.org${page.path}">`,
      );
      expect(page.description.length).toBeGreaterThan(20);
    }
  });

  it('are all listed in the site map with the reconstruction, on the canonical origin', () => {
    const sitemap = renderSitemap();
    for (const path of sitePaths) {
      expect(sitemap).toContain(`<loc>https://www.titanic-4d.org${path}</loc>`);
    }
    expect(sitemap.match(/<url>/g)).toHaveLength(staticPages.length + 1);
  });
});

describe('site menu and footer', () => {
  it('offer every page, the support section and the Legal Notice', () => {
    const hrefs = navigation.map((item) => item.href);
    expect(hrefs).toEqual(expect.arrayContaining(['/', ...staticPages.map((page) => page.path)]));
    expect(navigation.find((item) => item.href === SUPPORT_PATH)?.label).toBe('Support Titanic 4D');
    expect(navigation.find((item) => item.href === LEGAL_NOTICE_PATH)?.label).toBe('Legal Notice');
  });

  it('mark the current page only', () => {
    const header = renderSiteHeader('/about/').markup;
    expect(header.match(/aria-current="page"/g)).toHaveLength(1);
    expect(header).toContain('<a href="/about/" aria-current="page">About</a>');
  });

  it('link the Legal Notice and the contact address from the footer', () => {
    const footer = renderSiteFooter().markup;
    expect(footer).toContain('<a href="/legal-notice/">Legal Notice</a>');
    expect(footer).toContain('href="mailto:contact@titanic-4d.org"');
  });
});
