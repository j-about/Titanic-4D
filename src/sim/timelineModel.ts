import type { HullSection } from '../data/schema/breakup.ts';
import type { Dataset } from '../data/schema/dataset.ts';
import type { BoatId } from '../data/schema/lifeboats.ts';
import { factValue } from '../ship/particulars.ts';
import { deckHeightAt } from '../ship/sheer.ts';
import { shipTimeToSeconds } from '../time/shipTime.ts';
import { buildTimelineEvents, type TimelineEvent } from './events.ts';
import { ICEBERG, type IcebergPosition, icebergPosition } from './iceberg.ts';
import { type Curve, createLinearCurve, createMonotoneCurve } from './interpolation.ts';
import { bodyToWorld, type Pose, seaLevelAboveKeel } from './pose.ts';
import { ROCKET_VISIBLE_SECONDS } from './rocketAppearance.ts';

export type Phase = 'afloat' | 'final-plunge' | 'break-up' | 'descent' | 'wreck';

export type CompartmentStatus = 'dry' | 'flooding' | 'flooded';

export interface CompartmentState {
  readonly id: string;
  /** Water level inside the compartment, in metres above the keel. */
  readonly levelAboveKeelM: number;
  /** Fraction of the height between the tank top and the watertight deck that is under water. */
  readonly fillRatio: number;
  readonly status: CompartmentStatus;
}

export type BoatStatus = 'stowed' | 'lowering' | 'afloat';

export interface BoatState {
  readonly id: BoatId;
  readonly status: BoatStatus;
  /** 0 at the davits, 1 on the water. */
  readonly loweringProgress: number;
  /** Seconds since the boat reached the water; 0 until then. */
  readonly secondsAfloat: number;
}

export interface RocketState {
  readonly id: string;
  /** Seconds since the signal was fired. */
  readonly ageSeconds: number;
}

/** Complete state of the reconstruction at one instant. */
export interface ShipState {
  /** Seconds since the collision, clamped to the modelled period. */
  readonly t: number;
  readonly phase: Phase;
  /** False once the hull has parted. */
  readonly intact: boolean;
  /** Trim of the forward section, in degrees, positive down by the head. */
  readonly trimDeg: number;
  /** List of the forward section, in degrees, positive to starboard. */
  readonly heelDeg: number;
  /** Draught at the two perpendiculars while the hull is intact; null afterwards. */
  readonly draught: { readonly forwardM: number; readonly aftM: number } | null;
  readonly bow: Pose;
  readonly stern: Pose;
  readonly compartments: readonly CompartmentState[];
  /** Mass of water aboard in tonnes while the hull is intact; null afterwards. */
  readonly waterAboardTonnes: number | null;
  readonly boats: readonly BoatState[];
  /** Distress signals currently in the air. */
  readonly rockets: readonly RocketState[];
  /** Number of distress signals fired so far. */
  readonly rocketsFired: number;
  /** Electrical lighting output as a fraction of normal. */
  readonly lightingOutput: number;
  /** Whether each of the four funnels, from forward to aft, is still standing. */
  readonly funnelsStanding: readonly boolean[];
  /** Position of the iceberg of the collision, left astern as the ship ran on. */
  readonly iceberg: IcebergPosition;
  /** Whether each section has come to rest on the seabed. */
  readonly wreck: { readonly bowAtRest: boolean; readonly sternAtRest: boolean };
}

/** A distress signal and the time at which it was fired, in seconds since the collision. */
export interface RocketFiring {
  readonly id: string;
  readonly seconds: number;
}

export interface TimelineModel {
  /** Start of the modelled period: the collision. */
  readonly startSeconds: number;
  /** Start of the final plunge, when the bridge goes under. */
  readonly finalPlungeSeconds: number;
  readonly breakSeconds: number;
  readonly founderingSeconds: number;
  /** End of the modelled period: both sections at rest on the seabed. */
  readonly endSeconds: number;
  /** Every dated entry of the narrative, in chronological order. */
  readonly events: readonly TimelineEvent[];
  /** The distress signals, in the order in which they were fired. */
  readonly rocketFirings: readonly RocketFiring[];
  /** Returns the state at `t` seconds after the collision. Pure: same `t`, same state. */
  evaluate(t: number): ShipState;
}

/** Body station of the part of the starboard bow abreast of which the iceberg is at the collision. */
const ICEBERG_CONTACT_STATION_M = 20;
const METRES_PER_SECOND_PER_KNOT = 1852 / 3600;

const SECONDS_PER_MINUTE = 60;
const DRY_TOLERANCE_M = 0.05;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

