import { legalNotice, type TelephoneNumber } from '../config/legal.ts';
import { type Child, h, type Markup } from './html.ts';

/** One line of the notice: its label as a heading, followed by its value. */
function item(label: string, value: Child): Markup {
  return h('div', { class: 'notice-item' }, h('h3', {}, `${label}:`), ' ', value);
}

function telephone(number: TelephoneNumber): Markup {
  return h('p', {}, h('a', { href: `tel:${number.dial}` }, number.display));
}

/** Renders the Legal Notice from the configuration. */
export function renderLegalNotice(notice: typeof legalNotice = legalNotice): Markup {
  const { owner, host } = notice;
  return h(
    'article',
    { class: 'prose' },
    h('h1', {}, notice.title),
    h(
      'section',
      { 'aria-labelledby': 'website-owner' },
      h('h2', { id: 'website-owner' }, owner.heading),
      item('Name', h('p', {}, owner.name)),
      item('Address', h('address', {}, owner.address)),
      item('Email', h('p', {}, h('a', { href: `mailto:${owner.email}` }, owner.email))),
      item('Phone', telephone(owner.phone)),
      item('RCS', h('p', {}, owner.rcs)),
      item('SIREN', h('p', {}, owner.siren)),
    ),
    h(
      'section',
      { 'aria-labelledby': 'hosting-provider' },
      h('h2', { id: 'hosting-provider' }, host.heading),
      item('Company', h('p', {}, host.company)),
      item('Address', h('address', {}, host.address)),
      item('Phone', telephone(host.phone)),
    ),
  );
}
