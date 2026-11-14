import { z } from 'zod';
import { provenanceShape, shipTimeSchema } from './common.ts';
import { factSchema } from './facts.ts';

export const sectionKeyframeSchema = z.strictObject({
  ats: shipTimeSchema,
  pitch_deg: z.number().meta({ description: 'Positive when the forward end is down.' }),
  heel_deg: z.number().meta({ description: 'Positive to starboard.' }),
  yaw_deg: z.number().meta({
    description:
      'Rotation about the vertical, clockwise seen from above, from the heading at the break.',
  }),
  forward_m: z.number().meta({
    description:
      'Position of the section reference point along the heading at the break, from the surface point above the break.',
  }),
  starboard_m: z.number(),
  up_m: z
    .number()
    .meta({ description: 'Height of the section reference point above the sea surface.' }),
  ...provenanceShape,
});

export const hullSectionSchema = z.strictObject({
  x_start_m: z.number(),
  x_end_m: z.number(),
  reference_x_m: z.number().meta({
    description:
      'Station of the reference point of the section, on the centre line at the height of the original waterline.',
  }),
  keyframes: z.array(sectionKeyframeSchema).min(2),
  ...provenanceShape,
});

export const breakupFileSchema = z.strictObject({
  reference_model: factSchema,
  competing_models: z.array(factSchema).min(1),
  facts: z.array(factSchema).min(1),
  break: z.strictObject({
    ats: shipTimeSchema,
    trim_min_deg: z.number(),
    trim_max_deg: z.number(),
    ...provenanceShape,
  }),
  funnel_falls: z.array(
    z.strictObject({
      funnel_id: z.number().int().min(1).max(4),
      ats: shipTimeSchema,
      ...provenanceShape,
    }),
  ),
  bow_section: hullSectionSchema,
  stern_section: hullSectionSchema,
});

export type SectionKeyframe = z.infer<typeof sectionKeyframeSchema>;
export type HullSection = z.infer<typeof hullSectionSchema>;
export type BreakupFile = z.infer<typeof breakupFileSchema>;
