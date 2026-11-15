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
`--enable-unsafe-webgpu --use-webgpu-adapter=swiftshader`). Screenshots are compared with a
tolerance set in `playwright.config.ts` (see the second amendment).

**Consequences.** Baselines are reproducible. Software rasterisation is slow, so end-to-end
tests render at 1280×720 and frame rate is not asserted there; performance is measured
separately on real hardware. A unit test keeps the image tag and the package version aligned.

**Amendment (2026-11-14).** In headless Chromium on SwiftShader, a WebGPU device renders
correctly off screen but is destroyed as soon as it presents to a canvas (verified with a
minimal page without three.js, under eleven combinations of browser flags). The `webgpu`
project therefore opens the application with `renderer=webgpu-readback`: the scene is rendered
by the WebGPU backend into a texture, read back and painted on the canvas through a 2D context
(`src/render/presenter.ts`). The WGSL shaders and the WebGPU pipeline are exercised for real;
only the presentation differs from production. In production, a WebGPU device that is lost
makes the application start the scene again on WebGL 2.

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

## ADR 0008 — Application and scene architecture

**Status:** accepted (2026-11-14)

**Context.** The scene, the controls and the text must all show the same instant, and the
image must depend on that instant alone.

**Decision.**

- One store (`src/app/store.ts`) holds the application state: time, playback, camera mode,
  panel, scene status. The interface and the scene are both views of it.
- Each frame, the main loop advances time (`advancePlayback`), evaluates `TimelineModel` once
  and hands the resulting state to the interface and to the scene. The scene is rendered only
  when the state, the size or the camera changed, so a paused scene costs nothing.
- `src/render/` is loaded as a separate chunk. `sceneView.ts` owns the renderer, a
  `RenderPipeline` and the objects; each object takes the simulation state and sets transforms
  and uniforms from it. No object keeps history between frames.
- Geometry that can be computed without a renderer lives in `src/ship/` and `src/sim/` as pure
  functions with unit tests: hull form, mesh data, lamp positions, boat placement, camera poses,
  the conversion from poses to matrices. `src/render/` only turns them into GPU resources.
- The level-of-detail 0 ship is generated from the dataset. Its hull form is analytic and tuned
  to the recorded block, prismatic and midship coefficients; the test suite checks them, the
  displacement, the length overall and the breadth.
- Camera modes are pure functions from the state and a few user-controlled parameters to a
  position and a target. The guided camera depends on time alone and holds still within a shot
  when reduced motion is requested.
- The interface is semantic HTML built by small modules (`src/ui/`). The text of the "Now" tab
  is also the accessible description of the canvas, and the "Narrative" tab lists every event,
  so the page is complete without the 3D scene. Announcements go through one polite live
  region, at most one every four seconds, and only key events at high speed.
- Keyboard shortcuts that are single keys act only while the 3D view has the focus.
- The address carries the instant, the camera and the speed (`?t=01:40&camera=orbit&rate=60`).

**Consequences.** Any instant can be linked, reviewed and screenshotted deterministically, on
either backend. Positions of the boats after they leave, the height of the distress signals and
the massing of the deckhouses are not in the sources; they are marked as illustrative in the
code that draws them and in the interface text.

## ADR 0009 — Sea, sky and light of the night

**Status:** accepted (2026-11-14)

**Context.** The night was moonless, clear and flat calm. The image must show a sky that is
right for the date, the hour and the place, a sea that reflects the lit ship, and lamps that go
out as recorded, while staying a deterministic function of the instant on both backends.

**Decision.**

- The star field is the Yale Bright Star Catalogue to magnitude 6.5, moved to epoch 1912 by
  proper motion at build time and shipped as a 67 kB binary file loaded with the scene chunk.
  Its orientation, the planets, the Moon and the Sun come from Astronomy Engine (MIT, no
  dependency) for the foundering position and the adopted ship's time. Method and tests are in
  `docs/SKY.md`.
- The sea is a mirror plane whose reflection is displaced by wave slopes. The slopes come from a
  Tessendorf FFT field evaluated on the processor (128 × 128 samples, three inverse transforms
  per instant) and uploaded as a texture. A GPU implementation was not retained: compute
  shaders do not exist on the WebGL 2 backend, and the field is small enough for the processor.
- A second source of slopes, twelve sinusoidal waves from the same spectrum evaluated in the
  shader, serves the lowest quality level. It is the first-order form of Gerstner waves: the
  surface is never seen close enough for horizontal displacement to matter on a 5 cm sea.
- The amplitudes of both wave models come from a generator seeded with a constant; only phases
  depend on time. With reduced motion the waves are frozen.
