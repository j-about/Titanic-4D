import { site } from '../config/site.ts';
import { type SupportLink, supportLinks } from '../config/support.ts';
import type { Dataset } from '../data/schema/dataset.ts';
import { CERTAINTY_DESCRIPTIONS, CERTAINTY_LABELS } from '../ui/stateText.ts';
import { h, type Markup } from './html.ts';

/** Words announcing, in the accessible name of a link, that it opens a new tab. */
const NEW_TAB_NOTICE = 'opens in a new tab';

/**
 * A link to a payment page. Its accessible name is its visible label followed by what it is and
 * by the notice that it opens a new tab.
 */
function supportLink(link: SupportLink): Markup {
  return h(
    'a',
    {
      class: 'support__link',
      href: link.url,
      target: '_blank',
      rel: 'noopener',
      'data-support-link': link.id,
    },
    link.label,
    h('span', { class: 'visually-hidden' }, ` ${link.description}, ${NEW_TAB_NOTICE}`),
  );
}

/** Renders the section that presents the ways of supporting the project. */
export function renderSupport(links: readonly SupportLink[] = supportLinks): Markup {
  return h(
    'section',
    { id: 'support', class: 'support', 'aria-labelledby': 'support-heading', tabindex: '-1' },
    h('h2', { id: 'support-heading' }, `Support ${site.name}`),
    h(
      'p',
      {},
      `${site.name} is free to use and carries no advertising. A donation helps to pay for its `,
      'hosting and its further development. It is a contribution to the project itself: it is ',
      'not a charitable gift and no part of it goes to the families of those who died.',
    ),
    h(
      'ul',
      { class: 'support__links' },
      links.map((link) => h('li', {}, supportLink(link))),
    ),
    h(
      'p',
      { class: 'support__note' },
      'Each amount opens a payment page hosted by Stripe in a new tab. This site sets no cookie ',
      'and loads nothing from Stripe.',
    ),
  );
}

/** Renders the About page. */
export function renderAbout(dataset: Dataset): Markup {
  const sourceCount = dataset.sources.sources.length;
  return h(
    'article',
    { class: 'prose' },
    h('h1', {}, `About ${site.name}`),
    h(
      'p',
      {},
      `${site.name} is an interactive reconstruction of the sinking of RMS Titanic on the night `,
      'of 14–15 April 1912. It can be explored in space, around, above and below the ship, and ',
      'in time, from the collision with the iceberg at 11:40 p.m. to the foundering at 2:20 a.m., ',
      'then down to the two sections of the wreck on the seabed.',
    ),
    h(
      'p',
      {},
      'About 1,500 people died that night. The reconstruction shows the ship, the sea and the ',
      'sky. It does not depict the people aboard and it has no sound.',
    ),
    h('h2', {}, 'How it is made'),
    h(
      'p',
      {},
      'Everything shown is computed from a set of dated records: the attitude of the hull, the ',
      'water in each compartment, the lifeboats, the distress signals, the lighting, the ',
      'break-up. Every record names its sources and carries one of three levels of certainty:',
    ),
    h(
      'ul',
      {},
      (['established', 'estimated', 'debated'] as const).map((level) =>
        h(
          'li',
          {},
          h('strong', {}, CERTAINTY_LABELS[level]),
          `: ${CERTAINTY_DESCRIPTIONS[level].toLowerCase()}.`,
        ),
      ),
    ),
    h(
      'p',
      {},
      'Where the sources disagree, on the number of lives lost for instance, or on the ',
      'distance of the SS Californian, the competing positions are kept side by side instead of ',
      'being settled arbitrarily. The scene at any instant depends on that instant alone, so ',
      'the night can be played forward, backward or at any speed and always shows the same ',
      'thing at the same time.',
    ),
    h(
      'p',
      {},
      "Times are ship's time, 2 h 02 min ahead of New York time and 2 h 58 min behind ",
      'Greenwich Mean Time. The sky is computed for the date, the hour and the place from a ',
      'star catalogue and an ephemeris; the Moon was below the horizon all night.',
    ),
    h('h2', {}, 'What is not a historical record'),
    h(
      'p',
      {},
      'Some of what the scene shows is not in the sources and is drawn for want of anything ',
      'better: the exact shape of the iceberg, the detail of the deckhouses, the paths of the ',
      'lifeboats once they had left the ship, the height reached by the distress signals. The ',
      'break-up follows the reconstruction published by the Marine Forensics Panel of the ',
      'Society of Naval Architects and Marine Engineers, which its authors do not present as ',
      'proven. The "Sources" tab of the reconstruction says, for each instant, what is ',
      'established, what is estimated and what is debated.',
    ),
    h('h2', {}, 'Sources'),
    h(
      'p',
      {},
      `The dataset draws on ${sourceCount} sources: the reports and testimony of the British `,
      'and American inquiries of 1912, later forensic studies and surveys of the wreck. ',
      h('a', { href: '/narrative/' }, 'The night in words'),
      ' tells the whole night in text, with the sources of each event. The data, the code and ',
      'the method are published in the ',
      h('a', { href: site.repositoryUrl }, 'project repository'),
      '.',
    ),
    renderSupport(),
    h('h2', {}, 'Contact'),
    h(
      'p',
      {},
      'Corrections and questions are welcome at ',
      h('a', { href: `mailto:${site.contactEmail}` }, site.contactEmail),
      '.',
    ),
  );
}
