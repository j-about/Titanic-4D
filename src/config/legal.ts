import { site } from './site.ts';

/** A telephone number as it is displayed and as it is dialled. */
export interface TelephoneNumber {
  readonly display: string;
  /** Number in international format without spaces, for a `tel:` link. */
  readonly dial: string;
}

/**
 * Content of the Legal Notice page. The page is generated from this object alone, so that each
 * value is written once.
 */
export const legalNotice = {
  title: 'Legal Notice',
  owner: {
    heading: 'Website Owner',
    name: 'Jonathan About',
    address: '11 Rue du Faubourg Saint Martin, 75010 Paris, France',
    email: site.contactEmail,
    phone: { display: '+33 1 83 64 45 80', dial: '+33183644580' },
    rcs: '835137456 R.C.S. Paris',
    siren: '835137456',
  },
  host: {
    heading: 'Hosting Provider',
    company: 'OVH SAS',
    address: '2 Rue Kellermann, 59100 Roubaix, France',
    phone: { display: '+33 9 72 10 10 07', dial: '+33972101007' },
  },
} as const satisfies {
  readonly title: string;
  readonly owner: {
    readonly heading: string;
    readonly name: string;
    readonly address: string;
    readonly email: string;
    readonly phone: TelephoneNumber;
    readonly rcs: string;
    readonly siren: string;
  };
  readonly host: {
    readonly heading: string;
    readonly company: string;
    readonly address: string;
    readonly phone: TelephoneNumber;
  };
};
