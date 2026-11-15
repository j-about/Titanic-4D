# Titanic 4D

Explore the sinking of RMS Titanic (14–15 April 1912) in 3D, freely through space and time,
built on sourced historical data.

Live site: <https://www.titanic-4d.org>

The project treats its subject as what it is — a disaster in which about 1,500 people died.
The tone is sober and informative; every state shown on screen is tied to a documented source
and a stated level of certainty.

## Status

The project is under construction. Progress is tracked in [docs/STATUS.md](docs/STATUS.md), the
milestones in [docs/PLAN.md](docs/PLAN.md) and the architectural decisions in
[docs/DECISIONS.md](docs/DECISIONS.md).

## Using the application

- **Time.** Play, pause, run backward, change speed from real time to ×600, step by one minute,
  drag the scrubber or jump to a key moment. The night runs from the collision at 11:40 p.m. to
  the two sections of the wreck at rest on the seabed.
- **Views.** Guided tour, around the ship, on the bridge, below the surface, free camera. In the
  3D view: drag or arrow keys to turn, wheel, pinch or plus and minus to zoom, Space to play or
  pause, comma and full stop to step by one minute; in the free camera, W, A, S, D, Q and E to
  move.
- **Description.** The "Now" tab states the instant in words and figures and draws the water in
  each watertight compartment, with the same values as a table; "Sources" lists the
  records behind it with their level of certainty and the competing positions, and "Narrative"
  tells the whole night in order. The page is complete without the 3D scene.
- **Pages.** "The night in words" tells every event in text with its sources, "About" explains
  the method and its limits, and the Legal Notice names the owner and the host. These pages are
  plain HTML: they need neither JavaScript nor a graphics card.
- **Links.** The address carries the instant, the view and the speed, for example
  `?t=01:40&camera=orbit&rate=60` (ship's time on a 24-hour clock). `quality=low`, `medium`
  (the default) or `high` sets the level of detail of the sea and of its reflections.
  `renderer=webgl2` selects the WebGL 2 backend; `renderer=webgpu-readback` is a test mode
  described in [docs/DECISIONS.md](docs/DECISIONS.md).

## Historical data

The dataset lives in [`data/`](data/) and is documented in [docs/DATA.md](docs/DATA.md). Every
record names its sources and carries a level of certainty (`established`, `estimated` or
`debated`); where sources disagree, the competing positions are kept side by side. The state of
the ship at any instant is computed from these records by a pure function of time.

The sky is computed for the date, the hour and the place from a star catalogue and an ephemeris
library, and the sea from a wave spectrum; the method and its tests are in
[docs/SKY.md](docs/SKY.md). Third-party data and software are credited in
[ATTRIBUTIONS.md](ATTRIBUTIONS.md).

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

```bash
E2E_BASE_URL=http://127.0.0.1:8080 tools/e2e-container.sh
```

The image serves the static build with Caddy as an unprivileged user on port 8080, with
precompressed files, security headers and the redirect of the secondary hosts
(`titanic-4d.org`, `www.titanic-4d.com`, `titanic-4d.com`) to the canonical origin. The last
command runs the end-to-end suite against the running image, under its content security
policy.

## Deployment

The procedure, its verification and how to go back are in [docs/DEPLOY.md](docs/DEPLOY.md).

## Support Titanic 4D

Titanic 4D is free to use and carries no advertising. A donation helps to pay for its hosting
and its further development; it is not a charitable gift and no part of it goes to the families
of those who died. The payment links are on the
[About page](https://www.titanic-4d.org/about/#support): €3, €5, €10 or a custom amount, each
on a page hosted by Stripe.

## Security

See [SECURITY.md](SECURITY.md). The site publishes its contact for security reports at
<https://www.titanic-4d.org/.well-known/security.txt>.

## Contact

<contact@titanic-4d.org>

## Licence

[MIT](LICENSE)