- Quality levels (`src/render/quality.ts`): `low` (analytic waves, reflection at a quarter of
  the resolution, pixel ratio 1), `medium` (FFT waves, reflection at half resolution, pixel
  ratio up to 1.5; the default) and `high` (FFT waves, full-resolution reflection, pixel ratio
  up to 2). The level is chosen with `quality=` in the address; a control in the interface and
  the remaining settings come with M5.
- The logarithmic depth buffer is no longer used: a near plane of 1 m and a far plane of 45 km
  give enough depth precision for the scene, and every pass, the reflection included, then
  shares the same projection.
- The glow of the lamps is eight point lights beside the hull whose intensity follows `data/lighting.json`. No
  shift of colour is rendered as the output falls, for want of a primary testimony.

**Consequences.** The initial JavaScript grows to 314 kB gzip (budget 400 kB). The sky can be
checked against ephemerides by unit tests. The reflection costs one additional render of the
scene per frame, scaled by the quality level.

## ADR 0004 — second amendment (2026-11-14)

A night scene is mostly black, so a tolerance expressed as a share of the image hides real
changes: the images of M3 (stars, reflections, glow) still matched the baselines of M2 under
`maxDiffPixelRatio` 0.02 and `threshold` 0.2. Screenshots are now compared with `maxDiffPixels`
50 and `threshold` 0.1, which the M2 baselines fail at five of the six instants, and
`tests/e2e/scene.spec.ts` asserts the content of the image directly: stars as points in a dark
sky, the lit ship reflected in the sea, no reflection once the lights have failed.

The tighter comparison exposed a second weakness. The controls laid over the canvas were hidden
for screenshots by a style sheet that Playwright injects into the page; the content security
policy of the production server (`style-src 'self'`) rightly refuses it, so against the
container image the controls stayed in the picture, unnoticed under the old tolerance. The tests
now hide them through the CSS object model, which the policy allows, and the `container` job of
CI runs the end-to-end suite against the built image
(`E2E_BASE_URL=http://127.0.0.1:8080 tools/e2e-container.sh`), with the same baselines as the
preview server.

## ADR 0010 — Iceberg, distress signals, flooding diagram and wreck

**Status:** accepted (2026-11-15)

**Context.** M4 completes what the scene shows: the iceberg, the water inside the hull, the
distress signals at every playback speed, and the two sections on the seabed. The sources give
the size and appearance of the iceberg but not its path, describe the signals but not their
height, and describe the wreck in words.

**Decision.**

- **Iceberg.** A generic shape within the reported size (`src/sim/iceberg.ts`), dark, placed
  abreast of the starboard bow at the collision. The ship is drawn at rest, so the iceberg moves
  aft by the distance she runs, her speed falling evenly from the recorded 22 knots to nothing
  over four minutes. That duration is a modelling value, recorded as such in `data/site.json`
  (`iceberg-passage`).
- **Distress signals.** Each is a cluster of small white stars. Up to the speed at which the
  14-second sequence still lasts 0.9 s on screen, it is drawn as it happened. Faster, it would
  be a blink: it is drawn instead as a steady cluster at the height of the burst that comes up
  and fades over 0.9 s of real time. The scene therefore receives the playback speed as a
  display parameter (1 when paused); the simulation state itself still depends on time alone.
  `src/sim/rocketDisplay.test.ts` counts the flashes on screen at every speed offered: at most
  two in any second, under the limit of three of WCAG 2.3.1.
- **Guided camera.** Between the first and the last signal the view is wider and raised, so
  that the bursts stay in frame; a unit test checks it for each signal.
- **Flooding.** The "Now" tab draws a longitudinal section of the hull with the water in each
  of the sixteen compartments and the sea outside (`src/sim/floodingProfile.ts`,
  `src/ui/floodingDiagram.ts`). The drawing is an image named by its caption and is followed by
  a table of the same values. A cut-away view of the hull in the 3D scene is left to the
  detailed model of M5.
- **Wreck.** When the bow section comes to rest its foremast is laid across the bridge; when
  the stern section comes to rest it is drawn without its upper works, its mast and its lamps.
  Both follow records added to `data/site.json` from a tertiary source and are marked
  `estimated`. The stern is a massing: its real state, with decks collapsed and plating peeled
  away, is stated in the "Sources" tab.

**Consequences.** Every animated element is a function of the instant, plus the playback speed
for the display of the signals. The image of a paused instant is the same whatever speed was in
use before the pause.

## ADR 0011 — Static pages, Legal Notice and support

**Status:** accepted (2026-11-15)

**Context.** The Legal Notice must be readable without WebGL and without waiting for the scene,
be linked from every view, reproduce the owner's text exactly and have a single source. The
site also needs an About page, a complete text alternative and a discreet way to support the
project, with no third-party script and an unchanged content security policy.

**Decision.**

