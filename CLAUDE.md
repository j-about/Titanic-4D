# Titanic 4D — working notes for Claude

Interactive, source-backed 3D reconstruction of the sinking of RMS Titanic (14–15 April 1912),
navigable in space and time. Canonical URL: <https://www.titanic-4d.org>. The application,
code, comments, commits and documentation are in English only.

## Read first

1. `docs/STATUS.md` — done, in progress, next, blockers.
2. `docs/DATA.md` — dataset structure, conventions and modelling rules.
3. `docs/PLAN.md` — milestones and acceptance criteria.
4. `docs/DECISIONS.md` — architecture decision records (ADR).
5. `docs/SKY.md` — how the sky, the sea and the night lighting are computed and tested.
6. `docs/DEPLOY.md` — deployment procedure, verification and going back.
7. `docs/ASSETS.md` — the pipeline that builds the detailed model of the ship.

Update STATUS.md at the end of every task. A change of behaviour updates the affected
documentation in the same commit series.

## Commands

| Purpose                           | Command                                      |
| --------------------------------- | -------------------------------------------- |
| Install                           | `pnpm install --frozen-lockfile`             |
| Development server                | `pnpm dev`                                   |
| Type checking                     | `pnpm typecheck`                             |
| Lint and format check             | `pnpm lint`                                  |
| Apply formatting and safe fixes   | `pnpm format`                                |
| Unit tests                        | `pnpm test`                                  |
| Build and precompress             | `pnpm build`                                 |
| Performance budgets (after build) | `pnpm budgets`                               |
| All of the above                  | `pnpm check`                                 |
| Rebuild the model of the ship     | `pnpm assets:build`                          |
| Test the asset pipeline           | `pnpm assets:test`                           |
| End-to-end tests (pinned image)   | `pnpm test:e2e:container`                    |
| Verify a running container        | `node tools/verify-server.ts --origin <url>` |
| Verify the deployed site          | `node tools/verify-server.ts --live`         |
| End-to-end against a running site | `E2E_BASE_URL=<url> tools/e2e-container.sh`  |

Run `pnpm check` and the end-to-end suite before every commit.

## Repository map

| Path                                    | Content                                                                 |
| --------------------------------------- | ----------------------------------------------------------------------- |
| `index.html`                            | Application document                                                    |
| `about/`, `legal-notice/`, `narrative/` | Documents of the static pages; their content is generated               |
| `src/pages/`                            | Static pages rendered to HTML at build time, shared header and footer   |
| `data/`                                 | Historical dataset (JSON) and its exported JSON Schemas                 |
| `src/data/`                             | Zod schemas, typed loader and validation of the dataset                 |
| `src/sim/`                              | Pure simulation: timeline model, poses, events, waterline               |
| `src/ship/`                             | Pure geometry of the ship: hull form, mesh data, lamps                  |
| `src/sky/`                              | Star catalogue codec, sky orientation (ephemerides), star appearance    |
| `src/ocean/`                            | Wave spectrum, FFT field and analytic waves                             |
| `src/render/`                           | three.js scene, objects, cameras, quality levels (separate chunk)       |
| `src/app/`                              | Store, playback, address state                                          |
| `src/ui/`                               | Timeline, panels, camera controls, announcements                        |
| `src/time/`                             | Ship's time conversions and formatting                                  |
| `src/config/`                           | Typed configuration (site identity, later support links and legal data) |
| `src/styles/`                           | Design tokens, base styles and layout                                   |
| `public/`                               | Files served unchanged: `.well-known/security.txt`, `models/` (built)   |
| `assets/`                               | Asset pipeline: Python project run by uv, Blender, glTF-Transform       |
| `tools/`                                | Build and verification scripts, run by Node.js as TypeScript            |
| `tests/e2e/`                            | Playwright tests (accessibility, behaviour, visual regression)          |
| `docs/`                                 | Plan, status, decisions, data, sky and accessibility documentation      |
| `Dockerfile`                            | Build with Node.js, serve with Caddy as an unprivileged user            |
| `Caddyfile`                             | Headers, caching, fallback, host redirects                              |
| `budgets.json`                          | Performance budgets checked by `tools/check-budgets.ts`                 |

## Conventions

- TypeScript strict; relative imports carry the `.ts` extension; only erasable syntax, so that
  Node.js runs `tools/` directly.
- No default exports, no barrel files, no `any`, no non-null assertions.
- Unit tests sit next to the code as `*.test.ts` (Node) or `*.dom.test.ts` (happy-dom).
- Comments explain what the code does and how. Rationale, history and future work belong in
  `docs/DECISIONS.md`, commit messages and pull requests.
- Conventional Commits; one pull request per milestone.
- Latest stable versions, verified on the registry when installed. Version pins that must agree
  across files are guarded by `tools/consistency.test.ts`.
- For every dependency hosted on GitHub, consult both Context7 and DeepWiki before implementing
  a task that uses it (at most three searches per item).
- Python (asset pipeline, `assets/`): use uv, ruff and ty through the `/astral:*` skills.
  `public/models/ship-lod1.glb` is built by `pnpm assets:build`, never edited by hand; CI
  rebuilds it and fails when the committed file differs. See `docs/ASSETS.md`.
- Historical data: never invent a fact, time or figure. Every record carries `source_ids`,
  `certainty` (`established`, `estimated`, `debated`) and `note`. Data keys are snake_case.
- The state of the scene is a pure function of `t` (seconds since the collision). Nothing in
  `src/sim/` may keep state between calls or use unseeded randomness.
- Pure code first: anything computable without a renderer goes in `src/sim/` or `src/ship/`
  with unit tests; `src/render/` only turns it into GPU resources.
- Visual baselines (`tests/e2e/__screenshots__/`) are re-recorded only after the images have
  been looked at; note the review in `docs/STATUS.md`.
- A night image is mostly black: after a visual change, check that the old baselines fail before
  re-recording them, and assert new content directly (see `tests/e2e/pixels.ts`).
- Tests must work under the production content security policy: no injected style or script
  (`hideOverlays` in `tests/e2e/app.ts` uses the CSS object model).
- Legal, support and contact content is written once in `src/config/` and tested; the Legal
  Notice text is the owner's and is never completed or rephrased.
- Static pages contain no script. The header, the menu and the footer of every document come
  from `src/pages/layout.ts` through `tools/vite-static-pages.ts`.
- Tone: sober and informative. No depiction of victims, no sensational wording or sound.
- Accessibility: WCAG 2.2 level AA on every view.

## Environment notes

- Node.js 26.13.1 and pnpm 12.18.0 (`.node-version`, `packageManager`).
- End-to-end tests run in `mcr.microsoft.com/playwright` at the tag matching `@playwright/test`.
- Headless Chromium cannot present a WebGPU canvas on a software rasteriser: the `webgpu`
  project uses `renderer=webgpu-readback` (ADR 0004).
- No secret is ever committed, logged or written to a pull request.
