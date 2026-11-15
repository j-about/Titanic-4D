import { z } from 'zod';
import { idSchema, provenanceShape, shipTimeSchema } from './common.ts';
import { factSchema } from './facts.ts';

export const waterLevelKeyframeSchema = z.strictObject({
  ats: shipTimeSchema,
  level_above_keel_m: z.number().min(0),
  ...provenanceShape,
});

export const compartmentFloodingSchema = z.strictObject({
  compartment_id: idSchema,
  levels: z.array(waterLevelKeyframeSchema).min(1).meta({
    description:
      'Water level inside the compartment, never higher than the sea outside the hull at the same station.',
  }),
  equalised_from: shipTimeSchema.nullable().meta({
    description:
      'Time from which the water inside stands level with the sea outside. Between the last keyframe and this time the level rises linearly to meet the sea; null when the compartment is not assumed to equalise.',
  }),
  ...provenanceShape,
});

export const waterAboardKeyframeSchema = z.strictObject({
  ats: shipTimeSchema,
  tonnes: z.number().min(0),
  ...provenanceShape,
});

export const floodingFileSchema = z.strictObject({
  damage: z.array(factSchema).min(1),
  compartments: z.array(compartmentFloodingSchema).length(16),
  water_aboard: z.array(waterAboardKeyframeSchema).min(2),
});

export type CompartmentFlooding = z.infer<typeof compartmentFloodingSchema>;
export type FloodingFile = z.infer<typeof floodingFileSchema>;
