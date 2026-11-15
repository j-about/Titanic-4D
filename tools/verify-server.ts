import { request as httpRequest, type IncomingHttpHeaders } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { connect as tlsConnect } from 'node:tls';
import { parseArgs } from 'node:util';
import { legalNotice } from '../src/config/legal.ts';
import { canonicalUrl, site } from '../src/config/site.ts';
import { supportLinks } from '../src/config/support.ts';
import { sitePaths, staticPages } from '../src/pages/registry.ts';

interface Response {
  readonly status: number;
  readonly headers: IncomingHttpHeaders;
  readonly body: Buffer;
}

interface RequestOptions {
  readonly host?: string;
  readonly acceptEncoding?: string;
  readonly ifNoneMatch?: string;
}

/**
 * Two modes. By default the tool checks a container reached over HTTP at `--origin`, and
 * addresses the other hosts through the Host header. With `--live` it checks the deployed site:
 * every host is reached by its own name over HTTPS, and certificates and the redirection from
 * HTTP are checked as well. The options are read from the command line when the file is run as
 * a program; a module that imports it gets the defaults and runs no check by itself.
 */
const { values } = parseArgs({
  args: import.meta.main ? process.argv.slice(2) : [],
  options: {
    origin: { type: 'string' },
    live: { type: 'boolean', default: false },
  },
});
const live = values.live;
const origin = new URL(values.origin ?? (live ? site.canonicalOrigin : 'http://127.0.0.1:8080'));
const DAY_MS = 86_400_000;
/** Shortest remaining validity accepted for a certificate, in days. */
const MIN_CERTIFICATE_DAYS = 7;
/** Address from which the scene fetches the detailed model of the ship. */
const SHIP_MODEL_PATH = '/models/ship-lod1.glb';
/** Address at which the build writes its manifest, which the image does not contain. */
const BUILD_MANIFEST_PATH = '/.vite/manifest.json';

const failures: string[] = [];
let checkCount = 0;

