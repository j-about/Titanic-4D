# Sky, sea and light of the night

How the scene computes what was above and around the ship, what is taken from the sources and
what is a choice of display. The records behind it are in `data/site.json` (`environment`,
`heading`, `positions`) and `data/time-reference.json`.

## What the sources say

| Aspect       | Record (`data/site.json`)     | Rendering                                                    |
| ------------ | ----------------------------- | ------------------------------------------------------------ |
| Weather      | `weather` (established)       | Clear sky, no cloud                                          |
| Sea          | `sea-state` (established)     | Flat calm: significant wave height 0.05 m                    |
| Moon         | `moon` (established)          | No Moon in the sky; computed below the horizon all night     |
| Haze         | `haze` (debated)              | A faint cold band at the horizon into which stars fade       |
| Stars        | `sky-computation` (estimated) | Computed star field and planets, described below             |
| Ship's lamps | `data/lighting.json`          | Lamps and their glow follow the recorded output, out at 2:17 |

## Star field

- **Catalogue.** Yale Bright Star Catalogue, 5th revised edition (source `yale-bsc5`): the
  8,404 stars of visual magnitude 6.5 or brighter that have a position. See
  [ATTRIBUTIONS.md](../ATTRIBUTIONS.md) for the file, its checksum and how to rebuild it.
- **Epoch.** `tools/build-star-catalogue.ts` moves every star from its J2000 position by its
  proper motion to epoch 1912.29, then stores right ascension, declination, magnitude and B−V
  colour index in 8 bytes per star (`src/sky/starCatalogue.ts`, `src/sky/bright-stars.bin`,
  67 kB). The largest displacements, those of nearby stars, reach about ten arc minutes.
- **Orientation.** For an instant `t`, `src/sky/skyModel.ts` converts ship's time to UTC with
  the adopted offset (ship's time is GMT − 2 h 58 min, `certainty: debated`, see
  [DATA.md](DATA.md)), and asks Astronomy Engine (source `astronomy-engine`) for the rotation
  from the J2000 equatorial frame to the horizon of the observer at the foundering position
  (41.7256° N, 49.9469° W). That rotation includes precession, nutation and the rotation of the
  Earth. A last rotation about the vertical turns the horizon frame to the scene frame by the
  ship's heading (337.5° true, `certainty: debated`).
- **What is left out.** Atmospheric refraction, which matters only within a few degrees of the
  horizon where stars fade into the haze; scintillation; the Milky Way and other diffuse light.

The competing positions on ship's time differ by minutes; a change of ten minutes turns the sky
by 2.5°, which does not change which stars are up. The heading only turns the sky about the
vertical relative to the hull.

## Planets, Moon and Sun

Computed by Astronomy Engine for the same observer, with apparent magnitudes.

| Body    | 11:40 p.m.               | 2:20 a.m.                | In the scene                    |
| ------- | ------------------------ | ------------------------ | ------------------------------- |
| Jupiter | 5° up, azimuth 125°      | 23° up, azimuth 158°     | Brightest point, magnitude −2.4 |
| Mars    | 12° up, azimuth 293°     | Set (−11°)               | Sets shortly before 1 a.m.      |
| Saturn  | Below the horizon (−23°) | Below the horizon (−32°) | Not drawn                       |
| Venus   | Below the horizon (−47°) | Below the horizon (−29°) | Not drawn                       |
| Mercury | Below the horizon (−35°) | Below the horizon (−30°) | Not drawn                       |
| Moon    | −50°, 6 % lit            | −29°, 6 % lit            | Not drawn: below the horizon    |
| Sun     | −37°                     | −32°                     | Full astronomical night         |

The Moon is a waning crescent two to three days before new Moon (phase angle 331° to 332°) and
stays below the horizon until after the ship has gone, in agreement with the witnesses.

## Display choices

These are not historical facts; they map physical quantities to what a screen can show.

- **Stars** (`src/sky/starAppearance.ts`). Radius and intensity grow with flux, 2.5 magnitudes
  for a factor of ten, between fixed limits. Colour comes from the B−V index through an
  effective temperature and a black-body colour, desaturated because night vision perceives
  little colour.
- **Sky dome** (`src/render/skyObject.ts`). A gradient from the haze colour at the horizon to
  near black at the zenith. The fog of the scene uses the haze colour.
- **Ambient light** (`src/render/environment.ts`). A dim hemisphere light and a directional
  light from above stand for starlight and airglow, so that the unlit ship remains a readable
  silhouette after 2:17 a.m.
- **Lamp glow** (`src/render/shipObject.ts`). Eight point lights beside the hull stand for the
  light spilled by hundreds of lamps; their intensity follows `data/lighting.json` and
  falls to zero as each station goes under water. No change of colour is rendered as the output
  drops: no primary testimony for it was found.
- **Tone mapping.** AgX, exposure 1.

## Sea

- **Spectrum** (`src/ocean/spectrum.ts`). JONSWAP, peak wavelength 9 m, cosine-squared
  spreading, scaled to the significant wave height. The amplitudes come from a generator seeded
  with a constant, so the sea is a deterministic function of the instant.
- **FFT field** (`src/ocean/oceanField.ts`). Tessendorf's method on a 96 m periodic patch of
  128 × 128 samples, evaluated on the processor when the time changes; the slopes are obtained
  by exact spectral differentiation and uploaded as a texture, laid twice at two scales.
- **Analytic waves** (`src/ocean/analyticWaves.ts`). Twelve sinusoidal waves (the first-order
  form of Gerstner waves) drawn from the same spectrum and evaluated in the shader. Used at
  `quality=low`.
- **Surface** (`src/render/oceanObject.ts`). A plane that mirrors the scene; the reflection is
  displaced by the slopes and weighted by Fresnel reflectance. A faint band of disturbed water
  follows the waterline of each section of the hull (`src/sim/waterline.ts`).
- **Reduced motion.** With `prefers-reduced-motion`, the waves are frozen.

## Tests

| What is checked                                                            | Where                                    |
| -------------------------------------------------------------------------- | ---------------------------------------- |
| The equatorial-to-scene matrix is a rotation at every instant              | `src/sky/skyModel.test.ts`               |
| Altitude and azimuth of bright stars agree with the hour-angle formulas    | same file (1° and 1.5° on the sky)       |
| Polaris due north at the latitude of the ship; sky turns 15° an hour       | same file                                |
| Arcturus high, crossing the meridian to the south; Vega rising; Sirius set | same file                                |
| Moon below the horizon all night, thin waning crescent                     | same file                                |
| Sun below astronomical twilight until the end                              | same file                                |
| Jupiter up, brighter than magnitude −1.5, bearing between east and south   | same file                                |
| Catalogue file: star count, order, unit directions, Sirius moved to 1912   | `src/sky/starCatalogueFile.node.test.ts` |
| Star appearance follows the magnitude scale                                | `src/sky/starAppearance.test.ts`         |
| FFT round trip, wave height, exact slopes, determinism                     | `src/ocean/ocean.test.ts`                |
| Analytic waves: variance, dispersion, slopes, steepness close to the FFT's | `src/ocean/analyticWaves.test.ts`        |
| Waterline footprint of an inclined hull                                    | `src/sim/waterline.test.ts`              |
| Stars visible in a dark sky; lit ship reflected; reflection gone at 2:18   | `tests/e2e/scene.spec.ts`                |
