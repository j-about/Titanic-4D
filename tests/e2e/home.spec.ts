import { expect, test } from '@playwright/test';
import { findAccessibilityViolations } from './axe.ts';

test.describe('home page', () => {
  test('declares its language, title and a single top-level heading', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page).toHaveTitle(/Titanic 4D/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  });

  test('exposes a skip link as the first focusable element', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const skipLink = page.getByRole('link', { name: 'Skip to main content' });
    await expect(skipLink).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#main')).toBeFocused();
  });

  test('has no detectable WCAG 2.2 AA violation', async ({ page }) => {
    await page.goto('/');
    expect(await findAccessibilityViolations(page)).toEqual([]);
  });
});
