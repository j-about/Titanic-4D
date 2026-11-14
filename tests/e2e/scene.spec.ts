import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { BACKEND_BY_PROJECT, openAt } from './app.ts';

/** Instants reviewed at every milestone and kept as visual regression baselines. */
const KEY_INSTANTS = [
  { name: 'collision', clock: '23:40' },
  { name: 'first-boats', clock: '00:45' },
  { name: 'port-list', clock: '01:40' },
  { name: 'final-plunge', clock: '02:15' },
  { name: 'foundering', clock: '02:20' },
  { name: 'wreck', clock: '02:26' },
] as const;

/** Style sheet hiding the controls laid over the canvas, so that baselines show the scene alone. */
const HIDE_OVERLAYS = join(import.meta.dirname, 'hide-overlays.css');

test.describe('3D scene', () => {
  test('starts on the backend under test', async ({ page }, testInfo) => {
    await openAt(page, testInfo, '23:40');
    await expect(page.locator('#scene-frame')).toHaveAttribute('data-status', 'ready');
    await expect(page.locator('#scene-canvas')).toHaveAttribute(
      'data-backend',
      BACKEND_BY_PROJECT[testInfo.project.name] ?? '',
    );
    await expect(page.locator('#scene-status')).toBeHidden();
  });

  test('draws without errors in the console', async ({ page }, testInfo) => {
    const problems: string[] = [];
    page.on('pageerror', (error) => problems.push(String(error)));
    page.on('console', (message) => {
      if (message.type() === 'error') {
        problems.push(message.text());
      }
    });
    await openAt(page, testInfo, '02:18', 'orbit');
    expect(problems).toEqual([]);
  });

  for (const instant of KEY_INSTANTS) {
    test(`matches the reviewed image at ${instant.clock} (${instant.name})`, async ({
      page,
    }, testInfo) => {
      await openAt(page, testInfo, instant.clock);
      await expect(page.locator('#scene-canvas')).toHaveScreenshot(`${instant.name}.png`, {
        stylePath: HIDE_OVERLAYS,
      });
    });
  }

  test('draws the same image when the instant is reached by playing backward', async ({
    page,
  }, testInfo) => {
    await openAt(page, testInfo, '01:40', 'orbit');
    const canvas = page.locator('#scene-canvas');
    const direct = await canvas.screenshot();
    await page.getByRole('button', { name: 'Forward 1 min' }).click();
    await page.getByRole('button', { name: 'Forward 1 min' }).click();
    await page.getByRole('button', { name: 'Back 1 min' }).click();
    await page.getByRole('button', { name: 'Back 1 min' }).click();
    await expect(page.locator('.clock__time')).toHaveText('1:40 a.m.');
    await expect
      .poll(async () => (await canvas.screenshot()).equals(direct), { timeout: 20_000 })
      .toBe(true);
  });
});

test.describe('reduced motion', () => {
  test('is off unless the user asks for it', async ({ page }, testInfo) => {
    await openAt(page, testInfo, '00:22');
    await expect(page.locator('#scene-frame')).toHaveAttribute('data-reduced-motion', 'false');
  });

  test.describe('when the user asks for it', () => {
    test.use({ reducedMotion: 'reduce' });

    test('is passed on to the scene, which holds the guided camera still between shots', async ({
      page,
    }, testInfo) => {
      await openAt(page, testInfo, '00:22');
      await expect(page.locator('#scene-frame')).toHaveAttribute('data-reduced-motion', 'true');
    });

    test('never starts playing by itself', async ({ page }, testInfo) => {
      await openAt(page, testInfo, '00:22');
      await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
      await expect(page.locator('.clock__time')).toHaveText('12:22 a.m.');
    });
  });
});
