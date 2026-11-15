# Deployment

Titanic 4D is deployed on a Dokploy server from the `master` branch of this repository, as one
application built from the `Dockerfile`. This document is the complete procedure: what the
image contains, what must hold before a commit reaches `master`, how the Dokploy resources are
created, how the result is verified and how to go back.

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
sent without `preload`. The image contains the built site only: the build manifest
(`dist/.vite/`), which `pnpm budgets` reads, is removed before the files are copied.

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

CI (`.github/workflows/ci.yml`) runs the same steps on every pull request and on every push to
`master`, and rebuilds the model of the ship in a fourth job.

## Protecting `master` (owner, before the first deployment)

Dokploy deploys every push to `master` by itself and does not wait for CI. The image build runs
`pnpm build` only: no type checking, no test, no budget, no verification of the server. Without
a rule on the branch, a commit whose checks fail is therefore published while CI is still
running. The gate is a setting of the GitHub repository, which only its owner can change; on
2026-11-15 the GitHub API reported `master` as not protected.

In the repository settings on GitHub, add a branch protection rule (or a ruleset) for `master`:

1. Require a pull request before merging, so that nothing is pushed to `master` directly.
2. Require status checks to pass before merging, and require the branch to be up to date. The
   required checks are the four jobs of the workflow, under the names GitHub shows:
   - `Typecheck, lint, schema export, unit tests, build, budgets`
   - `End-to-end, accessibility and visual regression`
   - `Container image, headers, redirects and end-to-end under the production policy`
   - `Asset pipeline and reproducibility of the ship model`
3. Do not allow the rule to be bypassed, and do not allow force pushes or deletion.

With the rule in place, `master` only receives commits whose pull request passed the four jobs,
and those are the commits Dokploy deploys. The run of CI that starts on `master` after the merge
is not waited for by Dokploy either: it checks the same tree as the pull request did.

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

4. **Application.** Check first that `master` is protected as described above; if it is not,
   stop and ask the owner. Then `application-create` (name, `environmentId`) and
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
immutable caching of fingerprinted assets; the fallbacks and the 404; the absence of the build
manifest (`/.vite/manifest.json` answers 404); the model of the ship (`model/gltf-binary`,
`no-cache`, a 304 in answer to its own entity tag, Brotli and gzip variants); the static pages,
the Legal Notice values, the payment links, the site map and `security.txt`; for each of the
three secondary hosts, a 301 from `/a/b?x=1` to `https://www.titanic-4d.org/a/b?x=1`; and for
each of the four hosts, a trusted Let's Encrypt certificate naming the host and a permanent
redirection from HTTP to HTTPS. Each host has its own lines in the report: an untrusted
certificate fails the trust check with the reason given by the TLS layer, and a host that
cannot be reached is reported by name without stopping the checks of the others.

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

Finally merge a pull request into `master` and check that Dokploy redeploys it by itself.

## Going back

The site is static and has no data to migrate, so going back is redeploying an earlier commit.

1. Revert the faulty commits on a branch created from `master`, and push the branch:

   ```bash
   git switch --create revert-deployment origin/master
   ```

   ```bash
   git revert --no-edit <first-bad-commit>^..<last-bad-commit>
   ```

   ```bash
   git push origin revert-deployment
   ```

   Open a pull request from that branch and merge it once the required checks pass: `master`
   is protected, so the revert goes through the same gate as any other change. The merge
   triggers a deployment of the reverted state. History is not rewritten.

2. If the automatic deployment does not start, call `application-redeploy`, then follow
   `deployment-all` and `deployment-readLogs`.

3. Run `node tools/verify-server.ts --live` again.

If a deployment fails, read `deployment-readLogs` and `application-readLogs`, correct the cause
in the repository and redeploy. The live verification shows which version is being served.

## Maintenance

- `public/.well-known/security.txt` carries an expiry date. `tools/verify-server.ts` fails once
  it has passed or is more than a year away: renew it and redeploy before it expires.
- The build frontend (`# syntax=`) and the two base images of the `Dockerfile`, and the
  Playwright image of `tools/e2e-container.sh`, are referenced by exact version and digest
  (guarded by `tools/consistency.test.ts`). Update each digest together with its version, then
  run the checks above. The digest of a tag is the one of its multi-platform index:

  ```bash
  docker buildx imagetools inspect docker/dockerfile:<version> --format '{{.Manifest.Digest}}'
  ```
- Let's Encrypt certificates are renewed by Traefik. `tools/verify-server.ts --live` fails when
  one has less than seven days left.
