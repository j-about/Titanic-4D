import { z } from 'zod';
import { idSchema, provenanceShape } from './common.ts';
import { factSchema } from './facts.ts';

export const positionSchema = z.strictObject({
  id: idSchema,
  label: z.string().min(1),
  latitude_deg: z.number().min(-90).max(90),
  longitude_deg: z.number().min(-180).max(180),
  ...provenanceShape,
});

export const siteFileSchema = z.strictObject({
  positions: z.array(positionSchema).min(1),
  heading: z.strictObject({
    true_deg: z.number().min(0).lt(360),
    ...provenanceShape,
  }),
  environment: z.array(factSchema).min(1),
  iceberg: z.array(factSchema).min(1),
  californian: z.array(factSchema).min(1),
  wreck: z.array(factSchema).min(1),
  surveys: z.array(factSchema).min(1),
});

export type Position = z.infer<typeof positionSchema>;
export type SiteFile = z.infer<typeof siteFileSchema>;
