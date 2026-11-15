import type { Plugin } from 'vite';
import { renderSiteFooter, renderSiteHeader } from '../src/pages/layout.ts';
import { renderPageHead, renderSitemap, staticPages } from '../src/pages/registry.ts';

const SLOT_PATTERN = /<!--@([a-z-]+)-->/g;

/** Root-relative address of a page from the path of its HTML file. */
function pagePath(htmlPath: string): string {
  return htmlPath.replace(/index\.html$/, '');
}

/**
 * Vite plugin that fills the slots of the HTML documents at build time and in development:
 * `<!--@site-header-->` and `<!--@site-footer-->` in every document, `<!--@page-head-->` and
 * `<!--@page-content-->` in the documents of the static pages. It also writes `sitemap.xml`.
 */
export function staticPagesPlugin(): Plugin {
  return {
    name: 'titanic-4d:static-pages',
    transformIndexHtml: {
      order: 'pre',
      handler(html, context) {
        const path = pagePath(context.path);
        const page = staticPages.find((candidate) => candidate.path === path);
        return html.replace(SLOT_PATTERN, (_slot, name: string) => {
          switch (name) {
            case 'site-header':
              return renderSiteHeader(path).markup;
            case 'site-footer':
              return renderSiteFooter().markup;
            case 'page-head':
            case 'page-content': {
              if (page === undefined) {
                throw new Error(`No static page is registered for "${path}".`);
              }
              return name === 'page-head' ? renderPageHead(page).markup : page.render().markup;
            }
            default:
              throw new Error(`Unknown slot "${name}" in "${context.path}".`);
          }
        });
      },
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: renderSitemap() });
    },
  };
}
