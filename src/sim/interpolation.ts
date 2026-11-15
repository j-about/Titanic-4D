/** A function of one variable defined by sample points and held constant outside their range. */
export type Curve = (x: number) => number;

function assertSamples(xs: readonly number[], ys: readonly number[]): void {
  if (xs.length === 0 || xs.length !== ys.length) {
    throw new RangeError('A curve needs as many abscissae as ordinates, and at least one.');
  }
  for (let index = 1; index < xs.length; index += 1) {
    if ((xs[index] ?? 0) <= (xs[index - 1] ?? 0)) {
      throw new RangeError('Curve abscissae must be strictly increasing.');
    }
  }
}

/** Index `i` of the segment such that `xs[i] <= x < xs[i + 1]`, clamped to the valid segments. */
function segmentIndex(xs: readonly number[], x: number): number {
  let low = 0;
  let high = xs.length - 1;
  while (high - low > 1) {
    const middle = (low + high) >> 1;
    if ((xs[middle] ?? 0) <= x) {
      low = middle;
    } else {
      high = middle;
    }
  }
  return low;
}

function at(values: readonly number[], index: number): number {
  const value = values[index];
  if (value === undefined) {
    throw new RangeError(`Index ${index} is outside the samples.`);
  }
  return value;
}

/** Piecewise-linear interpolation through the samples. */
export function createLinearCurve(xs: readonly number[], ys: readonly number[]): Curve {
  assertSamples(xs, ys);
  const lastIndex = xs.length - 1;
  return (x) => {
    if (x <= at(xs, 0)) {
      return at(ys, 0);
    }
    if (x >= at(xs, lastIndex)) {
      return at(ys, lastIndex);
    }
    const index = segmentIndex(xs, x);
    const x0 = at(xs, index);
    const ratio = (x - x0) / (at(xs, index + 1) - x0);
    return at(ys, index) + ratio * (at(ys, index + 1) - at(ys, index));
  };
}

/**
 * Tangents of the Fritsch–Carlson monotone cubic interpolant: between two samples the curve never
 * leaves the interval of their values, so it introduces no overshoot that the data do not contain.
 */
function monotoneTangents(xs: readonly number[], ys: readonly number[]): number[] {
  const count = xs.length;
  const slopes: number[] = [];
  for (let index = 0; index < count - 1; index += 1) {
    slopes.push((at(ys, index + 1) - at(ys, index)) / (at(xs, index + 1) - at(xs, index)));
  }
  const tangents: number[] = [];
  for (let index = 0; index < count; index += 1) {
    const before = slopes[index - 1];
    const after = slopes[index];
    if (before === undefined || after === undefined) {
      tangents.push(before ?? after ?? 0);
    } else if (before * after <= 0) {
      tangents.push(0);
    } else {
      const widthBefore = at(xs, index) - at(xs, index - 1);
      const widthAfter = at(xs, index + 1) - at(xs, index);
      const weightBefore = 2 * widthAfter + widthBefore;
      const weightAfter = widthAfter + 2 * widthBefore;
      tangents.push((weightBefore + weightAfter) / (weightBefore / before + weightAfter / after));
    }
  }
  return tangents;
}

/** Smooth, shape-preserving cubic interpolation through the samples. */
export function createMonotoneCurve(xs: readonly number[], ys: readonly number[]): Curve {
  assertSamples(xs, ys);
  if (xs.length === 1) {
    return () => at(ys, 0);
  }
  const tangents = monotoneTangents(xs, ys);
  const lastIndex = xs.length - 1;
  return (x) => {
    if (x <= at(xs, 0)) {
      return at(ys, 0);
    }
    if (x >= at(xs, lastIndex)) {
      return at(ys, lastIndex);
    }
    const index = segmentIndex(xs, x);
    const width = at(xs, index + 1) - at(xs, index);
    const s = (x - at(xs, index)) / width;
    const s2 = s * s;
    const s3 = s2 * s;
    return (
      (2 * s3 - 3 * s2 + 1) * at(ys, index) +
      (s3 - 2 * s2 + s) * width * at(tangents, index) +
      (-2 * s3 + 3 * s2) * at(ys, index + 1) +
      (s3 - s2) * width * at(tangents, index + 1)
    );
  };
}

/** Indices of the samples that bracket `x`: equal when `x` lies on or beyond an end sample. */
export function bracketingIndices(xs: readonly number[], x: number): readonly [number, number] {
  const lastIndex = xs.length - 1;
  if (x <= at(xs, 0)) {
    return [0, 0];
  }
  if (x >= at(xs, lastIndex)) {
    return [lastIndex, lastIndex];
  }
  const index = segmentIndex(xs, x);
  return at(xs, index) === x ? [index, index] : [index, index + 1];
}
