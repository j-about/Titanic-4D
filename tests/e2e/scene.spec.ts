import { expect, test } from '@playwright/test';
import { BACKEND_BY_PROJECT, hideOverlays, openAt } from './app.ts';
import { type Band, measureBand } from './pixels.ts';

/** Instants reviewed at every milestone and kept as visual regression baselines. */
const KEY_INSTANTS = [
  { name: 'collision', clock: '23:40' },
  { name: 'first-boats', clock: '00:45' },
  { name: 'port-list', clock: '01:40' },
  { name: 'final-plunge', clock: '02:15' },
  { name: 'foundering', clock: '02:20' },
  { name: 'wreck', clock: '02:26' },
] as const;

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

  for (const quality of ['low', 'high'] as const) {
    test(`draws without errors at ${quality} quality`, async ({ page }, testInfo) => {
      const problems: string[] = [];
      page.on('pageerror', (error) => problems.push(String(error)));
      page.on('console', (message) => {
        if (message.type() === 'error') {
          problems.push(message.text());
        }
      });
      await openAt(page, testInfo, '00:45', 'orbit', `quality=${quality}`);
      await expect(page).toHaveURL(new RegExp(`quality=${quality}`));
      expect(problems).toEqual([]);
    });
  }

  for (const instant of KEY_INSTANTS) {
    test(`matches the reviewed image at ${instant.clock} (${instant.name})`, async ({
      page,
    }, testInfo) => {
      await openAt(page, testInfo, instant.clock);
      await hideOverlays(page);
      await expect(page.locator('#scene-canvas')).toHaveScreenshot(`${instant.name}.png`);
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

test.describe('night scene', () => {
  /** Luma (0–255) above which a pixel counts as lit: stars, lamps and their reflections. */
  const LIT_LUMA = 30;
  const SKY: Band = { from: 0, to: 0.25 };
  const SEA: Band = { from: 0.62, to: 1 };

  test('shows stars as points in a dark sky', async ({ page }, testInfo) => {
    await openAt(page, testInfo, '00:45', 'orbit');
    await hideOverlays(page);
    const sky = await measureBand(page.locator('#scene-canvas'), SKY, LIT_LUMA);
    expect(sky.bright).toBeGreaterThan(60);
    expect(sky.bright).toBeLessThan(sky.pixels * 0.02);
    expect(sky.medianLuma).toBeGreaterThan(2);
    expect(sky.medianLuma).toBeLessThan(25);
  });

  test('reflects the lights of the ship in a dark sea', async ({ page }, testInfo) => {
    await openAt(page, testInfo, '00:45', 'orbit');
    await hideOverlays(page);
    const sea = await measureBand(page.locator('#scene-canvas'), SEA, LIT_LUMA);
    expect(sea.bright).toBeGreaterThan(300);
    expect(sea.medianLuma).toBeLessThan(8);
  });

  test('loses the reflection once the lights have failed', async ({ page }, testInfo) => {
    await openAt(page, testInfo, '02:18', 'orbit');
    await hideOverlays(page);
    const sea = await measureBand(page.locator('#scene-canvas'), SEA, LIT_LUMA);
    expect(sea.bright).toBeLessThan(150);
    expect(sea.medianLuma).toBeLessThan(8);
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
