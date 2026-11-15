# Status

Living record of what is done, in progress, next and blocked. Updated at the end of every task.
Milestones and acceptance criteria are defined in [PLAN.md](PLAN.md).

## Milestones

| Milestone                                         | State                               |
| ------------------------------------------------- | ----------------------------------- |
| M0 — Skeleton                                     | Done                                |
| M1 — Data and TimelineModel                       | Done                                |
| M2 — LOD0 scene and complete timeline             | Done                                |
| M3 — Ocean, exact sky, lighting                   | Done                                |
| M4 — Flooding, boats, rockets, break-up, wreck    | Done                                |
| M5 — LOD1/LOD2, post-processing, quality settings | Done                                |
| M6 — Accessibility, UX, support, legal notice     | Done                                |
| M7 — Deployment                                   | Artefacts ready; deployment not run |

## M0 — Skeleton (done, 2026-11-14)

Verified by command:

| Check                                   | Command                                             | Result                                                              |
| --------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------- |
| Type checking                           | `pnpm typecheck`                                    | Pass                                                                |
| Lint and format                         | `pnpm lint`                                         | Pass                                                                |
| Unit tests                              | `pnpm test`                                         | 7 of 7 pass                                                         |
| Build and precompression                | `pnpm build`                                        | Pass                                                                |
| Budgets                                 | `pnpm budgets`                                      | JavaScript 408 B, CSS 1,282 B, HTML 762 B (gzip), all within budget |
| End-to-end, WebGL 2 and WebGPU projects | Playwright 1.65.1 in the official image             | 6 of 6 pass, no axe-core violation                                  |
| Container image                         | `node tools/verify-server.ts` against the container | 77 of 77 checks pass; container healthy and running as UID 10001    |
| Workflow syntax                         | actionlint                                          | Pass                                                                |

Notes:

- Software WebGPU (Dawn on SwiftShader) and software WebGL 2 (ANGLE on SwiftShader) are both
  available in headless Chromium, so both backends are exercised without a GPU.
- The GitHub Actions workflow has not yet run on GitHub; its first run happens on the pull
  request.

## M1 — Data and TimelineModel (done, 2026-11-14)

Delivered:

- Twelve data files in `data/` (sources, time reference, ship, chronology, attitude, flooding,
  lifeboats, signals, lighting, break-up, site, people), each validated by a Zod schema and
  exported as JSON Schema in `data/schema/`.
- More than 300 records, each with `source_ids`, `certainty` and `note`; 40 sources with their
  access level.
- `src/time/shipTime.ts`: ship's time, New York time and GMT conversions.
- `src/sim/`: monotone interpolation, hull poses, merged narrative events and `TimelineModel`.
- `docs/DATA.md` and the research notes in `docs/research/`.

Verified by command:

| Check                                   | Command                                                   | Result                                                                                     |
| --------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Schemas and cross-file consistency      | `pnpm data:validate`                                      | Valid                                                                                      |
| JSON Schema export up to date           | `pnpm data:schema:check`                                  | Pass                                                                                       |
| Unit tests                              | `pnpm test`                                               | 95 of 95 pass                                                                              |
| Determinism, forward, backward and jump | `src/sim/timelineModel.test.ts`, "time is the only input" | Pass over 400 pseudo-random instants                                                       |
| Continuity of poses and water levels    | same file, "continuity"                                   | Pass at one-second steps over the whole period                                             |
| Agreement with observations             | same file                                                 | Draughts, forecastle, well deck, A deck, crow's nest, break condition all within tolerance |

Corrections to the initial brief, found during research and recorded in the dataset:

- The British Wreck Commissioner's report gives 1,490 lives lost, not 1,503. Britannica
  attributes 1,503 to the Board of Trade; both are recorded as separate counts.
- The British report puts the Californian "not more than eight to ten miles" away.
- The latest revision of the lifeboat sequence is the 2026 study by Fitch, Layton and
  Wormstedt, which moves boats 9, 13, 15 and 2; boat 8 at 1:00 a.m. is their position only.
