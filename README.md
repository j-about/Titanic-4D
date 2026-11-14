# Titanic 4D

Explore the sinking of RMS Titanic (14–15 April 1912) in 3D, freely through space and time,
built on sourced historical data.

Live site: <https://www.titanic-4d.org>

The project treats its subject as what it is — a disaster in which more than 1,500 people died.
The tone is sober and informative; every state shown on screen is tied to a documented source
and a stated level of certainty.

## Status

The project is under construction. Progress is tracked in [docs/STATUS.md](docs/STATUS.md), the
milestones in [docs/PLAN.md](docs/PLAN.md) and the architectural decisions in
[docs/DECISIONS.md](docs/DECISIONS.md).

## Requirements

- Node.js 26.13.1 (see `.node-version`)
- pnpm 12.18.0
- Docker, for the end-to-end suite and the production image

## Getting started

```bash
pnpm install --frozen-lockfile
```

```bash
pnpm dev
```

## Quality checks

| Purpose                                         | Command                   |
| ----------------------------------------------- | ------------------------- |
| Type checking                                   | `pnpm typecheck`          |
| Lint and format check                           | `pnpm lint`               |
| Unit tests                                      | `pnpm test`               |
| Build and precompress                           | `pnpm build`              |
| Performance budgets (after a build)             | `pnpm budgets`            |
| All of the above                                | `pnpm check`              |
| End-to-end, accessibility and visual regression | `pnpm test:e2e:container` |

The end-to-end suite runs inside the official Playwright image so that every machine renders
with the same browser, fonts and software rasteriser. It exercises both the WebGL 2 and the
WebGPU backends.

## Production image

```bash
docker build --tag titanic-4d .
```

```bash
docker run --rm --publish 8080:8080 titanic-4d
```

```bash
node tools/verify-server.ts --origin http://127.0.0.1:8080
```

The image serves the static build with Caddy as an unprivileged user on port 8080, with
precompressed files, security headers and the redirect of the secondary hosts
(`titanic-4d.org`, `www.titanic-4d.com`, `titanic-4d.com`) to the canonical origin.

## Contact

<contact@titanic-4d.org>

## Licence

[MIT](LICENSE)
