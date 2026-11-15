# Status

Living record of what is done, in progress, next and blocked. Updated at the end of every task.
Milestones and acceptance criteria are defined in [PLAN.md](PLAN.md).

## Milestones

| Milestone                                         | State                                         |
| ------------------------------------------------- | --------------------------------------------- |
| M0 — Skeleton                                     | Done                                          |
| M1 — Data and TimelineModel                       | Done                                          |
| M2 — LOD0 scene and complete timeline             | Done                                          |
| M3 — Ocean, exact sky, lighting                   | Done                                          |
| M4 — Flooding, boats, rockets, break-up, wreck    | Done                                          |
| M5 — LOD1/LOD2, post-processing, quality settings | Done                                          |
| M6 — Accessibility, UX, support, legal notice     | Done                                          |
| M7 — Deployment                                   | Deployed; verified over IPv4; two checks open |

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
- The GitHub Actions workflow runs on the pull request. Its run on commit `300afd5`
  (2026-11-15) passed with its four jobs: quality, end-to-end, container and assets.

## M1 — Data and TimelineModel (done, 2026-11-14)

Delivered:

- Twelve data files in `data/` (sources, time reference, ship, chronology, attitude, flooding,
  lifeboats, signals, lighting, break-up, site, people), each validated by a Zod schema and
  exported as JSON Schema in `data/schema/`.
- More than 300 records, each with `source_ids`, `certainty` and `note`; 39 sources with their
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

Visual review of the six re-recorded baselines (12 images; the two at 2:20 a.m. came out
identical to the previous ones), of the signal at 12:47 a.m. and of both sections of the wreck:

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
| Limits enforced by that test                                            | same file, `webgl2` project only                                    | First frame under 5 s and under 2.5 MB transferred; 50 Mb/s down, 10 Mb/s up, 20 ms       |

Visual review of the six re-recorded baselines (12 images; the two at 2:20 a.m., when the ship
is gone, came out identical to the previous ones) and of close-ups at 12:45 a.m., 1:40 a.m. and
on the seabed, against the renders of the pipeline and the description of the ship:

- Agrees: smooth hull with the sheer line; rows of lit windows on B deck and the promenade
  above the rows of ports; soft glow around the lights; davits, deckhouses and bridge readable;
  the lamps sit on the plating and in the window openings; fallen foremast and stern gear on
  the seabed. Both backends give visually identical images.
- Differs, and is left as a known limit: the wrecked stern is intact plating; no debris field;
  no rigging or railings; the hull parts along clean planes; the upper works are lit more evenly
  than lamps would light them; no cut-away view of the water inside the hull in 3D (the diagram
  of the "Now" tab shows it).

The `assets` job has since run on GitHub (commit `300afd5`, 2026-11-15): it passed, and the
model it rebuilt there is identical to the committed file.

Not verified in the authoring session, whose software rasteriser is not representative: frame
rate on real graphics hardware. Measured since on a discrete card; see "Real hardware" under
M7.

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

Visual review of the twelve baselines re-recorded with this milestone (commit `6c7edb9`),
carried out on 2026-11-15 from the history of the repository by placing each image beside its
previous version:

- The header and its menu make the canvas one pixel shorter: every image went from 880 × 349 to
  880 × 348 pixels.
- Agrees: each of the six instants shows the same content as before on both backends (ship,
  iceberg, lit ports and their reflection, empty sea at 2:20 a.m., hull on the seabed);
  only the glints of the sea and a few stars fall on other pixels, as the frame is drawn at
  another height.
- Ten of these baselines were replaced by those of M5, reviewed above; the two at 2:20 a.m.
  stayed the current ones until the corrections of the review.

Not verified here, and why:

