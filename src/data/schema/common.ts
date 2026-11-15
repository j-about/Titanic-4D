import { z } from 'zod';

/** Level of confidence attached to every record of the dataset. */
export const certaintySchema = z.enum(['established', 'estimated', 'debated']).meta({
  description:
    'established: primary evidence and broad consensus; estimated: derived or approximate, with the method stated in the note; debated: competing positions exist and are listed.',
});

/** Kebab-case identifier, used for sources and records. */
export const idSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

/**
 * Local date and time on board Titanic (Apparent Time Ship), without zone designator.
 * Example: `1912-04-15T00:45` for 12:45 a.m. on 15 April 1912.
 */
export const shipTimeSchema = z
  .string()
  .regex(/^1912-04-1[45]T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/)
  .meta({ description: "Titanic ship's time (Apparent Time Ship), ISO 8601 local date-time." });

/** A position held by a named party that differs from the value adopted by the record. */
export const alternativeSchema = z.strictObject({
  holder: z.string().min(1),
  position: z.string().min(1),
  source_ids: z.array(idSchema).min(1),
});

/** Fields carried by every record: where it comes from and how certain it is. */
export const provenanceShape = {
  source_ids: z.array(idSchema).min(1),
  certainty: certaintySchema,
  note: z.string().min(1),
  alternatives: z.array(alternativeSchema).min(1).optional(),
} as const;

/** Symmetric or asymmetric uncertainty of a clock time, in minutes. */
export const timeUncertaintySchema = z.strictObject({
  before_min: z.number().min(0),
  after_min: z.number().min(0),
});

export type Certainty = z.infer<typeof certaintySchema>;
export type Alternative = z.infer<typeof alternativeSchema>;
