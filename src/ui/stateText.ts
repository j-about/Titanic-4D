import type { Certainty } from '../data/schema/common.ts';
import type { Phase, ShipState } from '../sim/timelineModel.ts';

/** Names of the phases of the night, as shown to the user. */
export const PHASE_LABELS: Readonly<Record<Phase, string>> = {
  afloat: 'Afloat, sinking by the head',
  'final-plunge': 'Final plunge',
  'break-up': 'Break-up',
  descent: 'Descent to the seabed',
  wreck: 'On the seabed',
};

export const CERTAINTY_LABELS: Readonly<Record<Certainty, string>> = {
  established: 'Established',
  estimated: 'Estimated',
  debated: 'Debated',
};

export const CERTAINTY_DESCRIPTIONS: Readonly<Record<Certainty, string>> = {
  established: 'Primary evidence and broad agreement',
  estimated: 'Derived or approximate',
  debated: 'Sources disagree',
};

const numberFormat = new Intl.NumberFormat('en-GB', {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});
const integerFormat = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 });

/** Formats an angle to one decimal, without a negative zero. */
function degrees(value: number): string {
  const rounded = Math.round(Math.abs(value) * 10) / 10;
  return `${numberFormat.format(rounded)}°`;
}

/** Trim in words: `3.2° by the head`. */
export function describeTrim(trimDeg: number): string {
  if (Math.abs(trimDeg) < 0.05) {
    return 'On an even keel';
  }
  return `${degrees(trimDeg)} by the ${trimDeg > 0 ? 'head' : 'stern'}`;
}

/** List in words: `5.0° to starboard`. */
export function describeList(heelDeg: number): string {
  if (Math.abs(heelDeg) < 0.05) {
    return 'Upright';
  }
  return `${degrees(heelDeg)} to ${heelDeg > 0 ? 'starboard' : 'port'}`;
}

/** Mass of water aboard, rounded to the nearest hundred tonnes. */
export function describeWaterAboard(tonnes: number | null): string {
  if (tonnes === null) {
    return 'Not applicable after the break-up';
  }
  return `About ${integerFormat.format(Math.round(tonnes / 100) * 100)} tonnes`;
}

export function describeLighting(output: number): string {
  if (output >= 0.999) {
    return 'All lights burning';
  }
  if (output <= 0) {
    return 'Lights out';
  }
  return 'Lights still on, power failing';
}

export function describeBoats(state: ShipState): string {
  const afloat = state.boats.filter((boat) => boat.status === 'afloat').length;
  const lowering = state.boats.filter((boat) => boat.status === 'lowering').length;
  const loweringText = lowering === 0 ? '' : `, ${lowering} being lowered`;
  return `${afloat} of ${state.boats.length} away${loweringText}`;
}

export function describeFlooding(state: ShipState): string {
  const flooded = state.compartments.filter(
    (compartment) => compartment.status === 'flooded',
  ).length;
  const flooding = state.compartments.filter(
    (compartment) => compartment.status === 'flooding',
  ).length;
  if (flooded === 0 && flooding === 0) {
    return 'No water in the ship';
  }
  return `${flooded} of ${state.compartments.length} compartments flooded, ${flooding} flooding`;
}

/**
 * One or two sentences describing what the scene shows at this instant. It is the text
 * alternative of the 3D view and is derived from the same state as the image.
 */
export function describeScene(state: ShipState): string {
  switch (state.phase) {
    case 'afloat':
    case 'final-plunge': {
      const attitude =
        Math.abs(state.trimDeg) < 0.5
          ? 'The ship floats almost level'
          : `The ship is down by the ${state.trimDeg > 0 ? 'head' : 'stern'} by ${degrees(state.trimDeg)}`;
      const list =
        Math.abs(state.heelDeg) < 0.5 ? 'upright' : `listing ${describeList(state.heelDeg)}`;
      const boats = describeBoats(state);
      const lights = describeLighting(state.lightingOutput).toLowerCase();
      const signal = state.rockets.length > 0 ? ' A white distress signal is in the air.' : '';
      return `${attitude}, ${list}, on a flat calm sea under a moonless, starlit sky. Lifeboats: ${boats}. ${lights.charAt(0).toUpperCase()}${lights.slice(1)}.${signal}`;
    }
    case 'break-up':
      return 'The hull has parted abaft amidships. The bow section is going under; the stern section settles back, then rises before sinking. The lights are out. All twenty boats are on the water.';
    case 'descent':
      return 'The ship has disappeared from the surface. The two sections are falling toward the seabed, about 3,800 metres down. The boats lie scattered on a calm sea.';
    case 'wreck':
      return 'The two sections of the wreck lie on the seabed about 3,800 metres down and about 600 metres apart, lit by the lamp of the camera: no daylight reaches this depth.';
  }
}