- Screen readers, voice control and forced colours need a person (`docs/ACCESSIBILITY.md`).
- Sixty frames per second on an integrated GPU cannot be measured on the software rasteriser of
  the authoring environment. The frame rate has since been measured on a discrete card ("Real
  hardware" under M7) and remains to be measured on an integrated one. The first render under
  five seconds at 50 Mb/s is measured and enforced by `tests/e2e/performance.spec.ts` since M5
  (see the M5 table), on the software rasteriser.

## M7 — Deployment (deployed on 2026-11-15; two checks open)

Carried out on 2026-11-15 from a session that had the tools of the `dokploy-mcp` server, by the
steps of `docs/DEPLOY.md`; decisions in ADR 0014. Times are UTC.

What was done, in order:

1. **DNS, first check** (10:12). The AAAA records of `titanic-4d.com` and `www.titanic-4d.com`
   named a machine that is not the server, so no domain was to be created before the zone was
   corrected.
2. **Protection of `master`** (10:14), through the GitHub API, before the application existed
   in Dokploy: pull request required, the four CI jobs required and bound to GitHub Actions,
   branch up to date, rule applied to administrators, no force push, no deletion.
3. **Dokploy resources** (10:15): project `Titanic-4D`, its `production` environment and the
   application `Titanic 4D`, with the GitHub source `j-about/Titanic-4D`, branch `master`,
   deployment on every push, build type `dockerfile`, `Dockerfile` and context `.`. No
   environment variable and no redirect rule.
4. **Merge** of pull request #1 with a merge commit (`d7e705d`, 10:17:08), the four checks
   green on its head `315f4bd`. Dokploy deployed that push by itself.
5. **DNS, second check** (10:51), after the owner had corrected the zone: the four
   authoritative servers answered the addresses of the server for the four hosts.
6. **Domains** (10:52): the canonical host first, then the three others, each with its own
   Let's Encrypt certificate, port 8080, HTTPS.
7. **Verification** of the live hosts (10:53 to 10:55).

The deployment therefore preceded the domains, in the reverse order of steps 6 and 7 of
`docs/DEPLOY.md`: Traefik applies the domain of an application without a new deployment.

Verified:

| Check                                      | Command                                                                                                             | Result                                                                                                                                                                                                               |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Install and every check, on `315f4bd`      | `pnpm install --frozen-lockfile`, `pnpm check`                                                                      | Pass with Node.js 26.13.1 and pnpm 12.18.0; 493 of 493 unit tests; JavaScript 353,913 B of 400,000 B gzip                                                                                                            |
| Image built from `315f4bd`                 | `docker build --tag titanic-4d .`                                                                                   | Pass (10:16)                                                                                                                                                                                                         |
| Container of that image                    | `node tools/verify-server.ts --origin http://127.0.0.1:8080`, `docker inspect`, `docker ps`                         | 160 of 160; user `10001:10001`; healthy                                                                                                                                                                              |
| End-to-end against that container          | `E2E_BASE_URL=http://127.0.0.1:8080 tools/e2e-container.sh`                                                         | 145 pass, 1 skipped by design; ended at 10:18, after the merge                                                                                                                                                       |
| Checks of pull request #1 before the merge | `gh pr view 1 --json statusCheckRollup`                                                                             | The four jobs successful on `315f4bd`; they were the gate of the merge                                                                                                                                               |
| Protection of `master`                     | `gh api repos/j-about/Titanic-4D/branches/master/protection`                                                        | Strict status checks on the four jobs, administrators included, pull request required, no force push, no deletion                                                                                                    |
| CI on `master` after the merge             | `gh run view 43703328850`                                                                                           | The four jobs successful on `d7e705d`                                                                                                                                                                                |
| Automatic deployment on push               | `deployment-all`                                                                                                    | Deployment of `d7e705d` created at 10:17:11, three seconds after the merge, without any call to `application-deploy`                                                                                                 |
| Build on the server                        | `deployment-readLogs`                                                                                               | Clone of `d7e705d`; image built from the pinned frontend and base images; dataset valid; 13 files precompressed; done at 10:17:41                                                                                    |
| Container on the server                    | `application-readLogs`, `docker-getContainersByAppNameMatch`                                                        | Caddy serving on port 8080 without error; container running and healthy                                                                                                                                              |
| DNS records of the four hosts, 10:51       | A and AAAA queries to the four authoritative servers of the zones; reverse queries for both addresses of the server | Every host: the A record and the AAAA record of the server, whose two addresses have the same reverse name                                                                                                           |
| … public resolvers                         | The same queries to Cloudflare, Google and Quad9                                                                    | The records of the server at 10:51; at 11:11 one cache of Quad9 still answered the former AAAA record of `www.titanic-4d.com`, with 31 s of its time to live left; at 11:31 Quad9 answered the records of the server |
| Domains in Dokploy                         | `domain-byApplicationId`                                                                                            | The four hosts, port 8080, HTTPS, `letsencrypt`; no redirect rule                                                                                                                                                    |
| Deployed site                              | `node tools/verify-server.ts --live`                                                                                | 180 of 180 at 10:53                                                                                                                                                                                                  |
| … certificates                             | same run; names and expiry read from each certificate in a TLS handshake                                            | Four certificates, each naming its own host only, trusted, issued by Let's Encrypt; they expire on 13 February 2027                                                                                                  |
| … redirections                             | same run                                                                                                            | Each secondary host: 301 from `/a/b?x=1` to `https://www.titanic-4d.org/a/b?x=1`; each host: HTTP to HTTPS, permanent                                                                                                |
| End-to-end against the canonical URL       | `E2E_BASE_URL=https://www.titanic-4d.org tools/e2e-container.sh`                                                    | 145 pass, 1 skipped by design, same baselines                                                                                                                                                                        |

The suite against the preview server (`pnpm test:e2e:container`) was run by CI on `315f4bd`.
In the session it was run after the deployment, on the branch of this record: 145 pass, 1
skipped by design.

Findings:

- `domain-validateDomain` reported `www.titanic-4d.com` as valid while its AAAA record named
  another machine: it accepts a host as soon as one of its addresses is the server's
  (ADR 0014).
- For up to an hour after the correction of the zone, a resolver could still give the former
  AAAA record of the two `.com` hosts.

Not verified yet:

- That a later push to `master`, through a pull request, replaces the running deployment by
  itself. The first deployment was started by the push of pull request #1; the merge of the
  pull request that carries this record is the next push.
- The four hosts over IPv6. The machine that ran the checks has no IPv6 route: the IPv6
  address of the server was identified by its reverse name, and every check above went over
  IPv4. `docs/DEPLOY.md` gives the command to run from a machine that has such a route.

### Real hardware (measured on 2026-11-15)

Frame rate and time to the first frame, measured on a graphics card for the first time. Method
in ADR 0014: Microsoft Edge driven through the DevTools protocol. No file of the application
changed. The page carried a mutation observer and one animation-frame callback of the measuring
script, which before playback also read the name of the card through a WebGL 2 context and a
WebGPU adapter of its own, started playback by a click on "Play" and, during the runs at ×60,
looked at the buttons every 100 ms. One run for each playback figure, three loads for each
first frame.

| Item       | Value                                                                                                                                                                                                                 |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Machine    | AMD Ryzen 9 5950X (16 cores), NVIDIA GeForce RTX 4090 (a discrete card; the machine has no integrated one), Windows 11                                                                                                |
| Display    | 1920 × 1080 at 144 Hz (6.94 ms for one refresh), one of the three displays attached                                                                                                                                   |
| Browser    | Microsoft Edge 157.0.4341.60, full screen: viewport of 1920 × 1080 CSS pixels; device pixel ratio 1, forced with `--force-device-scale-factor=1`; new profile for each run, extensions off, background throttling off |
| Motion     | Forced on with `--force-prefers-no-reduced-motion`, except in the row "Reduced motion": Windows has animation effects off on the measuring account, which Edge reports as `prefers-reduced-motion: reduce`            |
| Scene      | "medium" detail (`quality=medium`), guided tour, canvas of 1520 × 773 pixels, detailed model in place during playback; backend read from `data-backend`, WebGL 2 asked for with `renderer=webgl2`                     |
| Site       | The production image built from `315f4bd`, whose tree is that of `d7e705d`, in a local container; the deployed site where it is named                                                                                 |
| Other load | Load average of the Linux side of the machine (WSL 2): 0.1 to 2.2 during the playback runs, 3.3 to 5.4 during the first-frame loads; the load of Windows, where the browser ran, was not recorded                     |

"Frames drawn" counts the frames for which the application finished issuing its drawing
commands, one write of `data-rendered-time` each. It shows how often the scene was redrawn, not
that each frame reached the screen, which was not observed. The intervals are those between two
such writes; a write is stamped when the work of the page ends, so a refresh of the display
without a new frame shows in the animation frames of the page, counted in their own row, and
not as one long interval between writes. Clock times in this table are ship's time.

| Measurement                                                                                                                                                                                                          | WebGPU                                                                                                                            | WebGL 2                                                                                                                           |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| First frame of the scene, whichever model of the ship it shows; cache empty, 50 Mb/s down, 10 Mb/s up, 20 ms; 3 loads                                                                                                | 789, 810 and 828 ms                                                                                                               | 1,283, 1,296 and 1,342 ms                                                                                                         |
| … detailed model in place (`data-assets` ready, looked at every 10 ms from 700 ms after the navigation)                                                                                                              | 844, 866 and 901 ms                                                                                                               | 1,339, 1,354 and 1,394 ms                                                                                                         |
| First frame of the deployed site; cache empty, connection of the machine; 3 loads                                                                                                                                    | 654, 680 and 690 ms                                                                                                               | 1,126, 1,153 and 1,212 ms                                                                                                         |
| … detailed model in place                                                                                                                                                                                            | At most 776, 776 and 794 ms: in place when first looked at                                                                        | 1,175, 1,207 and 1,264 ms                                                                                                         |
| Playback at ×1 from 12:45 a.m.; the 180 s after the first 5 s                                                                                                                                                        | 24,015 frames drawn, 133.4 per second; median interval 7.4 ms, 99th centile 10.0 ms, longest 35 ms                                | 25,580 frames drawn, 142.1 per second; median interval 7.0 ms, 99th centile 8.0 ms, longest 26 ms                                 |
| … intervals over 16.7 ms and over 33.3 ms; lowest rate over one second                                                                                                                                               | 2 and 1; 120 per second                                                                                                           | 1 and 0; 137 per second                                                                                                           |
| … animation frames two refreshes apart instead of one                                                                                                                                                                | 1,899 of 24,014 (7.9 %)                                                                                                           | 339 of 25,579 (1.3 %)                                                                                                             |
| Playback at ×60 from 11:40 p.m. to the end of the timeline at 2:26 a.m.; the 164 s after the first 2 s                                                                                                               | 21,928 frames drawn, 133.7 per second; median interval 7.4 ms, 99th centile 9.3 ms, longest 35 ms                                 | 22,823 frames drawn, 139.2 per second; median interval 7.1 ms, 99th centile 8.3 ms, longest 27 ms                                 |
| … intervals over 16.7 ms and over 33.3 ms; lowest rate over one second                                                                                                                                               | 3 and 1; 117 per second                                                                                                           | 1 and 0; 132 per second                                                                                                           |
| … animation frames two refreshes apart instead of one                                                                                                                                                                | 1,678 of 21,935 (7.6 %)                                                                                                           | 790 of 22,836 (3.5 %)                                                                                                             |
| Display synchronisation and frame limit off (`--disable-gpu-vsync --disable-frame-rate-limit`), ×1 from 12:45 a.m., 60 s                                                                                             | 131.4 per second; median interval 7.5 ms, 99th centile 10.7 ms, longest 14 ms                                                     | 135.5 per second; median interval 7.3 ms, 99th centile 8.3 ms, longest 10 ms                                                      |
| Share of the time in which the card was executing work for any process, desktop included, during the three runs above (`nvidia-smi`, one sample per second, mean of each run without its first 8 and last 3 samples) | 27 to 29 %; highest sample 38 %                                                                                                   | 27 to 32 %; highest sample 40 %                                                                                                   |
| Reduced motion, ×1 from 12:45 a.m., 60 s: synchronised, then not synchronised                                                                                                                                        | 144.0 per second, no refresh without a new frame; then 492 per second (median interval 1.9 ms), the card at work 39 % of the time | 144.0 per second, no refresh without a new frame; then 554 per second (median interval 1.8 ms), the card at work 32 % of the time |

The WebGPU playback runs are second takes. The first ones were taken while a new run of the
scripted accessibility audit, not recorded yet, was running in containers on the same machine
(load average 1.5 to 4.9): 130.4, 123.4 and 122.8 frames per second with motion, 479 per second
with reduced motion and no synchronisation.

What the figures show, on this machine:

- With motion, the scene is redrawn 133 to 142 times per second and does not hold the 144 Hz
  of the display: a frame takes 7.0 to 7.6 ms on average, against 6.94 ms for one refresh.
  With the synchronisation off the rate is no higher (WebGPU 131.4 against 133.4 and 133.7,
  WebGL 2 135.5 against 142.1 and 139.2), so the synchronisation is not what keeps the scene
  under 144 Hz. Why the runs without synchronisation are 1.5 to 5 % slower is not explained.
- The card is not the limit either: once the sea is frozen it draws the same scene 492 to 554
  times per second. The time in which the card is at work is not a share of its capacity; it
  is given to show that it changes little, from 27 to 32 % at 131 to 142 frames per second to
  32 to 39 % at 492 to 554. This points to the work of the page on the processor as the limit.
  No processor time and no profile were collected.
- With reduced motion, which freezes the sea and holds the guided camera, a frame takes about
  2 ms. The difference, about 5 to 5.5 ms per frame, is attributed to the moving sea: at
  "medium" the wave field is evaluated on the processor and sent to the card again for every
  frame whose instant differs from the previous one, which is every frame of a playback. This
  rests on the code; no run separates the sea from the held camera.
- The first frame is within the five seconds of the criterion of `docs/PLAN.md`, on the
  emulated connection and on the deployed site. The connection of the machine to the deployed
  site was not characterised beyond HTTP/2 and about 11 ms to an open TCP connection, name
  resolution included.

The criterion of `docs/PLAN.md` (60 frames per second aimed at, 30 at least, at 1080p on a
recent integrated GPU at "medium") is not settled by these figures. They come from a discrete
card and a 16-core desktop processor, and a frame that the processor limits cannot be scaled to
another machine.

Not measured: the frame rate on an integrated GPU and on a slower processor; the processor time
of a frame; whether each frame reached the screen (no presentation or GPU timing was
collected); the "low" and "high" levels.

## Review of 2026-11-15 — corrections

State before these corrections, on commit `300afd5`: unit tests 316 of 316; pipeline tests 26 of
26; end-to-end 117 pass and 1 skipped by design, on the preview server and on the production
image; `tools/verify-server.ts` 144 of 144 against the container.

Corrected (decisions in ADR 0013):

- **CI.** The quality job runs `pnpm data:schema:check`, so it runs every step of `pnpm check`.
  The container job compares the user of the image and of the running container with
  `10001:10001`; the earlier comparison passed on an empty answer.
- **Budgets.** `budgets.json` counts 1,000 bytes to the kilobyte: 400,000 bytes for the initial
  JavaScript (was 409,600), 20,000 for the CSS, 8,000 for the entry document.
- **Model of the ship.** `/models/*` is served with `Cache-Control: no-cache` and revalidated by
  entity tag, instead of being cached for an hour beside fingerprinted scripts.
- **Build manifest.** `dist/.vite` is removed from the image; `/.vite/manifest.json` must answer
  404.
- **Pinned images.** The build frontend of the Dockerfile and the Playwright image are
  referenced by exact version and digest, like the base images.
- **Verification of the server.** New checks for the model (media type, cache policy, 304,
  precompressed variants) and for the absence of the build manifest. In live mode an untrusted
  certificate is now reported as a failed check with its reason, and each host is checked even
  when another one cannot be reached.
- **Deployment procedure.** `docs/DEPLOY.md` was changed to state that Dokploy deploys on push
  independently of CI and to give the protection of `master` as a step for the owner (carried
  out since: see M7 and ADR 0014); going back goes through a pull request.
- **Documentation.** Number of sources (39), first-render statement of M6, visual review of
  the M6 baselines, state of the `assets` job on GitHub, place of the pure modules of
  `src/render/` (ADR 0013), sentence of the README on the people who died (the lowest and the
  highest count of the dataset instead of "about 1,500").

- **`CLAUDE.md`.** Repository map (`src/config/`, `src/render/`, `docs/`), the three suffixes of
  unit test files, the "pure code first" convention as it is applied (ADR 0013) and the digest
  of the Playwright image.

The same review led to corrections in the data, the simulation, the scene and the interface
(decisions in ADR 0013):

- **Provenance.** Wireless events are no more certain than the clock offset that converts them
  and show the alternative offsets; margins of wireless times and of distress signals are in
  the records; lifeboat events carry the sources of every record their text uses; a record
  cannot be `established` on reference works, on works known through another or on the
  project's derivations alone (three records downgraded to `estimated`: the position of the
  bow of the wreck, the depth, the count of Encyclopedia Titanica); the sentence on the people
  who died is derived from the counts of the dataset; the Sources tab also lists the sky, the
  haze, the fallen funnels, the depth of the seabed and the light of the Californian.
