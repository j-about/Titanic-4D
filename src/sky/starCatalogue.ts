/**
 * Compact binary form of the bright-star catalogue.
 *
 * Each star takes eight bytes, little-endian:
 *   - right ascension, unsigned 16-bit: 0 to 65,535 for 0° to 360°;
 *   - declination, signed 16-bit: −32,767 to 32,767 for −90° to +90°;
 *   - visual magnitude, signed 16-bit, in hundredths of a magnitude;
 *   - B−V colour index, signed 16-bit, in hundredths of a magnitude.
 *
 * Coordinates are referred to the mean equator and equinox of J2000 and to the epoch of the
 * night of the sinking: proper motion has been applied when the file was built.
 */
export const BYTES_PER_STAR = 8;
const RIGHT_ASCENSION_STEPS = 65_536;
const DECLINATION_STEPS = 32_767;
const HUNDREDTHS = 100;
const RADIANS_PER_DEGREE = Math.PI / 180;

export interface CatalogueStar {
  readonly rightAscensionDeg: number;
  readonly declinationDeg: number;
  readonly magnitude: number;
  readonly colourIndex: number;
}

export interface StarField {
  readonly count: number;
  /** Unit vectors in the J2000 equatorial frame, three components per star. */
  readonly directions: Float32Array;
  readonly magnitudes: Float32Array;
  readonly colourIndices: Float32Array;
}

/** Encodes stars into the binary form described above. */
export function encodeStarCatalogue(stars: readonly CatalogueStar[]): Uint8Array {
  const bytes = new Uint8Array(stars.length * BYTES_PER_STAR);
  const view = new DataView(bytes.buffer);
  stars.forEach((star, index) => {
    const offset = index * BYTES_PER_STAR;
    const rightAscension =
      Math.round((star.rightAscensionDeg / 360) * RIGHT_ASCENSION_STEPS) % RIGHT_ASCENSION_STEPS;
    view.setUint16(offset, rightAscension, true);
    view.setInt16(offset + 2, Math.round((star.declinationDeg / 90) * DECLINATION_STEPS), true);
    view.setInt16(offset + 4, Math.round(star.magnitude * HUNDREDTHS), true);
    view.setInt16(offset + 6, Math.round(star.colourIndex * HUNDREDTHS), true);
  });
  return bytes;
}

/** Reads one star of the binary catalogue. */
export function decodeStar(bytes: Uint8Array, index: number): CatalogueStar {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const offset = index * BYTES_PER_STAR;
  return {
    rightAscensionDeg: (view.getUint16(offset, true) / RIGHT_ASCENSION_STEPS) * 360,
    declinationDeg: (view.getInt16(offset + 2, true) / DECLINATION_STEPS) * 90,
    magnitude: view.getInt16(offset + 4, true) / HUNDREDTHS,
    colourIndex: view.getInt16(offset + 6, true) / HUNDREDTHS,
  };
}

/** Unit vector of a direction of the equatorial frame: x toward the equinox, z toward the pole. */
export function equatorialDirection(
  rightAscensionDeg: number,
  declinationDeg: number,
): [number, number, number] {
  const rightAscension = rightAscensionDeg * RADIANS_PER_DEGREE;
  const declination = declinationDeg * RADIANS_PER_DEGREE;
  return [
    Math.cos(declination) * Math.cos(rightAscension),
    Math.cos(declination) * Math.sin(rightAscension),
    Math.sin(declination),
  ];
}

/** Decodes the binary catalogue into arrays ready for the star field. */
export function decodeStarCatalogue(bytes: Uint8Array): StarField {
  if (bytes.byteLength % BYTES_PER_STAR !== 0) {
    throw new RangeError('The star catalogue has an incomplete record.');
  }
  const count = bytes.byteLength / BYTES_PER_STAR;
  const directions = new Float32Array(count * 3);
  const magnitudes = new Float32Array(count);
  const colourIndices = new Float32Array(count);
  for (let index = 0; index < count; index += 1) {
    const star = decodeStar(bytes, index);
    directions.set(equatorialDirection(star.rightAscensionDeg, star.declinationDeg), index * 3);
    magnitudes[index] = star.magnitude;
    colourIndices[index] = star.colourIndex;
  }
  return { count, directions, magnitudes, colourIndices };
}
