# Asset pipeline

The level-of-detail 1 model of the ship, `public/models/ship-lod1.glb`, is generated. Nothing in
it is drawn by hand: one command rebuilds it, byte for byte, from the dataset, from the hull form
of the application and from the modelling values listed below. This document describes the
pipeline, what the model contains, where each dimension comes from, and how the result is checked.

## Build

Requirements: Node.js and pnpm at the versions of the repository, [uv](https://docs.astral.sh/uv/)
0.11 or later, and on Linux the system libraries that Blender loads (`libgl1 libice6 libsm6
libx11-6 libxext6 libxfixes3 libxi6 libxkbcommon0 libxrender1`). uv installs Python 3.13 and the
locked Python packages by itself.

```sh
pnpm install --frozen-lockfile                              # dataset schemas for the offsets tool
pnpm --dir assets/optimise install --frozen-lockfile        # glTF-Transform, meshoptimizer, validator
uv run --project assets --locked titanic-assets build       # writes public/models/ship-lod1.glb
```

The last command is the whole build. It takes about three seconds once the dependencies are
installed, and needs `node` on the `PATH`.

| Purpose                           | Command, from `assets/`                                      |
| --------------------------------- | ------------------------------------------------------------ |
| Build the model                   | `uv run titanic-assets build`                                |
| Build somewhere else              | `uv run titanic-assets build --output <file.glb>`            |
| Render review images (Cycles)     | `uv run titanic-assets render --output <directory>`          |
| Lint                              | `uv run ruff check`                                          |
| Format check                      | `uv run ruff format --check`                                 |
| Type check                        | `uv run ty check`                                            |
| Tests (two complete builds)       | `uv run pytest`                                              |
| Type check of the Node.js scripts | `pnpm exec tsc --noEmit`, from `assets/optimise/`            |
| Validate any model                | `node assets/optimise/validate.ts <file.glb>`, from the root |
| Table of offsets alone            | `node tools/export-hull-offsets.ts [--out <file.json>]`      |

Blender prints two lines starting with `ERROR Draco is not available` and `ERROR MeshOptimizer is
not available` during the export. They report that the `bpy` wheel ships without the exporter's
own compression libraries, which the pipeline does not use.

## Stages

| Stage       | Program                                        | Input                                                           | Output                                         |
| ----------- | ---------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------- |
| 1. Offsets  | `tools/export-hull-offsets.ts` (Node.js)       | `data/ship.json`, `breakup.json`, `lifeboats.json`, `src/ship/` | `assets/build/hull-offsets.json`               |
| 2. Geometry | `titanic_assets` (Python, NumPy)               | the table of offsets, `modelling.py`                            | triangles per node and per material, in memory |
| 3. Scene    | `titanic_assets.blender` (Blender as a module) | the triangles                                                   | `assets/build/ship-lod1.raw.glb`               |
| 4. Optimise | `assets/optimise/optimise.ts` (glTF-Transform) | the raw model                                                   | `public/models/ship-lod1.glb`                  |
| 5. Validate | `assets/optimise/validate.ts` (glTF Validator) | the raw model, then the final model                             | `assets/build/ship-lod1.validation.json`       |

`assets/build/` is generated and ignored by Git (`assets/.gitignore`). The final model is the
file to commit.

1. **Offsets.** The hull form is not implemented a second time. The tool imports `createHullForm`,
   `sectionRanges`, `buildLod0Model` and `deckHeightAt` from the application and samples them:
   half-breadths at 1,327 stations and 134 waterlines, the stem and stern profiles, the bottom and
   the top of the plating at every station, half-breadths at sixteen small heights above the
   bottom (where the bilge turns), the heights of the Boat, A, B and C decks at every station, the
   three sections with the stations at which the hull parted, the section carrying each funnel and
   each mast, the stations of the boats, the particulars the model uses and the 914 lamps of the
   level-of-detail 0 model. Values are rounded to the micrometre. The Python side reads only this
   file.
2. **Geometry.** Pure functions of the table: `hull.py` (plating, bottom, weather decks, caps,
   stem head), `walls.py` and `upperworks.py` (superstructure, Boat deck, deckhouses, bridge,
   davits), `fittings.py` (funnels, masts, rudder, deadwood, shaft fairings, propellers),
   `model.py` (assembly). Everything is computed in body coordinates, in double precision, with
   trigonometry from Python's `math` module only.
3. **Scene.** One Blender object per node, one material slot per material, one vertex per
   triangle corner with its own normal (custom split normals), then the glTF exporter of Blender
   with `export_yup`: positions, normals and materials only.
4. **Optimise.** Materials, meshes and accessors are de-duplicated; positions are rounded to a
   grid of 1/256 m and normals to eight bits per component; identical vertices are welded;
   triangles and vertices are reordered for compression; buffers are written with
   `EXT_meshopt_compression` (normals through the octahedral filter, declared with
   `KHR_mesh_quantization`).
5. **Validate.** The Khronos glTF Validator must report no error on either file; the build fails
   otherwise. The validator does not know `EXT_meshopt_compression`: on the final file it checks
   the document and reports the extension and the placeholder buffer as two informations; the
   content of the buffers is checked on the raw file.

## Content of the model

Frame: glTF, right-handed, metres. `X` forward, `Y` up, `Z` to starboard; a body point `(x, y, z)`
of the dataset is at `(−x, z, y)`. The origin is the forward perpendicular at the keel. No node
has a translation, a rotation, a scale or a matrix: every mesh is expressed directly in this
frame, children included.

| Node                   | Parent   | Content                                                                           |
| ---------------------- | -------- | --------------------------------------------------------------------------------- |
| `bow`                  | scene    | Hull and upper works from the stem to station 143, capped at 143                  |
| `middle`               | scene    | Hull and upper works between stations 143 and 164, capped at both                 |
| `stern`                | scene    | Hull and upper works abaft station 164, capped at 164, with rudder and propellers |
| `stern-wreck`          | scene    | The after section without upper works: hull, decks, cap, rudder and propellers    |
| `funnel-1`, `funnel-2` | `bow`    | Funnels above their casings, which belong to the sections                         |
| `funnel-3`             | `middle` |                                                                                   |
| `funnel-4`             | `stern`  |                                                                                   |
| `foremast`             | `bow`    | Pole mast with the crow's nest                                                    |
| `mainmast`             | `stern`  | Pole mast                                                                         |

The split, the cut stations and the parent of each funnel and mast are those of
`buildLod0Model(ship, 143, 164)`; they are read from its result, not repeated. `stern-wreck` is a
fourth root of the scene rather than a child of `stern`, so that hiding `stern` (with its funnel
and its mast) and showing `stern-wreck` are two independent switches. It keeps the rudder, the
deadwood and the propellers, which are part of the hull and remain on the wreck.

Each mesh has one primitive per material it uses. Materials are opaque, single-sided, without
texture and without emission (the application draws the lights):

| Material       | sRGB      | Roughness | Metalness | Used for                                                             |
| -------------- | --------- | --------- | --------- | -------------------------------------------------------------------- |
| `hull-black`   | `#15171a` | 0.72      | 0.08      | Plating between the boot-topping and the sheer stripe                |
| `antifouling`  | `#6e2a22` | 0.72      | 0.08      | Bottom and plating up to 0.30 m above the load waterline, stern gear |
| `sheer-stripe` | `#c9a23c` | 0.72      | 0.08      | Stripe along the line of C deck                                      |
| `white`        | `#e6e2d6` | 0.72      | 0.08      | Sheer strake, superstructure, deckhouses, bulwarks, davits           |
| `funnel-buff`  | `#c98f52` | 0.72      | 0.08      | Funnels and their pipes up to 78 % of their height                   |
| `funnel-black` | `#121314` | 0.72      | 0.08      | Top, rim and inside of the funnels                                   |
| `deck-wood`    | `#8c7a60` | 0.85      | 0         | Weather decks, A deck, Boat deck                                     |
| `steel`        | `#6f7377` | 0.45      | 0.6       | Propellers                                                           |
| `mast`         | `#9a7b4f` | 0.72      | 0.08      | Masts and crow's nest                                                |
| `glass`        | `#10161c` | 0.15      | 0         | Window panes, set 8 cm behind the face of their wall                 |
| `shadow`       | `#1b1d20` | 0.9       | 0         | Section caps, deckhouse roofs, house wall of the open promenade      |

The colours are those of `PAINT` in `src/ship/lod0.ts`; roughness 0.72 and metalness 0.08 are
those of its single material. `steel` and `glass` have no counterpart there. Two materials were
added to the nine first planned: `sheer-stripe` and `shadow` mirror `PAINT.sheerStripe` and
`PAINT.shadow`, which the level-of-detail 0 model uses for the same surfaces. Base colours are
stored as linear factors, as glTF requires.

The space of the twenty stowed boats is empty: a test checks that no triangle enters the box of
any boat at the position computed by `src/sim/boatPlacement.ts`. The lamps of the application sit
on the model: a test checks that each of the 914 lamps is either within 2 cm of the plating or,
for the windows of B deck and of the enclosed promenade, in front of a pane set back by the
depth of the glass recess, and that its drawn position, 4 cm proud, is outside the model.

## What comes from the dataset

Read from `data/` through the table of offsets, never typed again:

- length between perpendiculars, breadth, load draught, stem and stern overhangs, sheer;
- heights and extents of the Boat, A, B and C decks; forecastle, well decks, poop, midship
  superstructure, navigating bridge, officers' quarters, enclosed promenade;
- station, base, top, section and rake of the funnels, and whether they exhaust boilers; station,
  base, top and rake of the masts; height of the crow's nest;
- diameters of the wing and centre propellers;
- stations at which the hull parted (`breakup.json`); stations, sides and sizes of the boats
  (`lifeboats.json`), used only to place the davits and to keep the boats' space empty.

The surface of the hull is the analytic form of `src/ship/hullForm.ts`, sampled and joined by
flat facets. That form is itself a modelling choice of the application, tuned to the recorded
coefficients (ADR 0008); the model adds nothing to it and removes nothing from it. Measured from
every tabulated point of the form to the facets, the distance is 3.8 cm at worst (on the stem
line, at the forefoot) and 4 mm on average; a test asserts less than 4 cm on one station in
four. The largest deviation seen by a lamp is 1.1 cm.

The length overall of the dataset (269.06 m) is 3 cm more than the length of the analytic form,
whose stem head lies 0.73 m forward of the perpendicular where the record says 0.76 m. The model
carries the stem up along its own rake until it reaches the recorded overhang, which gives a stem
head 0.38 m above the forecastle deck. Its length is a modelling value.

## Modelling values (not historical records)

Every dimension that is not in the dataset is defined in one module,
`assets/src/titanic_assets/modelling.py`, and nowhere else. None of them is a historical record
and none should be quoted as one.

Mirrors of constants that the application keeps private (`src/ship/lod0.ts`,
`src/sim/boatPlacement.ts`); the consistency is checked by the tests on the lamps and the boats:

- boot-topping 0.30 m above the load waterline; sheer stripe ±0.12 m about the line of C deck;
- Boat deck 0.25 m thick; bulwark of the open promenade 1.1 m high; house wall of the open
  promenade 2.6 m inside the ship's side;
- deckhouses of the Boat deck: stations, half-widths and heights (2.9 m, raised roofs 1.3 m);
  funnel casings 0.6 m around the funnel; wheelhouse and bridge wings;
- black top of the funnels from 78 % of their height; mast radius 0.45 m at the base, 0.16 m at
  the top;
- rows of windows of B deck (every 2.2 m, 0.8 × 1.0 m) and of the enclosed promenade (every 2.4 m,
  0.9 × 1.1 m): the stations and sizes of the corresponding lamp rows of `buildLamps`;
- stowed boats: 1.7 m inside the ship's side, keel 0.7 m above the deck line, collapsibles as
  placed by the application.

Values introduced by this model:

- **Tessellation.** Stations every 1 m, 0.5 m within 45 m of either end and 0.25 m within 12 m,
  plus stations at squared distances from each end; twelve rows at fixed heights above the
  bottom in the turn of the bilge, then eight rows to the boot-topping, ten to the height at
  which the stem meets the forward perpendicular (where the flare of the form ends), two to the
  stripe, two in the white.
- **Stem head.** Falls back to the forecastle deck over 1.0 m.
- **Walls.** Facets of at most 1 m; glass 8 cm behind the face; bulwarks 8 cm thick; walls
  overlap the plating beneath them by 2 cm.
- **Open promenade.** Stanchions 0.12 m square every 3.05 m.
- **Deckhouse windows.** On the houses of full height: every 2.6 m, 0.55 × 0.7 m, centred 1.75 m
  above the deck line.
- **Navigating bridge.** Roofed part ±9.0 m wide and 2.5 m high with fourteen front windows
  (1.0 × 0.9 m every 1.25 m); wing cabs 2.2 × 1.7 × 2.3 m with one window forward and one
  outboard; wing bulwarks 1.2 m high. The wings end 0.4 m inside the ship's side, as in the
  level-of-detail 0 model, so that nothing exceeds the extreme breadth.
- **Funnels.** 48 facets; rim 0.3 m high standing 7 cm proud; wall 0.15 m; inside closed 2.5 m
  below the top; one pipe of 0.14 m radius against the fore side of every funnel and one against
  the after side of the three funnels that exhaust boilers, ending 0.5 m below the rim.
- **Crow's nest.** A drum 0.72 m in radius and 1.25 m high, its axis 0.45 m forward of the mast,
  its floor at the recorded height.
- **Davits.** One pair per boat stowed under davits, 0.4 m beyond each end of the boat, foot
  0.55 m inside the ship's side; arm 3.2 m high curving 1.15 m inboard; frame 0.34 × 0.95 ×
  0.55 m. The station of each boat is a dataset record marked `estimated`; the shape and the
  clearances are not records.
- **Stern gear.** Rudder blade below the counter only: leading edge 0.35 m abaft the after
  perpendicular, chord 4.65 m (the 15 ft 3 in quoted in the summary of the record
  `rudder-height`, whose value, 23.98 m, includes the stock inside the hull), outline and
  thickness. Deadwood 0.56 m thick between the keel line and the rising bottom of the form, from
  station 226 to a propeller post at station 253.6, sole piece 0.45 m high, rudder post. Centre
  propeller at station 256.3, shaft 3.1 m above the keel; wing propellers at station 249.2,
  5.6 m from the centre line, shafts 3.75 m above the keel, each in a conical fairing from
  station 221. Propellers: three blades, hub of one tenth of the diameter, pitch 1.1 diameters,
  blade outline. The record `centre-propeller-diameter` is marked `debated` and does not state a
  number of blades; three are modelled, with the adopted diameter, and the four-bladed
  alternative recorded in the dataset is not shown.
- **Materials.** Roughness and metalness of every material; base colours of `steel` and `glass`.
  The propellers were bronze; they use `steel` because no bronze material was planned.

Left out on purpose: portholes (the application draws the lamps), railings, rigging, anchors,
cranes, hatches, ventilators, the docking bridge and the compass platform.

## Budgets and measured numbers

| Quantity                         | Budget    | Measured                           |
| -------------------------------- | --------- | ---------------------------------- |
| Triangles                        | 250,000   | 94,204                             |
| Size of the model                | 1,500,000 | 452,156 bytes (185,255 after gzip) |
| Draw calls (primitives)          | 60        | 39                                 |
| Vertices after welding           |           | 66,001                             |
| Size before optimisation         |           | 7,232,036 bytes                    |
| Build time, dependencies present |           | 3.2 s                              |

| Node          | Triangles | Primitives |
| ------------- | --------- | ---------- |
| `bow`         | 36,256    | 7          |
| `middle`      | 3,956     | 7          |
| `stern`       | 26,826    | 8          |
| `stern-wreck` | 24,234    | 7          |
| `funnel-1`    | 704       | 2          |
| `funnel-2`    | 704       | 2          |
| `funnel-3`    | 704       | 2          |
| `funnel-4`    | 664       | 2          |
| `foremast`    | 120       | 1          |
| `mainmast`    | 36        | 1          |

The budgets are asserted by `assets/tests/test_build.py` on the file that the build writes.

Quantisation. Positions are rounded to 1/256 m (3.9 mm) and stay 32-bit floating-point numbers.
The usual integer positions of `KHR_mesh_quantization` need a scale and a translation on the
nodes, which the contract with the application excludes. The floating-point grid costs nothing
here: for the same input, the `meshopt()` transform of glTF-Transform with 16-bit positions in
one volume for the scene writes 464,512 bytes, against 452,156 for this pipeline, which also
rounds the normals before welding. Because all meshes share one grid, the edges of two sections
meet exactly at a cut. Normals are stored on eight bits through the octahedral filter of
meshoptimizer.

## Determinism

The same inputs give the same bytes. `assets/tests/test_build.py` runs the command line twice, in
two processes, and compares the SHA-256 of the raw and of the final model; it also compares the
result with the committed file, as the CI job does.

What makes it so: no timestamp is written (Blender's exporter records the time in its settings
but not in the file; the validator report is written without one); iteration is over sorted or
ordered collections; nothing is random; the table of offsets is rounded to the micrometre;
geometry uses double precision arithmetic, square roots and the scalar functions of `math`, not
vectorised transcendental functions whose results can depend on the processor; all tool versions
are pinned by `assets/uv.lock` and `assets/optimise/pnpm-lock.yaml`.

Verified: two builds on the development machine, and a build from a fresh copy of the tree with
freshly installed dependencies in the `mcr.microsoft.com/playwright:v1.65.1-noble` (the image that `tools/e2e-container.sh` pins by digest) container
(Ubuntu 24.04), give the committed file. Not verified: another processor architecture, another
operating system or a C library other than glibc 2.39. The custom normals pass through Blender's
compiled code, so a platform whose arithmetic differs in the last place could change a few
normals; the CI job would then fail and the model should be rebuilt on the CI platform, which is
the reference.

## Tools and licences

| Tool                       | Version         | Licence                 | Role                                 |
| -------------------------- | --------------- | ----------------------- | ------------------------------------ |
| Blender as a module, `bpy` | 5.3.0           | GPL-3.0-or-later        | Scene, glTF export, review renders   |
| glTF exporter of Blender   | bundled, 5.3.43 | Apache-2.0              | Writes the raw model                 |
| NumPy                      | 2.5.4           | BSD-3-Clause and others | Geometry                             |
| uv                         | 0.11.32         | MIT or Apache-2.0       | Python and package management        |
| Ruff                       | 0.17.5          | MIT                     | Lint and format                      |
| ty                         | 0.0.104         | MIT                     | Type check                           |
| pytest                     | 9.2.0           | MIT                     | Tests                                |
| glTF-Transform             | 4.5.1           | MIT                     | De-duplication, welding, reordering  |
| meshoptimizer              | 1.3.0           | MIT                     | Encoder of `EXT_meshopt_compression` |
| glTF Validator             | 2.0.0-dev.3.10  | Apache-2.0              | Validation                           |
| TypeScript, `@types/node`  | 7.0.2, 26.6.6   | Apache-2.0, MIT         | Type check of `assets/optimise/`     |

Blender is a build tool here. It is not part of the application, of the container image or of the
repository: uv installs it from PyPI into `assets/.venv`, which Git ignores. The GPL covers the
output of a program only when that output is itself a work based on the program (GPL-3.0,
section 2). The model contains triangles, normals and material factors computed by this
project's code and no part of Blender, so it is not covered: it is distributed under the licence
of the repository, like the dataset values it is built from. The Python modules that import
`bpy` (`blender.py`, `render.py`) are scripts for Blender; they are published under the MIT
licence of the repository, which is compatible with the GPL. Anyone who redistributes them
together with Blender must follow the GPL for that combination.

ty has no stubs for `bpy`, which ships none: `assets/typings/` declares the few members that the
pipeline calls. The Ruff rule set is `ALL`, less five rules named and explained in
`assets/pyproject.toml`; the tests are also exempt from three rules (assertions, literal values,
docstrings on test functions).

`assets/optimise/` is a separate pnpm project, with its own lockfile and the same
`minimumReleaseAge` as the root, so that the root `package.json` is untouched and the web
application does not depend on these tools.

## Textures

The model has no texture. One small tiling set (deck planking) was considered and left out: at
the distances and under the light of the scene it would change little, while it would oblige the
application to load a Basis transcoder (a WebAssembly module of several hundred kilobytes) for
that one texture.

The `ktx` command line of KTX-Software is obtainable: the release asset
`KTX-Software-4.4.2-Linux-x86_64.deb` answered a ranged request from the development machine. It
was not downloaded in full, installed or run. To add a KTX2 texture later:

1. In the CI job, download that asset from the release page of `KhronosGroup/KTX-Software`,
   check its SHA-256 against a value recorded in the repository, and install it with
   `sudo apt-get install ./KTX-Software-4.4.2-Linux-x86_64.deb`.
2. Generate the planking image in `titanic_assets` (deterministically), give the `deck-wood`
   triangles texture coordinates, and export with `export_texcoords=True`.
3. Encode: `ktx create --format R8G8B8A8_SRGB --generate-mipmap --encode basis-lz planks.png
   planks.ktx2`, then check with `ktx validate --gltf-basisu planks.ktx2`. Encode on one thread
   if the encoder proves to depend on thread scheduling.
4. In `optimise.ts`, replace the image by the KTX2 file and declare `KHR_texture_basisu`
   (`KHRTextureBasisu` of `@gltf-transform/extensions`).
5. In the application, give the loader a `KTX2Loader`; the server already declares `image/ktx2`.

The commands of step 3 come from the documentation of KTX-Software; they have not been run here.

## Continuous integration

The `assets` job of `.github/workflows/ci.yml` installs the system libraries that Blender
loads, the Node.js and Python dependencies from their lockfiles, then runs the type check of
`assets/optimise/`, ruff, ty and pytest, rebuilds the model and fails when the committed
`public/models/ship-lod1.glb` differs from the rebuilt one.

Its actions are pinned by commit as in the other jobs. `astral-sh/setup-uv` v10.3.3 is the
commit `68559e99cc807c1eb7e9238fd43a15bba460eec2`, read from the tags of its repository. The
first build of the job downloads `bpy` (428 MB); the cache of uv keeps it afterwards.

## Loading the model

- `GLTFLoader` needs a meshopt decoder: `loader.setMeshoptDecoder(MeshoptDecoder)` with
  `three/addons/libs/meshopt_decoder.module.js`. The decoder is a WebAssembly module, which the
  content security policy of the server must allow (`'wasm-unsafe-eval'` in `script-src`).
- A node with several primitives becomes a `Group` of meshes and a node with one primitive (the
  masts) a `Mesh`; funnels and masts are children of the group of their section, with the
  identity transform, as in `src/render/shipObject.ts`.
- Checked in Node.js with the `GLTFLoader` and the `MeshoptDecoder` of three 0.187: the file
  decodes to 39 meshes and 94,204 triangles under the four roots, with the eleven materials and
  the expected bounding boxes.
- `src/render/detailedShip.ts` loads it in the application at the medium and high levels of
  detail; the end-to-end suite checks on both backends, and under the content security policy
  of the production image, that the detailed model is the one drawn, and that the generated
  model stays in place when the file cannot be loaded.
- Materials are standard glTF materials. A material is shared by every primitive that uses it.

## Review renders

`titanic-assets render` draws eight views with Cycles on the processor (profile from starboard,
top, three-quarter bow and stern, bridge, Boat deck, stern gear, stern as a wreck) in about
eighty seconds. They are for review and are not committed. Cycles has no back-face culling: a
wall seen from inside shows lit, where the application would not draw it.

## Limits

- The deckhouses, the bridge and the stern gear convey massing and placement; none follows a
  plan. See "Points to check against works not yet consulted" in `docs/DATA.md`.
- `stern-wreck` is a massing, as in the level-of-detail 0 model: the real wreck is far more
  damaged.
