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

| Success criterion                        | How                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1.1 Non-text content                   | The canvas is described by a sentence on the state of the ship and by the operating instructions (`aria-describedby`); the flooding diagram is an image named by its caption and followed by a table.                                                                                                                                                                                                                                                      |
| 1.3.1 Info and relationships             | Landmarks, one `h1` per page, ordered headings, tables with header cells, lists, `address` elements, WAI-ARIA tabs.                                                                                                                                                                                                                                                                                                                                        |
| 1.3.4 Orientation, 1.4.10 Reflow         | Single column below 64 rem, where the view controls follow the canvas instead of lying over it; no horizontal scrolling at 320 CSS pixels.                                                                                                                                                                                                                                                                                                                 |
| 1.4.1 Use of colour                      | Levels of certainty carry a symbol and a word; the current page of the menu is also marked with `aria-current`.                                                                                                                                                                                                                                                                                                                                            |
| 1.4.3 Contrast, 1.4.11 Non-text contrast | Dark theme with text at 7:1 or more on its background; controls, focus ring, water and sea line of the diagram at 3:1 or more.                                                                                                                                                                                                                                                                                                                             |
| 1.4.4 Resize text, 1.4.12 Text spacing   | Sizes in `rem`. No rule cuts text off with an ellipsis: the titles of the key moments wrap inside their buttons. The operating instructions of the 3D view are a disclosure present at every width, open when the page loads in a window of 64 rem or more and closed below. Below a timeline width of 46 rem the playback buttons other than "Play" show their icon only and keep their name for assistive technology.                                    |
| 1.4.13 Content on hover or focus         | No content appears on hover or focus alone: no element carries a `title` tooltip, and the meaning of the levels of certainty is text in a disclosure of the "Sources" tab.                                                                                                                                                                                                                                                                                 |
| 2.1.1 Keyboard, 2.1.2 No keyboard trap   | Every control is a native element; the camera is driven from the keyboard when the canvas has the focus and Tab always leaves it.                                                                                                                                                                                                                                                                                                                          |
| 2.1.4 Character key shortcuts            | Single-key shortcuts act only while the 3D view has the focus.                                                                                                                                                                                                                                                                                                                                                                                             |
| 2.2.2 Pause, stop, hide                  | Time does not move until "Play" is pressed, and "Pause" stops it; the scene is drawn only when something changes.                                                                                                                                                                                                                                                                                                                                          |
| 2.3.1 Three flashes                      | Distress signals flash at most twice in any second at every playback speed; during fast playback they are steady lights. The light of the SS Californian is steady.                                                                                                                                                                                                                                                                                        |
| 2.3.3 Animation from interactions        | With `prefers-reduced-motion`, the guided camera holds still within a shot, the waves are frozen and transitions are removed.                                                                                                                                                                                                                                                                                                                              |
| 2.4.1 Bypass blocks                      | Skip links to the timeline and the description (reconstruction) or to the content (pages).                                                                                                                                                                                                                                                                                                                                                                 |
| 2.4.2 Page titled, 2.4.4 Link purpose    | Each page has its own title; links that open a new tab say so in their accessible name.                                                                                                                                                                                                                                                                                                                                                                    |
| 2.4.3 Focus order, 2.4.7, 2.4.11, 2.4.13 | Focus follows the reading order; a 3 px ring of 7:1 contrast is never hidden by other content. When the scene is started again its canvas is replaced, and the new canvas takes the focus if the old one had it; when the scene fails, the canvas and the view controls are hidden, and the focus that was on them moves to the main content.                                                                                                              |
| 2.5.1 Pointer gestures                   | Pinching to zoom has single-pointer equivalents: the mouse wheel and the "Zoom in" and "Zoom out" buttons.                                                                                                                                                                                                                                                                                                                                                 |
| 2.5.3 Label in name                      | Accessible names start with or contain the visible label; the step buttons of the camera show an icon and take their name from their own text.                                                                                                                                                                                                                                                                                                             |
| 2.5.7 Dragging                           | The scrubber is a native range input, also moved by a click on its track, by the keyboard and by the "Back 1 min" and "Forward 1 min" buttons. Dragging on the 3D view has single-click equivalents, one step per click, shown for the cameras that can be steered: "Turn left", "Turn right", "Tilt up" and "Tilt down" (15°), "Zoom in" and "Zoom out" around the ship and below the surface, "Move forward" and "Move back" (30 m) for the free camera. |
| 2.5.8 Target size                        | Buttons (the step buttons of the camera are 44 by 44), selects, tabs, the scrubber, the key-moment bookmarks and the payment links are at least 44 CSS pixels high; menu links at least 28; the time buttons of the event lists and the disclosure summaries at least 24.                                                                                                                                                                                  |
| 3.1.1 Language                           | `lang="en"` on every document.                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 3.2.3, 3.2.4 Consistent navigation       | The same header, menu and footer are generated for every page from one source.                                                                                                                                                                                                                                                                                                                                                                             |
| 4.1.2 Name, role, value                  | Native controls and WAI-ARIA tabs. The canvas becomes a tab stop with the `application` role only once the script runs: without JavaScript the document offers no 3D view to operate and announces no loading.                                                                                                                                                                                                                                             |
| 4.1.3 Status messages                    | Two polite regions: a status for the loading or failed state of the scene, and a live region for events. During playback the live region carries at most one announcement every four seconds, key events only during fast playback; after the user moves in time, the new instant is announced once, 0.7 s after the last move, whatever the time since the previous announcement.                                                                         |