interface PoseCurves {
  readonly referenceXM: number;
  readonly referenceZM: number;
  readonly pitch: Curve;
  readonly heel: Curve;
  readonly yaw: Curve;
  readonly forward: Curve;
  readonly starboard: Curve;
  readonly up: Curve;
}

function evaluatePose(curves: PoseCurves, t: number): Pose {
  return {
    pitchDeg: curves.pitch(t),
    heelDeg: curves.heel(t),
    yawDeg: curves.yaw(t),
    referenceXM: curves.referenceXM,
    referenceZM: curves.referenceZM,
    forwardM: curves.forward(t),
    starboardM: curves.starboard(t),
    upM: curves.up(t),
  };
}

interface CompartmentModel {
  readonly id: string;
  readonly midX: number;
  readonly inBowSection: boolean;
  readonly floorM: number;
  readonly topM: number;
  readonly levels: Curve;
  readonly lastKeyframeSeconds: number;
  readonly lastKeyframeLevelM: number;
  readonly equalisedSeconds: number | null;
}

interface BoatModel {
  readonly id: BoatId;
  readonly launchSeconds: number;
  readonly waterSeconds: number;
}

/**
 * Builds the timeline model from the dataset. All curves are prepared once; `evaluate` then only
 * reads them, so that the state depends on `t` alone and not on the order of the calls.
 */
