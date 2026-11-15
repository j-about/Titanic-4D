import { z } from 'zod';
import { idSchema, provenanceShape } from './common.ts';
import { factSchema } from './facts.ts';

export const deckIdSchema = z.enum([
  'boat',
  'a',
  'b',
  'c',
  'd',
  'e',
  'f',
  'g',
  'orlop',
  'tank-top',
]);

const lengthAlongHull = z.number().meta({
  description: 'Distance aft of the forward perpendicular, in metres (negative forward of it).',
});
const heightAboveKeel = z
  .number()
  .meta({ description: 'Height above the top of keel, in metres.' });

export const deckSchema = z.strictObject({
  id: deckIdSchema,
  name: z.string().min(1),
  height_amidships_m: heightAboveKeel,
  x_start_m: lengthAlongHull,
  x_end_m: lengthAlongHull,
  ...provenanceShape,
});

export const bulkheadSchema = z.strictObject({
  id: z.string().regex(/^[a-hj-p]$/),
  x_m: lengthAlongHull,
  watertight_to_deck: deckIdSchema,
  ...provenanceShape,
});

export const compartmentSchema = z.strictObject({
  id: idSchema,
  name: z.string().min(1),
  x_start_m: lengthAlongHull,
  x_end_m: lengthAlongHull,
  breached_by_collision: z.boolean(),
  ...provenanceShape,
});

export const funnelSchema = z.strictObject({
  id: z.number().int().min(1).max(4),
  x_m: lengthAlongHull,
  base_above_keel_m: heightAboveKeel,
  top_above_keel_m: heightAboveKeel,
  length_fore_aft_m: z.number().positive(),
  breadth_m: z.number().positive(),
  rake_deg: z.number(),
  exhausts_boilers: z.boolean(),
  ...provenanceShape,
});

export const mastSchema = z.strictObject({
  id: z.enum(['foremast', 'mainmast']),
  x_m: lengthAlongHull,
  base_above_keel_m: heightAboveKeel,
  top_above_keel_m: heightAboveKeel,
  rake_deg: z.number(),
  ...provenanceShape,
});

export const zoneSchema = z.strictObject({
  id: idSchema,
  name: z.string().min(1),
  x_start_m: lengthAlongHull,
  x_end_m: lengthAlongHull,
  ...provenanceShape,
});

export const shipFileSchema = z.strictObject({
  reference_frame: z.strictObject({
    description: z.string().min(1),
    ...provenanceShape,
  }),
  particulars: z.array(factSchema).min(1),
  sheer: z.strictObject({
    rise_at_bow_m: z.number(),
    rise_at_stern_m: z.number(),
    ...provenanceShape,
  }),
  decks: z.array(deckSchema).min(1),
  bulkheads: z.array(bulkheadSchema).length(15),
  compartments: z.array(compartmentSchema).length(16),
  funnels: z.array(funnelSchema).length(4),
  masts: z.array(mastSchema).length(2),
  zones: z.array(zoneSchema).min(1),
});

export type DeckId = z.infer<typeof deckIdSchema>;
export type Deck = z.infer<typeof deckSchema>;
export type Bulkhead = z.infer<typeof bulkheadSchema>;
export type Compartment = z.infer<typeof compartmentSchema>;
export type Funnel = z.infer<typeof funnelSchema>;
export type Mast = z.infer<typeof mastSchema>;
export type Zone = z.infer<typeof zoneSchema>;
export type ShipFile = z.infer<typeof shipFileSchema>;
