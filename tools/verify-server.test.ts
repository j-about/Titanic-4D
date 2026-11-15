import { generateKeyPairSync, type KeyObject, sign } from 'node:crypto';
import { createServer as createHttpServer } from 'node:http';
import { type AddressInfo, createServer as createTcpServer, type Server } from 'node:net';
import { createServer as createTlsServer } from 'node:tls';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readCertificate, verifyTransport } from './verify-server.ts';

const HOST = 'localhost';
const DAY_MS = 86_400_000;

/** Encodes one DER element: tag, length, content. */
function der(tag: number, ...parts: readonly Uint8Array[]): Buffer {
  const content = Buffer.concat(parts);
  const length =
    content.length < 0x80
      ? [content.length]
      : content.length < 0x100
        ? [0x81, content.length]
        : [0x82, content.length >> 8, content.length & 0xff];
  return Buffer.concat([Buffer.from([tag, ...length]), content]);
}

const sequence = (...parts: readonly Uint8Array[]): Buffer => der(0x30, ...parts);
const objectIdentifier = (...bytes: readonly number[]): Buffer => der(0x06, Buffer.from(bytes));

/** Encodes an instant as an ASN.1 UTCTime (YYMMDDhhmmssZ). */
function utcTime(instant: Date): Buffer {
  const digits = instant.toISOString().replace(/[-:T]/g, '').slice(2, 14);
  return der(0x17, Buffer.from(`${digits}Z`, 'ascii'));
}

/**
 * Builds an X.509 version 3 certificate for `name`, signed with its own key (ECDSA with
 * SHA-256), valid from yesterday for thirty days, with `name` as its only subject alternative
 * name. Returns it in PEM form.
 */
function selfSignedCertificate(name: string, publicKey: KeyObject, privateKey: KeyObject): string {
  const algorithm = sequence(objectIdentifier(0x2a, 0x86, 0x48, 0xce, 0x3d, 0x04, 0x03, 0x02));
  const distinguishedName = sequence(
    der(0x31, sequence(objectIdentifier(0x55, 0x04, 0x03), der(0x0c, Buffer.from(name, 'utf8')))),
  );
  const alternativeNames = sequence(
    objectIdentifier(0x55, 0x1d, 0x11),
    der(0x04, sequence(der(0x82, Buffer.from(name, 'ascii')))),
  );
  const body = sequence(
    der(0xa0, der(0x02, Buffer.from([2]))),
    der(0x02, Buffer.from([1])),
    algorithm,
    distinguishedName,
    sequence(utcTime(new Date(Date.now() - DAY_MS)), utcTime(new Date(Date.now() + 30 * DAY_MS))),
    distinguishedName,
    publicKey.export({ type: 'spki', format: 'der' }),
    der(0xa3, sequence(alternativeNames)),
  );
  const signature = der(0x03, Buffer.from([0]), sign('sha256', body, privateKey));
  const lines =
    sequence(body, algorithm, signature)
      .toString('base64')
      .match(/.{1,64}/g) ?? [];
  return `-----BEGIN CERTIFICATE-----\n${lines.join('\n')}\n-----END CERTIFICATE-----\n`;
}

function listen(server: Server): Promise<number> {
  return new Promise((resolve) => {
    server.listen(0, () => resolve((server.address() as AddressInfo).port));
  });
}

function close(server: Server): Promise<void> {
  return new Promise((resolve) => {
    server.close(() => resolve());
  });
}

/** Returns a port on which nothing listens: one that was bound and then released. */
async function closedPort(): Promise<number> {
  const server = createTcpServer();
  const port = await listen(server);
  await close(server);
  return port;
}

/** Runs the transport checks and returns the lines they print, one per check. */
async function transcript(
  hosts: readonly string[],
  ports: { readonly https: number; readonly http: number },
): Promise<string[]> {
  const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  await verifyTransport(hosts, ports);
  return log.mock.calls.map((call) => String(call[0]));
}

describe('transport checks of the deployed site', () => {
  const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const tlsServer = createTlsServer({
    key: privateKey.export({ type: 'pkcs8', format: 'pem' }),
    cert: selfSignedCertificate(HOST, publicKey, privateKey),
  });
  const redirectingServer = createHttpServer((request, response) => {
    response.writeHead(301, { Location: `https://${HOST}${request.url ?? '/'}` }).end();
  });
  let httpsPort = 0;
  let httpPort = 0;

  beforeAll(async () => {
    httpsPort = await listen(tlsServer);
    httpPort = await listen(redirectingServer);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await Promise.all([close(tlsServer), close(redirectingServer)]);
  });

  it('reads a certificate that is not trusted and reports why', async () => {
    const certificate = await readCertificate(HOST, httpsPort);

    expect(certificate.authorized).toBe(false);
    expect(certificate.authorizationError).toBe('DEPTH_ZERO_SELF_SIGNED_CERT');
    expect(certificate.names).toBe(`DNS:${HOST}`);
    expect(certificate.validTo).toBeGreaterThan(Date.now() + 7 * DAY_MS);
  });

  it('fails the trust check of an untrusted certificate and runs the other checks', async () => {
    const lines = await transcript([HOST], { https: httpsPort, http: httpPort });

    expect(lines).toEqual([
      `FAIL  ${HOST} presents a certificate trusted for that name`,
      `FAIL  ${HOST} certificate is issued by Let's Encrypt`,
      `PASS  ${HOST} certificate names the host`,
      `PASS  ${HOST} certificate is valid for at least 7 more days`,
      `PASS  http://${HOST} redirects permanently to HTTPS`,
    ]);
  });

  it('names a host whose certificate cannot be read and checks what follows it', async () => {
    const lines = await transcript([HOST, HOST], { https: await closedPort(), http: httpPort });

    expect(lines).toEqual([
      `FAIL  ${HOST} certificate could be checked`,
      `PASS  http://${HOST} redirects permanently to HTTPS`,
      `FAIL  ${HOST} certificate could be checked`,
      `PASS  http://${HOST} redirects permanently to HTTPS`,
    ]);
  });

  it('names a host that does not answer over HTTP and checks the next host', async () => {
    const lines = await transcript([HOST, HOST], { https: httpsPort, http: await closedPort() });

    expect(lines.filter((line) => line.includes('http://'))).toEqual([
      `FAIL  http://${HOST} redirection could be checked`,
      `FAIL  http://${HOST} redirection could be checked`,
    ]);
    expect(lines.filter((line) => line.includes('names the host'))).toHaveLength(2);
  });
});
