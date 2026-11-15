import { expect, test } from '@playwright/test';
import {
  addressAt,
  BACKEND_BY_PROJECT,
  hideOverlays,
  holdSceneStarts,
  openAt,
  waitForFrame,
  waitForSceneUpToDate,
} from './app.ts';
import { type Band, measureBand } from './pixels.ts';

/** Instants compared with the visual regression baselines. */
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

  test('draws the detailed model of the ship, and the generated one at low quality', async ({
    page,
  }, testInfo) => {
    const canvas = page.locator('#scene-canvas');
    await openAt(page, testInfo, '00:45', 'orbit');
    await expect(canvas).toHaveAttribute('data-ship-model', 'detailed');
    await openAt(page, testInfo, '00:45', 'orbit', 'quality=low');
    await expect(canvas).toHaveAttribute('data-ship-model', 'generated');
  });

  test('keeps the generated model when the detailed one cannot be loaded', async ({
    page,
  }, testInfo) => {
    await page.route('**/models/ship-lod1.glb', (route) => route.abort());
    await openAt(page, testInfo, '00:45', 'orbit');
    await expect(page.locator('#scene-frame')).toHaveAttribute('data-status', 'ready');
    await expect(page.locator('#scene-canvas')).toHaveAttribute('data-ship-model', 'generated');
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

test.describe('starts of the scene', () => {
  test('draws the last level of detail chosen when two changes follow each other at once', async ({
    page,
  }, testInfo) => {
    await openAt(page, testInfo, '01:00', 'orbit');
    const detail = page.getByLabel('Detail', { exact: true });
    await detail.selectOption('low');
    await detail.selectOption('high');
    await expect(page).toHaveURL(/quality=high/);
    await waitForFrame(page, '01:00');
    const canvas = page.locator('#scene-canvas');
    await expect(page.locator('#scene-frame')).toHaveAttribute('data-status', 'ready');
    await expect(canvas).toHaveAttribute(
      'data-backend',
      BACKEND_BY_PROJECT[testInfo.project.name] ?? '',
    );
    await expect(canvas).toHaveAttribute('data-ship-model', 'detailed');
    await expect(page.locator('#scene-status')).toBeHidden();
  });

  test('draws the level of detail chosen while the scene was still loading', async ({
    page,
  }, testInfo) => {
    const release = await holdSceneStarts(page);
    await page.goto(addressAt(testInfo, '01:00', 'orbit'));
    await expect(page.locator('#scene-frame')).toHaveAttribute('data-status', 'loading');
    await expect(page.locator('#scene-status')).toHaveText('Loading the 3D scene…');
    await page.getByLabel('Detail', { exact: true }).selectOption('low');
    release();
    await expect(page).toHaveURL(/quality=low/);
    await waitForFrame(page, '01:00');
    const canvas = page.locator('#scene-canvas');
    await expect(page.locator('#scene-frame')).toHaveAttribute('data-status', 'ready');
    await expect(canvas).toHaveAttribute(
      'data-backend',
      BACKEND_BY_PROJECT[testInfo.project.name] ?? '',
    );
    await expect(canvas).toHaveAttribute('data-ship-model', 'generated');
  });

  test('keeps the keyboard focus on the 3D view when the scene is started again', async ({
    page,
  }, testInfo) => {
    await openAt(page, testInfo, '01:00', 'orbit');
    await page.locator('#scene-canvas').focus();
    // Changed from a script, the level of detail restarts the scene without taking the focus.
    await page.evaluate(() => {
      const detail = document.querySelector<HTMLSelectElement>('#quality-select');
      if (detail === null) {
        throw new Error('The document has no choice of detail.');
      }
      detail.value = 'low';
      detail.dispatchEvent(new Event('change'));
    });
    await expect(page).toHaveURL(/quality=low/);
    await waitForFrame(page, '01:00');
    await expect(page.locator('#scene-canvas')).toBeFocused();
    await page.keyboard.press('Period');
    await expect(page.locator('.clock__time')).toHaveText('1:01 a.m.');
  });

  test('falls back to WebGL 2 on a fresh canvas, keeping the focus and the address', async ({
    page,
  }) => {
    // WebGPU is absent and the first canvas is refused a WebGL 2 context: the first start fails.
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'gpu', { value: undefined, configurable: true });
      const original = HTMLCanvasElement.prototype.getContext as (
        this: HTMLCanvasElement,
        contextId: string,
        options?: unknown,
      ) => RenderingContext | null;
      let refused = false;
      Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
        configurable: true,
        writable: true,
        value(this: HTMLCanvasElement, contextId: string, options?: unknown) {
          if (!refused && contextId === 'webgl2') {
            refused = true;
            return null;
          }
          return original.call(this, contextId, options);
        },
      });
    });
    const release = await holdSceneStarts(page);
    await page.goto('/?t=01:00&camera=orbit');
    const canvas = page.locator('#scene-canvas');
    await canvas.focus();
    const firstCanvas = await canvas.elementHandle();
    release();
    await waitForFrame(page, '01:00');
    await expect(page.locator('#scene-frame')).toHaveAttribute('data-status', 'ready');
    await expect(canvas).toHaveAttribute('data-backend', 'webgl2');
    // The scene is drawn on another canvas than the one that was refused a context.
    expect(
      await page.evaluate(
        (first) =>
          first !== document.getElementById('scene-canvas') && first?.isConnected === false,
        firstCanvas,
      ),
    ).toBe(true);
    await expect(canvas).toBeFocused();
    await expect(page).toHaveURL(/t=01:00:00&camera=orbit&rate=60$/);
    await page.getByRole('button', { name: 'Forward 1 min' }).click();
    await expect(page).toHaveURL(/t=01:01:00&camera=orbit&rate=60$/);
  });

  test('says that a file is missing, not that the device is at fault, without the star catalogue', async ({
    page,
  }, testInfo) => {
    await page.route('**/bright-stars*.bin', (route) => route.abort());
    await page.goto(addressAt(testInfo, '01:00', 'orbit'));
    await expect(page.locator('#scene-frame')).toHaveAttribute('data-status', 'failed');
    const status = page.locator('#scene-status');
    await expect(status).toContainText('A file that the 3D scene needs could not be loaded.');
    await expect(status).not.toContainText('on this device');
    await expect(page.locator('.clock__time')).toHaveText('1:00 a.m.');
    await page.getByRole('tab', { name: 'Narrative' }).click();
    await expect(page.getByRole('tabpanel', { name: 'Narrative' })).toBeVisible();
  });
});

