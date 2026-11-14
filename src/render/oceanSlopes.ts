import { float, sin, texture, uniform, vec2 } from 'three/tsl';
import {
  DataTexture,
  DataUtils,
  HalfFloatType,
  LinearFilter,
  LinearMipmapLinearFilter,
  type Node,
  RepeatWrapping,
  RGFormat,
} from 'three/webgpu';
import { CALM_SEA_WAVES, createAnalyticWaves, wavePhaseAt } from '../ocean/analyticWaves.ts';
import { CALM_SEA_PATCH_LENGTH_M, createOceanField } from '../ocean/oceanField.ts';
import { CALM_SEA } from '../ocean/spectrum.ts';

/** Slopes of the sea surface as shader nodes, for a horizontal position in metres. */
export interface SlopeSource {
  /** Slope of the short waves alone, which texture the disturbed water around the hull. */
  readonly fine: Node<'vec2'>;
  /** Slope of the whole surface. */
  readonly total: Node<'vec2'>;
  /** Moves the waves to `timeSeconds`. */
  update(timeSeconds: number): void;
  dispose(): void;
}

/** Samples along each side of the FFT wave patch. */
const PATCH_SIZE = 128;
/** Scale and rotation of the second, coarser layer of waves, which hides the repetition. */
const SECOND_LAYER_SCALE = 3.7;
const SECOND_LAYER_ROTATION_RAD = 0.61;
const SECOND_LAYER_WEIGHT = 0.6;

/**
 * Slopes read from a texture holding the FFT wave field, evaluated on the processor whenever the
 * time changes. The periodic patch is laid twice, at two scales and orientations.
 */
export function createSpectralSlopes(horizontal: Node<'vec2'>): SlopeSource {
  const field = createOceanField({
    ...CALM_SEA,
    patchLengthM: CALM_SEA_PATCH_LENGTH_M,
    size: PATCH_SIZE,
  });
  const data = new Uint16Array(PATCH_SIZE * PATCH_SIZE * 2);
  const slopeTexture = new DataTexture(data, PATCH_SIZE, PATCH_SIZE, RGFormat, HalfFloatType);
  slopeTexture.wrapS = RepeatWrapping;
  slopeTexture.wrapT = RepeatWrapping;
  slopeTexture.magFilter = LinearFilter;
  slopeTexture.minFilter = LinearMipmapLinearFilter;
  slopeTexture.generateMipmaps = true;

  const patch = float(field.patchLengthM);
  const cosine = Math.cos(SECOND_LAYER_ROTATION_RAD);
  const sine = Math.sin(SECOND_LAYER_ROTATION_RAD);
  const rotated = vec2(
    horizontal.x.mul(cosine).sub(horizontal.y.mul(sine)),
    horizontal.x.mul(sine).add(horizontal.y.mul(cosine)),
  );
  const fine = texture(slopeTexture, horizontal.div(patch)).rg;
  const coarse = texture(slopeTexture, rotated.div(patch.mul(SECOND_LAYER_SCALE))).rg;

  let evaluatedTime = Number.NaN;
  return {
    fine,
    total: fine.add(coarse.mul(SECOND_LAYER_WEIGHT)),
    update: (timeSeconds) => {
      if (timeSeconds === evaluatedTime) {
        return;
      }
      evaluatedTime = timeSeconds;
      const { slopes } = field.evaluate(timeSeconds);
      for (let index = 0; index < slopes.length; index += 1) {
        data[index] = DataUtils.toHalfFloat(slopes[index] ?? 0);
      }
      slopeTexture.needsUpdate = true;
    },
    dispose: () => {
      slopeTexture.dispose();
    },
  };
}

/**
 * Slopes computed in the shader as a sum of sinusoidal waves. Only the phase of each wave at the
 * origin changes with time; it is passed as a uniform.
 */
export function createAnalyticSlopes(horizontal: Node<'vec2'>): SlopeSource {
  const waves = createAnalyticWaves({ ...CALM_SEA, ...CALM_SEA_WAVES });
  const phases = waves.map(() => uniform(0));

  let total: Node<'vec2'> = vec2(0, 0);
  waves.forEach((wave, index) => {
    const phase = phases[index] ?? uniform(0);
    const argument = horizontal.x.mul(wave.kx).add(horizontal.y.mul(wave.kz)).add(phase);
    const steepness = sin(argument).mul(-wave.amplitudeM);
    total = total.add(vec2(steepness.mul(wave.kx), steepness.mul(wave.kz)));
  });

  return {
    fine: total,
    total,
    update: (timeSeconds) => {
      waves.forEach((wave, index) => {
        const phase = phases[index];
        if (phase !== undefined) {
          phase.value = wavePhaseAt(wave, timeSeconds);
        }
      });
    },
    dispose: () => undefined,
  };
}
