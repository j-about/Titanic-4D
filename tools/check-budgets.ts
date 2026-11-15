import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { constants, gzipSync } from 'node:zlib';

interface ManifestChunk {
  readonly file: string;
  readonly isEntry?: boolean;
  readonly imports?: readonly string[];
  readonly dynamicImports?: readonly string[];
  readonly css?: readonly string[];
}

interface BudgetConfig {
  readonly entry: string;
  readonly budgets: {
    readonly initialJavaScript: number;
    readonly initialCss: number;
    readonly entryHtml: number;
  };
  readonly deferredChunkPatterns: readonly string[];
}

interface Measurement {
  readonly label: string;
  readonly bytes: number;
  readonly limit: number;
}

const rootDir = join(import.meta.dirname, '..');
const distDir = join(rootDir, 'dist');

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8')) as T;
}

async function gzipSize(relativePath: string): Promise<number> {
  const content = await readFile(join(distDir, relativePath));
  return gzipSync(content, { level: constants.Z_BEST_COMPRESSION }).byteLength;
}

/**
 * Collects every chunk needed before the application is interactive: the entry, its static
 * imports and its dynamic imports, minus the chunks whose manifest key matches a deferred pattern.
 */
function collectInitialChunks(
  manifest: Readonly<Record<string, ManifestChunk>>,
  entryKey: string,
  deferred: readonly RegExp[],
): ManifestChunk[] {
  const visited = new Set<string>();
  const pending = [entryKey];
  const chunks: ManifestChunk[] = [];
  for (let key = pending.pop(); key !== undefined; key = pending.pop()) {
    if (visited.has(key) || deferred.some((pattern) => pattern.test(key as string))) {
      continue;
    }
    visited.add(key);
    const chunk = manifest[key];
    if (chunk === undefined) {
      throw new Error(`Manifest has no chunk for "${key}".`);
    }
    chunks.push(chunk);
    pending.push(...(chunk.imports ?? []), ...(chunk.dynamicImports ?? []));
  }
  return chunks;
}

async function sumSizes(files: Iterable<string>): Promise<number> {
  const sizes = await Promise.all([...new Set(files)].map(gzipSize));
  return sizes.reduce((total, size) => total + size, 0);
}

const config = await readJson<BudgetConfig>(join(rootDir, 'budgets.json'));
const manifest = await readJson<Record<string, ManifestChunk>>(
  join(distDir, '.vite', 'manifest.json'),
);
const chunks = collectInitialChunks(
  manifest,
  config.entry,
  config.deferredChunkPatterns.map((pattern) => new RegExp(pattern)),
);

const measurements: Measurement[] = [
  {
    label: 'Initial JavaScript',
    bytes: await sumSizes(chunks.map((chunk) => chunk.file).filter((file) => file.endsWith('.js'))),
    limit: config.budgets.initialJavaScript,
  },
  {
    label: 'Initial CSS',
    bytes: await sumSizes(chunks.flatMap((chunk) => chunk.css ?? [])),
    limit: config.budgets.initialCss,
  },
  {
    label: 'Entry HTML',
    bytes: await gzipSize(config.entry),
    limit: config.budgets.entryHtml,
  },
];

let failed = false;
for (const { label, bytes, limit } of measurements) {
  const withinBudget = bytes <= limit;
  failed ||= !withinBudget;
  const percentage = ((bytes / limit) * 100).toFixed(1);
  console.log(
    `${withinBudget ? 'PASS' : 'FAIL'}  ${label}: ${bytes} B gzip of ${limit} B (${percentage} %)`,
  );
}
if (failed) {
  console.error('At least one performance budget is exceeded.');
  process.exitCode = 1;
}
