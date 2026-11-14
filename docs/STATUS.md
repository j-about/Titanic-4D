# Status

Living record of what is done, in progress, next and blocked. Updated at the end of every task.
Milestones and acceptance criteria are defined in [PLAN.md](PLAN.md).

## Milestones

| Milestone                                         | State       |
| ------------------------------------------------- | ----------- |
| M0 — Skeleton                                     | Done        |
| M1 — Data and TimelineModel                       | Done        |
| M2 — LOD0 scene and complete timeline             | In progress |
| M3 — Ocean, exact sky, lighting                   | Not started |
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

## Tooling availability in the authoring session

- Context7 and DeepWiki MCP servers: both available and consulted for Vite, Biome, Vitest,
  Playwright, Caddy and TypeScript.
- Astral skills (`uv`, `ty`, `ruff`): available; they apply from M5 (Python pipeline).
- Dokploy MCP server: not available in the session that produced M0. M7 must be run from a
  session that has it.

## Blockers

None.
