import { expect, test } from '@playwright/test';
import { narrativeEventCount } from './app.ts';
import { findAccessibilityViolations } from './axe.ts';

const STATIC_PAGES = [
  { path: '/narrative/', heading: 'The night in words' },
  { path: '/about/', heading: 'About Titanic 4D' },
  { path: '/legal-notice/', heading: 'Legal Notice' },
] as const;

const LEGAL_NOTICE_TEXT = [
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
].join(' ');

const SUPPORT_LINKS = [
  {
    name: '€3 donation, opens in a new tab',
    url: 'https://buy.stripe.com/dRm8wO0NGaUTd1e8XW6Ri08',
  },
  {
    name: '€5 donation, opens in a new tab',
    url: 'https://buy.stripe.com/14A8wO0NG6ED7GU3DC6Ri09',
  },
  {
    name: '€10 donation, opens in a new tab',
    url: 'https://buy.stripe.com/28E5kC3ZSfb98KY2zy6Ri0a',
  },
  {
    name: 'Custom amount donation, opens in a new tab',
    url: 'https://buy.stripe.com/aFa5kCcwo1kjbXa2zy6Ri0b',
  },
] as const;

/** Smallest height of a target under WCAG 2.5.8, in CSS pixels. */
const WCAG_TARGET_MIN_PX = 24;

/** Text of an element with every run of white space reduced to one space. */
async function normalisedText(locator: import('@playwright/test').Locator): Promise<string> {
  return ((await locator.textContent()) ?? '').replace(/\s+/g, ' ').trim();
}

test.describe('static pages', () => {
  for (const { path, heading } of STATIC_PAGES) {
    test(`${path} has its heading, the site menu and the footer, and no accessibility violation`, async ({
      page,
    }) => {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
      const menu = page.getByRole('navigation', { name: 'Site' });
      await expect(menu.getByRole('link', { name: 'Support Titanic 4D' })).toHaveAttribute(
        'href',
        '/about/#support',
      );
      await expect(menu.locator('[aria-current="page"]')).toHaveCount(1);
      await expect(
        page.getByRole('contentinfo').getByRole('link', { name: 'Legal Notice' }),
      ).toHaveAttribute('href', '/legal-notice/');
      expect(await findAccessibilityViolations(page)).toEqual([]);
    });

    test(`${path} loads no script and reflows on a small screen`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 640 });
      await page.goto(path);
      await expect(page.locator('script')).toHaveCount(0);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
      expect(await findAccessibilityViolations(page)).toEqual([]);
    });
  }

  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 640, height: 400 },
    { width: 320, height: 640 },
  ]) {
    test(`gives every link that stands alone on its line a target of 24 CSS pixels, at ${viewport.width} px`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      /**
       * Links that are the only text of their parent and one of whose lines is lower than the
       * smallest target of WCAG 2.5.8, with every disclosure of the page open.
       */
      const lowLinksAloneOnTheirLine = (): Promise<string[]> =>
        page.evaluate((minimum) => {
          for (const disclosure of document.querySelectorAll('details')) {
            disclosure.open = true;
          }
          const text = (node: Element | null): string =>
            (node?.textContent ?? '').replace(/\s+/g, ' ').trim();
          return [...document.querySelectorAll<HTMLAnchorElement>('main a[href]')]
            .filter((link) => text(link.parentElement) === text(link))
            .filter((link) => [...link.getClientRects()].some((line) => line.height < minimum))
            .map((link) => text(link));
        }, WCAG_TARGET_MIN_PX);
      for (const path of ['/narrative/', '/about/', '/legal-notice/']) {
        await page.goto(path);
        expect(await lowLinksAloneOnTheirLine(), path).toEqual([]);
      }
      // The pages do hold such links: the test measures something.
      await expect(page.locator('.notice-item a')).toHaveCount(3);
    });
  }

  test('the skip link moves the focus to the content', async ({ page }) => {
    await page.goto('/about/');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to the content' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#main')).toBeFocused();
  });
});

test.describe('Legal Notice', () => {
  test('carries exactly the text supplied by the owner', async ({ page }) => {
    await page.goto('/legal-notice/');
    expect(await normalisedText(page.getByRole('main'))).toBe(LEGAL_NOTICE_TEXT);
  });

  test('links the telephone numbers and the contact address, and marks up the addresses', async ({
    page,
  }) => {
    await page.goto('/legal-notice/');
    const main = page.getByRole('main');
    await expect(main.getByRole('link', { name: '+33 1 83 64 45 80' })).toHaveAttribute(
      'href',
      'tel:+33183644580',
    );
    await expect(main.getByRole('link', { name: '+33 9 72 10 10 07' })).toHaveAttribute(
      'href',
      'tel:+33972101007',
    );
    await expect(main.getByRole('link', { name: 'contact@titanic-4d.org' })).toHaveAttribute(
      'href',
      'mailto:contact@titanic-4d.org',
    );
    await expect(main.locator('address')).toHaveText([
      '11 Rue du Faubourg Saint Martin, 75010 Paris, France',
      '2 Rue Kellermann, 59100 Roubaix, France',
    ]);
    await expect(main.getByRole('heading', { level: 2 })).toHaveText([
      'Website Owner',
      'Hosting Provider',
    ]);
    await expect(main.getByRole('heading', { level: 3 })).toHaveCount(9);
  });

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });

    test('is complete', async ({ page }) => {
      await page.goto('/legal-notice/');
      expect(await normalisedText(page.getByRole('main'))).toBe(LEGAL_NOTICE_TEXT);
    });

    test('so is the night in words', async ({ page }) => {
      await page.goto('/narrative/');
      await expect(page.locator('.chronicle__item')).toHaveCount(narrativeEventCount());
      await expect(page.getByRole('table')).toContainText('1,490');
    });
  });
});

test.describe('support', () => {
  test('offers the four payment links as plain links that open a new tab', async ({ page }) => {
    await page.goto('/about/#support');
    const section = page.getByRole('region', { name: 'Support Titanic 4D' });
    await expect(section).toBeVisible();
    await expect(section.getByRole('link')).toHaveCount(SUPPORT_LINKS.length);
    for (const { name, url } of SUPPORT_LINKS) {
      const link = section.getByRole('link', { name, exact: true });
      await expect(link).toHaveAttribute('href', url);
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', 'noopener');
    }
    await expect(section).toContainText('not a charitable gift');
    await expect(page.locator('iframe, script, form')).toHaveCount(0);
  });

  test('is offered from the menu of the reconstruction, which never shows it in the scene', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(
      page
        .getByRole('navigation', { name: 'Site' })
        .getByRole('link', { name: 'Support Titanic 4D' }),
    ).toHaveAttribute('href', '/about/#support');
    await expect(page.getByRole('main')).not.toContainText(/donat|Stripe|€/i);
    await expect(
      page.getByRole('contentinfo').getByRole('link', { name: 'Legal Notice' }),
    ).toHaveAttribute('href', '/legal-notice/');
  });
});
