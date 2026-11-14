import { readdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import { promisify } from 'node:util';
import { brotliCompress, constants, gzip } from 'node:zlib';

const brotli = promisify(brotliCompress);
const gzipAsync = promisify(gzip);

const distDir = join(import.meta.dirname, '..', 'dist');

/** File extensions whose content shrinks under a general-purpose compressor. */
const compressibleExtensions = new Set([
  '.bin',
  '.css',
  '.glb',
  '.html',
  '.js',
  '.json',
  '.svg',
  '.txt',
  '.wasm',
  '.webmanifest',
  '.xml',
]);

/** Files below this size are served uncompressed: the encoding overhead outweighs the gain. */
const minimumSizeBytes = 256;

async function* walk(directory: string): AsyncGenerator<string> {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      yield* walk(path);
    } else if (entry.isFile()) {
      yield path;
    }
  }
}

interface CompressionResult {
  readonly original: number;
  readonly br: number;
  readonly gz: number;
}

/**
 * Writes `<file>.br` and `<file>.gz` sidecars when they are smaller than the original.
 * Returns `undefined` for files too small to be worth compressing.
 */
async function compressFile(path: string): Promise<CompressionResult | undefined> {
  const source = await readFile(path);
  if (source.byteLength < minimumSizeBytes) {
    return undefined;
  }
  const [br, gz] = await Promise.all([
    brotli(source, {
      params: {
        [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
        [constants.BROTLI_PARAM_SIZE_HINT]: source.byteLength,
      },
    }),
    gzipAsync(source, { level: constants.Z_BEST_COMPRESSION }),
  ]);
  const writes: Promise<void>[] = [];
  if (br.byteLength < source.byteLength) {
    writes.push(writeFile(`${path}.br`, br));
  }
  if (gz.byteLength < source.byteLength) {
    writes.push(writeFile(`${path}.gz`, gz));
  }
  await Promise.all(writes);
  return { original: source.byteLength, br: br.byteLength, gz: gz.byteLength };
}

let fileCount = 0;
let originalTotal = 0;
let brotliTotal = 0;
for await (const path of walk(distDir)) {
  if (!compressibleExtensions.has(extname(path))) {
    continue;
  }
  const sizes = await compressFile(path);
  if (sizes === undefined) {
    continue;
  }
  fileCount += 1;
  originalTotal += sizes.original;
  brotliTotal += Math.min(sizes.br, sizes.original);
  console.log(
    `${relative(distDir, path)}: ${sizes.original} B -> br ${sizes.br} B, gzip ${sizes.gz} B`,
  );
}
console.log(`Precompressed ${fileCount} files: ${originalTotal} B -> ${brotliTotal} B (brotli).`);
