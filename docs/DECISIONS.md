# Architecture decision records

Each record states the context, the decision and its consequences. Records are append-only: a
decision that changes is superseded by a new record that references the old one.

## ADR 0001 — Rendering engine and core toolchain

**Status:** accepted (2026-11-14)

**Context.** The application renders a night ocean, a star field and a large ship in real time
in the browser, driven by a deterministic timeline. It must use WebGPU where available and fall
back to WebGL 2 elsewhere, keep the initial JavaScript under 400 kB compressed, and stay
maintainable as plain TypeScript.

**Engines compared.**

| Aspect                | three.js r187                                                                  | Babylon.js                                                    | PlayCanvas engine                                   |
| --------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------- | --------------------------------------------------- |
| WebGPU and fallback   | `WebGPURenderer` selects WebGPU and falls back to a WebGL 2 backend on its own | Separate `WebGPUEngine` and `Engine`; the application chooses | WebGPU and WebGL 2 devices; the application chooses |
| Shader authoring      | TSL: one node graph compiled to WGSL and GLSL                                  | Node Material plus hand-written WGSL and GLSL variants        | Shader chunks maintained in both GLSL and WGSL      |
| Bundle weight         | Tree-shakeable ES modules; the smallest of the three for this scene            | Feature-complete but markedly heavier core                    | Compact core, designed around its hosted editor     |
| Ecosystem             | Largest set of loaders, examples and community knowledge; glTF, KTX2, Meshopt  | Strong tooling (Inspector, NME); smaller community            | Smaller community; editor-centric workflow          |
| Fit with a pure model | Scene graph is a passive view that a state model can drive                     | Comparable                                                    | Entity-component system pulls logic into the engine |

**Decision.** Use three.js r187 (`three/webgpu`) with `WebGPURenderer`, materials and
post-processing written in TSL. Babylon.js and PlayCanvas are set aside: neither offers a single
shader source for both backends with automatic fallback, and both weigh more on the JavaScript
budget or pull the architecture toward the engine.

Toolchain, each version checked against the registry on the day of installation: Node.js 26.13.1
(LTS), pnpm 12.18.0, TypeScript 7.0.2 (strict), Vite 8.3.8, Vitest 5.1.0, Playwright 1.65.1,
axe-core 4.14.0, Zod 4.

**Consequences.** Shaders are written once. Both backends must be tested explicitly (see
ADR 0004). The renderer is loaded as its own chunk so that the document is readable before the
scene is ready.

## ADR 0002 — User interface without a framework

**Status:** accepted (2026-11-14)

**Context.** The interface consists of a timeline, a few panels and menus, and static pages
(About, Legal Notice, text narrative). It must be semantic, keyboard-operable HTML, must not wait
for the 3D scene, and shares the 400 kB budget with the renderer.

**Decision.** No UI framework and no React Three Fiber. The interface is semantic HTML driven by
small typed modules that subscribe to a single application state store. The scene is a view of
the same store. Static pages are rendered to HTML at build time from typed content modules, so
they are readable without JavaScript, WebGL or WebGPU.

**Consequences.** No framework runtime in the bundle and no hydration step. Components follow
the WAI-ARIA Authoring Practices by hand, which is covered by end-to-end and axe-core tests.

## ADR 0003 — Biome instead of ESLint and Prettier

**Status:** accepted (2026-11-14)

**Context.** TypeScript 7 is the native compiler. `typescript-eslint` 8.72.2, the current
release, declares the peer range `typescript >=4.8.4 <6.1.0` because it depends on the JavaScript
compiler API. Using it would require installing a second, older TypeScript only for linting, and
type-aware rules would then be evaluated by a different compiler than the one that builds the
project.

**Decision.** Use Biome 2.6.7 for linting and formatting of TypeScript, JSON, CSS and HTML.
Its `project` and `types` domains provide import-graph and type-aware rules without the
TypeScript API. Type checking remains the job of `tsc -b`.

**Consequences.** One tool and one configuration file (`biome.json`). The rule
`complexity/useLiteralKeys` is disabled because it contradicts the compiler option
`noPropertyAccessFromIndexSignature`, which is kept. To be revisited if `typescript-eslint`
supports TypeScript 7.

## ADR 0004 — End-to-end rendering tests in a pinned container

**Status:** accepted (2026-11-14)

**Context.** Visual regression baselines are only meaningful when the browser build, the fonts
and the rasteriser are identical between the machine that records them and the machine that
compares them. CI runners have no GPU.

