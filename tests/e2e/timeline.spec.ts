import { expect, test } from '@playwright/test';
import { hideOverlays, narrativeEventCount, openAt, showOverlays, waitForFrame } from './app.ts';
import { findAccessibilityViolations } from './axe.ts';

const clock = (page: import('@playwright/test').Page) => page.locator('.clock__time');

/** Smallest side of a target that the application gives to its buttons, in CSS pixels. */
const TARGET_MIN_PX = 44;

/** Image of the canvas alone, without the controls and messages laid over it. */
async function sceneImage(page: import('@playwright/test').Page): Promise<Buffer> {
  await hideOverlays(page);
  const image = await page.locator('#scene-canvas').screenshot();
  await showOverlays(page);
  return image;
}

/** True when the page is no wider than its window. */
const fitsTheWindow = (page: import('@playwright/test').Page): Promise<boolean> =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

test.describe('timeline', () => {
  test('opens at the moment given in the address', async ({ page }, testInfo) => {
    await openAt(page, testInfo, '01:40');
    await expect(clock(page)).toHaveText('1:40 a.m.');
    await expect(page.locator('.clock__date')).toHaveText('15 April 1912');
    await expect(page.locator('.clock__elapsed')).toHaveText('2 h 00 min after the collision');
  });

  test('starts at the collision by default, paused', async ({ page }) => {
    await page.goto('/');
    await expect(clock(page)).toHaveText('11:40 p.m.');
    await expect(page.locator('.clock__date')).toHaveText('14 April 1912');
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
  });

  test('moves in time with the scrubber from the keyboard', async ({ page }, testInfo) => {
    await openAt(page, testInfo, '00:00');
    const scrubber = page.getByRole('slider', { name: "Time of the night, ship's time" });
    await scrubber.focus();
    await page.keyboard.press('ArrowRight');
    await expect(clock(page)).toHaveText('12:00 a.m.');
    await expect(scrubber).toHaveAttribute(
      'aria-valuetext',
      /^12:00 a\.m\., 20 min after the collision$/,
    );
    await page.keyboard.press('PageUp');
    await expect(clock(page)).toHaveText('12:05 a.m.');
    await page.keyboard.press('End');
    await expect(clock(page)).toHaveText('2:26 a.m.');
    await page.keyboard.press('Home');
    await expect(clock(page)).toHaveText('11:40 p.m.');
  });

  test('steps by one minute and jumps to the ends', async ({ page }, testInfo) => {
    await openAt(page, testInfo, '00:45');
    await page.getByRole('button', { name: 'Forward 1 min' }).click();
    await expect(clock(page)).toHaveText('12:46 a.m.');
    await page.getByRole('button', { name: 'Back 1 min' }).click();
    await page.getByRole('button', { name: 'Back 1 min' }).click();
    await expect(clock(page)).toHaveText('12:44 a.m.');
    await page.getByRole('button', { name: 'Go to the wreck on the seabed' }).click();
    await expect(clock(page)).toHaveText('2:26 a.m.');
    await page.getByRole('button', { name: 'Go to the collision, 11:40 p.m.' }).click();
    await expect(clock(page)).toHaveText('11:40 p.m.');
  });

  test('jumps to a key moment and marks it as current', async ({ page }, testInfo) => {
    await openAt(page, testInfo, '23:40');
    const bookmark = page.getByRole('button', { name: 'Go to 2:20 a.m. The ship founders' });
    await bookmark.click();
    await expect(clock(page)).toHaveText('2:20 a.m.');
    await expect(bookmark).toHaveAttribute('aria-current', 'true');
    await expect(page).toHaveURL(/t=02:20:00/);
  });

  test('shows the title of every key moment in full, also with the spacing of WCAG 1.4.12', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.locator('.bookmark').first()).toBeVisible();
    /**
     * Titles cut off in their box and bookmarks whose content is wider than they are, beyond
     * the pixel by which the two rounded widths can differ.
     */
    const cutOff = (): Promise<string[]> =>
      page.evaluate(() => [
        ...[...document.querySelectorAll<HTMLElement>('.bookmark__title')]
          .filter((title) => title.scrollWidth > title.clientWidth + 1)
          .map((title) => `title: ${title.textContent}`),
        ...[...document.querySelectorAll<HTMLElement>('.bookmark')]
          .filter((bookmark) => bookmark.scrollWidth > bookmark.clientWidth + 1)
          .map((bookmark) => `bookmark: ${bookmark.textContent}`),
      ]);
    expect(await cutOff()).toEqual([]);
    expect(
      await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('.bookmark__title')].map(
          (title) => getComputedStyle(title).textOverflow,
        ),
      ),
    ).not.toContain('ellipsis');
    // Set through the CSS object model, which the content security policy allows.
    await page.evaluate(() => {
      for (const element of document.querySelectorAll<HTMLElement>('.bookmark, .bookmark *')) {
        element.style.lineHeight = '1.5';
        element.style.letterSpacing = '0.12em';
        element.style.wordSpacing = '0.16em';
      }
    });
    expect(await cutOff()).toEqual([]);
    await expect(
      page.getByRole('button', { name: 'Go to 2:20 a.m. The ship founders' }),
    ).toContainText('The ship founders');
  });

  test('plays forward and backward and pauses', async ({ page }, testInfo) => {
    await openAt(page, testInfo, '01:00');
    await page.getByLabel('Speed').selectOption('600');
    await page.getByRole('button', { name: 'Play' }).click();
    await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
    await expect(clock(page)).not.toHaveText('1:00 a.m.');
    await page.getByRole('button', { name: 'Pause' }).click();
    const forward = await clock(page).textContent();
    expect(forward).not.toBeNull();

    const backward = page.getByRole('button', { name: 'Run time backward' });
    await backward.click();
    await expect(backward).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Play' }).click();
    await expect(clock(page)).not.toHaveText(forward ?? '');
    await page.getByRole('button', { name: 'Pause' }).click();
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
  });

  test('stops at the end of the night', async ({ page }, testInfo) => {
    await openAt(page, testInfo, '02:25');
    await page.getByLabel('Speed').selectOption('600');
    await page.getByRole('button', { name: 'Play' }).click();
    await expect(clock(page)).toHaveText('2:26 a.m.');
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
    await expect(page.locator('.clock__phase')).toHaveText('On the seabed');
  });

  test('plays and steps from the 3D view with the keyboard', async ({ page }, testInfo) => {
    await openAt(page, testInfo, '00:30', 'orbit');
    await page.locator('#scene-canvas').focus();
    await page.keyboard.press('Period');
    await expect(clock(page)).toHaveText('12:31 a.m.');
    await page.keyboard.press('Comma');
    await expect(clock(page)).toHaveText('12:30 a.m.');
    await page.keyboard.press('Space');
    await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
    await page.keyboard.press('Space');
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
  });
});

