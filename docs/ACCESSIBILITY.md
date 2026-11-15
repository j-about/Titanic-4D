# Accessibility

Target: WCAG 2.2 level AA on every view. This document records how each requirement is met, how
it is checked, and what has not been checked.

## Views

| View                | Address          | Needs JavaScript | Needs a graphics card |
| ------------------- | ---------------- | ---------------- | --------------------- |
| 3D reconstruction   | `/`              | Yes              | For the image only    |
| The night in words  | `/narrative/`    | No               | No                    |
| About, with support | `/about/`        | No               | No                    |
| Legal Notice        | `/legal-notice/` | No               | No                    |

The reconstruction stays usable when the 3D scene cannot start: the timeline, the "Now",
"Sources" and "Narrative" tabs and the flooding diagram are HTML. "The night in words" is the
complete text alternative and needs no script at all.

## How the requirements are met

| Success criterion                        | How                                                                                                                                                       |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1.1 Non-text content                   | The canvas is described by the text of the "Now" tab (`aria-describedby`); the flooding diagram is an image named by its caption and followed by a table. |
| 1.3.1 Info and relationships             | Landmarks, one `h1` per page, ordered headings, tables with header cells, lists, `address` elements, WAI-ARIA tabs.                                       |
| 1.3.4 Orientation, 1.4.10 Reflow         | Single column below 64 rem; no horizontal scrolling at 320 CSS pixels.                                                                                    |
| 1.4.1 Use of colour                      | Levels of certainty carry a symbol and a word; the current page of the menu is also marked with `aria-current`.                                           |
| 1.4.3 Contrast, 1.4.11 Non-text contrast | Dark theme with text at 7:1 or more on its background; controls, focus ring, water and sea line of the diagram at 3:1 or more.                            |
| 1.4.4 Resize text, 1.4.12 Text spacing   | Sizes in `rem`; no clipped text at 200 % zoom or with the spacing of the criterion.                                                                       |
| 1.4.13 Content on hover or focus         | No content appears on hover or focus alone.                                                                                                               |
| 2.1.1 Keyboard, 2.1.2 No keyboard trap   | Every control is a native element; the camera is driven from the keyboard when the canvas has the focus and Tab always leaves it.                         |
| 2.1.4 Character key shortcuts            | Single-key shortcuts act only while the 3D view has the focus.                                                                                            |
| 2.2.2 Pause, stop, hide                  | Time does not move until "Play" is pressed, and "Pause" stops it; the scene is drawn only when something changes.                                         |
| 2.3.1 Three flashes                      | Distress signals flash at most twice in any second at every playback speed; during fast playback they are steady lights.                                  |
| 2.3.3 Animation from interactions        | With `prefers-reduced-motion`, the guided camera holds still within a shot, the waves are frozen and transitions are removed.                             |
| 2.4.1 Bypass blocks                      | Skip links to the timeline and the description (reconstruction) or to the content (pages).                                                                |
| 2.4.2 Page titled, 2.4.4 Link purpose    | Each page has its own title; links that open a new tab say so in their accessible name.                                                                   |
| 2.4.3 Focus order, 2.4.7, 2.4.11, 2.4.13 | Focus follows the reading order; a 3 px ring of 7:1 contrast is never hidden by other content.                                                            |
| 2.5.3 Label in name                      | Accessible names start with or contain the visible label.                                                                                                 |
| 2.5.7 Dragging, 2.5.8 Target size        | The scrubber and the camera have keyboard and button equivalents; controls are at least 44 CSS pixels high, menu links at least 28.                       |
| 3.1.1 Language                           | `lang="en"` on every document.                                                                                                                            |
| 3.2.3, 3.2.4 Consistent navigation       | The same header, menu and footer are generated for every page from one source.                                                                            |
| 4.1.2 Name, role, value; 4.1.3 Status    | Native controls and WAI-ARIA tabs; one polite live region, at most one announcement every four seconds, key events only during fast playback.             |

## Automated checks

Run by `pnpm test:e2e:container` on both rendering backends, and by CI also against the
production image under its content security policy.

| Check                                                                                                       | Where                                                                             |
| ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| axe-core, WCAG 2.0 to 2.2 A and AA rules and best practices, no violation                                   | `tests/e2e/home.spec.ts`, `tests/e2e/pages.spec.ts`, `tests/e2e/timeline.spec.ts` |
| … on the reconstruction with each tab open, on a 390 px screen, with the table of the flooding diagram open | same files                                                                        |
| … on each static page at 1280 px and at 320 px, without horizontal scrolling                                | `tests/e2e/pages.spec.ts`                                                         |
| Static pages complete without JavaScript and without any script                                             | `tests/e2e/pages.spec.ts`                                                         |
| Skip link, tabs with arrow keys, timeline and camera from the keyboard                                      | `tests/e2e/pages.spec.ts`, `tests/e2e/timeline.spec.ts`                           |
| Reduced motion passed on to the scene; nothing plays by itself                                              | `tests/e2e/scene.spec.ts`                                                         |
| Flashes of the distress signals at every playback speed                                                     | `src/sim/rocketDisplay.test.ts`                                                   |
| Announcements: rate limit and key events during fast playback                                               | `src/ui/announcer.test.ts`                                                        |

## Scripted audit of 15 November 2026

Run with Chromium in the Playwright image against the built site.

| What was examined                                                 | Result                                                                                      |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Tab order of the reconstruction at 1280 px (41 stops)             | Skip links, title, menu, 3D view, view controls, timeline, key moments, tabs, panel, footer |
| Tab order of the About page (16 stops)                            | Skip link, title, menu, links of the text, the four payment links, contact, footer          |
| Focus indicator on every stop                                     | Solid 3 px outline on all of them                                                           |
| Targets smaller than 24 × 24 CSS pixels                           | None, apart from links inside sentences, which the criterion exempts                        |
| Horizontal scrolling at 320 px (reconstruction, About, narrative) | None                                                                                        |
| 200 % zoom of a 1280 × 800 window (640 × 400 viewport)            | No horizontal scrolling; the page scrolls vertically                                        |
| Text spacing of criterion 1.4.12 on the About page                | No clipped or overlapping text                                                              |

## Not yet checked

These need a person and are to be done before the site is announced:

- Reading with screen readers (NVDA with Firefox, VoiceOver with Safari on macOS and iOS,
  TalkBack with Chrome): names, order and announcements were checked through the accessibility
  tree and axe-core only.
- Use with voice control and with a switch.
- Windows high-contrast themes (`forced-colors`).
- Frame rate of the scene on real graphics hardware; see `docs/STATUS.md`.
