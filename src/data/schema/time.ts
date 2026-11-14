import { z } from 'zod';
import { idSchema, provenanceShape, shipTimeSchema } from './common.ts';
import { factSchema } from './facts.ts';

const clockOffsetSchema = z.strictObject({
  id: idSchema,
  holder: z.string().min(1),
  ship_minus_new_york_min: z.number().int(),
  ship_minus_gmt_min: z.number().int(),
  ...provenanceShape,
});

export const timeReferenceFileSchema = z.strictObject({
  collision: z.strictObject({ ats: shipTimeSchema, ...provenanceShape }),
  foundering: z.strictObject({ ats: shipTimeSchema, ...provenanceShape }),
  adopted_offset: clockOffsetSchema,
  alternative_offsets: z.array(clockOffsetSchema).min(1),
  other_vessels: z.array(
    z.strictObject({
      id: idSchema,
      vessel: z.string().min(1),
      vessel_minus_titanic_min: z.number().int(),
      ...provenanceShape,
    }),
  ),
  open_questions: z.array(factSchema),
});

export type TimeReferenceFile = z.infer<typeof timeReferenceFileSchema>;
