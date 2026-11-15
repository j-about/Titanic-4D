import { describe, expect, it } from 'vitest';
import { textOf } from './html.ts';
import { renderLegalNotice } from './legalNotice.ts';

const page = renderLegalNotice();

describe('Legal Notice', () => {
  it('carries exactly the text supplied by the owner of the site', () => {
    expect(textOf(page)).toBe(
      [
        'Legal Notice',
        'Website Owner',
        'Name: Jonathan About',
        'Address: 11 Rue du Faubourg Saint Martin, 75010 Paris, France',
        'Email: contact@titanic-4d.org',
        'Phone: +33 1 83 64 45 80',
        'RCS: 835137456 R.C.S. Paris',
        'SIREN: 835137456',
        'Hosting Provider',
        'Company: OVH SAS',
        'Address: 2 Rue Kellermann, 59100 Roubaix, France',
        'Phone: +33 9 72 10 10 07',
      ].join(' '),
    );
  });

  it('links the telephone numbers and the address of contact', () => {
    expect(page.markup).toContain('<a href="tel:+33183644580">+33 1 83 64 45 80</a>');
    expect(page.markup).toContain('<a href="tel:+33972101007">+33 9 72 10 10 07</a>');
    expect(page.markup).toContain(
      '<a href="mailto:contact@titanic-4d.org">contact@titanic-4d.org</a>',
    );
  });

  it('marks up the two postal addresses as addresses', () => {
    expect(page.markup).toContain(
      '<address>11 Rue du Faubourg Saint Martin, 75010 Paris, France</address>',
    );
    expect(page.markup).toContain('<address>2 Rue Kellermann, 59100 Roubaix, France</address>');
  });

  it('has one main heading, two sections and a label heading for each line', () => {
    expect(page.markup.match(/<h1[ >]/g)).toHaveLength(1);
    expect(page.markup.match(/<h2[ >]/g)).toHaveLength(2);
    expect(page.markup.match(/<h3[ >]/g)).toHaveLength(9);
    expect(page.markup).not.toMatch(/<address>[^<]*<h/);
  });
});
