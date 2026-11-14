import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { type Dataset, type DatasetFileName, datasetSchemas } from '../src/data/schema/dataset.ts';
import { findDatasetIssues } from '../src/data/validation.ts';

const dataDir = join(import.meta.dirname, '..', 'data');

/** Property of `Dataset` holding each file. */
const datasetKeys: Record<DatasetFileName, keyof Dataset> = {
  sources: 'sources',
  'time-reference': 'timeReference',
  ship: 'ship',
  chronology: 'chronology',
  attitude: 'attitude',
  flooding: 'flooding',
  lifeboats: 'lifeboats',
  signals: 'signals',
  lighting: 'lighting',
  breakup: 'breakup',
  site: 'site',
  people: 'people',
};

const issues: string[] = [];
const parsed: Partial<Record<keyof Dataset, unknown>> = {};
for (const name of Object.keys(datasetSchemas) as DatasetFileName[]) {
  const raw: unknown = JSON.parse(await readFile(join(dataDir, `${name}.json`), 'utf8'));
  const result = datasetSchemas[name].safeParse(raw);
  if (result.success) {
    parsed[datasetKeys[name]] = result.data;
  } else {
    for (const issue of result.error.issues) {
      issues.push(`${name}.json: ${issue.path.join('.')}: ${issue.message}`);
    }
  }
}

if (issues.length === 0) {
  issues.push(...findDatasetIssues(parsed as Dataset));
}

if (issues.length > 0) {
  console.error(`The dataset is invalid:\n${issues.map((issue) => `  - ${issue}`).join('\n')}`);
  process.exitCode = 1;
} else {
  console.log('The dataset is valid: every file matches its schema and the files are consistent.');
}
