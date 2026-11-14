import { expect, test } from '@playwright/test';
import { openAt } from './app.ts';
import { findAccessibilityViolations } from './axe.ts';

test.describe('document', () => {
  test('declares its language, title and a single top-level heading', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page).toHaveTitle(/Titanic 4D/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  });

  test('offers skip links to the timeline and to the description as first focusable elements', async ({
    page,
  }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to the timeline' })).toBeFocused();
    await page.keyboard.press('Tab');
    const toDescription = page.getByRole('link', { name: 'Skip to the description of the scene' });
    await expect(toDescription).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#panel')).toBeFocused();
  });

  test('names its landmarks and regions', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('contentinfo')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Timeline' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Description of the scene' })).toBeVisible();
    await expect(page.getByRole('region', { name: '3D scene' })).toBeVisible();
  });
});

test.describe('accessibility', () => {
  for (const tab of ['Now', 'Sources', 'Narrative'] as const) {
    test(`has no detectable WCAG 2.2 AA violation with the ${tab} tab open`, async ({
      page,
    }, testInfo) => {
      await openAt(page, testInfo, '01:40');
      await page.getByRole('tab', { name: tab }).click();
      await expect(page.getByRole('tabpanel', { name: tab })).toBeVisible();
      expect(await findAccessibilityViolations(page)).toEqual([]);
    });
  }

  test('has no detectable violation on a narrow screen', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openAt(page, testInfo, '00:45');
    expect(await findAccessibilityViolations(page)).toEqual([]);
  });

  test('describes the scene in words for assistive technology', async ({ page }, testInfo) => {
    await openAt(page, testInfo, '01:50');
    const canvas = page.locator('#scene-canvas');
    await expect(canvas).toHaveAttribute('aria-describedby', /scene-description/);
    await expect(page.locator('#scene-description')).toContainText('down by the head');
    await expect(page.locator('#scene-description')).toContainText('to port');
  });
});
