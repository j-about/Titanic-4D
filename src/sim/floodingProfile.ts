import type { Dataset } from '../data/schema/dataset.ts';
import { createHullForm } from '../ship/hullForm.ts';
import { deckHeightAt } from '../ship/sheer.ts';
import { seaLevelAboveKeel } from './pose.ts';
import type { CompartmentStatus, ShipState } from './timelineModel.ts';

/**
 * Longitudinal section of the hull with the water in each watertight compartment, for a
 * diagram. All lengths are in metres in the body frame: `x` aft of the forward perpendicular,
 * `z` above the keel.
 */
export type ProfilePoint = readonly [x: number, z: number];

export interface ProfileCompartment {
  readonly id: string;
  readonly name: string;
  readonly xStart: number;
  readonly xEnd: number;
  /** Height of the bottom of the hull and of the top of the plating at mid-length. */
  readonly floorZ: number;
  readonly topZ: number;
}

export interface ProfileWater {
  readonly id: string;
  readonly status: CompartmentStatus;
  /** Height of the water surface in the compartment, between its floor and its top. */
  readonly waterZ: number;
  /** Depth of water above the floor of the compartment. */
  readonly depthM: number;
}

export interface FloodingProfile {
  /** Closed outline of the hull, from the stem along the keel to the stern and back over the top. */
  readonly outline: readonly ProfilePoint[];
  readonly compartments: readonly ProfileCompartment[];
  /** Watertight bulkheads: station and height to which each is watertight. */
  readonly bulkheads: readonly { readonly id: string; readonly x: number; readonly topZ: number }[];
  /** Water in each compartment at the given instant, in the order of `compartments`. */
  water(state: ShipState): readonly ProfileWater[];
  /**
   * Height at which the sea outside cuts the two ends of the outline, or `null` once the hull
   * has parted and no single line describes it.
   */
  seaLine(state: ShipState): { readonly forwardZ: number; readonly aftZ: number } | null;
  /** Stations of the two ends of the outline. */
  readonly xForward: number;
  readonly xAft: number;
}

const OUTLINE_STEP_M = 4;

export function createFloodingProfile(dataset: Dataset): FloodingProfile {
  const { ship } = dataset;
  const form = createHullForm(ship);
  const xAft = form.sternX(form.topHeight(form.lengthBetweenPerpendiculars));
  const xForward = form.stemX(form.topHeight(0));

  const bottom: ProfilePoint[] = [];
  const top: ProfilePoint[] = [];
  for (let x = xForward; x < xAft; x += OUTLINE_STEP_M) {
    bottom.push([x, form.keelHeight(Math.max(x, 0))]);
    top.push([x, form.topHeight(x)]);
  }
  bottom.push([xAft, form.keelHeight(xAft)]);
  top.push([xAft, form.topHeight(xAft)]);

  const compartments = ship.compartments.map((compartment): ProfileCompartment => {
    const middle = (compartment.x_start_m + compartment.x_end_m) / 2;
    return {
      id: compartment.id,
      name: compartment.name,
      xStart: compartment.x_start_m,
      xEnd: compartment.x_end_m,
      floorZ: form.keelHeight(middle),
      topZ: form.topHeight(middle),
    };
  });

  return {
    outline: [...bottom, ...top.reverse()],
    compartments,
    bulkheads: ship.bulkheads.map((bulkhead) => ({
      id: bulkhead.id,
      x: bulkhead.x_m,
      topZ: deckHeightAt(ship, bulkhead.watertight_to_deck, bulkhead.x_m),
    })),
    water: (state) =>
      compartments.map((compartment, index) => {
        const level = state.compartments[index];
        const waterZ = Math.min(
          Math.max(level?.levelAboveKeelM ?? compartment.floorZ, compartment.floorZ),
          compartment.topZ,
        );
        return {
          id: compartment.id,
          status: level?.status ?? 'dry',
          waterZ,
          depthM: waterZ - compartment.floorZ,
        };
      }),
    seaLine: (state) =>
      state.intact
        ? {
            forwardZ: seaLevelAboveKeel(state.bow, xForward),
            aftZ: seaLevelAboveKeel(state.bow, xAft),
          }
        : null,
    xForward,
    xAft,
  };
}