**Decision.** The Playwright suite always runs inside the official image
`mcr.microsoft.com/playwright` at the tag matching the installed `@playwright/test`
(`tools/e2e-container.sh`, used locally and by CI). Two projects run every test: `webgl2`
(ANGLE on SwiftShader) and `webgpu` (Dawn on SwiftShader, enabled by
`--enable-unsafe-webgpu --use-webgpu-adapter=swiftshader`). Screenshots are compared with
`maxDiffPixelRatio` 0.02 and a per-pixel `threshold` of 0.2.

**Consequences.** Baselines are reproducible. Software rasterisation is slow, so end-to-end
tests render at 1280×720 and frame rate is not asserted there; performance is measured
separately on real hardware. A unit test keeps the image tag and the package version aligned.

## ADR 0005 — Delivery: Caddy, headers, caching and budgets

**Status:** accepted (2026-11-14)

**Context.** The site is static. Dokploy's Static build type serves files through a generic
Nginx without control over headers or precompression.

**Decision.**

- A multi-stage Dockerfile builds with Node.js and serves with Caddy 2 as an unprivileged user
  on port 8080. Base images are pinned by tag and digest.
- Files are precompressed at build time (Brotli quality 11 and gzip level 9) and served with
  `file_server { precompressed br gzip }`.
- Fingerprinted files under `/assets/` are `immutable`; HTML documents are `no-cache`; other
  files are cached for one hour.
- The fallback to `index.html` applies to extensionless paths only. A missing file with an
  extension is a 404, so a missing asset is never answered with an HTML document.
- Security headers are set on every response, redirects and errors included: a strict
  Content-Security-Policy with `default-src 'none'`, HSTS, Referrer-Policy, Permissions-Policy,
  X-Content-Type-Options and X-Frame-Options. HSTS carries neither `preload` nor
  `includeSubDomains`: the apex domains also answer and the policy must not constrain hosts
  this project does not operate. COOP and COEP are not sent because nothing requires
  `SharedArrayBuffer`.
- The three secondary hosts are redirected by the Caddyfile (301, path and query preserved), not
  by the platform, so the rule is versioned and tested (`tools/verify-server.ts`).
- Budgets (`budgets.json`) are measured after gzip, the least efficient encoding offered, and
  count every chunk reachable from the entry document, dynamic imports included, unless a chunk
  is explicitly listed as deferred.

**Consequences.** Header and redirect behaviour is verified against the real image in CI.
Anything that needs a new CSP source (for example WebAssembly decoders) must update the
Caddyfile and its test together.

## ADR 0006 — Dependency release age

**Status:** accepted (2026-11-14)

**Context.** pnpm refuses packages published less than a configurable time ago, which limits
exposure to compromised releases. The project also requires the latest stable versions.

**Decision.** `minimumReleaseAge` is 1440 minutes. A version younger than that is used only
when it is the latest stable release and is listed explicitly in `minimumReleaseAgeExclude`
(currently `playwright-core@1.65.1`). Entries are removed once the version has aged.

**Consequences.** Every exception is visible in `pnpm-workspace.yaml` and reviewed like code.

## ADR 0007 — Dataset and timeline model

**Status:** accepted (2026-11-14)

**Context.** Every displayed state must derive from a sourced record, and the state must be a
pure, deterministic function of time so that playing forward, backward and jumping agree.

**Decision.**

- The dataset is a set of JSON files in `data/`, one schema per file written with Zod and
  exported as JSON Schema. Every record carries `source_ids`, `certainty` and `note`, and may
  carry `alternatives`. Cross-file rules are code (`src/data/validation.ts`).
- Zod is a development dependency. Files are validated by the unit tests and before every build
  (`pnpm data:validate`); the browser imports the JSON as typed modules and does not validate
  again, which keeps the schema library out of the bundle.
- The simulation clock is seconds since the collision in ship's time. Conversions to New York
  time and GMT take the clock offset from the dataset, so that the offset remains a parameter.
- `createTimelineModel` prepares its curves once and returns an `evaluate(t)` that reads them
  without mutating anything. Interpolation is monotone cubic for attitudes and positions and
  linear for water levels and lighting, so that no value overshoots its keyframes.
- While intact, the hull rotates about the pivot of the waterline given by Halpern. From the
  break, each section follows keyframes that start from the pose computed at the break.
- Where sources disagree, the record adopts one value for the scene, states why, and lists the
  other positions. The choices are summarised in `docs/DATA.md`.

**Consequences.** Adding or correcting history is a data change validated by schema and tests.
Effects that need randomness must derive their seeds from `t`. Quantities the sources do not
give (for example positions of the boats after they leave) are either absent from the state or
flagged as illustrative by the view that draws them.
