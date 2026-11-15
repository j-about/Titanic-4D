import { readFile, writeFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { parseArgs } from 'node:util';
import { validateBytes } from 'gltf-validator';

/**
 * Validates a model with the Khronos glTF Validator: `node validate.ts <model.glb>`.
 *
 * Prints the number of issues of each severity and every message, optionally writes the whole
 * report with `--report <file.json>`, and fails when the validator reports an error.
 */

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { report: { type: 'string' } },
});
const [modelPath] = positionals;
if (modelPath === undefined) {
  throw new Error('Usage: node validate.ts <model.glb> [--report <file.json>]');
}

const report = await validateBytes(new Uint8Array(await readFile(modelPath)), {
  uri: basename(modelPath),
  format: 'glb',
  writeTimestamp: false,
  maxIssues: 0,
});
if (values.report !== undefined) {
  await writeFile(values.report, `${JSON.stringify(report, null, 2)}\n`);
}

const { numErrors, numWarnings, numInfos, numHints, messages } = report.issues;
console.info(
  `${modelPath}: ${numErrors} errors, ${numWarnings} warnings, ${numInfos} infos, ${numHints} hints (glTF Validator ${report.validatorVersion})`,
);
for (const message of messages) {
  console.info(`  [${message.code}] ${message.pointer ?? ''} ${message.message}`);
}
if (numErrors > 0) {
  process.exitCode = 1;
}