- Observed trim is 6 to 7° at 2:05 a.m. and 10° at 2:15 a.m.; 8 to 10° at 2:00 a.m. is not
  supported.
- The statement that the wreck lies about 13 nautical miles from the distress position is
  sourced to the MAIB report (1992) and to a great-circle computation; the NOAA 2004 pages
  could not be reached.
- No primary testimony was found for the lights turning red; the scene shows no change of
  colour.

Open points are listed in `docs/DATA.md` under "Points to check against works not yet
consulted".

## M2 — LOD0 scene and complete timeline (done, 2026-11-14)

Delivered:

- Procedural level-of-detail 0 ship generated from the dataset (`src/ship/`): hull, decks,
  superstructure, four raked funnels, two masts, 716 lamps, twenty boats.
- WebGPU renderer with WebGL 2 fallback, AgX tone mapping, render pipeline (`src/render/`).
- Five cameras: guided tour, around the ship, on the bridge, below the surface, free.
- Timeline: play, pause, backward, ×1 to ×600, one-minute steps, scrubber, bookmarks of key
  moments, deep links (`?t=01:40&camera=orbit&rate=60`).
- Panels: "Now" (state in words and figures), "Sources" (records behind the current instant,
  certainty, other positions), "Narrative" (all 91 events, in step with the timeline).
- Live announcements of events, reduced-motion support, keyboard operation of every control.

Verified by command:

| Check                                       | Command                               | Result                                                                 |
| ------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------- |
| Type checking, lint, dataset, schema export | `pnpm check`                          | Pass                                                                   |
| Unit tests                                  | `pnpm test`                           | 195 of 195 pass                                                        |
| Hull form against recorded coefficients     | `src/ship/hullForm.test.ts`           | Block 0.684, prismatic 0.704, midship 0.972; displacement within 1.6 % |
| Budgets                                     | `pnpm budgets`                        | JavaScript 284 kB of 400 kB, CSS 3.4 kB, HTML 1.3 kB (gzip)            |
| End-to-end, WebGL 2 and WebGPU              | Playwright in the official image      | 70 of 70 pass; no axe-core violation on any tab or on a 390 px screen  |
| Visual baselines at the six key instants    | `tests/e2e/scene.spec.ts`             | Recorded for both backends (12 images)                                 |
| Same image when reached by playing backward | same file                             | Pass                                                                   |
| Scene under the production CSP              | suite run against the Caddy container | 28 of 28 scene and accessibility tests pass                            |
| Container image                             | `node tools/verify-server.ts`         | 77 of 77                                                               |

Visual review of the six baselines (11:40 p.m., 12:45 a.m., 1:40 a.m., 2:15 a.m., 2:20 a.m.,
wreck), against the documented description of the ship and of the night:

- Agrees: length, breadth, sheer and proportions; four funnels raked aft, buff with black
  tops; two raked masts; black hull, white upper works, red bottom; rows of lit ports; trim by
  the head and list to port at 1:40 a.m.; bow under and boats on the water at 2:15 a.m.; empty
  sea with the boats at 2:20 a.m.; a section of the hull on the seabed under the camera lamp.
- Differs, to be addressed in the milestones shown: the sea is a flat plane and the sky is
  empty (M3); no iceberg, no rendering of flooding or of the break itself beyond the two
  sections parting, pristine wreck sections, standing mainmast on the seabed (M4); schematic
  deckhouses, no davits, rigging or deck fittings (M5).
- Both backends give visually identical images.

Environment finding: headless Chromium on a software rasteriser cannot present a WebGPU canvas
(the device is destroyed). The WebGPU backend is therefore tested through a read-back
presenter; see the amendment to ADR 0004.

## M3 — Ocean, exact sky, lighting (done, 2026-11-14)

Delivered:

