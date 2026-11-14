import { z } from 'zod';
import { idSchema, provenanceShape } from './common.ts';

/** A sourced statement, optionally carrying a number that the application reads by identifier. */
export const factSchema = z.strictObject({
  id: idSchema,
  title: z.string().min(1),
  summary: z.string().min(1),
  value: z.number().optional(),
  unit: z.string().min(1).optional(),
  ...provenanceShape,
});

export type Fact = z.infer<typeof factSchema>;
