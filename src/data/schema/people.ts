import { z } from 'zod';
import { idSchema, provenanceShape, shipTimeSchema } from './common.ts';
import { factSchema } from './facts.ts';

const groupCountSchema = z.strictObject({
  group: z.string().min(1),
  aboard: z.number().int().min(0),
  saved: z.number().int().min(0),
  lost: z.number().int().min(0),
});

export const casualtyCountSchema = z.strictObject({
  id: idSchema,
  holder: z.string().min(1),
  aboard: z.number().int().positive().nullable(),
  saved: z.number().int().positive().nullable(),
  lost: z.number().int().positive(),
  breakdown: z.array(groupCountSchema).min(1).optional(),
  ...provenanceShape,
});

export const rescueEventSchema = z.strictObject({
  id: idSchema,
  carpathia_time: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  ats: shipTimeSchema.meta({
    description: "Equivalent Titanic ship's time, a bookkeeping convention after the foundering.",
  }),
  title: z.string().min(1).max(80),
  description: z.string().min(1),
  ...provenanceShape,
});

export const peopleFileSchema = z.strictObject({
  casualty_counts: z.array(casualtyCountSchema).min(2),
  rescue: z.array(rescueEventSchema).min(1),
  facts: z.array(factSchema).min(1),
});

export type CasualtyCount = z.infer<typeof casualtyCountSchema>;
export type RescueEvent = z.infer<typeof rescueEventSchema>;
export type PeopleFile = z.infer<typeof peopleFileSchema>;
