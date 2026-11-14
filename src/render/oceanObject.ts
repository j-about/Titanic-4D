import {
  cameraPosition,
  clamp,
  color,
  dot,
  float,
  max,
  min,
  mix,
  positionWorld,
  reflector,
  smoothstep,
  uniform,
  vec2,
  vec3,
} from 'three/tsl';
import {
  DoubleSide,
  Group,
  Mesh,
  MeshBasicNodeMaterial,
  type Node,
  PlaneGeometry,
  Vector4,
} from 'three/webgpu';
import type { SceneVector } from '../sim/sceneFrame.ts';
import type { WaterlineFootprint } from '../sim/waterline.ts';
import { createAnalyticSlopes, createSpectralSlopes } from './oceanSlopes.ts';
import type { QualitySettings } from './quality.ts';

export interface OceanFrame {
  /** Time used for the phases of the waves, in seconds. */
  readonly timeSeconds: number;
  readonly cameraPosition: SceneVector;
  /** Stretches of hull cutting the surface, at most two: the bow and stern sections. */
  readonly footprints: readonly WaterlineFootprint[];
}

export interface OceanObject {
  readonly root: Group;
  update(frame: OceanFrame): void;
  dispose(): void;
}

const SEA_SIZE_M = 90_000;
/** Colour of the water body seen from above at night, where it reflects nothing. */
const DEEP_WATER_COLOUR = 0x010409;
/** Colour of the surface seen from below. */
const UNDERSIDE_COLOUR = 0x02101a;
/** Reflectance of water at normal incidence. */
const NORMAL_REFLECTANCE = 0.02;
/** Displacement of the reflection, in screen units per unit of slope. */
const REFLECTION_DISTORTION = 0.8;
/** Stretch of the displacement along the line of sight at grazing incidence. */
const MAX_REFLECTION_STRETCH = 7;
/** Width of the band of disturbed water around the hull, in metres, and its brightness. */
const FOAM_WIDTH_M = 3.5;
const FOAM_BRIGHTNESS = 0.06;
/** Fraction of the length of a footprint over which each end narrows to a point. */
const FOOTPRINT_TAPER = 0.3;
const MAX_FOOTPRINTS = 2;

/**
 * Signed distance from a point of the surface to the outline of a footprint, in metres: negative
 * inside. The outline is a segment thickened by a half-breadth that tapers to nothing over the
 * first and last fractions of its length, like the waterline of a hull.
 */
function distanceToFootprint(
  point: Node<'vec2'>,
  start: Node<'vec2'>,
  end: Node<'vec2'>,
  halfBreadth: Node<'float'>,
): Node<'float'> {
  const toPoint = point.sub(start);
  const along = end.sub(start);
  const ratio = clamp(dot(toPoint, along).div(max(dot(along, along), 0.0001)), 0, 1);
  const fromNearestEnd = min(ratio, float(1).sub(ratio));
  const taper = smoothstep(float(0), float(FOOTPRINT_TAPER), fromNearestEnd);
  return toPoint.sub(along.mul(ratio)).length().sub(halfBreadth.mul(taper));
}

/**
 * Creates the sea: a plane that mirrors the scene, its reflection displaced by the slopes of the
 * waves, with Fresnel weighting and a faint band of disturbed water around the hull.
 */
export function createOceanObject(
  quality: Pick<QualitySettings, 'waves' | 'reflectionResolutionScale'>,
): OceanObject {
  const underwater = uniform(0);
  const footprintSegments = Array.from({ length: MAX_FOOTPRINTS }, () => uniform(new Vector4()));
  const footprintRadii = Array.from({ length: MAX_FOOTPRINTS }, () => uniform(0));

  const horizontal = positionWorld.xz;
  const slopes =
    quality.waves === 'spectral'
      ? createSpectralSlopes(horizontal)
      : createAnalyticSlopes(horizontal);
  const slope = slopes.total;

  const normal = vec3(slope.x.negate(), 1, slope.y.negate()).normalize();
  const toCamera = cameraPosition.sub(positionWorld).normalize();
  const cosIncidence = max(dot(normal, toCamera), 0);
  const fresnel = float(NORMAL_REFLECTANCE).add(
    float(1 - NORMAL_REFLECTANCE).mul(float(1).sub(cosIncidence).pow(5)),
  );

  // The reflection is looked up where a tilted facet would send the line of sight: sideways by
  // the slope across the view, and further along the view the more grazing the incidence.
  const sight = toCamera.xz.normalize();
  const across = vec2(sight.y, sight.x.negate());
  const stretch = clamp(float(1).div(cosIncidence.add(0.12)), 1, MAX_REFLECTION_STRETCH);
  const displacement = vec2(dot(slope, across), dot(slope, sight).mul(stretch)).mul(
    REFLECTION_DISTORTION,
  );
  const reflection = reflector({ resolutionScale: quality.reflectionResolutionScale });
  reflection.target.rotateX(-Math.PI / 2);
  reflection.uvNode = reflection.uvNode?.add(displacement) ?? null;

  let foam: Node<'float'> = float(0);
  footprintSegments.forEach((segment, index) => {
    const radius = footprintRadii[index] ?? uniform(0);
    const distance = distanceToFootprint(horizontal, segment.xy, segment.zw, radius);
    const band = smoothstep(float(FOAM_WIDTH_M), float(0), distance.abs()).mul(
      radius.greaterThan(0).select(1, 0),
    );
    foam = max(foam, band);
  });
  const ripple = clamp(slopes.fine.length().mul(60), 0.25, 1);
  const foamColour = vec3(0.62, 0.7, 0.78).mul(foam.mul(ripple).mul(FOAM_BRIGHTNESS));

  const material = new MeshBasicNodeMaterial({ side: DoubleSide });
  const fromAbove = mix(color(DEEP_WATER_COLOUR), reflection.rgb, fresnel).add(foamColour);
  material.colorNode = mix(fromAbove, color(UNDERSIDE_COLOUR), underwater);

  const geometry = new PlaneGeometry(SEA_SIZE_M, SEA_SIZE_M);
  const mesh = new Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.name = 'sea';
  const root = new Group();
  root.add(mesh, reflection.target);

  const update = (frame: OceanFrame): void => {
    slopes.update(frame.timeSeconds);
    mesh.position.set(frame.cameraPosition[0], 0, frame.cameraPosition[2]);
    underwater.value = frame.cameraPosition[1] < 0 ? 1 : 0;
    footprintSegments.forEach((segment, index) => {
      const footprint = frame.footprints[index];
      const radius = footprintRadii[index];
      if (radius === undefined) {
        return;
      }
      if (footprint === undefined) {
        radius.value = 0;
        return;
      }
      // Horizontal scene coordinates are (forward, starboard).
      segment.value.set(
        footprint.startForward,
        footprint.startStarboard,
        footprint.endForward,
        footprint.endStarboard,
      );
      radius.value = footprint.halfBreadthM;
    });
  };

  const dispose = (): void => {
    geometry.dispose();
    material.dispose();
    slopes.dispose();
    reflection.dispose();
  };

  return { root, update, dispose };
}