function check(description: string, condition: boolean, detail = ''): void {
  checkCount += 1;
  if (!condition) {
    failures.push(detail === '' ? description : `${description} — ${detail}`);
  }
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${description}`);
}

/**
 * Sends a GET request. A request for another host goes to the server under test with that Host
 * header, or, in live mode, to that host itself over HTTPS.
 */
function get(path: string, options: RequestOptions = {}): Promise<Response> {
  const direct = live && options.host !== undefined;
  const base = direct ? new URL(`https://${options.host}`) : origin;
  const send = base.protocol === 'https:' ? httpsRequest : httpRequest;
  return new Promise((resolve, reject) => {
    const outgoing = send(
      {
        hostname: base.hostname,
        port: base.port === '' ? undefined : base.port,
        path,
        method: 'GET',
        headers: {
          ...(options.host === undefined || direct ? {} : { Host: options.host }),
          ...(options.ifNoneMatch === undefined ? {} : { 'If-None-Match': options.ifNoneMatch }),
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
    `${label}: CSP allows own scripts and WebAssembly only, no inline or remote script`,
    /script-src 'self' 'wasm-unsafe-eval';/.test(csp) &&
      !csp.includes("'unsafe-inline'") &&
      !csp.includes("'unsafe-eval'"),
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

  const manifest = await get(BUILD_MANIFEST_PATH);
  check(`${BUILD_MANIFEST_PATH} is not served`, manifest.status === 404, String(manifest.status));
}

/**
 * Checks the detailed model of the ship: its media type, its revalidation on every use, with a
 * validator that turns an unchanged file into a 304, and its precompressed variants.
 */
async function verifyShipModel(): Promise<void> {
  const response = await get(SHIP_MODEL_PATH);
  const etag = header(response, 'etag');
  check(`${SHIP_MODEL_PATH} responds 200`, response.status === 200, String(response.status));
  check(
    `${SHIP_MODEL_PATH} is a binary glTF model`,
    header(response, 'content-type') === 'model/gltf-binary',
    header(response, 'content-type'),
  );
  check(
    `${SHIP_MODEL_PATH} is revalidated on every use`,
    header(response, 'cache-control') === 'no-cache',
    header(response, 'cache-control'),
  );
  check(`${SHIP_MODEL_PATH} carries an entity tag`, etag !== '');
  checkSecurityHeaders(SHIP_MODEL_PATH, response);

  if (etag !== '') {
    const revalidated = await get(SHIP_MODEL_PATH, { ifNoneMatch: etag });
    check(
      `${SHIP_MODEL_PATH} answers 304 to its own entity tag`,
      revalidated.status === 304 && revalidated.body.byteLength === 0,
      String(revalidated.status),
    );
  }

  for (const encoding of ['br', 'gzip']) {
    const compressed = await get(SHIP_MODEL_PATH, { acceptEncoding: encoding });
    check(
      `${SHIP_MODEL_PATH} is served precompressed with ${encoding}`,
      header(compressed, 'content-encoding') === encoding &&
        header(compressed, 'content-type') === 'model/gltf-binary' &&
        header(compressed, 'cache-control') === 'no-cache',
      `${header(compressed, 'content-encoding')}, ${header(compressed, 'content-type')}, ${header(compressed, 'cache-control')}`,
    );
  }
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

/** Checks the pages generated at build time, the site map and the security contact file. */
async function verifyStaticPages(): Promise<void> {
  for (const page of staticPages) {
    const response = await get(page.path);
    const html = response.body.toString('utf8');
    check(`${page.path} responds 200`, response.status === 200, String(response.status));
    check(`${page.path} is HTML`, header(response, 'content-type').startsWith('text/html'));
    check(
      `${page.path} is revalidated on every use`,
      header(response, 'cache-control') === 'no-cache',
    );
    check(`${page.path} carries its title`, html.includes(`<title>${page.title} — ${site.name}`));
    check(`${page.path} declares its canonical address`, html.includes(canonicalUrl(page.path)));
    check(`${page.path} loads no script`, !html.includes('<script'));
    check(`${page.path} links the Legal Notice`, html.includes('href="/legal-notice/"'));
    checkSecurityHeaders(page.path, response);
  }

  const notice = (await get('/legal-notice/')).body.toString('utf8');
  for (const value of [
    legalNotice.owner.name,
    legalNotice.owner.address,
    legalNotice.owner.rcs,
    legalNotice.host.company,
    legalNotice.host.address,
    `tel:${legalNotice.owner.phone.dial}`,
    `tel:${legalNotice.host.phone.dial}`,
    `mailto:${legalNotice.owner.email}`,
  ]) {
    check(`Legal Notice contains "${value}"`, notice.includes(value));
  }

  const about = (await get('/about/')).body.toString('utf8');
  for (const link of supportLinks) {
    check(`About page offers the ${link.label} payment link`, about.includes(`href="${link.url}"`));
  }

  const sitemap = await get('/sitemap.xml');
  check('/sitemap.xml responds 200', sitemap.status === 200, String(sitemap.status));
  for (const path of sitePaths) {
    check(
      `/sitemap.xml lists ${path}`,
      sitemap.body.toString('utf8').includes(`<loc>${canonicalUrl(path)}</loc>`),
    );
  }

  const security = await get('/.well-known/security.txt');
  const securityText = security.body.toString('utf8');
  check('/.well-known/security.txt responds 200', security.status === 200, String(security.status));
  check(
    '/.well-known/security.txt is plain text',
    header(security, 'content-type').startsWith('text/plain'),
    header(security, 'content-type'),
  );
  check(
    '/.well-known/security.txt gives the contact address',
    securityText.includes(`Contact: mailto:${site.contactEmail}`),
  );
  const expires = Date.parse(/^Expires: (.+)$/m.exec(securityText)?.[1] ?? '');
  check(
    '/.well-known/security.txt has not expired',
    expires > Date.now(),
    new Date(expires).toString(),
  );
  check(
    '/.well-known/security.txt expires within a year, as RFC 9116 recommends',
    expires - Date.now() < 366 * DAY_MS,
  );
}

interface CertificateSummary {
  readonly authorized: boolean;
  /** Reason given by the TLS layer when the certificate is not trusted for the host. */
  readonly authorizationError: string;
  readonly issuer: string;
  readonly validTo: number;
  readonly names: string;
}

/** Ports of the two transports checked in live mode. */
interface TransportPorts {
  readonly https: number;
  readonly http: number;
}

const STANDARD_PORTS: TransportPorts = { https: 443, http: 80 };

/**
 * Opens a TLS connection to a host and reports on the certificate it presents. The handshake is
 * completed whether or not the certificate is trusted, and the verdict of the TLS layer is part
 * of the report; the promise is rejected only when no handshake takes place.
 */
export function readCertificate(host: string, port: number): Promise<CertificateSummary> {
  return new Promise((resolve, reject) => {
    const socket = tlsConnect({ host, port, servername: host, rejectUnauthorized: false }, () => {
      const certificate = socket.getPeerCertificate();
      resolve({
        authorized: socket.authorized,
        authorizationError: socket.authorized ? '' : String(socket.authorizationError),
        issuer: String(certificate.issuer.O ?? ''),
        validTo: Date.parse(certificate.valid_to),
        names: certificate.subjectaltname ?? '',
      });
      socket.end();
    });
    socket.on('error', reject);
  });
}

/** Sends a GET request over plain HTTP to a host, without following redirections. */
function getOverHttp(host: string, port: number, path: string): Promise<Response> {
  return new Promise((resolve, reject) => {
    const outgoing = httpRequest({ hostname: host, port, path, method: 'GET' }, (incoming) => {
      incoming.resume();
      incoming.on('end', () => {
        resolve({
          status: incoming.statusCode ?? 0,
          headers: incoming.headers,
          body: Buffer.alloc(0),
        });
      });
    });
    outgoing.on('error', reject);
    outgoing.end();
  });
}

/** Checks the certificate that a host presents: trust, issuer, names and remaining validity. */
async function verifyCertificate(host: string, port: number): Promise<void> {
  const certificate = await readCertificate(host, port);
  check(
    `${host} presents a certificate trusted for that name`,
    certificate.authorized,
    certificate.authorizationError,
  );
  check(
    `${host} certificate is issued by Let's Encrypt`,
    certificate.issuer.includes("Let's Encrypt"),
    certificate.issuer,
  );
  check(
    `${host} certificate names the host`,
    certificate.names.includes(`DNS:${host}`),
    certificate.names,
  );
  check(
    `${host} certificate is valid for at least ${MIN_CERTIFICATE_DAYS} more days`,
    certificate.validTo - Date.now() > MIN_CERTIFICATE_DAYS * DAY_MS,
    new Date(certificate.validTo).toString(),
  );
}

/** Checks that a host answers a plain HTTP request with a permanent redirection to HTTPS. */
async function verifyHttpRedirection(host: string, port: number): Promise<void> {
  const plain = await getOverHttp(host, port, '/a/b?x=1');
  check(
    `http://${host} redirects permanently to HTTPS`,
    [301, 308].includes(plain.status) && header(plain, 'location').startsWith('https://'),
    `${plain.status} ${header(plain, 'location')}`,
  );
}

/**
 * Live mode only: the certificate of every host and its redirection from HTTP to HTTPS. The two
 * steps of each host are separate groups, so a host that cannot be reached is reported under its
 * own name and the steps and hosts after it are still checked.
 */
export async function verifyTransport(
  hosts: readonly string[],
  ports: TransportPorts = STANDARD_PORTS,
): Promise<void> {
  for (const host of hosts) {
    await run(`${host} certificate`, () => verifyCertificate(host, ports.https));
    await run(`http://${host} redirection`, () => verifyHttpRedirection(host, ports.http));
  }
}

/** Runs a group of checks; a request that cannot be made counts as a failed check. */
async function run<T>(label: string, group: () => Promise<T>): Promise<T | undefined> {
  try {
    return await group();
  } catch (error) {
    check(
      `${label} could be checked`,
      false,
      error instanceof Error ? error.message : String(error),
    );
    return undefined;
  }
}

/** Runs every group of checks against the origin and sets the exit code of the process. */
async function main(): Promise<void> {
  console.log(`Checking ${origin.href} (${live ? 'deployed site' : 'container'})`);
  await run('health endpoint', verifyHealth);
  const documentHtml = await run('application document', verifyDocument);
  if (documentHtml !== undefined) {
    await run('fingerprinted asset', () => verifyFingerprintedAsset(documentHtml));
    await run('fallbacks', () => verifyFallbacks(documentHtml));
  }
  await run('model of the ship', verifyShipModel);
  await run('static pages', verifyStaticPages);
  await run('host redirects', verifyRedirects);
  if (live) {
    await verifyTransport([new URL(site.canonicalOrigin).host, ...site.secondaryHosts]);
  }

  console.log(`${checkCount - failures.length}/${checkCount} checks passed against ${origin.href}`);
  if (failures.length > 0) {
    console.error(`Failed checks:\n${failures.map((failure) => `  - ${failure}`).join('\n')}`);
    process.exitCode = 1;
  }
}

if (import.meta.main) {
  await main();
}