export function createTimelineModel(dataset: Dataset): TimelineModel {
  const { ship, attitude, flooding, lifeboats, signals, lighting, breakup, chronology } = dataset;

  const lengthBetweenPerpendiculars = factValue(ship.particulars, 'length-between-perpendiculars');
  const initialWaterlineAt = (x: number): number =>
    attitude.initial_draught.forward_m +
    ((attitude.initial_draught.aft_m - attitude.initial_draught.forward_m) * x) /
      lengthBetweenPerpendiculars;

  const startSeconds = shipTimeToSeconds(dataset.timeReference.collision.ats);
  const founderingSeconds = shipTimeToSeconds(dataset.timeReference.foundering.ats);
  const breakSeconds = shipTimeToSeconds(breakup.break.ats);
  const finalPlungeSeconds = shipTimeToSeconds(
    chronology.events.find((event) => event.id === 'bridge-submerged')?.ats ?? breakup.break.ats,
  );

  const trim = createMonotoneCurve(
    attitude.trim.map((keyframe) => shipTimeToSeconds(keyframe.ats)),
    attitude.trim.map((keyframe) => keyframe.trim_deg),
  );
  const heel = createMonotoneCurve(
    attitude.heel.map((keyframe) => shipTimeToSeconds(keyframe.ats)),
    attitude.heel.map((keyframe) => keyframe.heel_deg),
  );

  const pivotX = attitude.waterline_pivot.x_m;
  /** Pose of the intact hull: it rotates about the pivot of the waterline, which stays at sea level. */
  const intactPose = (t: number): Pose => ({
    pitchDeg: trim(t),
    heelDeg: heel(t),
    yawDeg: 0,
    referenceXM: pivotX,
    referenceZM: initialWaterlineAt(pivotX),
    forwardM: 0,
    starboardM: 0,
    upM: 0,
  });

  /** Expresses the pose of the intact hull about the reference point of one of its sections. */
  const sectionPoseWhileIntact = (section: HullSection, t: number): Pose => {
    const whole = intactPose(t);
    const referenceZM = initialWaterlineAt(section.reference_x_m);
    const position = bodyToWorld(whole, { x: section.reference_x_m, y: 0, z: referenceZM });
    return {
      pitchDeg: whole.pitchDeg,
      heelDeg: whole.heelDeg,
      yawDeg: 0,
      referenceXM: section.reference_x_m,
      referenceZM,
      forwardM: position.forward,
      starboardM: position.starboard,
      upM: position.up,
    };
  };

  /** Curves of a section after the break, starting from its pose at the instant of the break. */
  const sectionCurves = (section: HullSection): PoseCurves => {
    const atBreak = sectionPoseWhileIntact(section, breakSeconds);
    const times = [
      breakSeconds,
      ...section.keyframes.map((keyframe) => shipTimeToSeconds(keyframe.ats)),
    ];
    const channel = (initial: number, values: readonly number[]): Curve =>
      createMonotoneCurve(times, [initial, ...values]);
    return {
      referenceXM: atBreak.referenceXM,
      referenceZM: atBreak.referenceZM,
      pitch: channel(
        atBreak.pitchDeg,
        section.keyframes.map((keyframe) => keyframe.pitch_deg),
      ),
      heel: channel(
        atBreak.heelDeg,
        section.keyframes.map((keyframe) => keyframe.heel_deg),
      ),
      yaw: channel(
        atBreak.yawDeg,
        section.keyframes.map((keyframe) => keyframe.yaw_deg),
      ),
      forward: channel(
        atBreak.forwardM,
        section.keyframes.map((keyframe) => keyframe.forward_m),
      ),
      starboard: channel(
        atBreak.starboardM,
        section.keyframes.map((keyframe) => keyframe.starboard_m),
      ),
      up: channel(
        atBreak.upM,
        section.keyframes.map((keyframe) => keyframe.up_m),
      ),
    };
  };

  const bowCurves = sectionCurves(breakup.bow_section);
  const sternCurves = sectionCurves(breakup.stern_section);
  const bowPose = (t: number): Pose =>
    t <= breakSeconds ? sectionPoseWhileIntact(breakup.bow_section, t) : evaluatePose(bowCurves, t);
  const sternPose = (t: number): Pose =>
    t <= breakSeconds
      ? sectionPoseWhileIntact(breakup.stern_section, t)
      : evaluatePose(sternCurves, t);

  const endSeconds = Math.max(
    ...breakup.bow_section.keyframes.map((keyframe) => shipTimeToSeconds(keyframe.ats)),
    ...breakup.stern_section.keyframes.map((keyframe) => shipTimeToSeconds(keyframe.ats)),
  );
  const restSeconds = endSeconds;

  const sectionBoundaryX = (breakup.bow_section.x_end_m + breakup.stern_section.x_start_m) / 2;
  const compartmentModels: readonly CompartmentModel[] = ship.compartments.map(
    (compartment, index) => {
      const record = flooding.compartments[index];
      const bulkhead = ship.bulkheads[Math.min(index, ship.bulkheads.length - 1)];
      if (record === undefined || bulkhead === undefined) {
        throw new RangeError(`No flooding record for compartment "${compartment.id}".`);
      }
      const midX = (compartment.x_start_m + compartment.x_end_m) / 2;
      const times = record.levels.map((keyframe) => shipTimeToSeconds(keyframe.ats));
      const values = record.levels.map((keyframe) => keyframe.level_above_keel_m);
      return {
        id: compartment.id,
        midX,
        inBowSection: midX < sectionBoundaryX,
        floorM: deckHeightAt(ship, 'tank-top', midX),
        topM: deckHeightAt(ship, bulkhead.watertight_to_deck, midX),
        levels: createLinearCurve(times, values),
        lastKeyframeSeconds: times.at(-1) ?? startSeconds,
        lastKeyframeLevelM: values.at(-1) ?? 0,
        equalisedSeconds:
          record.equalised_from === null ? null : shipTimeToSeconds(record.equalised_from),
      };
    },
  );

  /** Sea level outside the hull at the station of a compartment, capped to its height. */
  const seaLevelFor = (compartment: CompartmentModel, t: number): number => {
    const pose = compartment.inBowSection ? bowPose(t) : sternPose(t);
    return clamp(seaLevelAboveKeel(pose, compartment.midX), 0, compartment.topM);
  };

  const compartmentLevel = (compartment: CompartmentModel, t: number): number => {
    const sea = seaLevelFor(compartment, t);
    const { equalisedSeconds, lastKeyframeSeconds, lastKeyframeLevelM } = compartment;
    if (equalisedSeconds !== null && t >= equalisedSeconds) {
      return sea;
    }
    if (t <= lastKeyframeSeconds || equalisedSeconds === null) {
      return Math.min(compartment.levels(t), sea);
    }
    const target = Math.max(seaLevelFor(compartment, equalisedSeconds), lastKeyframeLevelM);
    const ratio = (t - lastKeyframeSeconds) / (equalisedSeconds - lastKeyframeSeconds);
    return Math.min(lastKeyframeLevelM + ratio * (target - lastKeyframeLevelM), sea);
  };

  const compartmentState = (compartment: CompartmentModel, t: number): CompartmentState => {
    const level = compartmentLevel(compartment, t);
    const fillRatio = clamp(
      (level - compartment.floorM) / (compartment.topM - compartment.floorM),
      0,
      1,
    );
    let status: CompartmentStatus = 'flooding';
    if (level <= DRY_TOLERANCE_M) {
      status = 'dry';
    } else if (fillRatio >= 1) {
      status = 'flooded';
    }
    return { id: compartment.id, levelAboveKeelM: level, fillRatio, status };
  };

  const waterAboard = createMonotoneCurve(
    flooding.water_aboard.map((keyframe) => shipTimeToSeconds(keyframe.ats)),
    flooding.water_aboard.map((keyframe) => keyframe.tonnes),
  );

  const loweringSeconds = factValue(lifeboats.facts, 'lowering-duration') * SECONDS_PER_MINUTE;
  const boatModels: readonly BoatModel[] = lifeboats.boats.map((boat) => {
    const launchSeconds = shipTimeToSeconds(boat.launch.ats);
    let waterSeconds = launchSeconds + loweringSeconds;
    if (boat.launch.mode === 'floated-off') {
      waterSeconds = launchSeconds;
    } else if (boat.launch.reached_water_ats !== undefined) {
      waterSeconds = shipTimeToSeconds(boat.launch.reached_water_ats);
    }
    return { id: boat.id, launchSeconds, waterSeconds };
  });

  const boatState = (boat: BoatModel, t: number): BoatState => {
    if (t < boat.launchSeconds) {
      return { id: boat.id, status: 'stowed', loweringProgress: 0, secondsAfloat: 0 };
    }
    if (t < boat.waterSeconds) {
      const progress = (t - boat.launchSeconds) / (boat.waterSeconds - boat.launchSeconds);
      return { id: boat.id, status: 'lowering', loweringProgress: progress, secondsAfloat: 0 };
    }
    return {
      id: boat.id,
      status: 'afloat',
      loweringProgress: 1,
      secondsAfloat: t - boat.waterSeconds,
    };
  };

  const rocketTimes: readonly RocketFiring[] = signals.rockets.firings.map((firing) => ({
    id: firing.id,
    seconds: shipTimeToSeconds(firing.ats),
  }));

  const restTime = (section: HullSection): number =>
    Math.max(...section.keyframes.map((keyframe) => shipTimeToSeconds(keyframe.ats)));
  const bowRestSeconds = restTime(breakup.bow_section);
  const sternRestSeconds = restTime(breakup.stern_section);

  const abreast = bodyToWorld(intactPose(startSeconds), {
    x: ICEBERG_CONTACT_STATION_M,
    y: factValue(ship.particulars, 'breadth') / 2 + ICEBERG.clearanceM + ICEBERG.breadthM / 2,
    z: 0,
  });
  const icebergPath = {
    speedMps: factValue(ship.particulars, 'speed-at-collision') * METRES_PER_SECOND_PER_KNOT,
    atCollision: { forwardM: abreast.forward, starboardM: abreast.starboard },
  };

  const lightingOutput = createLinearCurve(
    lighting.output.map((keyframe) => shipTimeToSeconds(keyframe.ats)),
    lighting.output.map((keyframe) => keyframe.output),
  );

  const funnelFallSeconds = ship.funnels.map((funnel) => {
    const fall = breakup.funnel_falls.find((candidate) => candidate.funnel_id === funnel.id);
    return fall === undefined ? Number.POSITIVE_INFINITY : shipTimeToSeconds(fall.ats);
  });

  const phaseAt = (t: number): Phase => {
    if (t < finalPlungeSeconds) {
      return 'afloat';
    }
    if (t < breakSeconds) {
      return 'final-plunge';
    }
    if (t < founderingSeconds) {
      return 'break-up';
    }
    return t < restSeconds ? 'descent' : 'wreck';
  };

  const evaluate = (requestedSeconds: number): ShipState => {
    const t = clamp(requestedSeconds, startSeconds, endSeconds);
    const intact = t <= breakSeconds;
    const bow = bowPose(t);
    const stern = sternPose(t);
    const whole = intactPose(t);
    return {
      t,
      phase: phaseAt(t),
      intact,
      trimDeg: bow.pitchDeg,
      heelDeg: bow.heelDeg,
      draught: intact
        ? {
            forwardM: seaLevelAboveKeel(whole, 0),
            aftM: seaLevelAboveKeel(whole, lengthBetweenPerpendiculars),
          }
        : null,
      bow,
      stern,
      compartments: compartmentModels.map((compartment) => compartmentState(compartment, t)),
      waterAboardTonnes: intact ? waterAboard(t) : null,
      boats: boatModels.map((boat) => boatState(boat, t)),
      rockets: rocketTimes
        .filter((rocket) => t >= rocket.seconds && t - rocket.seconds < ROCKET_VISIBLE_SECONDS)
        .map((rocket) => ({ id: rocket.id, ageSeconds: t - rocket.seconds })),
      rocketsFired: rocketTimes.filter((rocket) => t >= rocket.seconds).length,
      lightingOutput: lightingOutput(t),
      funnelsStanding: funnelFallSeconds.map((fallSeconds) => t < fallSeconds),
      iceberg: icebergPosition(icebergPath, t),
      wreck: { bowAtRest: t >= bowRestSeconds, sternAtRest: t >= sternRestSeconds },
    };
  };

  return {
    startSeconds,
    finalPlungeSeconds,
    breakSeconds,
    founderingSeconds,
    endSeconds,
    events: buildTimelineEvents(dataset),
    rocketFirings: rocketTimes,
    evaluate,
  };
}
