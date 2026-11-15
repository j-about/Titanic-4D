import { z } from 'zod';
import { provenanceShape, shipTimeSchema, timeUncertaintySchema } from './common.ts';
import { factSchema } from './facts.ts';

export const boatIdSchema = z.enum([
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  '11',
  '12',
  '13',
  '14',
  '15',
  '16',
  'a',
  'b',
  'c',
  'd',
]);

export const boatTypeIdSchema = z.enum(['lifeboat', 'cutter', 'collapsible']);

export const boatTypeSchema = z.strictObject({
  id: boatTypeIdSchema,
  name: z.string().min(1),
  count: z.number().int().positive(),
  length_m: z.number().positive(),
  breadth_m: z.number().positive(),
  depth_m: z.number().positive(),
  capacity: z.number().int().positive(),
  ...provenanceShape,
});

/** A statement in words about a boat, with its own provenance. */
export const boatStatementSchema = z.strictObject({
  value: z.string().min(1),
  ...provenanceShape,
});

export const boatSchema = z.strictObject({
  id: boatIdSchema,
  type: boatTypeIdSchema,
  side: z.enum(['port', 'starboard']),
  station: z.strictObject({
    group: z.enum(['forward', 'aft', 'officers-quarters-roof']),
    x_m: z.number().meta({
      description: 'Mid-length of the stowed boat, in metres aft of the forward perpendicular.',
    }),
    ...provenanceShape,
  }),
  launch: z.strictObject({
    ats: shipTimeSchema,
    uncertainty: timeUncertaintySchema,
    mode: z.enum(['lowered', 'floated-off']),
    reached_water_ats: shipTimeSchema.optional(),
    ...provenanceShape,
  }),
  in_charge: boatStatementSchema.nullable().meta({
    description: 'Rank and name of the person in charge in the boat; null when nobody was.',
  }),
  occupancy: z.strictObject({
    persons: z.number().int().min(0).nullable(),
    basis: z.enum(['attributed', 'reached-from-water']).meta({
      description:
        'attributed: people attributed to the boat by the source, not uniformly a count at launch; reached-from-water: people who reached the boat from the water after it floated off.',
    }),
    ...provenanceShape,
  }),
  remark: boatStatementSchema.nullable().meta({
    description: 'A circumstance of the launch, as one sentence; null when none is recorded.',
  }),
});

export const lifeboatsFileSchema = z.strictObject({
  facts: z.array(factSchema).min(1),
  types: z.array(boatTypeSchema).length(3),
  boats: z.array(boatSchema).length(20),
});

export type BoatId = z.infer<typeof boatIdSchema>;
export type BoatTypeId = z.infer<typeof boatTypeIdSchema>;
export type BoatType = z.infer<typeof boatTypeSchema>;
export type Boat = z.infer<typeof boatSchema>;
export type LifeboatsFile = z.infer<typeof lifeboatsFileSchema>;
