import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, type Page, type TestInfo } from '@playwright/test';

/** Renderer requested from the application for each Playwright project. */
const RENDERER_BY_PROJECT: Readonly<Record<string, string>> = {
  webgl2: 'webgl2',
  webgpu: 'webgpu-readback',
};

/** Backend that the application must report for each Playwright project. */
export const BACKEND_BY_PROJECT: Readonly<Record<string, string>> = {
  webgl2: 'webgl2',
  webgpu: 'webgpu',
};

const COLLISION_SECOND_OF_DAY = 23 * 3600 + 40 * 60;
const SECONDS_PER_DAY = 86_400;

/** Seconds since the collision for a 24-hour ship's clock such as `01:40` or `02:17:30`. */
export function secondsAt(clock: string): number {
  const [hours = 0, minutes = 0, seconds = 0] = clock.split(':').map(Number);
  return (
    (hours * 3600 + minutes * 60 + seconds - COLLISION_SECOND_OF_DAY + SECONDS_PER_DAY) %
    SECONDS_PER_DAY
  );
}

/**
 * Waits until the scene has drawn the frame of the given ship's clock time with everything it
 * loads in place, the detailed model of the ship included.
 */
export async function waitForFrame(page: Page, clock: string): Promise<void> {
  const canvas = page.locator('#scene-canvas');
  await expect(canvas).toHaveAttribute('data-rendered-time', String(secondsAt(clock)), {
    timeout: 45_000,
  });
  await expect(canvas).toHaveAttribute('data-assets', 'ready', { timeout: 45_000 });
  // Two animation frames let a render that was already in flight reach the canvas.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}

/**
 * Opens the application at a ship's clock time with the renderer of the current project.
 * `extraQuery` adds parameters to the address, for example `quality=low`.
 */
export async function openAt(
  page: Page,
  testInfo: TestInfo,
  clock: string,
  camera = 'guided',
  extraQuery = '',
): Promise<void> {
  const renderer = RENDERER_BY_PROJECT[testInfo.project.name];
  if (renderer === undefined) {
    throw new Error(`No renderer is defined for project "${testInfo.project.name}".`);
  }
  const suffix = extraQuery === '' ? '' : `&${extraQuery}`;
  await page.goto(`/?t=${clock}&camera=${camera}&renderer=${renderer}${suffix}`);
  await waitForFrame(page, clock);
}

/** Controls and messages laid over the canvas. */
const OVERLAY_SELECTOR = '#camera-root, #scene-status';

/**
 * Hides what is laid over the canvas, so that a screenshot of it shows the scene alone. The
 * style is set through the CSS object model, which the content security policy of the
 * production server allows, unlike an injected style sheet.
 */
export async function hideOverlays(page: Page): Promise<void> {
  await page.evaluate((selector) => {
    for (const element of document.querySelectorAll<HTMLElement>(selector)) {
      element.style.visibility = 'hidden';
    }
  }, OVERLAY_SELECTOR);
}

function readData<T>(name: string): T {
  return JSON.parse(
    readFileSync(join(import.meta.dirname, '..', '..', 'data', `${name}.json`), 'utf8'),
  ) as T;
}

/** Number of entries of the narrative: chronology, lifeboats, distress signals and wireless. */
export function narrativeEventCount(): number {
  const chronology = readData<{ events: unknown[] }>('chronology');
  const lifeboats = readData<{ boats: unknown[] }>('lifeboats');
  const signals = readData<{ rockets: { firings: unknown[] }; wireless: { messages: unknown[] } }>(
    'signals',
  );
  return (
    chronology.events.length +
    lifeboats.boats.length +
    signals.rockets.firings.length +
    signals.wireless.messages.length
  );
}
