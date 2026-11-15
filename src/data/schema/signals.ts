import { z } from 'zod';
import { idSchema, provenanceShape, shipTimeSchema, timeUncertaintySchema } from './common.ts';
import { factSchema } from './facts.ts';

export const rocketFiringSchema = z.strictObject({
  id: idSchema,
  ats: shipTimeSchema,
  uncertainty: timeUncertaintySchema.meta({
    description: 'Margin on the firing time; the note of the record states where it comes from.',
  }),
  ...provenanceShape,
});

/**
 * A message as entered in a station log. The provenance fields describe the log entry; the ship's
 * time is a conversion and is never more certain than the adopted clock offset.
 */
export const wirelessMessageSchema = z.strictObject({
  id: idSchema,
  logged_time: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  logged_reference: z.enum(['new-york', 'gmt']).meta({
    description:
      'Clock of the station log (procès-verbal): New York time (GMT − 5 h) or Greenwich Mean Time.',
  }),
  ats: shipTimeSchema.meta({
    description:
      "Ship's time obtained from the logged time with the adopted clock offset; it is never more certain than that offset.",
  }),
  uncertainty: timeUncertaintySchema.optional().meta({
    description:
      'Margin on the logged time, stated in the note; absent when none is recorded. It does not cover the choice of clock offset, whose other values are recorded in time-reference.json.',
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
