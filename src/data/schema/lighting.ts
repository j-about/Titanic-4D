import { z } from 'zod';
import { provenanceShape, shipTimeSchema } from './common.ts';
import { factSchema } from './facts.ts';

export const lightingKeyframeSchema = z.strictObject({
  ats: shipTimeSchema,
  output: z.number().min(0).max(1).meta({
    description:
      'Electrical lighting output as a fraction of normal, before any lamp is submerged.',
  }),
  ...provenanceShape,
});

export const lightingFileSchema = z.strictObject({
  facts: z.array(factSchema).min(1),
  output: z.array(lightingKeyframeSchema).min(2),
});

export type LightingKeyframe = z.infer<typeof lightingKeyframeSchema>;
export type LightingFile = z.infer<typeof lightingFileSchema>;
