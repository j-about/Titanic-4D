import { describe, expect, it } from 'vitest';
import { dataset } from '../data/dataset.ts';
import { shipTimeToSeconds } from '../time/shipTime.ts';
import { createSkyModel, equatorialToSceneDirection } from './skyModel.ts';
import {
  decodeStar,
  decodeStarCatalogue,
  encodeStarCatalogue,
  equatorialDirection,
} from './starCatalogue.ts';

const site = dataset.site.positions.find((position) => position.id === 'wreck-boiler-field');
const latitudeDeg = site?.latitude_deg ?? Number.NaN;
const longitudeDeg = site?.longitude_deg ?? Number.NaN;
const shipMinusGmtMinutes = dataset.timeReference.adopted_offset.ship_minus_gmt_min;
const headingTrueDeg = dataset.site.heading.true_deg;

/** Sky with the first scene axis pointing true north, so that scene directions read as bearings. */
const northUp = createSkyModel({
  latitudeDeg,
  longitudeDeg,
  headingTrueDeg: 0,
  shipMinusGmtMinutes,
});
const asSailed = createSkyModel({ latitudeDeg, longitudeDeg, headingTrueDeg, shipMinusGmtMinutes });
const seconds = (clock: string): number => shipTimeToSeconds(`1912-04-${clock}`);
const DEG = 180 / Math.PI;

function altitudeAzimuth(direction: readonly [number, number, number]): {
  altitude: number;
  azimuth: number;
} {
  return {
    altitude: Math.asin(direction[1]) * DEG,
    azimuth: (((Math.atan2(direction[2], direction[0]) * DEG) % 360) + 360) % 360,
  };
}

/** J2000 coordinates of a few bright stars, from the catalogue itself (degrees). */
const STARS = {
  polaris: [37.95, 89.264],
  arcturus: [213.915, 19.182],
  vega: [279.235, 38.784],
  sirius: [101.287, -16.716],
  dubhe: [165.932, 61.751],
} as const;

function starAt(t: number, star: readonly [number, number]): { altitude: number; azimuth: number } {
  const sky = northUp.evaluate(t);
  return altitudeAzimuth(
    equatorialToSceneDirection(sky.equatorialToScene, equatorialDirection(star[0], star[1])),
  );
}

/**
 * Independent check: altitude from the classical hour-angle formula, with Greenwich mean sidereal
 * time from the linear expression of the Astronomical Almanac and no precession. It agrees with a
 * rigorous computation to about one degree over 88 years.
 */
function classicalAltitude(t: number, star: readonly [number, number]): number {
  const date = Date.UTC(1912, 3, 14, 23, 40) + (t - shipMinusGmtMinutes * 60) * 1000;
  const daysSinceJ2000 = (date - Date.UTC(2000, 0, 1, 12)) / 86_400_000;
  const siderealDeg =
    (((280.46061837 + 360.98564736629 * daysSinceJ2000 + longitudeDeg) % 360) + 360) % 360;
  const hourAngle = (siderealDeg - star[0]) / DEG;
  const declination = star[1] / DEG;
  const latitude = latitudeDeg / DEG;
  return (
    Math.asin(
      Math.sin(latitude) * Math.sin(declination) +
        Math.cos(latitude) * Math.cos(declination) * Math.cos(hourAngle),
    ) * DEG
  );
}

