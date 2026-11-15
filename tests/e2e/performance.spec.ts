import { expect, test } from '@playwright/test';

/** Downstream and upstream rates of the connection emulated, in megabits per second. */
const DOWNLOAD_MBPS = 50;
const UPLOAD_MBPS = 10;
const LATENCY_MS = 20;
/** Longest time allowed from the start of navigation to the first frame of the scene. */
const FIRST_FRAME_BUDGET_MS = 5000;
/** Largest transfer allowed before the first frame, in bytes. */
const TRANSFER_BUDGET_BYTES = 2_500_000;

test.describe('performance', () => {
  test('draws the first frame within five seconds on a 50 Mb/s connection, cache empty', async ({
    page,
    context,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'webgl2',
      'The WebGPU project draws through the read-back presenter, a path that only tests use.',
    );
    const session = await context.newCDPSession(page);
    await session.send('Network.enable');
    await session.send('Network.setCacheDisabled', { cacheDisabled: true });
    await session.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: LATENCY_MS,
      downloadThroughput: (DOWNLOAD_MBPS * 1_000_000) / 8,
      uploadThroughput: (UPLOAD_MBPS * 1_000_000) / 8,
    });
    let transferred = 0;
    session.on('Network.loadingFinished', (event) => {
      transferred += event.encodedDataLength;
    });

    const start = Date.now();
    await page.goto('/?renderer=webgl2');
    await expect(page.locator('#scene-canvas')).toHaveAttribute('data-rendered-time', '0', {
      timeout: 30_000,
    });
    const elapsed = Date.now() - start;

    await expect(page.locator('#scene-canvas')).toHaveAttribute('data-backend', 'webgl2');
    testInfo.annotations.push({
      type: 'first frame',
      description: `${elapsed} ms, ${transferred} bytes transferred`,
    });
    expect(elapsed).toBeLessThan(FIRST_FRAME_BUDGET_MS);
    expect(transferred).toBeLessThan(TRANSFER_BUDGET_BYTES);
  });
});
