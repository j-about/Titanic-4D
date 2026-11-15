/** A way of supporting the project: a payment page hosted by Stripe. */
export interface SupportLink {
  readonly id: string;
  /** Text of the link. */
  readonly label: string;
  /** Words added to the label in the accessible name of the link. */
  readonly description: string;
  readonly url: string;
}

/**
 * Payment links offered on the About page. They are plain links to pages hosted by Stripe: the
 * site loads no script, frame or cookie from a third party.
 */
export const supportLinks: readonly SupportLink[] = [
  {
    id: 'eur-3',
    label: '€3',
    description: 'donation',
    url: 'https://buy.stripe.com/dRm8wO0NGaUTd1e8XW6Ri08',
  },
  {
    id: 'eur-5',
    label: '€5',
    description: 'donation',
    url: 'https://buy.stripe.com/14A8wO0NG6ED7GU3DC6Ri09',
  },
  {
    id: 'eur-10',
    label: '€10',
    description: 'donation',
    url: 'https://buy.stripe.com/28E5kC3ZSfb98KY2zy6Ri0a',
  },
  {
    id: 'custom',
    label: 'Custom amount',
    description: 'donation',
    url: 'https://buy.stripe.com/aFa5kCcwo1kjbXa2zy6Ri0b',
  },
];

/** Root-relative address of the section of the site that presents the links. */
export const SUPPORT_PATH = '/about/#support';
