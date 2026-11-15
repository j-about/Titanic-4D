import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { canonicalUrl, site } from '../src/config/site.ts';
import { SUPPORT_PATH } from '../src/config/support.ts';

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

describe('published contact and support addresses', () => {
  it('gives the contact address and the canonical location in security.txt', async () => {
    const securityTxt = await read('public/.well-known/security.txt');
    expect(securityTxt).toContain(`Contact: mailto:${site.contactEmail}\n`);
    expect(securityTxt).toContain(`Canonical: ${canonicalUrl('/.well-known/security.txt')}\n`);
    const expires = firstMatch(securityTxt, /^Expires: (.+)$/m, 'the Expires field');
    expect(expires).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    expect(Number.isNaN(Date.parse(expires))).toBe(false);
  });

  it('publishes no other address than the contact address', async () => {
    const documents = await Promise.all(
      ['README.md', 'SECURITY.md', 'public/.well-known/security.txt'].map(read),
    );
    for (const document of documents) {
      const addresses = document.match(/[\w.+-]+@[\w-]+\.[\w.-]+/g) ?? [];
      expect(addresses.length).toBeGreaterThan(0);
      for (const address of addresses) {
        expect(address).toBe(site.contactEmail);
      }
    }
  });

  it('points the funding file of the repository to the support section of the site', async () => {
    const funding = await read('.github/FUNDING.yml');
    expect(funding.trim()).toBe(`custom: ["${canonicalUrl(SUPPORT_PATH)}"]`);
  });

  it('declares the site map of the canonical origin in robots.txt', async () => {
    expect(await read('public/robots.txt')).toContain(`Sitemap: ${canonicalUrl('/sitemap.xml')}`);
  });
});
