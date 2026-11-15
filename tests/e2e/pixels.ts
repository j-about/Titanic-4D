import type { Locator, Page } from '@playwright/test';

/** A horizontal band of an image, as fractions of its height from the top. */
export interface Band {
  readonly from: number;
  readonly to: number;
}

export interface BandStatistics {
  /** Number of pixels of the band. */
  readonly pixels: number;
  /** Number of pixels whose luma (0–255, Rec. 709) is above the threshold. */
  readonly bright: number;
  /** Median luma of the band. */
  readonly medianLuma: number;
}

/**
 * Takes a screenshot of the element and measures a band of it: how many pixels are brighter than
 * `brightLuma`, and the median luma. The image is decoded by the browser.
 */
export async function measureBand(
  element: Locator,
  band: Band,
  brightLuma: number,
): Promise<BandStatistics> {
  const screenshot = await element.screenshot();
  return element.page().evaluate(
    async ({ encoded, from, to, threshold }) => {
      const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const context = canvas.getContext('2d');
      if (context === null) {
        throw new Error('No 2D context is available to decode the screenshot.');
      }
      context.drawImage(bitmap, 0, 0);
      const top = Math.round(from * bitmap.height);
      const height = Math.max(Math.round(to * bitmap.height) - top, 1);
      const { data } = context.getImageData(0, top, bitmap.width, height);
      const lumas: number[] = [];
      for (let offset = 0; offset < data.length; offset += 4) {
        lumas.push(
          0.2126 * (data[offset] ?? 0) +
            0.7152 * (data[offset + 1] ?? 0) +
            0.0722 * (data[offset + 2] ?? 0),
        );
      }
      const bright = lumas.filter((luma) => luma > threshold).length;
      lumas.sort((a, b) => a - b);
      return {
        pixels: lumas.length,
        bright,
        medianLuma: lumas[Math.floor(lumas.length / 2)] ?? 0,
      };
    },
    { encoded: screenshot.toString('base64'), from: band.from, to: band.to, threshold: brightLuma },
  );
}

/** Share of the length of each side of a focus ring on which its outermost line is drawn. */
export interface RingSides {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

/**
 * Reads, in a screenshot of the page, the outermost line of pixels of the focus ring drawn around
 * the element that holds the focus: on each side, the share of that line whose colour is the
 * outline colour of the element. The corners are left out, over the radius of the element and
 * the reach of the ring. The device pixel ratio of the page must be 1.
 */
export async function focusRingSides(page: Page): Promise<RingSides> {
  const ring = await page.evaluate(() => {
    const focused = document.activeElement;
    if (!(focused instanceof HTMLElement)) {
      throw new Error('No element holds the focus.');
    }
    const style = getComputedStyle(focused);
    const box = focused.getBoundingClientRect();
    const reach = Number.parseFloat(style.outlineOffset) + Number.parseFloat(style.outlineWidth);
    const colour = (style.outlineColor.match(/\d+/g) ?? []).slice(0, 3).map(Number);
    return {
      x: Math.round(box.left),
      y: Math.round(box.top),
      width: Math.round(box.width),
      height: Math.round(box.height),
      reach: Math.round(reach),
      corner: Math.ceil(Number.parseFloat(style.borderTopLeftRadius) || 0) + Math.round(reach),
      colour,
    };
  });
  const clip = {
    x: ring.x - ring.reach,
    y: ring.y - ring.reach,
    width: ring.width + 2 * ring.reach,
    height: ring.height + 2 * ring.reach,
  };
  const screenshot = await page.screenshot({ clip });
  return page.evaluate(
    async ({ encoded, corner, colour }) => {
      const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const context = canvas.getContext('2d');
      if (context === null) {
        throw new Error('No 2D context is available to decode the screenshot.');
      }
      context.drawImage(bitmap, 0, 0);
      const { data } = context.getImageData(0, 0, bitmap.width, bitmap.height);
      const isRing = (x: number, y: number): boolean => {
        const offset = 4 * (y * bitmap.width + x);
        return colour.every(
          (channel, index) => Math.abs((data[offset + index] ?? 0) - channel) <= 24,
        );
      };
      const share = (length: number, at: (position: number) => boolean): number => {
        let drawn = 0;
        for (let position = corner; position < length - corner; position += 1) {
          drawn += at(position) ? 1 : 0;
        }
        return drawn / Math.max(length - 2 * corner, 1);
      };
      return {
        top: share(bitmap.width, (x) => isRing(x, 0)),
        right: share(bitmap.height, (y) => isRing(bitmap.width - 1, y)),
        bottom: share(bitmap.width, (x) => isRing(x, bitmap.height - 1)),
        left: share(bitmap.height, (y) => isRing(0, y)),
      };
    },
    { encoded: screenshot.toString('base64'), corner: ring.corner, colour: ring.colour },
  );
}
