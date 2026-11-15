import { LEGAL_NOTICE_PATH, navigation } from '../config/navigation.ts';
import { site } from '../config/site.ts';
import { h, type Markup } from './html.ts';

/**
 * Header shared by every page: the name of the site and the menu. `currentPath` is the
 * root-relative address of the page being rendered; its menu entry is marked as current.
 */
export function renderSiteHeader(currentPath: string): Markup {
  const current = (href: string): 'page' | undefined => (href === currentPath ? 'page' : undefined);
  return h(
    'header',
    { class: 'app-header' },
    h('p', { class: 'site-title' }, h('a', { href: '/', 'aria-current': current('/') }, site.name)),
    h('p', { class: 'site-tagline' }, 'The sinking of RMS Titanic, 14–15 April 1912'),
    h(
      'nav',
      { class: 'site-nav', 'aria-label': 'Site' },
      h(
        'ul',
        { class: 'site-nav__list' },
        navigation.map((item) =>
          h('li', {}, h('a', { href: item.href, 'aria-current': current(item.href) }, item.label)),
        ),
      ),
    ),
  );
}

/** Footer shared by every page: a line on the subject, the Legal Notice and the contact address. */
export function renderSiteFooter(): Markup {
  return h(
    'footer',
    { class: 'app-footer' },
    h(
      'p',
      {},
      'A sober, source-backed reconstruction. About 1,500 people died that night. ',
      h('a', { href: LEGAL_NOTICE_PATH }, 'Legal Notice'),
      ' · ',
      h('a', { href: `mailto:${site.contactEmail}` }, site.contactEmail),
    ),
  );
}