- **Sky.** Star field from the Yale Bright Star Catalogue (8,404 stars to magnitude 6.5, moved
  to epoch 1912 by proper motion, 67 kB), oriented for the instant, the foundering position and
  the heading by Astronomy Engine; Jupiter and Mars drawn while they are up; Moon and Sun
  computed and below the horizon all night; haze band at the horizon. Method in `docs/SKY.md`.
- **Sea.** JONSWAP spectrum scaled to a 5 cm significant wave height; FFT wave field on the
  processor; mirror reflection displaced by the slopes with Fresnel weighting; band of disturbed
  water along the waterline of each section; analytic (Gerstner, first order) waves as the
  fallback of the lowest quality level; waves frozen with reduced motion.
- **Lighting.** Glow of the lamps on the hull and upper works, following `data/lighting.json`
  and each station going under; dim starlight keeps the unlit ship readable; AgX tone mapping.
- **Quality levels.** `quality=low|medium|high` in the address (`src/render/quality.ts`); the
  control in the interface comes with M5.
- **Visual tests.** Screenshot tolerance tightened and content assertions added (ADR 0004,
  second amendment).

Verified:

| Check                                         | Command                               | Result                                                                |
| --------------------------------------------- | ------------------------------------- | --------------------------------------------------------------------- |
| Type checking, lint, dataset, schema export   | `pnpm check`                          | Pass                                                                  |
| Unit tests                                    | `pnpm test`                           | 242 of 242 pass                                                       |
| Sky against ephemeris cross-checks            | `src/sky/skyModel.test.ts`            | Hour-angle formula within 1°; Polaris, spring sky, Moon, Sun, Jupiter |
| Sea: FFT, exact slopes, determinism, fallback | `src/ocean/*.test.ts`                 | 20 of 20 pass                                                         |
| Budgets                                       | `pnpm budgets`                        | JavaScript 314 kB of 400 kB, CSS 3.4 kB, HTML 1.3 kB (gzip)           |
| End-to-end, WebGL 2 and WebGPU                | Playwright in the official image      | 80 of 80 pass; no axe-core violation                                  |
| Old baselines fail under the new tolerance    | same suite before re-recording        | 5 of 6 instants fail on each backend; the wreck image is unchanged    |
| Content of the night image                    | `tests/e2e/scene.spec.ts`             | Stars in a dark sky, reflection of the lit ship, none after 2:17      |
| Low and high quality levels                   | same file                             | Draw without console errors on both backends                          |
| Scene under the production CSP                | suite run against the Caddy container | 50 of 50 scene and accessibility tests pass, same baselines           |

Visual review of the six re-recorded baselines (12 images) and of close-ups at 12:45 a.m. and
1:40 a.m., against the witnesses' description of the night recorded in `data/site.json`:

- Agrees: moonless sky full of stars down to a hazy horizon; flat sea, dark except where it
  mirrors the ship; rows of lit ports and warm glow on the upper works, reflected as a broken
  path of light; black hull staying dark; lights and reflection gone at 2:20 a.m.; boats alone
  on a starlit sea; the wreck image is unchanged.
- Differs, to be addressed in the milestones shown: the upper works are lit more evenly than
  lamps would light them, and bright stars reflect as a few sharp glints near the camera rather
  than soft ones (M5, with bloom and the detailed model); the distress signals rise above the
  frame of the guided camera at 12:47 a.m. (M4); no Milky Way or diffuse sky light.
- Both backends give visually identical images (a few hundred pixels differ slightly).

Findings, both recorded in the second amendment to ADR 0004:

- The tolerance used until M2 let the M3 images pass against the M2 baselines, because a night
  image is mostly black.
- Under the production content security policy the style sheet that hid the controls for
  screenshots was refused, so the controls stayed in the picture; the tests now hide them
  through the CSS object model and CI runs them against the container image.

## M4 — Flooding, boats, rockets, break-up, descent, wreck (done, 2026-11-15)

Delivered:

- **Iceberg.** Generic dark shape within the reported size, abreast of the starboard bow at the
  collision and left astern as the ship runs on (`src/sim/iceberg.ts`,
  `src/render/icebergObject.ts`); new record `iceberg-passage`.
