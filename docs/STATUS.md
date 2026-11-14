# Status

Living record of what is done, in progress, next and blocked. Updated at the end of every task.
Milestones and acceptance criteria are defined in [PLAN.md](PLAN.md).

## Milestones

| Milestone                                         | State       |
| ------------------------------------------------- | ----------- |
| M0 — Skeleton                                     | Done        |
| M1 — Data and TimelineModel                       | Done        |
| M2 — LOD0 scene and complete timeline             | Done        |
| M3 — Ocean, exact sky, lighting                   | Done        |
| M4 — Flooding, boats, rockets, break-up, wreck    | Not started |
| M5 — LOD1/LOD2, post-processing, quality settings | Not started |
| M6 — Accessibility, UX, support, legal notice     | Not started |
| M7 — Deployment                                   | Not started |

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

## Tooling availability in the authoring session

- Context7 and DeepWiki MCP servers: both available and consulted for Vite, Biome, Vitest,
  Playwright, Caddy, TypeScript, Zod, three.js and Astronomy Engine.
- Astral skills (`uv`, `ty`, `ruff`): available; they apply from M5 (Python pipeline).
- Dokploy MCP server: not available in the session that produced M0. M7 must be run from a
  session that has it.

## Blockers

None.
