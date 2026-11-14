import { request as httpRequest, type IncomingHttpHeaders } from 'node:http';
import { parseArgs } from 'node:util';
import { site } from '../src/config/site.ts';

interface Response {
  readonly status: number;
  readonly headers: IncomingHttpHeaders;
  readonly body: Buffer;
}

interface RequestOptions {
  readonly host?: string;
  readonly acceptEncoding?: string;
}

const { values } = parseArgs({
  options: { origin: { type: 'string', default: 'http://127.0.0.1:8080' } },
});
const origin = new URL(values.origin);

const failures: string[] = [];
let checkCount = 0;

function check(description: string, condition: boolean, detail = ''): void {
  checkCount += 1;
  if (!condition) {
    failures.push(detail === '' ? description : `${description} — ${detail}`);
  }
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${description}`);
}

/** Sends a GET request to the server under test, optionally overriding the Host header. */
function get(path: string, options: RequestOptions = {}): Promise<Response> {
  return new Promise((resolve, reject) => {
    const outgoing = httpRequest(
      {
        hostname: origin.hostname,
        port: origin.port,
        path,
        method: 'GET',
        headers: {
          ...(options.host === undefined ? {} : { Host: options.host }),
          'Accept-Encoding': options.acceptEncoding ?? 'identity',
        },
      },
      (incoming) => {
        const chunks: Buffer[] = [];
        incoming.on('data', (chunk: Buffer) => chunks.push(chunk));
        incoming.on('end', () => {
          resolve({
            status: incoming.statusCode ?? 0,
            headers: incoming.headers,
            body: Buffer.concat(chunks),
          });
        });
      },
    );
    outgoing.on('error', reject);
    outgoing.end();
  });
}

function header(response: Response, name: string): string {
  const value = response.headers[name];
  return Array.isArray(value) ? value.join(', ') : (value ?? '');
}

function checkSecurityHeaders(label: string, response: Response): void {
  const hsts = header(response, 'strict-transport-security');
  check(`${label}: HSTS is set without preload`, /^max-age=\d+$/.test(hsts), hsts);
  const csp = header(response, 'content-security-policy');
  check(`${label}: CSP denies by default`, csp.includes("default-src 'none'"), csp);
  check(`${label}: CSP forbids framing`, csp.includes("frame-ancestors 'none'"), csp);
  check(
    `${label}: CSP allows no inline or remote script`,
    csp.includes("script-src 'self'") && !csp.includes("'unsafe-inline'"),
    csp,
  );
  check(
    `${label}: X-Content-Type-Options is nosniff`,
    header(response, 'x-content-type-options') === 'nosniff',
  );
  check(
    `${label}: Referrer-Policy is strict-origin-when-cross-origin`,
    header(response, 'referrer-policy') === 'strict-origin-when-cross-origin',
  );
  check(
    `${label}: Permissions-Policy is set`,
    header(response, 'permissions-policy').includes('geolocation=()'),
  );
  check(`${label}: Server header is removed`, header(response, 'server') === '');
}

async function verifyHealth(): Promise<void> {
  const response = await get('/healthz');
  check('/healthz responds 200', response.status === 200, String(response.status));
  check('/healthz body is "ok"', response.body.toString('utf8') === 'ok');
}

async function verifyDocument(): Promise<string> {
  const response = await get('/');
  check('/ responds 200', response.status === 200, String(response.status));
  check('/ is HTML', header(response, 'content-type').startsWith('text/html'));
  check('/ is revalidated on every use', header(response, 'cache-control') === 'no-cache');
  checkSecurityHeaders('/', response);

  const canonicalHost = new URL(site.canonicalOrigin).host;
  const canonical = await get('/', { host: canonicalHost });
  check(`${canonicalHost} is served, not redirected`, canonical.status === 200);

  const brotli = await get('/', { acceptEncoding: 'br, gzip' });
  check('/ is served precompressed with Brotli', header(brotli, 'content-encoding') === 'br');
  const gzip = await get('/', { acceptEncoding: 'gzip' });
  check('/ is served precompressed with gzip', header(gzip, 'content-encoding') === 'gzip');
  check('/ varies on Accept-Encoding', header(brotli, 'vary').includes('Accept-Encoding'));
  return response.body.toString('utf8');
}

async function verifyFingerprintedAsset(documentHtml: string): Promise<void> {
  const assetPath = /(?:src|href)="(\/assets\/[^"]+\.js)"/.exec(documentHtml)?.[1];
  check('index.html references a fingerprinted script', assetPath !== undefined);
  if (assetPath === undefined) {
    return;
  }
  const response = await get(assetPath);
  check(`${assetPath} responds 200`, response.status === 200, String(response.status));
  check(
    `${assetPath} is cached immutably`,
    header(response, 'cache-control') === 'public, max-age=31536000, immutable',
    header(response, 'cache-control'),
  );
  check(
    `${assetPath} is JavaScript`,
    header(response, 'content-type').startsWith('text/javascript'),
    header(response, 'content-type'),
  );
  checkSecurityHeaders(assetPath, response);
}

async function verifyFallbacks(documentHtml: string): Promise<void> {
  const navigation = await get('/unknown/route');
  check('unknown navigation path falls back to the application shell', navigation.status === 200);
  check('fallback body is index.html', navigation.body.toString('utf8') === documentHtml);
  check('fallback is revalidated', header(navigation, 'cache-control') === 'no-cache');

  const missingFile = await get('/assets/missing-file.js');
  check('missing file responds 404', missingFile.status === 404, String(missingFile.status));
  check('404 is not cached', header(missingFile, 'cache-control') === 'no-store');
  checkSecurityHeaders('404', missingFile);

  const unversioned = await get('/favicon.svg');
  check('/favicon.svg responds 200', unversioned.status === 200);
  check(
    'unversioned files are cached briefly',
    header(unversioned, 'cache-control') === 'public, max-age=3600',
    header(unversioned, 'cache-control'),
  );
}

async function verifyRedirects(): Promise<void> {
  const pathAndQuery = '/a/b?x=1';
  for (const host of site.secondaryHosts) {
    const response = await get(pathAndQuery, { host });
    const expected = `${site.canonicalOrigin}${pathAndQuery}`;
    check(`${host} redirects permanently`, response.status === 301, String(response.status));
    check(
      `${host} redirects to the canonical origin with path and query`,
      header(response, 'location') === expected,
      header(response, 'location'),
    );
    checkSecurityHeaders(`${host} redirect`, response);

    const root = await get('/', { host });
    check(
      `${host} redirects its root`,
      root.status === 301 && header(root, 'location') === `${site.canonicalOrigin}/`,
      header(root, 'location'),
    );
  }
}

await verifyHealth();
const documentHtml = await verifyDocument();
await verifyFingerprintedAsset(documentHtml);
await verifyFallbacks(documentHtml);
await verifyRedirects();

console.log(`${checkCount - failures.length}/${checkCount} checks passed against ${origin.href}`);
if (failures.length > 0) {
  console.error(`Failed checks:\n${failures.map((failure) => `  - ${failure}`).join('\n')}`);
  process.exitCode = 1;
}