describe('orientation of the sky', () => {
  it('is a rotation at every instant', () => {
    for (const t of [0, 3000, 9600]) {
      const m = northUp.evaluate(t).equatorialToScene;
      const row = (index: number): number[] => m.slice(index * 3, index * 3 + 3);
      const dot = (a: number[], b: number[]): number =>
        a.reduce((sum, value, axis) => sum + value * (b[axis] ?? 0), 0);
      for (const index of [0, 1, 2]) {
        expect(dot(row(index), row(index))).toBeCloseTo(1, 9);
        expect(dot(row(index), row((index + 1) % 3))).toBeCloseTo(0, 9);
      }
    }
  });

  it('keeps the Pole Star due north at about the latitude of the ship', () => {
    for (const t of [0, 4800, 9600]) {
      const polaris = starAt(t, STARS.polaris);
      expect(Math.abs(polaris.altitude - latitudeDeg)).toBeLessThan(1.5);
      expect(Math.min(polaris.azimuth, 360 - polaris.azimuth)).toBeLessThan(2);
    }
  });

  it('agrees with the classical hour-angle formula for bright stars', () => {
    for (const t of [0, 4800, 9600]) {
      for (const star of [STARS.arcturus, STARS.vega, STARS.dubhe, STARS.sirius]) {
        expect(Math.abs(starAt(t, star).altitude - classicalAltitude(t, star))).toBeLessThan(1);
      }
    }
  });

  it('shows the spring sky of the North Atlantic: Arcturus high, Vega rising, Sirius set', () => {
    const t = seconds('14T23:40');
    expect(starAt(t, STARS.arcturus).altitude).toBeGreaterThan(55);
    expect(starAt(t, STARS.vega).altitude).toBeGreaterThan(15);
    expect(starAt(t, STARS.vega).azimuth).toBeLessThan(90);
    expect(starAt(t, STARS.dubhe).altitude).toBeGreaterThan(60);
    expect(starAt(t, STARS.sirius).altitude).toBeLessThan(0);
  });

  it('turns by about fifteen degrees an hour around the pole', () => {
    const first = starAt(seconds('14T23:40'), STARS.vega);
    const later = starAt(seconds('15T01:40'), STARS.vega);
    expect(later.altitude - first.altitude).toBeGreaterThan(15);
    expect(later.altitude - first.altitude).toBeLessThan(25);
  });

  it('places the Pole Star off the starboard bow for a ship heading north-north-west', () => {
    const sky = asSailed.evaluate(0);
    const [forward, up, starboard] = equatorialToSceneDirection(
      sky.equatorialToScene,
      equatorialDirection(STARS.polaris[0], STARS.polaris[1]),
    );
    expect(forward).toBeGreaterThan(0);
    expect(starboard).toBeGreaterThan(0);
    expect(Math.atan2(starboard, forward) * DEG).toBeCloseTo(360 - headingTrueDeg, 0);
    expect(up).toBeGreaterThan(0.6);
  });

  it('is a function of time alone', () => {
    expect(asSailed.evaluate(4321)).toEqual(asSailed.evaluate(4321));
  });
});

describe('Moon, Sun and planets', () => {
  it('keeps the Moon below the horizon all night, as the witnesses said', () => {
    for (let t = 0; t <= seconds('15T02:26'); t += 300) {
      expect(northUp.evaluate(t).moon.altitudeDeg).toBeLessThan(0);
    }
  });

  it('finds a thin waning crescent, two to three days before new Moon', () => {
    const moon = northUp.evaluate(seconds('15T02:20')).moon;
    expect(moon.illuminatedFraction).toBeLessThan(0.1);
    expect(moon.phaseAngleDeg).toBeGreaterThan(315);
    expect(moon.phaseAngleDeg).toBeLessThan(345);
  });

  it('keeps the Sun below astronomical twilight until the end', () => {
    for (let t = 0; t <= seconds('15T02:26'); t += 300) {
      expect(northUp.evaluate(t).sunAltitudeDeg).toBeLessThan(-18);
    }
  });

  it('gives the five naked-eye planets with unit directions consistent with their altitude', () => {
    const { planets } = northUp.evaluate(seconds('15T00:00'));
    expect(planets.map((planet) => planet.name)).toEqual([
      'Mercury',
      'Venus',
      'Mars',
      'Jupiter',
      'Saturn',
    ]);
    for (const planet of planets) {
      expect(Math.hypot(...planet.direction)).toBeCloseTo(1, 9);
      // The direction carries no refraction; the altitude does. They differ by well under a degree
      // except very close to the horizon.
      if (planet.altitudeDeg > 5) {
        expect(
          Math.abs(altitudeAzimuth(planet.direction).altitude - planet.altitudeDeg),
        ).toBeLessThan(0.5);
      }
      expect(Number.isFinite(planet.magnitude)).toBe(true);
    }
  });

  it('has Jupiter up in the south-east during the sinking', () => {
    const jupiter = northUp
      .evaluate(seconds('15T01:00'))
      .planets.find((planet) => planet.name === 'Jupiter');
    expect(jupiter?.altitudeDeg).toBeGreaterThan(0);
    expect(jupiter?.magnitude).toBeLessThan(-1.5);
  });
});

describe('star catalogue', () => {
  it('round-trips through its binary form', () => {
    const star = {
      rightAscensionDeg: 213.915,
      declinationDeg: 19.182,
      magnitude: -0.04,
      colourIndex: 1.23,
    };
    const decoded = decodeStar(encodeStarCatalogue([star]), 0);
    expect(decoded.rightAscensionDeg).toBeCloseTo(star.rightAscensionDeg, 2);
    expect(decoded.declinationDeg).toBeCloseTo(star.declinationDeg, 2);
    expect(decoded.magnitude).toBeCloseTo(star.magnitude, 6);
    expect(decoded.colourIndex).toBeCloseTo(star.colourIndex, 6);
  });

  it('rejects a truncated file', () => {
    expect(() => decodeStarCatalogue(new Uint8Array(7))).toThrow(RangeError);
  });
});