- **Flooding.** Longitudinal section of the hull in the "Now" tab with the water in each of the
  sixteen compartments, the bulkheads and the sea outside, followed by a table of the same
  values (`src/sim/floodingProfile.ts`, `src/ui/floodingDiagram.ts`).
- **Distress signals.** Clusters of white stars; steady clusters during fast playback, so that
  nothing blinks; guided view raised and widened between the first and the last signal.
- **Wreck.** Foremast laid across the bridge and after section without upper works once each
  section is at rest; new records `foremast-condition` and `funnels-lost`; the iceberg and the
  state of the wreck are listed in the "Sources" tab.
- **Already driven by the model since M2:** trim and heel, lifeboat launches with their
  margins, parting of the hull at the recorded trim, fall of the funnels, descent of both
  sections. Nothing depends on the history of frames.

Verified:

| Check                                     | Command                                                                 | Result                                                           |
| ----------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Type checking, lint, dataset, build       | `pnpm check`                                                            | Pass                                                             |
| Unit tests                                | `pnpm test`                                                             | 277 of 277 pass                                                  |
| Flashes of the signals at every speed     | `src/sim/rocketDisplay.test.ts`                                         | At most two in any second at ×1, ×10, ×60, ×300 and ×600         |
| Every signal in frame in the guided view  | `src/render/camera/cameraPose.test.ts`                                  | Pass for the twelve signals                                      |
| Iceberg within 50 to 100 ft, about 400 ft | `src/sim/iceberg.test.ts`                                               | Pass                                                             |
| Flooding profile and diagram              | `src/sim/floodingProfile.test.ts`, `src/ui/floodingDiagram.dom.test.ts` | Pass                                                             |
| Budgets                                   | `pnpm budgets`                                                          | JavaScript 318 kB of 400 kB, CSS 3.6 kB, HTML 1.3 kB (gzip)      |
| End-to-end, WebGL 2 and WebGPU            | Playwright in the official image                                        | 84 of 84 pass; no axe-core violation, diagram and table included |
| Whole suite under the production CSP      | suite run against the Caddy container                                   | 84 of 84 pass, same baselines                                    |
| Container image                           | `node tools/verify-server.ts`                                           | 77 of 77                                                         |

Visual review of the six re-recorded baselines (12 images), of the signal at 12:47 a.m. and of
both sections of the wreck:

- Agrees: a dark mass of ice about as high as the Boat deck beside the bow at 11:40 p.m.; white
  stars bursting high above the bridge, inside the frame; hull without funnels on the seabed,
  foremast lying aft across the bridge, after section reduced to its hull.
- Differs, to be addressed in the milestones shown: the wrecked stern is intact plating, not
  the torn and collapsed structure of the surveys, and there is no debris field (M5); the
  iceberg is a smooth massing (M5); the water inside the hull is shown in the diagram only, not
  in the 3D view (M5); the hull parts along clean planes (M5).
- Both backends give visually identical images.

## M5 — Detailed model, post-processing, levels of detail (done, 2026-11-15)

Completed after M6 (see ADR 0011 and ADR 0012).

Delivered:

- **Asset pipeline** (`assets/`, `docs/ASSETS.md`): Python project run by uv; offsets exported
  from the application's own hull form; geometry in NumPy; assembly and glTF export in headless
  Blender; Meshopt compression and validation with glTF-Transform and the Khronos validator.
  One command, `pnpm assets:build`, rebuilds `public/models/ship-lod1.glb`.
- **Detailed model**: smooth hull on the same analytic form, paint bands, decks, upper works
  with recessed windows, bridge, deckhouses, funnels with rims and pipes, masts with the crow's
  nest, davits, rudder and propellers; the same parts and frame as the generated model.
- **In the application**: the detailed model replaces the generated one once loaded, at the
  medium and high levels; the generated model remains the start-up and fallback model.
