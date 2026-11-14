import { expect, test } from '@playwright/test';
import { narrativeEventCount, openAt, waitForFrame } from './app.ts';

const clock = (page: import('@playwright/test').Page) => page.locator('.clock__time');

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
