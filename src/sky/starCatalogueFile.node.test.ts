import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { decodeStar, decodeStarCatalogue } from './starCatalogue.ts';

const DEG = 180 / Math.PI;

describe('bright-stars.bin', () => {
  it('holds the naked-eye stars, brightest first, with unit directions', async () => {
    const bytes = new Uint8Array(await readFile(join(import.meta.dirname, 'bright-stars.bin')));
    const field = decodeStarCatalogue(bytes);
    expect(field.count).toBeGreaterThan(8000);
    expect(field.count).toBeLessThan(9200);
    expect(field.magnitudes[0]).toBeCloseTo(-1.46, 2);
    expect(Math.max(...field.magnitudes)).toBeLessThanOrEqual(6.5);
    for (let index = 0; index < field.count; index += 500) {
      const length = Math.hypot(
        field.directions[index * 3] ?? 0,
        field.directions[index * 3 + 1] ?? 0,
        field.directions[index * 3 + 2] ?? 0,
      );
      expect(length).toBeCloseTo(1, 5);
    }
  });

  it('carries Sirius where the catalogue puts it, moved back to 1912 by its proper motion', async () => {
    const bytes = new Uint8Array(await readFile(join(import.meta.dirname, 'bright-stars.bin')));
    const sirius = decodeStar(bytes, 0);
    // J2000 position and yearly proper motion of Sirius, in degrees and seconds of arc; the
    // sinking was 87.7 years before J2000.
    const j2000 = { rightAscensionDeg: 101.287, declinationDeg: -16.716 };
    const movedRightAscensionDeg = (0.553 * 87.7) / 3600 / Math.cos(16.716 / DEG);
    const movedDeclinationDeg = (1.205 * 87.7) / 3600;
    // The motion is 0.014° in right ascension and 0.029° in declination: the stored position is
    // within 0.005° of the moved one, and the J2000 one is not.
    expect(sirius.rightAscensionDeg).toBeCloseTo(
      j2000.rightAscensionDeg + movedRightAscensionDeg,
      2,
    );
    expect(sirius.declinationDeg).toBeCloseTo(j2000.declinationDeg + movedDeclinationDeg, 2);
    expect(sirius.rightAscensionDeg - j2000.rightAscensionDeg).toBeGreaterThan(0.009);
    expect(sirius.declinationDeg - j2000.declinationDeg).toBeGreaterThan(0.02);
  });
});
