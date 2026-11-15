import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { z } from 'zod';
import { datasetSchemas } from '../src/data/schema/dataset.ts';

const { values } = parseArgs({ options: { check: { type: 'boolean', default: false } } });

const schemaDir = join(import.meta.dirname, '..', 'data', 'schema');

/** Serialises the JSON Schema (draft 2020-12) of one dataset file. */
function renderSchema(name: keyof typeof datasetSchemas): string {
  const schema = z.toJSONSchema(datasetSchemas[name], { target: 'draft-2020-12', reused: 'ref' });
  const document = {
    $id: `https://www.titanic-4d.org/schema/${name}.schema.json`,
    title: `Titanic 4D dataset: ${name}.json`,
    ...schema,
  };
  return `${JSON.stringify(document, null, 2)}\n`;
}

await mkdir(schemaDir, { recursive: true });
const stale: string[] = [];
for (const name of Object.keys(datasetSchemas) as (keyof typeof datasetSchemas)[]) {
  const path = join(schemaDir, `${name}.schema.json`);
  const rendered = renderSchema(name);
  if (values.check) {
    const current = await readFile(path, 'utf8').catch(() => '');
    if (current !== rendered) {
      stale.push(`data/schema/${name}.schema.json`);
    }
  } else {
    await writeFile(path, rendered);
    console.log(`Wrote data/schema/${name}.schema.json`);
  }
}

if (stale.length > 0) {
  console.error(`Stale JSON Schema files (run "pnpm data:schema"):\n${stale.join('\n')}`);
  process.exitCode = 1;
}