test.describe('night scene', () => {
  /** Luma (0–255) above which a pixel counts as lit: stars, lamps and their reflections. */
  const LIT_LUMA = 30;
  const SKY: Band = { from: 0, to: 0.25 };
  /** The lowest rows are left out: the edge of the frame shows there when the canvas is a fraction of a pixel high. */
  const SEA: Band = { from: 0.62, to: 0.97 };

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

  test('shows a distress signal as white stars above the ship', async ({ page }, testInfo) => {
    /** Luma above which a pixel of the sky is as bright as a star of a distress signal. */
    const signalLuma = 170;
    const upperSky: Band = { from: 0, to: 0.45 };
    await openAt(page, testInfo, '00:46:40');
    await hideOverlays(page);
    const before = await measureBand(page.locator('#scene-canvas'), upperSky, signalLuma);
    await openAt(page, testInfo, '00:47:07');
    await hideOverlays(page);
    const during = await measureBand(page.locator('#scene-canvas'), upperSky, signalLuma);
    expect(during.bright - before.bright).toBeGreaterThan(12);
    expect(during.bright - before.bright).toBeLessThan(400);
  });

  test('shows the light of the Californian on the horizon until the ship founders', async ({
    page,
  }, testInfo) => {
    /**
     * Rows around the horizon for the default view around the ship. Turned eight steps to the
     * right, that view looks over the after part of the ship toward the port bow, where the
     * light stands; the ship is dark by then and nothing else on the horizon is lit.
     */
    const horizon: Band = { from: 0.24, to: 0.3 };
    const canvas = page.locator('#scene-canvas');
    await openAt(page, testInfo, '02:19:59', 'orbit');
    const turnRight = page.getByRole('button', { name: 'Turn right', exact: true });
    for (let step = 0; step < 8; step += 1) {
      await turnRight.click();
    }
    await hideOverlays(page);
    await waitForSceneUpToDate(page);
    const afloat = await measureBand(canvas, horizon, LIT_LUMA);
    expect(afloat.bright).toBeGreaterThan(0);

    // One step of the scrubber passes 2:20 a.m., when the ship founders.
    const renderedBefore = await canvas.getAttribute('data-rendered-time');
    await page.getByRole('slider', { name: "Time of the night, ship's time" }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('.clock__phase')).toHaveText('Descent to the seabed');
    await expect(canvas).not.toHaveAttribute('data-rendered-time', renderedBefore ?? '');
    await waitForSceneUpToDate(page);
    const foundered = await measureBand(canvas, horizon, LIT_LUMA);
    expect(foundered.bright).toBeLessThan(afloat.bright);
    expect(afloat.bright - foundered.bright).toBeLessThan(80);
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
