# Historical dataset

Everything the application shows about the night of 14–15 April 1912 comes from the JSON files
of `data/`. This document describes their structure, the conventions they follow and the rules
by which the timeline model turns them into a state.

## Reliability rules

- No fact, time or figure is invented. When a value is missing it is either marked `estimated`,
  with the method in its note, or `debated`, with the competing positions listed.
- Every record carries three fields:
  - `source_ids`: one or more identifiers from `data/sources.json`;
  - `certainty`: `established` (primary evidence and broad consensus), `estimated` (derived or
    approximate) or `debated` (competing positions exist);
  - `note`: where the value comes from, with question numbers of the 1912 inquiries where they
    are known, and how it was derived.
- A record may list `alternatives`: positions held by named parties that differ from the value
  the record adopts. The adopted value is the one the scene shows; the alternatives are shown
  beside it in the Sources panel and are never discarded.
- A record marked `established` must cite at least one source that the project opened (`access`
  `read` or `read-in-part`) and that is neither a work of reference (`kind` `reference`:
  Wikipedia, Britannica, Encyclopedia Titanica, a model maker's page) nor a derivation by the
  project (`kind` `project`). `src/data/validation.ts` enforces it from the registry of sources.
- A statement built from several records is no more certain than the weakest of them and cites
  the sources, notes and alternatives of all of them (`combineProvenance` in
  `src/data/provenance.ts`).
- Sources are paraphrased. Short quotations come from the public 1912 inquiry transcripts.
- Each source records how it was accessed (`read`, `read-in-part`, `cited-through`,
  `not-consulted`), so that a reader can tell what was actually opened.

## Files

| File                  | Content                                                                                                   |
| --------------------- | --------------------------------------------------------------------------------------------------------- |
| `sources.json`        | Registry of sources: title, authors, year, publisher, URL, kind and access                                |
| `time-reference.json` | Collision and foundering times, the adopted clock offset, the alternative offsets, open questions         |
| `ship.json`           | Reference frame, principal particulars, sheer, decks, bulkheads, compartments, funnels, masts, zones      |
| `chronology.json`     | Dated events other than boat launches, distress signals and wireless messages                             |
| `attitude.json`       | Initial draughts, pivot of the waterline, trim and list keyframes                                         |
| `flooding.json`       | Damage, water level keyframes for the sixteen compartments, mass of water aboard                          |
| `lifeboats.json`      | Boat types, the twenty boats with station, launch time, uncertainty, person in charge, occupancy, remark  |
| `signals.json`        | Distress signals (facts, firing times, margins) and wireless messages (logged time, log clock, margin)    |
| `lighting.json`       | Electrical plant and the lighting output keyframes                                                        |
| `breakup.json`        | Reference and competing break-up models, the break, funnel falls, poses of the two sections to the seabed |
| `site.json`           | Positions, heading, weather, sea, ice, iceberg, Californian, wreck, surveys                               |
| `people.json`         | Counts of people aboard, saved and lost by source; rescue by the Carpathia                                |

Schemas are written with Zod in `src/data/schema/` and exported as JSON Schema (draft 2020-12)
to `data/schema/`. Regenerate the export with `pnpm data:schema`; `pnpm data:schema:check`
fails when it is stale. `pnpm data:validate` validates every file and the consistency between
files; it runs before every build and in the unit tests.

## Conventions

- **Time.** All times are ship's time (Apparent Time Ship) written as local date-times without
  zone, for example `1912-04-15T00:45`. The simulation clock `t` is the number of seconds since
  the collision at `1912-04-14T23:40`; the foundering is `t = 9600`.
- **Clock conversion.** The adopted offset is Samuel Halpern's: on 14 April the ship's clocks
  were 2 h 02 min ahead of New York time and 2 h 58 min behind GMT, from the longitude of local
  apparent noon. The US Senate report's 1 h 33 min and the 1 h 50 min implied by the British
  report are recorded as alternatives. Whether a clock had been put back before the collision,
  and Captain Rostron's "5.47 GMT" for the foundering, are recorded as open questions and are
  not settled. Conversion code lives in `src/time/shipTime.ts`.
- **Wireless logs.** Titanic's log was lost. Each message stores the time written in another
  station's log, the clock of that log (New York time or GMT) and the ship's time obtained with
  the adopted offset; validation checks that the three agree. The provenance fields of a message
  describe the log entry. The ship's time shown is a conversion: `src/sim/events.ts` combines
  the message with the adopted offset, so that a message is never shown as more certain than
  that offset (`debated`), cites its sources too, and lists, beside the positions recorded on
  the message, the time at which each alternative offset puts the same log entry.
- **Uncertainty.** Dated events, boat launches, distress signals and wireless messages carry
  `uncertainty.before_min` and `uncertainty.after_min`; the interface shows the larger of the
  two and no margin is added in code. Lifeboat times are approximate to about five minutes. The
  margin of a distress signal is half the six-minute interval of Halpern's model, by the
  project's choice; that of the first and of the last signal is the project's estimate. The
  margin of a wireless message, three or five minutes, is the project's estimate of the
  precision of the logged time, from its research notes; it does not cover the choice of clock
  offset, and the two entries of the Virginian carry none. Each note says which applies.
- **Lifeboats.** `in_charge` and `remark` are objects with a `value` and their own provenance.
  `occupancy.basis` says what the figure counts: `attributed` (people attributed to the boat by
  the source, not uniformly a count at launch) or `reached-from-water` (collapsibles A and B).
  The text of a lifeboat event is worded after it and carries the provenance of every record it
  uses: launch, person in charge, occupancy, capacity of the boat type and remark.
- **Geometry.** Metres. `x` is the distance aft of the forward perpendicular, `z` the height
  above the keel, `y` the distance from the centre line, positive to starboard. Original imperial
  figures are kept in the summaries and notes.
- **Angles.** Trim is positive down by the head; list is positive to starboard.

## From data to state

`src/sim/timelineModel.ts` evaluates the state for any `t`. It is a pure function of `t`: it
holds no state between calls, so playing forward, playing backward and jumping give identical
results (`src/sim/timelineModel.test.ts`).

| Quantity             | Rule                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Trim and list        | Monotone cubic interpolation (Fritsch–Carlson) through the keyframes: between two keyframes the value never leaves their interval                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Hull position        | While intact, the hull rotates about the pivot of the waterline, a point of the original waterline 585 ft aft of the forward perpendicular (Halpern), which stays at sea level                                                                                                                                                                                                                                                                                                                                                                               |
| Water levels         | Linear between keyframes and never above the sea outside the hull at the same station; after the last keyframe the level rises linearly to meet the sea at `equalised_from`, then follows it                                                                                                                                                                                                                                                                                                                                                                 |
| Lifeboats            | Stowed, then swung out: the lifeboats over the minute that follows the recorded order (`swing-out-boats`), the two cutters from the start as their record says, collapsibles C and D over the minute before they start down. Lowering from the launch time until `reached_water_ats` (or for the default lowering duration), hanging under the davit head and bearing against the ship's side where the list brings the side under the davits; then afloat. Collapsibles A and B stay on the roof of the officers' quarters until the sea reaches them there |
| Distress signals     | In the air for a few seconds after each firing time                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Lighting             | Linear between the output keyframes; zero from 2:17 a.m.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Break-up and descent | From the break, each section follows its own keyframes, starting from the pose computed at the instant of the break, so that the two sections part without a jump                                                                                                                                                                                                                                                                                                                                                                                            |
| Funnels              | Each funnel is shown until the time of its record in `funnel_falls`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

The model is checked against the observations behind the curves: draughts at the collision,
forecastle still dry at 1:35 a.m., forward well deck awash at 1:50 a.m., sea at A deck by
collapsible D at 2:05 a.m., crow's nest about level with the sea at 2:15 a.m., and the last
Hackett and Bedford flooding condition at the break.

No source gives the attitude of the stern section during its fall. Its keyframes hold it pitched
20° with the after end down from 2:22 a.m., then 10° on the approach, so that it reaches the
seabed rudder first, as Mengot describes; the notes of the keyframes say that the
angles are the project's choice, and a unit test checks that the after end leads.

The light of the SS Californian is drawn from the records `californian-distance` and
`californian-bearing` until the foundering. Its height above the horizon (0.2°) and its
brightness (that of a second-magnitude star) are modelling values of the project, defined in
`src/render/californianLight.ts`.

## Sources of the instant

`src/sim/stateSources.ts` lists, for the state at `t`, the records from which what the scene
shows derives; the Sources panel displays that list.

| Topic            | Listed                                                                                                                                      | Records                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Time             | Always                                                                                                                                      | `adopted_offset`, `collision`                                                                             |
| Trim, list, hull | While the hull is intact                                                                                                                    | Keyframes around `t`, `waterline_pivot`, `initial_draught`                                                |
| Break-up         | From the final plunge; the sections once the hull has parted; the wreck once a section is at rest                                           | `reference_model`, `break`, section keyframes, `stern-angle`, `site.wreck`                                |
| Funnels          | Each funnel from the moment the scene no longer shows it                                                                                    | Its record in `breakup.funnel_falls`                                                                      |
| Flooding         | Compartments that are flooding; the water aboard while the hull is intact                                                                   | `flooding.compartments`, `flooding.water_aboard`                                                          |
| Lifeboats        | For ten minutes after a launch                                                                                                              | `launch`, `station`, `launch-sequence-debate`                                                             |
| Distress signals | Until the next signal is due                                                                                                                | The firing, `rocket-count`                                                                                |
| Lighting         | Always                                                                                                                                      | Keyframes of `lighting.output` around `t`                                                                 |
| Events           | The last four events of the past five minutes, boat launches and distress signals apart                                                     | The event, with the clock offset for a wireless message                                                   |
| Surroundings     | Iceberg for ten minutes; light of the Californian until the foundering; weather and heading always; depth of the seabed from the foundering | `site.iceberg`, `californian-distance`, `californian-bearing`, `weather`, `sea-state`, `heading`, `depth` |
| Sky              | Always: the computed sky and the haze of the horizon                                                                                        | `sky-computation`, `moon`, `adopted_offset`, `wreck-boiler-field`; `haze`                                 |

## Choices the scene has to make

A scene can show only one value where sources disagree. Each such choice is recorded on the
record itself with its alternatives:

| Subject                     | Shown                                             | Also recorded                                                                                                               |
| --------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Lifeboat times              | Fitch, Layton and Wormstedt (2026)                | Halpern (2023), British Inquiry (1912), Georgiou (through Halpern)                                                          |
| List at 2:05 a.m.           | 10° to port                                       | Halpern 15° (2023) and 10° to 15° (2026); Rowe about 6°                                                                     |
| Trim at 2:15 a.m.           | 10° (Halpern)                                     | 9° (Fitch, Layton, Wormstedt); about 17° (Hackett and Bedford model)                                                        |
| Break-up                    | Bottom-up failure at 15–17° of trim (SNAME panel) | Sank intact (1912); top-down at a high angle; low-angle break (Long)                                                        |
| Angle of the stern          | 30° at most                                       | Unknown (SNAME panel); perpendicular (1912 reports)                                                                         |
| Number of distress signals  | Twelve modelled firing times (Halpern)            | About eight (British Inquiry)                                                                                               |
| Distance of the Californian | A faint light about ten nautical miles away       | 5 to 10 (Barnett), 12 to 14 (Halpern), 17 to 20 (de Coverly), 19½ (Lord)                                                    |
| Bearing of the Californian  | North-west by north, 326° true (de Coverly)       | About 315° true (Halpern); 341° true from the position reported by her master                                               |
| Heading while sinking       | About north-north-west true (Halpern)             | Little change after the turn to port (MAIB)                                                                                 |
| People lost                 | Each count beside its source                      | 1,490 (British report), 1,517 (US report), 1,496 (Encyclopedia Titanica), 1,503 (Board of Trade figure cited by Britannica) |

The light of the Californian is listed among the sources of the instant until the ship has
foundered, with the competing distances and bearings, and "The night in words" gives the same
records in text. The footer of every page and the About page do not state one number of people
lost: `src/pages/casualties.ts` writes their sentence from the lowest and the highest count of
`people.json`, and links to the table that gives each count beside its source.

The steep break angle popularised by the 1997 film is not supported by the sources and is not
reproduced: a unit test keeps both sections below 45° while any part is at the surface.

## Points to check against works not yet consulted

The following could not be verified in the sources reached and are marked `estimated`:

- stations of the masts, expansion joints, individual davits and deckhouses; height of the
  funnels; hull offsets;
- occupancy of each boat at launch (figures attributed to Wormstedt and Fitch, 2011, were read
  through Wikipedia; the twenty figures add up to 713);
- forenames of the persons in charge of the boats, and the source of the remarks on boats
  No. 8 and No. 14, which the research notes record without naming it;
- coordinates of the bow section, read only in search-result extracts (Britannica refused
  direct requests), and the depth of each section;
- the count of Encyclopedia Titanica, read through an extract of its table;
- headings of the two sections on the seabed and the exact coordinates of the stern section;
- times of the Hackett and Bedford flooding conditions other than C4 and C5;
- testimony for any reddening or dimming of the lights (none was found; the scene shows no
  change of colour).

Works to consult: Beveridge et al., _Titanic: The Ship Magnificent_; Fitch, Layton and
Wormstedt, _On a Sea of Glass_; Halpern et al., _Report into the Loss of the SS Titanic: A
Centennial Reappraisal_; Ballard, _The Discovery of the Titanic_; Hackett and Bedford (1996);
Stettler and Thomas (2013).

## Research notes

The notes compiled while building the dataset are kept in `docs/research/`. They list, for
every item, whether it was read on a page, seen in a search extract or recalled from memory,
and what could not be verified.