test.describe('description panels', () => {
  test('switches tabs with the arrow keys', async ({ page }, testInfo) => {
    await openAt(page, testInfo, '01:40');
    await page.getByRole('tab', { name: 'Now' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: 'Sources' })).toBeFocused();
    await expect(page.getByRole('tab', { name: 'Sources' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.getByRole('tabpanel', { name: 'Sources' })).toBeVisible();
    await page.keyboard.press('End');
    await expect(page.getByRole('tabpanel', { name: 'Narrative' })).toBeVisible();
    await page.keyboard.press('Home');
    await expect(page.getByRole('tabpanel', { name: 'Now' })).toBeVisible();
  });

  test('states the figures of the instant in words', async ({ page }, testInfo) => {
    await openAt(page, testInfo, '01:50');
    const panel = page.getByRole('tabpanel', { name: 'Now' });
    await expect(panel.getByRole('heading', { name: 'Afloat, sinking by the head' })).toBeVisible();
    await expect(panel.locator('.facts')).toContainText('5.5° by the head');
    await expect(panel.locator('.facts')).toContainText('10.0° to port');
    await expect(panel.locator('.facts')).toContainText('of 20 away');
  });

  test('draws the water in the hull and gives the same values as a table', async ({
    page,
  }, testInfo) => {
    await openAt(page, testInfo, '01:40');
    const panel = page.getByRole('tabpanel', { name: 'Now' });
    await expect(
      panel.getByRole('img', { name: /Water in the hull, seen from starboard/ }),
    ).toBeVisible();
    await panel.getByText('Water level by compartment').click();
    const table = panel.getByRole('table', { name: 'Water in each watertight compartment' });
    await expect(table.getByRole('row')).toHaveCount(17);
    await expect(table.getByRole('row', { name: /No\. 1 hold/ })).toContainText('Flooded');
    await expect(table.getByRole('row', { name: /Turbine engine room/ })).toContainText('None');
    expect(await findAccessibilityViolations(page)).toEqual([]);
  });

  test('shows the sources of the instant with their certainty and the other positions', async ({
    page,
  }, testInfo) => {
    await openAt(page, testInfo, '02:00');
    await page.getByRole('tab', { name: 'Sources' }).click();
    const panel = page.getByRole('tabpanel', { name: 'Sources' });
    const list = panel.locator('.source-entry', { hasText: 'List 10.0° to port' });
    await expect(list).toContainText('Debated');
    await list.locator('summary').click();
    await expect(list).toContainText('Other positions');
    await expect(list).toContainText('Samuel Halpern (2023)');
    await expect(list.getByRole('link').first()).toHaveAttribute('href', /^https?:\/\//);
  });

  test('states what the levels of certainty mean in words, not in a tooltip', async ({
    page,
  }, testInfo) => {
    await openAt(page, testInfo, '02:00');
    await page.getByRole('tab', { name: 'Sources' }).click();
    const panel = page.getByRole('tabpanel', { name: 'Sources' });
    await expect(panel.locator('.certainty[title]')).toHaveCount(0);
    const legend = panel.locator('details.certainty-legend');
    await legend.locator('summary').click();
    await expect(legend.getByText('Primary evidence and broad agreement.')).toBeVisible();
    await expect(legend.getByText('Derived or approximate.')).toBeVisible();
    await expect(legend.getByText('Sources disagree.')).toBeVisible();
    expect(await findAccessibilityViolations(page)).toEqual([]);
  });

  test('shows lifeboat times with their margin', async ({ page }, testInfo) => {
    await openAt(page, testInfo, '00:44');
    await page.getByRole('tab', { name: 'Sources' }).click();
    await expect(page.getByRole('tabpanel', { name: 'Sources' })).toContainText(
      'Boat No. 7 started down at about 12:40 a.m., give or take 5 minutes.',
    );
  });

  test('tells the night in words and moves the scene from the narrative', async ({
    page,
  }, testInfo) => {
    await openAt(page, testInfo, '23:40');
    await page.getByRole('tab', { name: 'Narrative' }).click();
    const panel = page.getByRole('tabpanel', { name: 'Narrative' });
    await expect(panel.locator('.narrative__item')).toHaveCount(narrativeEventCount());
    await expect(panel.locator('.narrative__item[aria-current="step"]')).toContainText(
      'Water enters boiler rooms 6 and 5',
    );
    await panel.getByRole('button', { name: 'Go to 2:17 a.m., The lights go out' }).click();
    await expect(clock(page)).toHaveText('2:17 a.m.');
    await waitForFrame(page, '02:17');
    await expect(panel.locator('.narrative__item[aria-current="step"]')).toContainText(
      'The hull breaks apart',
    );
  });
});

test.describe('views', () => {
  test('changes the camera and keeps the choice in the address', async ({ page }, testInfo) => {
    await openAt(page, testInfo, '01:00');
    await page.getByLabel('View', { exact: true }).selectOption('deck');
    await expect(page).toHaveURL(/camera=deck/);
    await expect(page.locator('#camera-help')).toContainText('bridge');
    await waitForFrame(page, '01:00');
  });

  test('changes the level of detail, restarts the scene and keeps the choice in the address', async ({
    page,
  }, testInfo) => {
    await openAt(page, testInfo, '01:00', 'orbit');
    const canvas = page.locator('#scene-canvas');
    const medium = await canvas.screenshot();
    await page.getByLabel('Detail', { exact: true }).selectOption('low');
    await expect(page).toHaveURL(/quality=low/);
    await expect(page.locator('#scene-frame')).toHaveAttribute('data-status', 'ready');
    await waitForFrame(page, '01:00');
    await expect(page.getByLabel('Detail', { exact: true })).toHaveValue('low');
    expect((await page.locator('#scene-canvas').screenshot()).equals(medium)).toBe(false);
    await page.getByLabel('Detail', { exact: true }).selectOption('medium');
    await expect(page).not.toHaveURL(/quality=/);
    await waitForFrame(page, '01:00');
  });

  test('turns, tilts and zooms the view one step per click', async ({ page }, testInfo) => {
    await openAt(page, testInfo, '01:00', 'orbit');
    const group = page.getByRole('group', { name: 'Move the camera' });
    await expect(group.getByRole('button')).toHaveText([
      'Turn left',
      'Turn right',
      'Tilt up',
      'Tilt down',
      'Zoom in',
      'Zoom out',
    ]);
    const start = await sceneImage(page);
    let previous = start;
    for (const name of ['Turn right', 'Tilt up', 'Zoom in', 'Zoom out', 'Tilt down']) {
      const button = group.getByRole('button', { name, exact: true });
      const box = await button.boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(TARGET_MIN_PX);
      expect(box?.height).toBeGreaterThanOrEqual(TARGET_MIN_PX);
      await button.click();
      const before = previous;
      await expect
        .poll(async () => (await sceneImage(page)).equals(before), { timeout: 20_000 })
        .toBe(false);
      previous = await sceneImage(page);
    }
    // Turning back by the same step returns to the first view, tilt and distance being restored.
    await group.getByRole('button', { name: 'Turn left', exact: true }).click();
    await expect
      .poll(async () => (await sceneImage(page)).equals(start), { timeout: 20_000 })
      .toBe(true);
  });

  test('offers the step buttons of each view and none for the guided tour', async ({
    page,
  }, testInfo) => {
    await openAt(page, testInfo, '01:00');
    const group = page.getByRole('group', { name: 'Move the camera' });
    await expect(group).toBeHidden();
    const view = page.getByLabel('View', { exact: true });
    await view.selectOption('deck');
    await expect(group.getByRole('button')).toHaveText([
      'Turn left',
      'Turn right',
      'Tilt up',
      'Tilt down',
    ]);
    await view.selectOption('free');
    await expect(group.getByRole('button')).toHaveText([
      'Turn left',
      'Turn right',
      'Tilt up',
      'Tilt down',
      'Move forward',
      'Move back',
    ]);
    await waitForFrame(page, '01:00');
    const before = await sceneImage(page);
    await group.getByRole('button', { name: 'Move forward', exact: true }).click();
    await expect
      .poll(async () => (await sceneImage(page)).equals(before), { timeout: 20_000 })
      .toBe(false);
    expect(await findAccessibilityViolations(page)).toEqual([]);
  });

  test('shows how to operate the 3D view, the keys that move time included', async ({
    page,
  }, testInfo) => {
    await openAt(page, testInfo, '01:00', 'orbit');
    const help = page.locator('#camera-help');
    await expect(help).toBeHidden();
    await page.getByText('Controls of the 3D view').click();
    await expect(help).toBeVisible();
    await expect(help).toContainText('arrow keys');
    await expect(help).toContainText('The Turn, Tilt and Zoom buttons');
    await expect(help).toContainText('Space plays or pauses');
    await expect(help).toContainText('comma and full stop step one minute');
  });

  test('keeps the view controls usable on a 320 px screen, below the canvas', async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await openAt(page, testInfo, '01:00', 'orbit');
    expect(await fitsTheWindow(page)).toBe(true);
    const canvas = page.locator('#scene-canvas');
    const canvasBox = await canvas.boundingBox();
    const toolbarBox = await page.locator('#camera-root').boundingBox();
    expect(canvasBox).not.toBeNull();
    expect(toolbarBox).not.toBeNull();
    expect(toolbarBox?.y ?? 0).toBeGreaterThanOrEqual(
      (canvasBox?.y ?? 0) + (canvasBox?.height ?? 0) - 1,
    );
    const group = page.getByRole('group', { name: 'Move the camera' });
    for (const button of await group.getByRole('button').all()) {
      const box = await button.boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(TARGET_MIN_PX);
      expect(box?.height).toBeGreaterThanOrEqual(TARGET_MIN_PX);
      expect(box?.x ?? -1).toBeGreaterThanOrEqual(0);
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(320);
    }
    const before = await canvas.screenshot();
    await group.getByRole('button', { name: 'Zoom in', exact: true }).click();
    await expect
      .poll(async () => (await canvas.screenshot()).equals(before), { timeout: 20_000 })
      .toBe(false);
    expect(await findAccessibilityViolations(page)).toEqual([]);
  });

  test('keeps the operating instructions available at 200 % zoom, in a disclosure', async ({
    page,
  }, testInfo) => {
    // A 1280 × 800 window zoomed to 200 % lays the page out in 640 × 400 CSS pixels.
    await page.setViewportSize({ width: 640, height: 400 });
    await openAt(page, testInfo, '01:00', 'orbit');
    const help = page.locator('#camera-help');
    await expect(help).toBeHidden();
    await page.getByText('Controls of the 3D view').click();
    await expect(help).toBeVisible();
    await expect(help).toContainText('arrow keys');
    await expect(help).toContainText('Space plays or pauses');
    const box = await help.boundingBox();
    expect(box?.width).toBeGreaterThan(200);
    expect(box?.height).toBeGreaterThan(20);
    expect(await fitsTheWindow(page)).toBe(true);
    expect(await findAccessibilityViolations(page)).toEqual([]);
  });

  test('turns the view from the keyboard', async ({ page }, testInfo) => {
    await openAt(page, testInfo, '01:00', 'orbit');
    const canvas = page.locator('#scene-canvas');
    const before = await canvas.screenshot();
    await canvas.focus();
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(600);
    await page.keyboard.up('ArrowRight');
    await waitForFrame(page, '01:00');
    expect((await canvas.screenshot()).equals(before)).toBe(false);
  });
});
