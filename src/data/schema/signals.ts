import { z } from 'zod';
import { idSchema, provenanceShape, shipTimeSchema } from './common.ts';
import { factSchema } from './facts.ts';

export const rocketFiringSchema = z.strictObject({
  id: idSchema,
  ats: shipTimeSchema,
  ...provenanceShape,
});

export const wirelessMessageSchema = z.strictObject({
  id: idSchema,
  logged_time: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  logged_reference: z.enum(['new-york', 'gmt']).meta({
    description:
      'Clock of the station log (procès-verbal): New York time (GMT − 5 h) or Greenwich Mean Time.',
  }),
  ats: shipTimeSchema.meta({
    description: "Ship's time obtained from the logged time with the adopted clock offset.",
  }),
  sender: z.string().min(1),
  summary: z.string().min(1),
  heard_by: z.array(z.string().min(1)).min(1),
  ...provenanceShape,
});

export const signalsFileSchema = z.strictObject({
  rockets: z.strictObject({
    facts: z.array(factSchema).min(1),
    firings: z.array(rocketFiringSchema).min(1),
  }),
  wireless: z.strictObject({
    facts: z.array(factSchema).min(1),
    messages: z.array(wirelessMessageSchema).min(1),
  }),
});

export type RocketFiring = z.infer<typeof rocketFiringSchema>;
export type WirelessMessage = z.infer<typeof wirelessMessageSchema>;
export type SignalsFile = z.infer<typeof signalsFileSchema>;
