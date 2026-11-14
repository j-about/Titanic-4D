# Attributions

Third-party data and software distributed with, or built into, Titanic 4D. Historical sources
are listed separately in `data/sources.json` and documented in [docs/DATA.md](docs/DATA.md).

## Data

### Yale Bright Star Catalogue, 5th revised edition

- **Authors.** Dorrit Hoffleit and Wayne H. Warren Jr., Yale University Observatory, 1991
  (preliminary version); VizieR catalogue V/50.
- **Used for.** The star field: `src/sky/bright-stars.bin` holds the position at epoch 1912.29,
  the visual magnitude and the B−V colour index of the 8,404 catalogue stars of magnitude 6.5
  or brighter.
- **Obtained from.** `http://tdc-www.harvard.edu/catalogs/bsc5.dat.gz` (Harvard–Smithsonian
  Center for Astrophysics, Telescope Data Center), the fixed-width ASCII file of the catalogue.
  SHA-256 of the compressed file:
  `0471ced07fc241e625613baa689b2fa5f4b59fd733f731003e57d2d436036cdb`; of `bsc5.dat`:
  `69797549cc1605aad7ff94e9325e29a1661f2a253917faaa056d9bf20b809afd`.
- **Rebuilding.** `node tools/build-star-catalogue.ts --input <path to bsc5.dat>`.
- **Terms.** The catalogue is distributed by the astronomical data centres without a licence
  file; it is reproduced here in derived form with acknowledgement of its authors.

## Software built into the application

| Package          | Version | Licence | Used for                                   |
| ---------------- | ------- | ------- | ------------------------------------------ |
| three            | 0.187.0 | MIT     | WebGPU and WebGL 2 rendering               |
| astronomy-engine | 2.1.19  | MIT     | Orientation of the sky, planets, Moon, Sun |

Development tools are listed in `package.json`; they are not distributed with the application.
