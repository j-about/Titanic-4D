import { z } from 'zod';
import { idSchema } from './common.ts';

export const sourceSchema = z.strictObject({
  id: idSchema,
  title: z.string().min(1),
  authors: z.array(z.string().min(1)),
  year: z.string().min(1),
  publisher: z.string().min(1),
  url: z.url().optional(),
  kind: z.enum([
    'inquiry-report',
    'inquiry-testimony',
    'analysis',
    'book',
    'survey',
    'press',
    'reference',
    'catalogue',
    'software',
    'project',
  ]),
  access: z.enum(['read', 'read-in-part', 'cited-through', 'not-consulted']).meta({
    description:
      'read: consulted in full for the cited parts; read-in-part: partly consulted or through a summary; cited-through: known only through another listed source; not-consulted: reference work not opened.',
  }),
  note: z.string().min(1),
});

export const sourcesFileSchema = z.strictObject({
  sources: z.array(sourceSchema).min(1),
});

export type Source = z.infer<typeof sourceSchema>;
export type SourcesFile = z.infer<typeof sourcesFileSchema>;
