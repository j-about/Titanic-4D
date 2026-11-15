import {
  Body,
  Equator,
  Horizon,
  Illumination,
  MakeTime,
  MoonPhase,
  Observer,
  RotateVector,
  Rotation_EQJ_HOR,
  Vector,
} from 'astronomy-engine';
import { toUtcDate } from '../time/shipTime.ts';

/**
 * Orientation of the sky above the ship.
 *
 * The star field is stored in the J2000 equatorial frame. For a given instant, the ephemeris
 * library gives the rotation from that frame to the observer's horizon, which includes
 * precession, nutation and the rotation of the Earth; a last rotation about the vertical turns
 * the horizon frame so that its first axis points along the ship's heading. Refraction is not
 * applied to the star field.
 */
export interface SkyBody {
  readonly name: string;
  /** Unit vector toward the body in the scene frame: x forward, y up, z to starboard. */
  readonly direction: readonly [number, number, number];
  readonly altitudeDeg: number;
  /** Degrees clockwise from true north. */
  readonly azimuthDeg: number;
  readonly magnitude: number;
}

export interface SkyState {
  /**
   * Rotation from the J2000 equatorial frame to the scene frame, as nine numbers in row-major
   * order: scene = M · equatorial.
   */
  readonly equatorialToScene: readonly number[];
  /** The naked-eye planets, above or below the horizon. */
  readonly planets: readonly SkyBody[];
  readonly moon: SkyBody & {
    /** Fraction of the disc that is sunlit, from 0 to 1. */
    readonly illuminatedFraction: number;
    /** Difference of ecliptic longitude between Moon and Sun: 0 new, 180 full, in degrees. */
    readonly phaseAngleDeg: number;
  };
  readonly sunAltitudeDeg: number;
}

export interface SkyModelOptions {
  readonly latitudeDeg: number;
  readonly longitudeDeg: number;
  /** True heading of the ship, in degrees clockwise from north. */
  readonly headingTrueDeg: number;
  /** Ship's time minus Greenwich Mean Time, in minutes. */
  readonly shipMinusGmtMinutes: number;
}

export interface SkyModel {
  /** Returns the sky at `t` seconds after the collision. Pure: same `t`, same sky. */
  evaluate(t: number): SkyState;
}

const RADIANS_PER_DEGREE = Math.PI / 180;

const NAKED_EYE_PLANETS: readonly { readonly name: string; readonly body: Body }[] = [
  { name: 'Mercury', body: Body.Mercury },
  { name: 'Venus', body: Body.Venus },
  { name: 'Mars', body: Body.Mars },
  { name: 'Jupiter', body: Body.Jupiter },
  { name: 'Saturn', body: Body.Saturn },
];

export function createSkyModel(options: SkyModelOptions): SkyModel {
  const observer = new Observer(options.latitudeDeg, options.longitudeDeg, 0);
  const heading = options.headingTrueDeg * RADIANS_PER_DEGREE;
  const sinHeading = Math.sin(heading);
  const cosHeading = Math.cos(heading);

  /** Turns a vector of the horizon frame (north, west, zenith) into the scene frame. */
  const horizonToScene = (
    north: number,
    west: number,
    zenith: number,
  ): [number, number, number] => {
    const east = -west;
    return [east * sinHeading + north * cosHeading, zenith, east * cosHeading - north * sinHeading];
  };

  const evaluate = (t: number): SkyState => {
    const time = MakeTime(toUtcDate(t, options.shipMinusGmtMinutes));
    const rotation = Rotation_EQJ_HOR(time, observer);
    const rotate = (x: number, y: number, z: number): [number, number, number] => {
      const horizontal = RotateVector(rotation, new Vector(x, y, z, time));
      return horizonToScene(horizontal.x, horizontal.y, horizontal.z);
    };
    // The columns of the matrix are the images of the three axes of the equatorial frame.
    const columnX = rotate(1, 0, 0);
    const columnY = rotate(0, 1, 0);
    const columnZ = rotate(0, 0, 1);
    const equatorialToScene = [
      columnX[0],
      columnY[0],
      columnZ[0],
      columnX[1],
      columnY[1],
      columnZ[1],
      columnX[2],
      columnY[2],
      columnZ[2],
    ];

    const locate = (name: string, body: Body): SkyBody => {
      const j2000 = Equator(body, time, observer, false, true);
      const length = Math.hypot(j2000.vec.x, j2000.vec.y, j2000.vec.z);
      const ofDate = Equator(body, time, observer, true, true);
      const horizontal = Horizon(time, observer, ofDate.ra, ofDate.dec, 'normal');
      return {
        name,
        direction: rotate(j2000.vec.x / length, j2000.vec.y / length, j2000.vec.z / length),
        altitudeDeg: horizontal.altitude,
        azimuthDeg: horizontal.azimuth,
        magnitude: Illumination(body, time).mag,
      };
    };

    const sun = Equator(Body.Sun, time, observer, true, true);
    return {
      equatorialToScene,
      planets: NAKED_EYE_PLANETS.map((planet) => locate(planet.name, planet.body)),
      moon: {
        ...locate('Moon', Body.Moon),
        illuminatedFraction: Illumination(Body.Moon, time).phase_fraction,
        phaseAngleDeg: MoonPhase(time),
      },
      sunAltitudeDeg: Horizon(time, observer, sun.ra, sun.dec, 'normal').altitude,
    };
  };

  return { evaluate };
}

/** Applies the row-major rotation of a sky state to an equatorial unit vector. */
export function equatorialToSceneDirection(
  matrix: readonly number[],
  direction: readonly [number, number, number],
): [number, number, number] {
  const [x, y, z] = direction;
  const m = (index: number): number => matrix[index] ?? 0;
  return [
    m(0) * x + m(1) * y + m(2) * z,
    m(3) * x + m(4) * y + m(5) * z,
    m(6) * x + m(7) * y + m(8) * z,
  ];
}