- **Stern section.** It reaches the seabed rudder first, as the dataset's own record says.
- **Lifeboats.** Boats being lowered bear against the ship's side instead of passing through
  it; the lifeboats swing out from the recorded order, the cutters from the start, collapsibles
  C and D before they start down; A and B stay on the roof until the sea reaches them.
- **Generated hull.** True outward normals up to the top edge of the plating; no quad dropped
  at the stern tip.
- **Scene and application.** Numbered starts of the scene (no leaked view, no undrawn canvas);
  a fallback to WebGL 2 no longer written into the address; a missing star catalogue reported
  as such; "Reset view" working in the free camera; address written at most every 500 ms.
- **Light of the Californian** drawn low on the horizon until the foundering.
- **Accessibility.** Turn, Tilt, Zoom and Move buttons as the single-click alternative to
  dragging, pinching and the wheel (WCAG 2.5.7, 2.5.1); focus kept when the canvas is
  replaced and moved to the main content when the scene fails; titles of the key moments no
  longer clipped; operating instructions available at every width; meaning of the levels of
  certainty given in text; no false "loading" status without JavaScript;
  `docs/ACCESSIBILITY.md` brought in line with the code.
- **Tests.** The frame of the scene reports when the canvas is up to date, and the end-to-end
  tests wait on it.

