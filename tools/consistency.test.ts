import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { site } from '../src/config/site.ts';

const rootDir = join(import.meta.dirname, '..');

function read(relativePath: string): Promise<string> {
  return readFile(join(rootDir, relativePath), 'utf8');
}

function firstMatch(text: string, pattern: RegExp, description: string): string {
  const value = pattern.exec(text)?.[1];
  if (value === undefined) {
    throw new Error(`Could not find ${description}.`);
  }
  return value;
}

interface PackageManifest {
  readonly packageManager: string;
  readonly devDependencies: Readonly<Record<string, string>>;
}

const manifest = JSON.parse(await read('package.json')) as PackageManifest;
const dockerfile = await read('Dockerfile');
const caddyfile = await read('Caddyfile');
const e2eScript = await read('tools/e2e-container.sh');

describe('pinned toolchain versions', () => {
  const pnpmVersion = firstMatch(manifest.packageManager, /^pnpm@(.+)$/, 'the pnpm version');

  it('installs the same pnpm version in the Dockerfile and the e2e container', () => {
    expect(firstMatch(dockerfile, /pnpm@([\d.]+)/, 'pnpm in Dockerfile')).toBe(pnpmVersion);
    expect(firstMatch(e2eScript, /pnpm_version="([\d.]+)"/, 'pnpm in e2e script')).toBe(
      pnpmVersion,
    );
  });

  it('builds the image with the Node.js version declared in .node-version', async () => {
    const nodeVersion = (await read('.node-version')).trim();
    expect(firstMatch(dockerfile, /FROM node:([\d.]+)-/, 'Node.js in Dockerfile')).toBe(
      nodeVersion,
    );
  });

  it('runs end-to-end tests in the image matching the installed Playwright version', () => {
    const playwrightVersion = manifest.devDependencies['@playwright/test'];
    expect(firstMatch(e2eScript, /playwright:v([\d.]+)-/, 'the Playwright image tag')).toBe(
      playwrightVersion,
    );
  });
});

describe('Caddyfile host redirects', () => {
  it('redirects exactly the secondary hosts to the canonical origin', () => {
    const hosts = firstMatch(caddyfile, /@secondaryHost host (.+)/, 'the secondary host matcher');
    const byName = (a: string, b: string): number => a.localeCompare(b);
    expect(hosts.trim().split(/\s+/).toSorted(byName)).toEqual(
      [...site.secondaryHosts].toSorted(byName),
    );
    expect(caddyfile).toContain(`redir @secondaryHost ${site.canonicalOrigin}{uri} permanent`);
  });
});
