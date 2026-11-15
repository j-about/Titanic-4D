import type { Locator } from '@playwright/test';

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
