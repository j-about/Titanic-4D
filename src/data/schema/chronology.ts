import { z } from 'zod';
import { idSchema, provenanceShape, shipTimeSchema, timeUncertaintySchema } from './common.ts';

export const eventCategorySchema = z.enum([
  'navigation',
  'flooding',
  'command',
  'lifeboat',
  'signal',
  'wireless',
  'power',
  'structure',
  'rescue',
]);

export const chronologyEventSchema = z.strictObject({
  id: idSchema,
  ats: shipTimeSchema,
  uncertainty: timeUncertaintySchema,
  category: eventCategorySchema,
  title: z.string().min(1).max(80),
  description: z.string().min(1),
  location: z.string().min(1).nullable(),
  key_event: z.boolean().meta({
    description: 'Key events are offered as bookmarks on the timeline.',
  }),
  ...provenanceShape,
});

export const chronologyFileSchema = z.strictObject({
  events: z.array(chronologyEventSchema).min(1),
});

export type EventCategory = z.infer<typeof eventCategorySchema>;
export type ChronologyEvent = z.infer<typeof chronologyEventSchema>;
export type ChronologyFile = z.infer<typeof chronologyFileSchema>;
