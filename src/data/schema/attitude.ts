import { z } from 'zod';
import { provenanceShape, shipTimeSchema } from './common.ts';

export const trimKeyframeSchema = z.strictObject({
  ats: shipTimeSchema,
  trim_deg: z.number().meta({ description: 'Trim in degrees, positive down by the head.' }),
  ...provenanceShape,
});

export const heelKeyframeSchema = z.strictObject({
  ats: shipTimeSchema,
  heel_deg: z.number().meta({ description: 'List in degrees, positive to starboard.' }),
  ...provenanceShape,
});

export const attitudeFileSchema = z.strictObject({
  initial_draught: z.strictObject({
    forward_m: z.number().positive(),
    aft_m: z.number().positive(),
    ...provenanceShape,
  }),
  waterline_pivot: z.strictObject({
    x_m: z.number().meta({
      description:
        'Station, in metres aft of the forward perpendicular, about which the waterline appears to rotate as the ship trims.',
    }),
    ...provenanceShape,
  }),
  trim: z.array(trimKeyframeSchema).min(2),
  heel: z.array(heelKeyframeSchema).min(2),
});

export type TrimKeyframe = z.infer<typeof trimKeyframeSchema>;
export type HeelKeyframe = z.infer<typeof heelKeyframeSchema>;
export type AttitudeFile = z.infer<typeof attitudeFileSchema>;