Verified after all the corrections:

| Check                                                       | Command                                                  | Result                                                                                                 |
| ----------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Type checking, lint, dataset, schema export, build, budgets | `pnpm check`                                             | Pass; JavaScript 353,913 B of 400,000 B gzip                                                           |
| Unit tests                                                  | `pnpm test`                                              | 493 of 493 pass                                                                                        |
| Pipeline tests; model rebuilt                               | `pnpm assets:test`, `pnpm assets:build`                  | 26 of 26 pass; same SHA-256, model unchanged                                                           |
| End-to-end, WebGL 2 and WebGPU                              | Playwright in the official image                         | 145 pass, 1 skipped by design; no axe-core violation                                                   |
| Whole suite under the production CSP                        | suite run against the Caddy container                    | 145 pass, 1 skipped by design, same baselines                                                          |
| Container image, built with the pinned frontend             | `node tools/verify-server.ts`                            | 160 of 160, including the model (no-cache, entity tag, 304, br and gzip) and the absent build manifest |
| Container user                                              | `docker inspect`, `docker exec id -u`                    | `10001:10001`                                                                                          |
| First frame at 50 Mb/s, cache empty                         | `tests/e2e/performance.spec.ts` and a run at 1920 × 1080 | Within the 5 s budget at 1280 × 720; 2.5 to 3.6 s at 1920 × 1080, on a software rasteriser             |
| Workflow syntax                                             | actionlint                                               | Pass                                                                                                   |

Visual review of the twelve re-recorded baselines (880 × 341 pixels instead of 880 × 348: the
interface around the canvas changed height):

- Agrees: the same six scenes as before on both backends; the boats now hang swung out along
  the Boat deck from 12:13 a.m.; the stern on the seabed is seen from the same side.
- Differs: the lowest row of each image shows the edge of the frame, because the canvas is a
  fraction of a pixel high; the content tests leave those rows out.

Not verified in that review: the scripted accessibility audit of M6 predates the new view
controls, so its tab-stop count and target measurements are to be taken again; screen readers
remain to be tested by a person (`docs/ACCESSIBILITY.md`). The frame rate has since been
measured on a discrete card ("Real hardware" under M7) and remains to be measured on an
integrated one.

## Tooling availability

- Context7 and DeepWiki MCP servers: both available and consulted for Vite, Biome, Vitest,
  Playwright, Caddy, TypeScript, Zod, three.js and Astronomy Engine.
- Astral skills (`uv`, `ty`, `ruff`): available and used for the asset pipeline (M5).
- Dokploy MCP server: not available in the authoring session; available in the session of
  2026-11-15 that ran M7.

## Blockers

None in the repository. One open check needs another machine: the four hosts over IPv6 (see
M7).
