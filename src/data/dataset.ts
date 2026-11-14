import attitude from '../../data/attitude.json' with { type: 'json' };
import breakup from '../../data/breakup.json' with { type: 'json' };
import chronology from '../../data/chronology.json' with { type: 'json' };
import flooding from '../../data/flooding.json' with { type: 'json' };
import lifeboats from '../../data/lifeboats.json' with { type: 'json' };
import lighting from '../../data/lighting.json' with { type: 'json' };
import people from '../../data/people.json' with { type: 'json' };
import ship from '../../data/ship.json' with { type: 'json' };
import signals from '../../data/signals.json' with { type: 'json' };
import site from '../../data/site.json' with { type: 'json' };
import sources from '../../data/sources.json' with { type: 'json' };
import timeReference from '../../data/time-reference.json' with { type: 'json' };
import type { Dataset } from './schema/dataset.ts';

/**
 * The historical dataset of `data/`, typed by the schemas of `src/data/schema`.
 *
 * JSON modules are typed structurally, with string unions widened to `string`; the assertion
 * narrows them to the schema types. Its soundness is established outside the browser: the unit
 * tests and the build validate every file against its schema.
 */
export const dataset = {
  sources,
  timeReference,
  ship,
  chronology,
  attitude,
  flooding,
  lifeboats,
  signals,
  lighting,
  breakup,
  site,
  people,
} as unknown as Dataset;
