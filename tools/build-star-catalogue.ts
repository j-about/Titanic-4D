import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { type CatalogueStar, encodeStarCatalogue } from '../src/sky/starCatalogue.ts';

/**
 * Converts the Bright Star Catalogue, 5th revised edition (file `bsc5.dat`, fixed-width records)
 * into the compact binary read by the application. Usage:
 *
 *   node tools/build-star-catalogue.ts --input path/to/bsc5.dat
 */
const { values } = parseArgs({ options: { input: { type: 'string' } } });
if (values.input === undefined) {
  throw new Error('Pass the path of bsc5.dat with --input.');
}

/** Epoch of the catalogue positions and epoch of the night of 14–15 April 1912, in years. */
const CATALOGUE_EPOCH = 2000;
const NIGHT_EPOCH = 1912.2877;
/** Faintest magnitude kept: the limit of the unaided eye under a dark sky. */
const FAINTEST_MAGNITUDE = 6.5;
const ARCSECONDS_PER_DEGREE = 3600;

/** Reads a field given by its 1-based first and last byte, as in the catalogue's description. */
function field(line: string, first: number, last: number): string {
  return line.slice(first - 1, last).trim();
}

function parseStar(line: string): CatalogueStar | undefined {
  const hours = field(line, 76, 77);
  const magnitudeText = field(line, 103, 107);
  if (hours === '' || magnitudeText === '') {
    // Entries without coordinates are novae, clusters and galaxies kept for numbering only.
    return undefined;
  }
  const rightAscensionDeg =
    (Number(hours) + Number(field(line, 78, 79)) / 60 + Number(field(line, 80, 83)) / 3600) * 15;
  const sign = field(line, 84, 84) === '-' ? -1 : 1;
  const declinationDeg =
    sign *
    (Number(field(line, 85, 86)) +
      Number(field(line, 87, 88)) / 60 +
      Number(field(line, 89, 90)) / 3600);
  // Proper motions are annual great-circle rates in arcseconds; the right ascension itself
  // changes faster by the secant of the declination.
  const years = NIGHT_EPOCH - CATALOGUE_EPOCH;
  const motionInRightAscension = Number(field(line, 149, 154) || '0');
  const motionInDeclination = Number(field(line, 155, 160) || '0');
  const cosDeclination = Math.max(Math.cos((declinationDeg * Math.PI) / 180), 1e-6);
  return {
    rightAscensionDeg:
      (((rightAscensionDeg +
        (motionInRightAscension * years) / ARCSECONDS_PER_DEGREE / cosDeclination) %
        360) +
        360) %
      360,
    declinationDeg: declinationDeg + (motionInDeclination * years) / ARCSECONDS_PER_DEGREE,
    magnitude: Number(magnitudeText),
    colourIndex: Number(field(line, 110, 114) || '0'),
  };
}

const lines = (await readFile(values.input, 'latin1'))
  .split('\n')
  .filter((line) => line.length > 0);
const stars = lines
  .map(parseStar)
  .filter(
    (star): star is CatalogueStar => star !== undefined && star.magnitude <= FAINTEST_MAGNITUDE,
  )
  .sort((a, b) => a.magnitude - b.magnitude);

const output = join(import.meta.dirname, '..', 'src', 'sky', 'bright-stars.bin');
await writeFile(output, encodeStarCatalogue(stars));
console.log(`Wrote ${stars.length} stars of ${lines.length} catalogue entries to ${output}.`);