- **Post-processing**: bloom on what is brighter than scene white.
- **Levels of detail**: "Detail" control in the view toolbar and `quality=` in the address.
- **Gamepad**: standard mapping, for every camera that can be steered.
- **Windows of the upper works** now lit: 914 lamps instead of 716.
- **CI**: `assets` job (lint, types, tests, rebuild, comparison with the committed model);
  first-frame time and transfer budget under an emulated 50 Mb/s connection.

Verified:

| Check                                                                   | Command                                                             | Result                                                                                    |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Type checking, lint, dataset, build                                     | `pnpm check`                                                        | Pass                                                                                      |
| Unit tests                                                              | `pnpm test`                                                         | 316 of 316 pass                                                                           |
| Pipeline lint, format, types                                            | `uv run ruff check`, `ruff format --check`, `ty check` in `assets/` | Pass, no finding                                                                          |
| Pipeline tests                                                          | `pnpm assets:test`                                                  | 26 of 26 pass                                                                             |
| Reproducible build                                                      | `pnpm assets:build` twice                                           | Same SHA-256 (`781b3edc…9392`); 3.3 s                                                     |
| Model budgets                                                           | pipeline tests                                                      | 94,204 triangles of 250,000; 452 kB of 1.5 MB (125 kB with Brotli); 39 draw calls of 60   |
| Model against the hull form and the lamps                               | pipeline tests                                                      | Plating within 3.8 cm of the form; every lamp on the plating or in front of a window pane |
| glTF validity                                                           | Khronos validator in the build                                      | 0 errors, 0 warnings                                                                      |
| Budgets                                                                 | `pnpm budgets`                                                      | JavaScript 348 kB of 400 kB, CSS 3.7 kB, HTML 1.4 kB (gzip)                               |
| End-to-end, WebGL 2 and WebGPU                                          | Playwright in the official image                                    | 117 pass, 1 skipped by design (timing on the test-only WebGPU presenter)                  |
| Detailed model drawn; generated model kept when the file is unavailable | `tests/e2e/scene.spec.ts`                                           | Pass on both backends                                                                     |
| Whole suite under the production CSP                                    | suite run against the Caddy container                               | 117 pass, same baselines; WebAssembly decoding allowed, nothing else                      |
| Container image                                                         | `node tools/verify-server.ts`                                       | 144 of 144                                                                                |
| First frame at 50 Mb/s, cache empty                                     | `tests/e2e/performance.spec.ts`                                     | 2.6 s at 1280 × 720; 3.4 to 3.8 s at 1920 × 1080, on a software rasteriser                |

Visual review of the six re-recorded baselines (12 images) and of close-ups at 12:45 a.m.,
1:40 a.m. and on the seabed, against the renders of the pipeline and the description of the
ship:

- Agrees: smooth hull with the sheer line; rows of lit windows on B deck and the promenade
  above the rows of ports; soft glow around the lights; davits, deckhouses and bridge readable;
  the lamps sit on the plating and in the window openings; fallen foremast and stern gear on
  the seabed. Both backends give visually identical images.
- Differs, and is left as a known limit: the wrecked stern is intact plating; no debris field;
  no rigging or railings; the hull parts along clean planes; the upper works are lit more evenly
  than lamps would light them; no cut-away view of the water inside the hull in 3D (the diagram
  of the "Now" tab shows it).

Not verified here: the `assets` job has not yet run on GitHub at the time of writing; frame rate
on real graphics hardware (the software rasteriser of this environment is not representative).

## M6 — Accessibility, UX, support, legal notice (done, 2026-11-15)

Carried out before the end of M5 (see ADR 0011).

Delivered:

- **Static pages.** "The night in words" (every event with its time, certainty, differing
  positions and sources, and the counts of each source), "About" and the Legal Notice, generated
  at build time, without any script; shared header, menu and footer on every view; site map.
- **Legal Notice.** The owner's text from `src/config/legal.ts`, with headings, `address`
  elements, `mailto:` and `tel:` links; linked from the footer and the menu of every view.
