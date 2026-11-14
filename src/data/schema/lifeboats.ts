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
  in_charge: z.string().min(1).nullable(),
  occupancy: z.strictObject({
    persons: z.number().int().min(0).nullable(),
    ...provenanceShape,
  }),
  remark: z.string().min(1).nullable(),
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