- The pages `/narrative/`, `/about/` and `/legal-notice/` are separate HTML documents generated
  at build time. `src/pages/` renders them to HTML text with a small escaping builder;
  `tools/vite-static-pages.ts` fills the slots of each document (head, header, content, footer)
  and writes `sitemap.xml`. They contain no script, so they work without JavaScript and under
  the strictest policy. The header, the menu and the footer of the reconstruction come from the
  same functions.
- The content of the Legal Notice lives in `src/config/legal.ts`. Each line of the owner's text
  is a label and a value: the label is a level-three heading and the value follows it, as a
  paragraph, a link or an `address` element. Headings cannot be nested inside `address` in
  HTML, so this is the arrangement that keeps the heading hierarchy, the `address` elements and
  the exact text at once. A unit test and an end-to-end test compare the text of the page with
  the owner's, value for value.
- The four payment links live in `src/config/support.ts` and are rendered in one section of the
  About page, reached from the menu entry "Support Titanic 4D". They are plain links with
  `target="_blank"` and `rel="noopener"`, whose accessible name says that they open a new tab.
  Nothing about support appears in the reconstruction itself. `.github/FUNDING.yml` points to
  that section rather than repeating the links.
- `public/.well-known/security.txt` gives the contact address and an expiry date within a year;
  `tools/verify-server.ts` fails once it has expired, so the date is renewed with a deployment.
- The line about the dead in the footer and the documentation reads "about 1,500": the counts
  of the sources run from 1,490 to 1,517 and are given separately in "The night in words".
- M6 was carried out before the end of M5, whose asset pipeline was being built in parallel:
  the legal and accessibility requirements gate the first public deployment, the detailed model
  does not.

**Consequences.** Four documents are built instead of one; the application chunk is unchanged.
`tools/verify-server.ts` checks the pages, the Legal Notice values, the payment links, the site
map and `security.txt` on the running server (144 checks).

## ADR 0012 — Detailed model, post-processing and levels of detail

**Status:** accepted (2026-11-15)

**Context.** M5 replaces the generated ship by a detailed model, adds post-processing and gives
the user a choice of detail, without giving up determinism, the generated model as a fallback,
or the strictness of the content security policy more than necessary.

**Decision.**

- **Pipeline.** `assets/` is a Python project run by uv. It reads only a table of offsets that
  `tools/export-hull-offsets.ts` exports from the dataset and from the same analytic hull form
  as the application, builds the geometry with NumPy, assembles and exports it with Blender
  (`bpy`) and compresses it with glTF-Transform (Meshopt, quantised normals). The output,
  `public/models/ship-lod1.glb`, is committed; the build is byte-for-byte reproducible and a CI
  job rebuilds it and fails when the committed file differs. What comes from the dataset and
  what is a modelling value is listed in `docs/ASSETS.md`.
- **Same parts, same frame.** The model has the parts of the generated one (three sections,
  funnels, masts, wrecked stern) under the same names and in the same coordinates, so the scene
  swaps one for the other (`src/render/detailedShip.ts`, `ShipObject.useDetailedModel`). The
  scene starts with the generated model and replaces it when the file has loaded; if loading
  fails, the generated model stays. The lamps are still computed by the application.
- **No texture.** Materials only: a deck texture would need a Basis transcoder in the browser
  for little gain at night.
- **Content security policy.** The Meshopt decoder is WebAssembly and has no JavaScript
  fallback, so `script-src` gains `'wasm-unsafe-eval'`, which allows compiling WebAssembly and
  nothing else: no `eval`, no inline or remote script. This amends ADR 0005.
- **Levels of detail.** `low`: generated model, analytic waves, quarter-resolution reflection,
  no bloom, pixel ratio 1. `medium` (default): detailed model, FFT waves, half-resolution
  reflection, bloom, pixel ratio up to 1.5. `high`: as medium with a full-resolution reflection
  and a pixel ratio up to 2. The level is chosen in the view toolbar ("Detail") or with
  `quality=` in the address; changing it restarts the scene on a fresh canvas.
- **Bloom.** Only what is brighter than scene white glows: lamps, stars, distress signals.
- **Gamepad.** A gamepad with the standard mapping drives the camera
  (`src/render/camera/gamepad.ts`); the Permissions-Policy already allowed it for the site.
- **Windows of the upper works.** The rows of lamps of B deck and of the enclosed promenade
  produced no lamp, because they were looked up on the hull form above the top of its plating.
  They are now placed on the wall that carries the ship's side upward, where the detailed model
  has its windows.

**Consequences.** The initial JavaScript is 348 kB gzip of the 400 kB budget; the model adds a
0.45 MB file (0.13 MB with Brotli) fetched after the first frame. Tests wait for the model
through `data-assets` and `data-ship-model` on the canvas, and one of them checks that the
detailed model is the one drawn under the production policy.