- **Support.** Section "Support Titanic 4D" of the About page with the four payment links from
  `src/config/support.ts`, menu entry, README section, `.github/FUNDING.yml`.
- **Security contact.** `public/.well-known/security.txt` (RFC 9116) and `SECURITY.md`.
- **Accessibility.** `docs/ACCESSIBILITY.md`: how each criterion is met, automated checks, a
  scripted audit, and what still needs a person.

Verified:

| Check                                            | Command                                                    | Result                                                      |
| ------------------------------------------------ | ---------------------------------------------------------- | ----------------------------------------------------------- |
| Type checking, lint, dataset, build              | `pnpm check`                                               | Pass                                                        |
| Unit tests                                       | `pnpm test`                                                | 305 of 305 pass                                             |
| Legal Notice text equals the owner's             | `src/pages/legalNotice.test.ts`, `tests/e2e/pages.spec.ts` | Pass, with and without JavaScript                           |
| Payment links: URLs, labels, new tab, `noopener` | `src/pages/about.test.ts`, `tests/e2e/pages.spec.ts`       | Pass                                                        |
| One published address, funding file, site map    | `tools/consistency.test.ts`                                | Pass                                                        |
| End-to-end, WebGL 2 and WebGPU                   | Playwright in the official image                           | 110 of 110 pass; no axe-core violation on any view          |
| Whole suite under the production CSP             | suite run against the Caddy container                      | 110 of 110 pass, same baselines                             |
| Container image, pages, security.txt, site map   | `node tools/verify-server.ts`                              | 144 of 144                                                  |
| Budgets                                          | `pnpm budgets`                                             | JavaScript 318 kB of 400 kB, CSS 3.7 kB, HTML 1.4 kB (gzip) |

Not verified here, and why:

- Screen readers, voice control and forced colours need a person (`docs/ACCESSIBILITY.md`).
- Sixty frames per second on an integrated GPU and first render under five seconds at 50 Mb/s
  cannot be measured on the software rasteriser of this environment. The page weighs about
  0.4 MB compressed before the 3D scene starts, which is a fraction of a second at that speed;
  the frame rate remains to be measured on real hardware.

## M7 — Deployment (artefacts ready, deployment not run)

The tools of the `dokploy-mcp` server were not available in the authoring session, so no
Dokploy resource was created. M7 must be run again from a session that has them, following
`docs/DEPLOY.md`.

Ready in the repository:

- `Dockerfile`, `Caddyfile` and the CI job that builds the image, checks its headers, caching,
  fallbacks and host redirects, and runs the end-to-end suite against it.
- `docs/DEPLOY.md`: prerequisites, the sequence of Dokploy MCP calls, verification, going back,
  maintenance.
- `tools/verify-server.ts --live`: checks of the deployed site, including the certificate of
  each of the four hosts and the redirection from HTTP to HTTPS.

Verified:

| Check                                | Command                                            | Result                                                                                    |
| ------------------------------------ | -------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Image built from the committed files | `docker build`                                     | Pass                                                                                      |
| Container mode of the verification   | `node tools/verify-server.ts --origin <container>` | 144 of 144                                                                                |
| Live mode of the verification        | `node tools/verify-server.ts --live`               | Runs and reports; not meaningful from the authoring environment, whose proxy re-signs TLS |

Remaining for the deployment session: steps 1 to 8 of `docs/DEPLOY.md`, then the results of the
live verification and of the end-to-end suite against the canonical URL, recorded here.

## Tooling availability in the authoring session

- Context7 and DeepWiki MCP servers: both available and consulted for Vite, Biome, Vitest,
  Playwright, Caddy, TypeScript, Zod, three.js and Astronomy Engine.
- Astral skills (`uv`, `ty`, `ruff`): available and used for the asset pipeline (M5).
- Dokploy MCP server: not available in the session that produced M0. M7 must be run from a
  session that has it.

## Blockers

None.
