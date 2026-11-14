# Status

Living record of what is done, in progress, next and blocked. Updated at the end of every task.
Milestones and acceptance criteria are defined in [PLAN.md](PLAN.md).

## Milestones

| Milestone                                         | State       |
| ------------------------------------------------- | ----------- |
| M0 — Skeleton                                     | Done        |
| M1 — Data and TimelineModel                       | In progress |
| M2 — LOD0 scene and complete timeline             | Not started |
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

## Tooling availability in the authoring session

- Context7 and DeepWiki MCP servers: both available and consulted for Vite, Biome, Vitest,
  Playwright, Caddy and TypeScript.
- Astral skills (`uv`, `ty`, `ruff`): available; they apply from M5 (Python pipeline).
- Dokploy MCP server: not available in the session that produced M0. M7 must be run from a
  session that has it.

## Blockers

None.
