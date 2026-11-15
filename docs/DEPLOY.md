# Deployment

Titanic 4D is deployed on a Dokploy server from the `master` branch of this repository, as one
application built from the `Dockerfile`. This document is the complete procedure: what the
image contains, how the Dokploy resources are created, how the result is verified and how to go
back.

The deployment itself (milestone M7) has not been carried out yet: it must be run from a
session in which the tools of the `dokploy-mcp` server are available. Everything it needs is in
the repository.

## What is deployed

| Item          | Value                                                                                                   |
| ------------- | ------------------------------------------------------------------------------------------------------- |
| Canonical URL | `https://www.titanic-4d.org`                                                                            |
| Other hosts   | `titanic-4d.org`, `www.titanic-4d.com`, `titanic-4d.com`: 301 to the canonical URL, path and query kept |
| Image         | `Dockerfile`: build with Node.js and pnpm from the lockfile, precompression, then Caddy 2               |
| Process       | Caddy as UID 10001, listening on port 8080, `HEALTHCHECK` on `/healthz`                                 |
| TLS           | Terminated by Traefik on the Dokploy server, one Let's Encrypt certificate per host                     |
| Redirects     | In the `Caddyfile` only; Traefik passes the original Host header to Caddy                               |

Caddy sets the security and cache headers (ADR 0005), also on redirects and errors. HSTS is
sent without `preload`.

## Variables and secrets

The build and the container need no environment variable and no secret. Never put a Dokploy API
key, a token or any other secret in the repository, in logs or in a pull request.

## Before deploying

Run from a checkout of the commit to deploy:

```bash
pnpm install --frozen-lockfile
```

```bash
pnpm check
```

```bash
pnpm test:e2e:container
```

```bash
docker build --tag titanic-4d .
```

```bash
docker run --rm --detach --name titanic-4d --publish 8080:8080 titanic-4d
```

```bash
node tools/verify-server.ts --origin http://127.0.0.1:8080
```

```bash
E2E_BASE_URL=http://127.0.0.1:8080 tools/e2e-container.sh
```

```bash
docker rm --force titanic-4d
```

CI runs the same steps on every push and pull request.

## Sequence with the Dokploy MCP tools

Read the schema of each tool before calling it, to use the exact names of its parameters.

1. **Server and DNS.** `server-all`, `server-publicIp` or `settings-getIp`: identify the server
   and its IPv4 address. Check that the four hosts resolve to that address and that no AAAA
   record points elsewhere:

   ```bash
   for host in www.titanic-4d.org titanic-4d.org www.titanic-4d.com titanic-4d.com; do dig +short A "$host"; dig +short AAAA "$host"; done
   ```

   If any host does not resolve to the server, stop before creating any domain and report the
   hosts at fault: a Let's Encrypt validation that fails in a loop uses up the rate limits.

2. **Project.** `project-create` with the name of the repository, unless the project exists.
   Reuse the production environment created with the project, or create it with
   `environment-create`.

3. **GitHub provider.** `github-githubProviders`, then `github-getGithubRepositories` and
   `github-getGithubBranches`: obtain the `githubId` and confirm that this repository
   (`git remote get-url origin`) and its `master` branch are listed.

4. **Application.** `application-create` (name, `environmentId`), then
   `application-saveGithubProvider`: owner, repository, branch `master`, `githubId`, build path
   `/`, deployment triggered on every push.

5. **Build.** `application-saveBuildType`: build type `dockerfile`, Dockerfile path
   `Dockerfile`, context `.`. `application-saveEnvironment` is not needed: there is no build
   variable. `application-update` to enable automatic deployment if it is not already on.

6. **Domains.** `domain-create` once per host, the canonical host first: host, path `/`, port
   `8080`, `https` true, certificate type `letsencrypt`, domain type `application`,
   `applicationId`. Each secondary host needs its own certificate so that the redirection also
   works over HTTPS. Then `domain-validateDomain` for each host and `domain-byApplicationId` to
   check that the four are present. Do not create any `redirects-create` rule in Dokploy: the
   redirection to the canonical URL stays in the `Caddyfile`, the single versioned and tested
   source.

7. **Deployment.** `application-deploy`. Follow `deployment-all` and `deployment-readLogs` to
   the end, then `application-readLogs`. If it fails, find the root cause, correct it in the
   repository, push, then `application-redeploy`.

8. **Verification.** See the next section. Record the results in `docs/STATUS.md`.

Creating or changing any Dokploy resource other than those above needs the owner's
confirmation first.

## Verifying the deployed site

From a machine with direct access to the Internet (a TLS-inspecting proxy would present its own
certificates):

```bash
node tools/verify-server.ts --live
```

It checks, on the deployed site: `/healthz`; the application document, its headers (HSTS, CSP,
Permissions-Policy, Referrer-Policy, `nosniff`, framing) and its precompressed variants; the
immutable caching of fingerprinted assets; the fallbacks and the 404; the static pages, the
Legal Notice values, the payment links, the site map and `security.txt`; for each of the three
secondary hosts, a 301 from `/a/b?x=1` to `https://www.titanic-4d.org/a/b?x=1`; and for each
of the four hosts, a trusted Let's Encrypt certificate naming the host and a permanent
redirection from HTTP to HTTPS.

The same by hand, for the main points:

```bash
curl -sSI https://www.titanic-4d.org
```

```bash
curl -sSI "https://titanic-4d.org/a/b?x=1"
```

```bash
curl -sSI http://www.titanic-4d.com/
```

Then the end-to-end suite against the canonical URL:

```bash
E2E_BASE_URL=https://www.titanic-4d.org tools/e2e-container.sh
```

Finally push a commit to `master` and check that Dokploy redeploys it by itself.

## Going back

The site is static and has no data to migrate, so going back is redeploying an earlier commit.

1. Revert the faulty commits on `master` and push:

   ```bash
   git revert --no-edit <first-bad-commit>^..<last-bad-commit>
   ```

   ```bash
   git push origin master
   ```

   The push triggers a deployment of the reverted state. History is not rewritten.

2. If the automatic deployment does not start, call `application-redeploy`, then follow
   `deployment-all` and `deployment-readLogs`.

3. Run `node tools/verify-server.ts --live` again.

If the new image fails its health check, Dokploy keeps the previous container running: read
`deployment-readLogs`, correct the cause and redeploy.

## Maintenance

- `public/.well-known/security.txt` carries an expiry date. `tools/verify-server.ts` fails once
  it has passed or is more than a year away: renew it and redeploy before it expires.
- The base images of the `Dockerfile` are pinned by digest; update the digests together with
  the versions and run the checks above.
- Let's Encrypt certificates are renewed by Traefik. `tools/verify-server.ts --live` fails when
  one has less than seven days left.
