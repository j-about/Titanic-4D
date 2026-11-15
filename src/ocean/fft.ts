/**
 * In-place radix-2 fast Fourier transform on separate real and imaginary arrays.
 *
 * `inverse` selects the sign of the exponent; no scaling is applied in either direction, so a
 * forward transform followed by an inverse one multiplies the data by its length.
 */
export function fft(
  real: Float32Array,
  imaginary: Float32Array,
  offset: number,
  stride: number,
  size: number,
  inverse: boolean,
): void {
  // Bit-reversal permutation.
  for (let index = 1, reversed = 0; index < size; index += 1) {
    let bit = size >> 1;
    while (reversed & bit) {
      reversed ^= bit;
      bit >>= 1;
    }
    reversed ^= bit;
    if (index < reversed) {
      const a = offset + index * stride;
      const b = offset + reversed * stride;
      const swapReal = real[a] as number;
      real[a] = real[b] as number;
      real[b] = swapReal;
      const swapImaginary = imaginary[a] as number;
      imaginary[a] = imaginary[b] as number;
      imaginary[b] = swapImaginary;
    }
  }
  const sign = inverse ? 1 : -1;
  for (let length = 2; length <= size; length <<= 1) {
    const angle = (sign * 2 * Math.PI) / length;
    const stepReal = Math.cos(angle);
    const stepImaginary = Math.sin(angle);
    const half = length >> 1;
    for (let start = 0; start < size; start += length) {
      let twiddleReal = 1;
      let twiddleImaginary = 0;
      for (let k = 0; k < half; k += 1) {
        const even = offset + (start + k) * stride;
        const odd = offset + (start + k + half) * stride;
        const oddReal =
          (real[odd] as number) * twiddleReal - (imaginary[odd] as number) * twiddleImaginary;
        const oddImaginary =
          (real[odd] as number) * twiddleImaginary + (imaginary[odd] as number) * twiddleReal;
        real[odd] = (real[even] as number) - oddReal;
        imaginary[odd] = (imaginary[even] as number) - oddImaginary;
        real[even] = (real[even] as number) + oddReal;
        imaginary[even] = (imaginary[even] as number) + oddImaginary;
        const nextReal = twiddleReal * stepReal - twiddleImaginary * stepImaginary;
        twiddleImaginary = twiddleReal * stepImaginary + twiddleImaginary * stepReal;
        twiddleReal = nextReal;
      }
    }
  }
}

/** In-place inverse transform of a square grid stored row by row, without scaling. */
export function inverseFft2d(real: Float32Array, imaginary: Float32Array, size: number): void {
  for (let row = 0; row < size; row += 1) {
    fft(real, imaginary, row * size, 1, size, true);
  }
  for (let column = 0; column < size; column += 1) {
    fft(real, imaginary, column, size, size, true);
  }
}

export function isPowerOfTwo(value: number): boolean {
  return Number.isInteger(value) && value > 0 && (value & (value - 1)) === 0;
}
