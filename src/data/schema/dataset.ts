import type { z } from 'zod';
import { attitudeFileSchema } from './attitude.ts';
import { breakupFileSchema } from './breakup.ts';
import { chronologyFileSchema } from './chronology.ts';
import { floodingFileSchema } from './flooding.ts';
import { lifeboatsFileSchema } from './lifeboats.ts';
import { lightingFileSchema } from './lighting.ts';
import { peopleFileSchema } from './people.ts';
import { shipFileSchema } from './ship.ts';
import { signalsFileSchema } from './signals.ts';
import { siteFileSchema } from './site.ts';
import { sourcesFileSchema } from './sources.ts';
import { timeReferenceFileSchema } from './time.ts';

/** Schema of every file of `data/`, keyed by file name without extension. */
export const datasetSchemas = {
  sources: sourcesFileSchema,
  'time-reference': timeReferenceFileSchema,
  ship: shipFileSchema,
  chronology: chronologyFileSchema,
  attitude: attitudeFileSchema,
  flooding: floodingFileSchema,
  lifeboats: lifeboatsFileSchema,
  signals: signalsFileSchema,
  lighting: lightingFileSchema,
  breakup: breakupFileSchema,
  site: siteFileSchema,
  people: peopleFileSchema,
} as const;

export type DatasetFileName = keyof typeof datasetSchemas;

/** The whole dataset, one property per file, with camel-cased keys for the hyphenated names. */
export interface Dataset {
  readonly sources: z.infer<typeof sourcesFileSchema>;
  readonly timeReference: z.infer<typeof timeReferenceFileSchema>;
  readonly ship: z.infer<typeof shipFileSchema>;
  readonly chronology: z.infer<typeof chronologyFileSchema>;
  readonly attitude: z.infer<typeof attitudeFileSchema>;
  readonly flooding: z.infer<typeof floodingFileSchema>;
  readonly lifeboats: z.infer<typeof lifeboatsFileSchema>;
  readonly signals: z.infer<typeof signalsFileSchema>;
  readonly lighting: z.infer<typeof lightingFileSchema>;
  readonly breakup: z.infer<typeof breakupFileSchema>;
  readonly site: z.infer<typeof siteFileSchema>;
  readonly people: z.infer<typeof peopleFileSchema>;
}