## Automated checks

Run by `pnpm test:e2e:container` on both rendering backends, and by CI also against the
production image under its content security policy.

| Check                                                                                                              | Where                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| axe-core, WCAG 2.0 to 2.2 A and AA rules and best practices, no violation                                          | `tests/e2e/home.spec.ts`, `tests/e2e/pages.spec.ts`, `tests/e2e/timeline.spec.ts`                     |
| … on the reconstruction with each tab open, on a 390 px screen, with the table of the flooding diagram open        | same files                                                                                            |
| … with the legend of the levels of certainty open, with the step buttons of the camera, at 320 px and at 640 × 400 | `tests/e2e/timeline.spec.ts`                                                                          |
| … on each static page at 1280 px and at 320 px, without horizontal scrolling                                       | `tests/e2e/pages.spec.ts`                                                                             |
| Static pages complete without JavaScript and without any script                                                    | `tests/e2e/pages.spec.ts`                                                                             |
| Reconstruction without JavaScript: no loading status, no canvas to operate, notice pointing to the night in words  | `tests/e2e/home.spec.ts`                                                                              |
| Skip link, tabs with arrow keys, timeline and camera from the keyboard                                             | `tests/e2e/pages.spec.ts`, `tests/e2e/timeline.spec.ts`                                               |
| Camera step buttons: one step per click, the buttons of each view, 44 px targets, within a 320 px screen           | `tests/e2e/timeline.spec.ts`, `src/ui/cameraPanel.dom.test.ts`, `src/render/camera/cameraRig.test.ts` |
| Operating instructions shown at 1280 px and available in their disclosure at 640 × 400                             | `tests/e2e/timeline.spec.ts`, `src/ui/cameraPanel.dom.test.ts`                                        |
| Titles of the key moments not cut off, by default and with the spacing of criterion 1.4.12                         | `tests/e2e/timeline.spec.ts`                                                                          |
| Levels of certainty explained in text, no `title` tooltip                                                          | `src/ui/certaintyBadge.dom.test.ts`, `src/ui/sourcesPanel.dom.test.ts`, `tests/e2e/timeline.spec.ts`  |
| Focus kept on the 3D view when its canvas is replaced, moved to the main content when it is hidden                 | `src/ui/sceneCanvas.dom.test.ts`, `tests/e2e/scene.spec.ts`                                           |
| Reduced motion passed on to the scene; nothing plays by itself                                                     | `tests/e2e/scene.spec.ts`                                                                             |
| Flashes of the distress signals at every playback speed                                                            | `src/sim/rocketDisplay.test.ts`                                                                       |
| Announcements: rate limit and key events during fast playback                                                      | `src/ui/announcer.test.ts`                                                                            |

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

The scripted audit above predates the step buttons of the camera, the disclosure of the operating
instructions, the legend of the levels of certainty, the wrapping titles of the key moments and
the view controls placed below the canvas under 64 rem. Its count of tab stops, its measure of
the targets and its text-spacing result do not cover them; they are to be measured again.

These need a person and are to be done before the site is announced:

- Reading with screen readers (NVDA with Firefox, VoiceOver with Safari on macOS and iOS,
  TalkBack with Chrome): names, order and announcements were checked through the accessibility
  tree and axe-core only.
- Use with voice control and with a switch.
- Windows high-contrast themes (`forced-colors`).
- Frame rate of the scene on real graphics hardware; see `docs/STATUS.md`.
