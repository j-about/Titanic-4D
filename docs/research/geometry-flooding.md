# RMS Titanic — ship geometry and flooding sequence: research notes

Compiled 2026-11-14. Research notes only (no code). About 49 web requests were made.

Conventions used throughout

- Times are Titanic ship's time (Apparent Time Ship, ATS): collision 11:40 pm 14 April, foundering 2:20 am 15 April 1912.
- "ft aft of FP" = distance aft of the forward perpendicular. 1 ft = 0.3048 m. "tons" = British long tons (2,240 lb; Wilding Q19798); 1 long ton = 1.01605 t.
- Certainty: `established` / `estimated` (method stated) / `debated` (positions stated).
- `FROM-MEMORY` = not read on a page during this session; lower its certainty.
- `VIA <id>` = I read the figure in the fetched source `<id>`, which attributes it to another work I did not open.
- `SNIPPET` = seen only in a web-search result summary, page not opened.
- `UNVERIFIED` = could not find; what I tried is stated.

---

## 0. Sources consulted

### Fetched and read in this session

| id | Source | URL | How |
|---|---|---|---|
| `brit-inquiry-report-description` | British Wreck Commissioner's Inquiry, Report on the Loss of the "Titanic" (Lord Mersey, 30 July 1912), "Description of the Ship" | https://www.titanicinquiry.org/BOTInq/BOTReport/botRepTitanic.php | curl, full text |
| `brit-inquiry-report-watertight` | same Report, "Watertight Compartments" | https://www.titanicinquiry.org/BOTInq/BOTReport/botRepWC.php | curl, full text |
| `brit-inquiry-report-decks` | same Report, "Decks and Accommodation" | https://www.titanicinquiry.org/BOTInq/BOTReport/botRepAccomo.php | curl, full text |
| `brit-inquiry-report-structure` | same Report, "Structure" (incl. masts and rigging) | https://www.titanicinquiry.org/BOTInq/BOTReport/botRepStructure.php | curl, full text |
| `brit-inquiry-report-lsa` | same Report, "Life-saving Appliances" | https://www.titanicinquiry.org/BOTInq/BOTReport/botRepLSApp.php | curl, full text |
| `brit-inquiry-report-machinery` | same Report, "Machinery" and "General" | .../botRepMach.php and .../botRepGeneral.php | curl, full text |
| `brit-inquiry-report-speed` | same Report, "Speed of the Ship" | .../botRepSpeed.php | curl, full text |
| `brit-inquiry-report-collision` | same Report, "The Collision" | .../botRepCollision.php | curl, full text |
| `brit-inquiry-report-damage` | same Report, "Extent of the Damage" and "Time in which the damage was done" | .../botRepExtent.php and .../botRepTime.php | curl, full text |
| `brit-inquiry-report-flooding10` | same Report, "Flooding in the First Ten Minutes" | .../botRepFlooding.php | curl, full text |
| `brit-inquiry-report-gradual` | same Report, "Gradual Effect of the Damage" | .../botRepGradEff.php | curl, full text |
| `brit-inquiry-report-final` | same Report, "Final Effect of the Damage" | .../botRepFinEff.php | curl, full text |
| `brit-inquiry-report-observations` | same Report, "Observations" and "Effect of Additional Subdivision" | .../botRepObserv.php and .../botRepSubdiv.php | curl, full text |
| `brit-inquiry-wilding-d18` | British Inquiry, Day 18, testimony of Edward Wilding (H&W naval architect), Q19789–19949 | https://www.titanicinquiry.org/BOTInq/BOTInq18Wilding01.php | curl, page 01 only |
| `brit-inquiry-wilding-d19` | British Inquiry, Day 19, testimony of Edward Wilding, Q20188–20536 | https://www.titanicinquiry.org/BOTInq/BOTInq19Wilding01.php … 04.php | curl, pages 01–04 |
| `halpern-12-square-feet` | Samuel Halpern, "Somewhere About 12 Square Feet" (n.d.) | https://www.titanicology.com/Titanica/SomewhereAbout12SquareFeet.pdf | curl, full PDF text |
| `halpern-list-trim-2023-1` | S. Halpern, "Lifeboats, Launch Times, List and Trim – Part I" (2023) | https://www.titanicology.com/Titanica/LifeboatLaunchTimesList&TrimPart1.pdf | curl, partly read |
| `halpern-list-trim-2023-2` | S. Halpern, "Lifeboats, Launch Times, List and Trim – Part II" (2023) | https://www.titanicology.com/Titanica/LifeboatLaunchTimesList&TrimPart2.pdf | curl, main text read in full |
| `halpern-trim-heel-2017` | S. Halpern (Appendix A with Capt. Charles Weeks), "Angles of Trim and Heel" (rev. Aug 2017) | https://www.titanicology.com/Titanica/TrimAndHeel.pdf | curl, full PDF text |
| `halpern-list-205-2026` | S. Halpern, "Titanic's List at 2:05 AM" (2026) | https://www.titanicology.com/Titanica/ListAt2-05am05.pdf | curl, partly read |
| `halpern-afpp` | S. Halpern, "Finding the Apparent Floatation Pivot Point (AFPP)" (2011) | https://www.titanicology.com/Titanica/Finding_the_AFPP.pdf | curl, full PDF text |
| `halpern-initial-list` | S. Halpern, "Titanic's Initial List to Starboard" | https://www.titanicology.com/Titanica/InitialListToStarboard.pdf | curl, full PDF text |
| `halpern-stability-trim` | S. Halpern, "A Matter of Stability and Trim" | https://www.titanicology.com/Titanica/Stability&Trim.pdf | curl, mostly read |
| `halpern-low-angle-break` | S. Halpern, "Why A Low Angle Break?" | https://www.titanicology.com/Titanica/LowAngleBreak.pdf | curl, partly read |
| `halpern-flooding-by-compartment` | S. Halpern, "Practically Unsinkable / Flooding by Compartment" (web page quoting Wilding's plan) | https://www.titanicology.com/FloodingByCompartment.html | curl, text only (figures not readable) |
| `wikipedia-titanic` | Wikipedia, "Titanic" | https://en.wikipedia.org/wiki/Titanic | WebFetch summary of the first 100,000 characters only; pointer-grade |
| `deseret-1997-sonar` | Deseret News, "Did small holes in hull doom Titanic?", 8 April 1997 | https://www.deseret.com/1997/4/8/19305597/did-small-holes-in-hull-doom-titanic/ | WebFetch summary |
| `model-monkey-funnels` | Model Monkey product page "1/350 Titanic funnels" (commercial; cites the H&W "Titanic Rigging Plan") | https://www.model-monkey.com/product-page/1-350-titanic-funnels | WebFetch summary; weak source |

### Not fetched (cited through another source, or blocked)

| id | Source | Status |
|---|---|---|
| `hackett-bedford-1996` | C. Hackett & J. G. Bedford, "The Sinking of S.S. Titanic – Investigated by Modern Techniques", RINA/IESIS joint meeting 10 Dec 1996, RINA Transactions (one Halpern page says 1997 volume) | NOT fetched. All figures are VIA Halpern. |
| `stettler-thomas-2013` | J. W. Stettler & B. S. Thomas, "Flooding and structural forensic analysis of the sinking of the RMS Titanic", Ships and Offshore Structures (2013) | NOT fetched. encyclopedia-titanica.org copy returned HTTP 403 to WebFetch; search snippets had no figures. |
| `halpern-centennial-reappraisal` | S. Halpern et al., "Report into the Loss of the SS Titanic: A Centennial Reappraisal" (History Press, 2011) | NOT fetched (book). His online articles above cover the same analyses. |
| `fitch-layton-wormstedt-2026` | T. Fitch, J. K. Layton, B. Wormstedt, "Titanic: The Lifeboat Launching Sequence – A New Study" (April 2026), wormstedt.com | NOT fetched. Their positions are VIA `halpern-list-205-2026`, i.e. as described by their critic. |
| `wilding-limitation-1915` | E. Wilding, deposition, Limitation of Liability Hearings, 13–14 May 1915 | NOT fetched. Quoted VIA `halpern-12-square-feet`. On titanicinquiry.org under /lol/depositions/. |
| `us-inquiry` | US Senate Inquiry 1912 (Hichens, Ward, Evans, Bright, Rowe, Lightoller, Bride, Woolner) | NOT fetched. Page references are VIA Halpern. |
| `hw-particulars` | Harland & Wolff, "Particulars of Completed Ships" (archive record book) | NOT fetched. VIA `halpern-stability-trim`. |
| `websearch-snippets` | Search-result summaries (titanicconnections.com, titanicpages.com, etc.) | Pages not opened. Marked SNIPPET. |

---

## A. Geometry

### A1. Principal dimensions

| Item | Original unit | Metres | Source | Certainty |
|---|---|---|---|---|
| Length overall | 882 ft 9 in | 269.06 m | `wikipedia-titanic` | established (figure also FROM-MEMORY; not in the British report text) |
| Length between perpendiculars | 850 ft | 259.08 m | `halpern-stability-trim` (H&W calculations use 850 ft); the 16 compartment lengths in `brit-inquiry-report-watertight` sum to exactly 850 ft | established |
| Registered length | 852.5 ft | 259.84 m | `brit-inquiry-report-description` | established |
| Breadth (registered) | 92.5 ft (92 ft 6 in) | 28.19 m | `brit-inquiry-report-description` | established |
| Depth, top of keel to top of beam at lowest point of sheer of C deck | 64 ft 9 in | 19.74 m | `brit-inquiry-report-description` | established; `wikipedia-titanic` infobox gives 64 ft 6 in (19.7 m) — 3 in discrepancy, unresolved |
| Depth of hold (registered) | 59.58 ft | 18.16 m | `brit-inquiry-report-description` | established |
| Boat deck above keel, lowest point of sheer | about 92 ft 6 in | 28.19 m | `brit-inquiry-report-decks`; Wilding, Day 18, Q19839 (`brit-inquiry-wilding-d18`) | established |
| Boat deck above waterline amidships at time of accident | about 60.5 ft | 18.44 m | `brit-inquiry-report-description` | established |
| Keel to top of bridge | 104 ft | 32 m | `wikipedia-titanic` | estimated (single tertiary source) |
| Keel to top of funnels | 175 ft | 53.3 m | `wikipedia-titanic` infobox | debated — see A4 |
| Load draught | 34 ft 7 in | 10.54 m | Wilding Q19796 | established |
| Displacement at load draught | 52,310 long tons | 53,150 t | Wilding Q19797–19798 ("a ton of 2,240 lbs") | established (Wikipedia's "52,310 tonnes" is loose) |
| Gross tonnage | 46,328 | — | `brit-inquiry-report-description` | established (`wikipedia-titanic` has 46,329) |
| Net register tonnage | 21,831 | — | `brit-inquiry-report-description` | established |
| Draught at collision: forward / aft / mean | 30 ft 9 in / 33 ft 9 in / 32 ft 3 in | 9.37 / 10.29 / 9.83 m | `halpern-stability-trim`, `halpern-afpp` (VIA `hackett-bedford-1996` and Wilding) | estimated (Wilding's 1912 working estimate) |
| Trim at collision | 0.20° by the stern | — | `halpern-afpp` | estimated (arctan(3 ft / 850 ft)) |
| Displacement at collision | about 48,300 long tons | about 49,075 t | `halpern-stability-trim` (load displacement minus 28 in × 143.8 tons per inch) | estimated |
| Tons per inch immersion | 143.8 long tons/in | — | `halpern-stability-trim` VIA `hw-particulars` | established |
| Registered horsepower | 50,000; at least 55,000 probably developed | — | `brit-inquiry-report-description` | established (`wikipedia-titanic`: 30,000 + 16,000 = 46,000 hp) |
| Service speed | 21 kn | — | `wikipedia-titanic` | established |
| Speed at collision | 22 kn (Boxhall's estimate, Q15645; 75 rpm; log 45 nm per 2 h) | 11.3 m/s | `brit-inquiry-report-speed` | established as about 22 kn |
| same, other statements | "over 20 knots" (Report); 22 and 22½ kn put to Wilding (Q20266, Q20282); about 37 ft/s (Halpern) | — | `brit-inquiry-report-damage`, `brit-inquiry-wilding-d19`, `halpern-trim-heel-2017` | estimated range 22–22.5 kn |
| Maximum speed | UNVERIFIED | — | Wikipedia summary says trials reached "just under 21 knots"; no 23–24 kn figure found | — |

### A2. Decks

Deck names (builder's name in brackets, from Wilding Q19802–19808 and `wikipedia-titanic`): Boat; A (Promenade); B (Bridge); C (Shelter); D (Saloon); E (Upper); F (Middle); G (Lower); Orlop; Lower Orlop (forepeak and No. 1 hold only); Tank Top (inner bottom).

Heights amidships. Source: table in `brit-inquiry-report-description`, confirmed by Wilding Q19802–19808. Certainty: established for the inter-deck heights and waterline offsets; the "above keel" column is my addition (34 ft 7 in + offset) = estimated.

| Deck | Height to next deck above | Relative to 34 ft 7 in waterline, amidships | Above keel (derived) | Metres above keel |
|---|---|---|---|---|
| Boat | — | 58 ft 0 in above | 92 ft 7 in (report text: about 92 ft 6 in) | 28.2 m |
| A | 9 ft 6 in | 48 ft 6 in above | 83 ft 1 in | 25.32 m |
| B | 9 ft 0 in | 39 ft 6 in above | 74 ft 1 in | 22.58 m |
| C | 9 ft 0 in | 30 ft 6 in above | 65 ft 1 in | 19.84 m |
| D | 10 ft 6 in (9 ft at fore end, 9 ft 6 in at after end) | 20 ft 0 in above | 54 ft 7 in | 16.64 m |
| E | 9 ft 0 in | 11 ft 0 in above | 45 ft 7 in | 13.89 m |
| F | 8 ft 6 in | 2 ft 6 in above | 37 ft 1 in | 11.30 m |
| G | 8 ft 0 in | 5 ft 6 in below | 29 ft 1 in | 8.86 m |
| Orlop | 8 ft 0 in | 13 ft 6 in below | 21 ft 1 in | 6.43 m |
| Tank top | — | — | about 5 ft above top of keel; double bottom 63 in deep at centre line, 78 in under the reciprocating engines | 1.5–1.6 m |

Notes on this table

- In the online transcription the "below waterline" cells are shifted up two rows (5 ft 6 in and 13 ft 6 in appear against E and F). The arithmetic (F at +2 ft 6 in, decks 8 ft apart) shows they belong to G and Orlop. I have corrected the alignment; treat as my reading.
- `halpern-stability-trim` gives F deck amidships as 36 ft 9 in above keel, 4 in less than my derived figure. The difference is the keel reference (top versus underside); not resolved.
- Stokehold plates were a little over 2 ft above the tank top (`halpern-12-square-feet`). estimated.

Sheer (height above the 34 ft 7 in waterline). Source: `brit-inquiry-report-description`. established.

| Deck | Lowest part amidships | At bow | At stern |
|---|---|---|---|
| D | 20 ft 0 in (6.10 m) | 33 ft 0 in (10.06 m) | 25 ft 0 in (7.62 m) |
| E | 11 ft 0 in (3.35 m) | 24 ft 0 in (7.32 m) | 16 ft 0 in (4.88 m) |
| F | 2 ft 6 in (0.76 m) | transcription reads "25 ft 6 in" | 7 ft 6 in (2.29 m) |

- So D, E and F rise about 13 ft (3.96 m) at the bow and 5 ft (1.52 m) at the stern above their lowest point.
- F at the bow is almost certainly 15 ft 6 in (4.72 m), a transcription error; flag as my inference.
- C deck sheer is a little less, because D-to-C height tapers from 10 ft 6 in to 9 ft forward and 9 ft 6 in aft (`brit-inquiry-report-decks`). Derived: about +11 ft 6 in at the bow, +4 ft at the stern. estimated.
- G deck forward was about 7 ft 6 in above the waterline at the bow and level with the waterline at bulkhead D (`brit-inquiry-report-description`). established.
- The mail-room floor (Orlop, No. 3 hold) was 24 ft (7.32 m) above the keel (`brit-inquiry-report-flooding10`). established.

Fore-and-aft extents. Sources: `brit-inquiry-report-description`, `brit-inquiry-report-decks`. The lengths are established as "about" figures; the "from bow" ranges are derived by adding them up = estimated.

| Element | Length | Position from bow (derived) |
|---|---|---|
| Forecastle deck (level of B deck) | 125 ft (38.1 m) | 0 – 125 ft |
| Forward well deck (C deck exposed; No. 2 hatch and bunker hatch) | about 50 ft (15.2 m) | 125 – 175 ft |
| B deck, continuous superstructure | 550 ft (167.6 m) | 175 – 725 ft |
| After well deck (No. 5 and No. 6 hatches) | about 50 ft (15.2 m) | 725 – 775 ft |
| Poop deck (level of B deck) | about 105 ft (32.0 m); Wikipedia 106 ft | 775 – 880 ft |
| Boat deck | about 500 ft (152.4 m); fore end 190 ft from the bow | about 190 – 690 ft |
| A deck | about 500 ft (152.4 m) | about 190 – 690 ft (assumed to match the Boat deck) |
| A-deck deckhouse | "nearly the whole length of the deck"; width 24 ft to 72 ft (7.3–21.9 m) | — |
| A-deck enclosed promenade screen | 192 ft (58.5 m), forward end, both sides | starts near the fore end of A deck |
| C-deck full-breadth house abaft the forward well | 450 ft (137.2 m) | about 175 – 625 ft |
| G deck and Orlop deck | 190 ft forward of the boilers, 210 ft aft of the machinery | — |
| C, D, E, F decks | whole length of ship | — |

- Check: 125 + 50 + 550 + 50 + 105 = 880 ft against 882 ft 9 in overall. Consistent, since each figure is "about".
- Conflict: `wikipedia-titanic` gives the A-deck superstructure as 546 ft (166 m) against the Report's "about 500 ft". Unresolved; the Report is the primary source.
- D deck room lengths (`brit-inquiry-report-decks`): first-class reception room and staircase 83 ft; dining saloon 112 ft (between funnels 2 and 3); first-class pantry 56 ft; galley 45 ft; hospital and second-class pantry block about 54 ft; second-class saloon 70 ft; second-class cabins 88 ft.

### A3. Watertight subdivision

Source: `brit-inquiry-report-watertight` and `brit-inquiry-report-description`. Lengths and bulkhead heights = established. Cumulative positions are my running sum = estimated; bulkheads were stepped in places, so each position is nominal.

15 transverse bulkheads lettered A to P (no I), 16 compartments.

| # | Compartment | Bounded by | Length | Aft bulkhead position, ft aft of FP | Metres | Aft bulkhead watertight up to |
|---|---|---|---|---|---|---|
| 1 | Forepeak (peak tank below, storerooms above) | bow – A | 46 ft (14.02 m) | A = 46 | 14.02 | A: built to C deck, watertight only to D deck |
| 2 | No. 1 hold | A – B | 45 ft (13.72 m) | B = 91 | 27.74 | B: D deck |
| 3 | No. 2 hold | B – C | 51 ft (15.54 m) | C = 142 | 43.28 | C: E deck |
| 4 | No. 3 hold (coal or cargo; mail and baggage on Orlop; squash court on G) | C – D | 51 ft (15.54 m) | D = 193 | 58.83 | D: E deck |
| 5 | Boiler room No. 6 | D – E | 54 ft (16.46 m) | E = 247 | 75.29 | E: E deck |
| 6 | Boiler room No. 5 | E – F | 57 ft (17.37 m) | F = 304 | 92.66 | F: E deck |
| 7 | Boiler room No. 4 | F – G | 57 ft (17.37 m) | G = 361 | 110.03 | G: E deck |
| 8 | Boiler room No. 3 | G – H | 57 ft (17.37 m) | H = 418 | 127.41 | H: E deck |
| 9 | Boiler room No. 2 | H – J | 60 ft (18.29 m) | J = 478 | 145.69 | J: E deck |
| 10 | Boiler room No. 1 | J – K | 36 ft (10.97 m) | K = 514 | 156.67 | K: D deck |
| 11 | Reciprocating engine room | K – L | 69 ft (21.03 m) | L = 583 | 177.70 | L: D deck |
| 12 | Turbine engine room | L – M | 57 ft (17.37 m) | M = 640 | 195.07 | M: D deck |
| 13 | Electric engine (dynamo) room | M – N | 63 ft (19.20 m) | N = 703 | 214.27 | N: D deck |
| 14 | Shaft tunnel (forward section) | N – O | 54 ft (16.46 m) | O = 757 | 230.73 | O: D deck |
| 15 | Shaft tunnel (after section) | O – P | 57 ft (17.37 m) | P = 814 | 248.11 | P: D deck |
| 16 | After peak (trimming tank, stores above) | P – stern | 36 ft (10.97 m) | AP = 850 | 259.08 | — |

- Cross-check: the Report says bulkhead K is "90 ft. abaft amidships"; my sum gives 514 − 425 = 89 ft. Good agreement.
- The Report does not say whether "Bow to A 46 ft" starts at the perpendicular or the stem. The exact 850 ft total implies the perpendiculars.
- Perpendiculars (`halpern-stability-trim`, footnote on the H&W sheer plan): the FP meets the stem at the level of E deck, about 58 ft above the keel; the AP is the forward side of the rudder post; the stem rakes 1 ft per 12 ft; the load waterline meets the stem about 2 ft aft of the FP. established (VIA H&W plans).
- Derived overhangs: stem head about 2–3 ft forward of the FP at forecastle level; stern about 30 ft abaft the AP (882.75 − 850 − 2.5). estimated.
- Frame numbers of bulkheads: UNVERIFIED. Not in the Report sections or Halpern articles read.
- Frame spacing: 300 frames, 24–36 in (61–91 cm) apart (`wikipedia-titanic`). The split "36 in amidships, 24 in forward, 27 in aft" is FROM-MEMORY.
- Boiler contents: BR 6 four double-ended boilers; BR 5, 4, 3, 2 five double-ended each; BR 1 five single-ended. Boilers 15 ft 9 in (4.80 m) diameter; double-ended 20 ft (6.10 m) long, single-ended 11 ft 9 in (3.58 m) (`brit-inquiry-report-machinery`). established.
- Watertight doors: 12 vertical sliding doors at tank-top level in bulkheads D to O, closed electrically from the bridge in 25–30 s, also by hand lever and by float. A, B and P had no openings (`brit-inquiry-report-description`, `-structure`). established.
- Inner bottom: from bulkhead A to 20 ft before P; extends up the side to 7 ft above keel for about half the length (`brit-inquiry-report-structure`). established.
- Firemen's passage: watertight tunnel on the centre line through Nos. 2 and 3 holds, 3½ ft inboard of the shell at its closest per the Report; 10.5 ft high and 8.5 ft wide per `halpern-initial-list`. established / estimated.
- Design standard: afloat with any two adjoining compartments flooded, freeboard 2 ft 6 in to 3 ft below the bulkhead deck (`brit-inquiry-report-structure`). Any three of the first four could flood; all four forward too; not the first five (`brit-inquiry-report-observations`, Wilding Q20286–20364). established.

### A4. Funnels

| Item | Value | Source | Certainty |
|---|---|---|---|
| Number and function | Four, elliptical. Three forward ones working; the after one over the turbine hatch was a ventilator and carried the galley flues | `brit-inquiry-report-machinery` (General) | established |
| Uptake arrangement | Uptakes "united immediately above the watertight bulkhead which separated the boiler rooms" | same | established |
| Fore-aft position, funnel 1 | over bulkhead E (BR 6 / BR 5): about 247 ft aft of FP (75.3 m) | derived from A3 and the uptake statement | estimated |
| Fore-aft position, funnel 2 | over bulkhead G (BR 4 / BR 3): about 361 ft (110.0 m) | derived | estimated |
| Fore-aft position, funnel 3 | over bulkhead J (BR 2 / BR 1): about 478 ft (145.7 m) | derived | estimated |
| Fore-aft position, funnel 4 | over the turbine room, 583–640 ft; about 590–600 ft if the spacing is kept | derived; `halpern-afpp` says 578–590 ft aft of FP is "about under the location of the 4th funnel" | estimated |
| Spacing | 114 ft and 117 ft between the first three (derived) | derived | estimated |
| Cross-section | 24 ft 6 in fore-and-aft × 19 ft athwartships (7.47 × 5.79 m) | SNIPPET (`websearch-snippets`); matches the brief | estimated until read in a primary source |
| Rake | 2 in aft per 12 in of height = 9.46° from vertical | `model-monkey-funnels`, citing the H&W rigging plan | estimated (weak source; arithmetic checks) |
| Relative heights | Funnel 1 shortest; funnels 2 and 3 tallest | `model-monkey-funnels` | estimated |
| Height | see below | — | debated |
| Colour | buff with black tops | `wikipedia-titanic` | established ("White Star buff" as a name is FROM-MEMORY) |
| Whistles | on the two foremost funnels | `brit-inquiry-report-watertight` | established |

Funnel height — not resolved. Candidates found:

- 175 ft (53.3 m) keel to top of funnels (`wikipedia-titanic` infobox). That is 82 ft 6 in (25.1 m) above the Boat deck. A SNIPPET figure of 81.5 ft "above the deck" agrees.
- 163 ft 8 in (49.9 m) above keel for funnels 1 and 4, attributed to the H&W rigging plan (SNIPPET). That is about 71 ft 2 in (21.7 m) above the Boat deck.
- "about 70 ft above the casing" and "60 ft above the boat deck" (SNIPPETs).
- The brief's 62–63 ft above the Boat deck was not confirmed by anything I read. It may be the funnel proper above its raised casing; that is a guess.
- Recommendation: take funnel heights from the H&W rigging plan or Beveridge et al., "Titanic: The Ship Magnificent" (2008). Neither was reachable.

### A5. Masts

| Item | Value | Source | Certainty |
|---|---|---|---|
| Number and construction | Two steel pole masts stiffened with angle irons; teak pole tops; rigged with fore-and-aft sails | `brit-inquiry-report-structure` | established |
| Crow's nest | steel look-out cage on the foremast, about 95 ft (28.96 m) above the waterline; reached by a ladder inside the mast, entered at C deck | same | established |
| Mast height | 155 ft (47 m) each | `wikipedia-titanic` | estimated (reference level not stated) |
| Foremast position | Inside the forecastle, i.e. less than 125 ft from the bow | derived: the ladder opening "at C deck" is only enclosed under the forecastle | estimated; exact station UNVERIFIED |
| Mainmast position | abaft the fourth funnel (`halpern-flooding-by-compartment`, quoting Wilding) | — | exact station UNVERIFIED |
| Rake | 2 in per ft, same as funnels | FROM-MEMORY | UNVERIFIED |
| Masthead height above keel | UNVERIFIED (about 205 ft is FROM-MEMORY) | — | — |

### A6. Hull form

| Item | Value | Source | Certainty |
|---|---|---|---|
| Block coefficient | 0.684 | `halpern-stability-trim` VIA `hw-particulars` (Hull 401) | established |
| Prismatic coefficient | 0.705 | same | established |
| Midship section coefficient | 0.970 (= 0.684 / 0.705) | same | estimated (derived ratio) |
| Midship section | "very close to rectangular"; near-rectangular over the middle third only | same | estimated |
| Waterplane area at 32 ft 3 in draught | 59,899 sq ft in the body text, 59,889 sq ft in Appendix B (about 5,564 m²) | same (Simpson's rule on 25 stations of the H&W body plan) | estimated; internal 10 sq ft discrepancy |
| Longitudinal centre of flotation | 415.0 ft forward of AP = 10.0 ft aft of amidships | same | estimated |
| Longitudinal centre of buoyancy (Olympic, 51,290 tons, 34 ft 3 in) | 5.7 ft aft of amidships | same VIA H&W | established |
| KB / BM / KM / KG / GM on 14 April | 17.47 / 20.86 / 38.32 / 35.70 / 2.625 ft (5.32 / 6.36 / 11.68 / 10.88 / 0.80 m) | same; GM VIA `hackett-bedford-1996` | estimated |
| Stem | rake 1 ft per 12 ft | `halpern-stability-trim` | established |
| Bilge keels | about 300 ft (91.4 m) long, 25 in (0.64 m) deep, amidships | `brit-inquiry-report-structure` | established |
| Shell | heavy plating up to the Boat deck; doubled between C and B decks; two decks above B of light scantling | same | established |
| Expansion joints | two, on the Boat deck and A deck | `brit-inquiry-report-description` | established; positions UNVERIFIED (see A8) |
| Rudder | 78 ft 8 in high × 15 ft 3 in long (23.98 × 4.65 m), over 100 tons | `wikipedia-titanic` | estimated |
| Wing propellers | 23 ft 6 in (7.16 m), three blades | `wikipedia-titanic` | established |
| Centre propeller | 17 ft (5.18 m), three blades per `wikipedia-titanic` | — | debated: the older view is 16 ft 6 in with four blades (as Olympic). Halpern has an article "Titanic's Center Propeller – The Evidence Mounts" (title seen in his index, not opened). Details FROM-MEMORY. |
| Stern type | counter (elliptical) stern | FROM-MEMORY | UNVERIFIED |
| Bilge radius, tumblehome, waterline offsets | UNVERIFIED | Halpern's body-plan offsets are in figures only; no table in the text | — |
| Hull colours | red bottom coating (`wikipedia-titanic`). Black topsides, white superstructure, yellow sheer band: FROM-MEMORY | — | UNVERIFIED beyond the red bottom |

### A7. Lifeboats

Dimensions. Source: `brit-inquiry-report-lsa`. established.

| Boat type | Number | Length × breadth × depth | Metres | Capacity |
|---|---|---|---|---|
| Wooden lifeboat | 14 | 30 ft × 9 ft 1 in × 4 ft | 9.14 × 2.77 × 1.22 | 65 persons, 655.2 cu ft |
| Wooden emergency cutter | 2 | 25 ft 2 in × 7 ft 2 in × 3 ft (the other 7 ft 1 in broad) | 7.67 × 2.18 × 0.91 | 40 persons |
| Engelhardt collapsible | 4 | 27 ft 5 in × 8 ft × 3 ft | 8.36 × 2.44 × 0.91 | 47 persons, 376.6 cu ft |
| Total | 20 | — | — | 1,178 persons, 11,327.9 cu ft |

Layout

- 16 pairs of Welin davits in four groups of four: forward and aft on each side (`halpern-list-trim-2023-1`). established.
- Starboard boats odd, 1 forward to 15 aft; port boats even, 2 forward to 16 aft (`halpern-list-trim-2023-1`, `wikipedia-titanic`). established.
- Boats 1 and 2 are the cutters, at the fore end immediately abaft the navigating bridge, kept swung out (`brit-inquiry-report-lsa`, `halpern-trim-heel-2017`). established.
- Forward group (cutter plus three lifeboats per side) lies alongside the officers' quarters and the first-class entrance. After group (four per side) lies alongside and immediately forward of the second-class entrance (`brit-inquiry-report-decks`). established.
- Collapsible C on deck by the davits of boat 1 (starboard); D by the davits of boat 2 (port). A (starboard) and B (port) on the roof of the officers' quarters beside the first funnel (`halpern-list-trim-2023-1`). established.
- Fore part of boat D / No. 2 davits: about 220 ft from the bow (`halpern-list-205-2026`). estimated.
- Boat No. 8 is abreast the forward first-class stairway entrance (`halpern-list-trim-2023-2`). estimated.
- Port edge of the deck where boat D was lowered: about 46 ft (14.0 m) from the centre line (`halpern-list-trim-2023-2`). estimated.
- A swung-out 30 ft boat hangs about 1 ft from the ship's side at zero list; falls are 6:1 for lifeboats and 4:1 for cutters (`halpern-list-trim-2023-1`, `-2`). estimated.
- Station of each individual davit pair: UNVERIFIED. Halpern's Fig. 01 is an image; no table.

### A8. Positions of features

| Feature | Position | Source | Certainty |
|---|---|---|---|
| Navigating bridge (fore end of Boat deck) | 190 ft (57.9 m) from the bow | `brit-inquiry-report-decks` | established |
| Wheelhouse, chart room | at the after end of the bridge; chart room immediately abaft | same | established |
| Officers' quarters | around the wheelhouse and forward funnel casing; Marconi rooms on the centre line abaft the forward funnel casing | same | established |
| Forecastle | 0 – 125 ft from the bow | same | established |
| Forward well deck | about 125 – 175 ft | derived | estimated |
| Forward first-class entrance and Grand Staircase | abaft the officers' house, between funnels 1 and 2 (Wilding Q19871); three elevators on its fore side, E to A deck | `brit-inquiry-report-decks`, `brit-inquiry-wilding-d18` | established; distance from bow UNVERIFIED |
| After first-class entrance | near the after end of A deck, just forward of the smoke room; "in way of the third and fourth funnels" (Wilding, Day 18, Q19876) | same | established; distance UNVERIFIED |
| Standard compass platform | on the centre line of the Boat deck, "further aft" of the forward boat group | `brit-inquiry-report-decks` | established; "between funnels 2 and 3" is FROM-MEMORY |
| Second-class entrance house | after end of the Boat deck | same | established |
| Stewards' stairway | between the reciprocating engine casing and the third funnel casing | same | established |
| Docking bridge | light bridge above the poop | same | established; station UNVERIFIED |
| Expansion joints (two) | Boat and A decks. Symons saw the split "abaft the after expansion plate", about abeam the after funnel or a little forward (`halpern-low-angle-break`, `halpern-trim-heel-2017`) | — | stations UNVERIFIED |
| Dome over the Grand Staircase | UNVERIFIED | not mentioned in the Report sections read | — |

---

## B. Damage and flooding

### B1. Damage

| Item | Finding | Source | Certainty |
|---|---|---|---|
| Height of damage | About 10 ft above the keel on the starboard bottom; none above | `brit-inquiry-report-damage` | established as the 1912 finding |
| Compartments opened | Forepeak, No. 1, No. 2 and No. 3 holds, No. 6 and No. 5 boiler rooms (six) | same | established |
| Length (Report) | "The damage extended over a length of about 300 ft." ("Extent of the Damage") | same | established as wording; the figure itself is estimated |
| Duration | Under 10 seconds at over 20 knots (Report); just under 8 seconds (Halpern) | `brit-inquiry-report-damage`, `halpern-trim-heel-2017` | estimated |
| Length (Wilding) | About 200 ft, from the peak tank to just abaft bulkhead E. The transcript first prints "about 500 feet" and two sentences later "200 feet long"; Halpern marks 500 as [sic] | Wilding, Day 19, Q20422; `halpern-12-square-feet` | estimated |
| Check against A3 | Bulkhead E is 247 ft aft of FP, so forepeak tank to the BR 5 bunker is roughly 200–250 ft | derived | estimated |
| Aggregate opening (Wilding) | "somewhere about 12 square feet" (1.11 m²); mean width about ¾ in if continuous; he believed it was a series of separate punctures | Wilding, Day 19, Q20422–20425 | estimated (Wilding's back-calculation) |
| Wilding's basis | About 16,000 tons in about 40 minutes; initial head about 25 ft; allowance for obstructions | same | estimated |
| Wilding's error band | "more than 9 and less than 15, and 12 is the most probable" | `wilding-limitation-1915` VIA `halpern-12-square-feet` | estimated |
| Halpern's re-derivation | 11.67 sq ft (1.08 m²) from the same inputs with a falling-head model | `halpern-12-square-feet` | estimated |
| Hackett & Bedford | 9.53 sq ft with discharge coefficient 0.61; they lowered it to 0.485 to match 12 sq ft | `hackett-bedford-1996` VIA `halpern-12-square-feet` | estimated |
| 1996 sonar survey | Six thin openings across six compartments, about 12 to 13 sq ft in total (1.1–1.2 m²). Team included William Garzke and David Livingstone (H&W) | `deseret-1997-sonar` | estimated |
| Sonar attribution | Paul Matthias is named in a SNIPPET of a video transcript; "Polaris Imaging" is FROM-MEMORY | — | UNVERIFIED |
| Individual opening lengths | UNVERIFIED | not in the article fetched | — |
| BR 5 leak | In the empty starboard forward bunker, 2 ft above the stokehold plates, 2 ft abaft bulkhead E; flow like a fire hose, about 3 in diameter | `brit-inquiry-report-flooding10`, `-observations` (Barrett Q1917, 1921, 2105, 2255) | established |
| BR 4 damage | Report: "very doubtful"; at most about 3 ft of water in 1 h 40 min | `brit-inquiry-report-observations` | debated |

Short quote, Wilding, Day 19, Q20423: "the aggregate of the holes must have been somewhere about 12 square feet."

### B2. Flooding timeline by compartment

Times are as given by each source. The Report itself warns that times after the collision are unreliable. "Min" = minutes after 11:40 pm.

| Time | Min | Compartment | Observation | Witness (as cited) | Source | Certainty |
|---|---|---|---|---|---|---|
| 11:40 | 0 | BR 6, BR 5 | Water enters 2 ft above the stokehold plates, starboard side | Barrett, BI 1868, 1917 | `brit-inquiry-report-flooding10` | established |
| 11:40+ | 0–5 | Forepeak | Peak tank flooding fast; forepeak above the tank dry | Hemming, BI 17716, 17724 | `halpern-trim-heel-2017` App. A | established |
| 11:45 | 5 | No. 1 hold | Air and water heard; tarpaulin ballooning over the hatch | Buley, AI p. 607 | same | estimated (time) |
| 11:45–11:55 | 5–15 | No. 2 hold | Water rushing in at the bottom of the firemen's passage, starboard side. Report says 5 min; Halpern says more likely 10–15 min | Hendrickson, BI 4847–4870 | `brit-inquiry-report-flooding10`; `halpern-trim-heel-2017` | debated (time) |
| 11:50 | 10 | No. 1 hold | 7 ft of water | Poingdestre, BI 2821–2825 | both | established |
| 11:50 | 10 | BR 6 | 8 ft of water above the double bottom / plates. Halpern: probably the low starboard side under a 5° list, about 1 ft on the high side | Barrett, BI 1926, 1935–1937 | `brit-inquiry-report-flooding10`; `halpern-trim-heel-2017` | debated (depth) |
| 11:50 | 10 | All six | Report's summary: about 14 ft above the keel in all damaged compartments except BR 5 | — | `brit-inquiry-report-gradual` | estimated |
| 11:52 | 12 | No. 3 hold | Mail room filling; water within 2 ft of G deck | Boxhall, BI 15374–15380; Johnson, BI 3395–3397 | both | established |
| 11:55 | 15 | No. 1 hold | Water at the hatch coamings on G deck | Symons, BI 11356–11413 | `halpern-list-trim-2023-2` | established |
| 11:55 | 15 | No. 1 / 2 hold | Water running down the spiral stair from the leading firemen's quarters on G deck | Threlfall (press, May 1912) | `halpern-trim-heel-2017` | estimated |
| 12:00 | 20 | No. 1 hold | Water coming up No. 1 hatch, driving the firemen out; above G deck in 20 min | Lee, BI 2455–2485; Pitman, BI 14962–14965 | `brit-inquiry-report-gradual` | established |
| 12:00 | 20 | No. 3 hold | Mail room (Orlop) afloat | Pitman, BI 14948–14949 | `brit-inquiry-report-gradual` | established |
| 12:00–12:05 | 20–25 | No. 3 hold | Water "within 2 ft of F deck" as Halpern reads Chambers. This sits about 6 ft higher than the Report's level for the same time (next row); the two are not reconciled | Chambers, AI p. 1042 | `halpern-trim-heel-2017` App. A | debated (level) |
| 12:05–12:10 | 25–30 | No. 3 hold | Water in the first-class baggage room at 25 min; up to G deck at 30 min; no water yet on F deck | — | `brit-inquiry-report-gradual` | established |
| 12:10 | 30 | No. 3 hold | Water within six steps of E deck on the mail-room stairs | Robinson, BI 13277–13283 | `halpern-list-trim-2023-2` | established |
| 12:20–12:25 | 40–45 | No. 2 hold | Wooden bulkhead bursts; about 3 ft of water on E deck in the seamen's quarters | Poingdestre, BI 2842–2858 | `brit-inquiry-report-gradual`; Halpern | established (40 vs 45 min) |
| 12:40 | about 60 | Forepeak | Forepeak above the tank fills from above via the deck scuttle, "an hour after the collision", bow submerged to above C deck | — | `brit-inquiry-report-gradual` | estimated |
| 12:40 | about 60 | BR 6 | Probably full to the top of bulkhead E at E-deck level in about one hour | — | same; `-observations` | estimated |
| 12:45–12:55 | 65–75 | E and F decks over BR 4 | Water flowing down the first-class stairs from E deck to F deck, just aft of bulkhead F | Wheat, BI 10956–10972 | `halpern-trim-heel-2017` (12:45–12:50); `halpern-list-trim-2023-2` (12:55) | estimated |
| 12:50 | 70 | E deck | Water on E deck up to the second funnel casing by the main first-class stairway, both sides | Ray, AI p. 803–804 | `halpern-trim-heel-2017` | estimated |
| after about 12:45 | — | E deck, "Scotland Road" | Water above E deck runs aft along the broad port working passage, producing the port list (Wilding's theory, "does not amount to proof") | Wilding, Day 19, Q20242–20250 | `brit-inquiry-wilding-d19` | estimated |
| 12:40 to 1:10 | 60–90 | BR 5 | Rush of water through the pass between the boilers drives Barrett out. Report: bunker door burst about an hour after the collision. Halpern: 1:10 am, Barrett's "best guess" | Barrett, BI 1969, 2038–2041, 2348–2349 | `brit-inquiry-report-gradual`; `halpern-trim-heel-2017` | debated (time; and cause: bunker door per the Report and Halpern, against bulkhead failure) |
| 1:17–1:20 | 97–100 | Bow | Water up to the second row of ports under the ship's name | Symons, BI 11490 | Halpern | estimated (time) |
| 1:20 | 100 | BR 4 | Water rising through the stokehold plates, forward end, small quantities | Dillon, BI 3811, 3913; Cavell, BI 4248–4265 | `brit-inquiry-report-gradual` | established |
| 1:20 | 100 | BR 3, 2, 1 and engine rooms | Dry; engineers and stokers ordered up | Dillon, BI 3795, 3811; Scott, BI 5839 | same | established |
| 1:25 | 105 | Forecastle | Forecastle head not yet under, seen from boat 13 | Barrett, BI 2140–2142 | `halpern-trim-heel-2017` | established |
| 1:35 | 115 | Forecastle | Forecastle deck not under water | Lee, BI 2541 | `brit-inquiry-report-final` | established |
| 1:45 | 125 | Fore deck | "the fore deck was under water" | Jewell, BI 167 | same | estimated (time) |
| 1:45 | 125 | Stern | Propellers about half out of the water, seen from boat 15 | Nichols (letter / NYT) | Halpern | estimated |
| 1:50–1:52 | 130 | Forward well deck | Well deck awash; heavy list to port | Bride reporting Phillips, BI 16543–16553 | `halpern-list-trim-2023-2` | established |
| 1:50 | 130 | Forecastle | Not submerged but close to the water | Lightoller, BI 14081 | `brit-inquiry-report-final` | established |
| 2:00–2:05 | 140–145 | Well deck, forecastle | Well deck submerged as boat C reaches the water; forecastle head "just going under" as boat D lowers | Rowe, AI p. 524; Bright, AI p. 837–839 | Halpern | established |
| 2:05 | 145 | A deck, port side forward | Boat D drops only about 10 ft; water coming onto A deck and up the crew stairway under the Boat deck | Lightoller, BI 14018–14027; Woolner, AI p. 887–888 | `brit-inquiry-report-final`; `halpern-trim-heel-2017` | established |
| 2:10 | 150 | — | Wireless cabin abandoned | Bride | `halpern-list-trim-2023-2` | estimated |
| 2:15 | 155 | Bridge | Bridge going under; crow's nest about level with the water; ship "seemed to take a bit of a dive" | Lightoller, AI p. 90; BI 14052 | both | established (time estimated) |
| 2:17 | 157 | — | Lights go out; hull breaks; boats A and B float off | Symons, BI 11510–11525 | `halpern-list-trim-2023-2` | estimated |
| 2:20 | 160 | — | Stern disappears | Lee, BI 2558 | `brit-inquiry-report-final` | established |

Not verified

- Squash (racquet) court flooding: the court is on G deck in the No. 3 hold compartment (`brit-inquiry-report-decks`, established). A dated observation of water in it was not found. UNVERIFIED.
- "Hissing air" from the forepeak tank vent: the Hemming reference above covers the tank flooding; the hissing detail itself is FROM-MEMORY.
- Break-up: the 1912 Report concluded the ship did not break and reached the perpendicular (Lightoller). That is superseded by the wreck. Angle at break is debated: 11–15° (Roger Long, supported by the JMS study, VIA `halpern-low-angle-break`). Other figures were not checked.

### B3. Trim and heel against time

#### B3.1 Trim, from eyewitness observations (Halpern)

Method: each observation of water at a known place is matched to a waterline drawn on the ship's profile, interpolating between Hackett & Bedford waterlines; a polynomial trendline is then fitted. All values = estimated. Positive = down by the head.

| Time | Min | Trim | Basis | Source |
|---|---|---|---|---|
| 11:40 pm | 0 | −0.2° (by the stern) | Intact condition | `halpern-list-trim-2023-2` |
| 11:55 pm | 15 | 0.8° | Water at G deck by No. 1 hatch (Symons) | same |
| 12:10 am | 30 | 1.8° (text: "about 2°") | Water six steps below E deck at the mail-room stairs (Robinson) | same |
| 12:25 am | 45 | 2.6° | 3 ft of water on E deck, seamen's quarters (Poingdestre) | same |
| 12:55 am | 75 | 3.2° | Water down the first-class stairs from E deck (Wheat) | same |
| 1:20 am | 100 | 4.0° | Second row of ports at the bow under (Symons) | same |
| 1:45 am | 125 | about 5° | Read from the trendline; propellers half exposed (Nichols) | same |
| 1:50 am | 130 | 5.5° | Forward well deck awash (Phillips / Bride) | same |
| 2:00–2:05 am | 140–145 | "over 6°" (2023, 2026); "about 7°" (2017) | Forecastle head going under (Bright) | `halpern-list-trim-2023-2`; `halpern-trim-heel-2017` |
| 2:15 am | 155 | 10° | Crow's nest level with the sea as the bridge goes under (Lightoller); measured on the plans | all three Halpern articles |
| 2:15–2:17 am | 155–157 | rapid increase; bow lurches down; break and lights out at 2:17 | Symons, Lightoller | `halpern-list-trim-2023-2` |

- Halpern: the rate of trim change accelerates after about 1:45–1:50 am as longitudinal stability is lost.
- Competing value: Fitch, Layton and Wormstedt put the trim at about 9° at the time Lightoller left (their 2021 animation), moving the pivot point aft after BR 5 flooded. VIA `halpern-list-205-2026`. debated.

#### B3.2 Trim, Hackett & Bedford 1996 flooding model (theoretical)

Source: `halpern-afpp`, tabulating `hackett-bedford-1996`. L = 850 ft. Draughts at the perpendiculars; a negative after draught means the keel at the AP is above water. Model outputs = estimated.

| Condition | Draught aft | Draught forward | Water aboard (long tons) | Tonnes | Trim by head | Pivot point, ft aft of FP | Time |
|---|---|---|---|---|---|---|---|
| C0 intact | 33.75 ft (10.29 m) | 30.75 ft (9.37 m) | 0 | 0 | −0.20° | — | 11:40 pm |
| C1 | 29.96 ft (9.13 m) | 39.33 ft (11.99 m) | 3,975 | 4,039 | 0.63° | 590 | UNVERIFIED |
| C2 | 25.85 ft (7.88 m) | 47.54 ft (14.49 m) | 7,450 | 7,570 | 1.46° | 578 | UNVERIFIED |
| C3 | 19.52 ft (5.95 m) | 61.46 ft (18.73 m) | 14,131 | 14,358 | 2.82° | 581 | UNVERIFIED |
| C4 | 12.21 ft (3.72 m) | 78.9 ft (24.05 m) | 23,607 | 23,986 | 4.49° | 587 | 12:40 am (`halpern-trim-heel-2017`) |
| C5 | 9.25 ft (2.82 m) | 85.15 ft (25.95 m) | 26,438 | 26,862 | 5.10° | 586 | 1:45 am (same) |
| C6 | −11.38 ft (−3.47 m) | 129.67 ft (39.52 m) | 32,741 | 33,266 | 9.42° | 584 | UNVERIFIED |
| C7 | −43.85 ft (−13.37 m) | 203.94 ft (62.16 m) | 35,312 | 35,879 | 16.25° | 587 | UNVERIFIED |

- The times of C1, C2, C3, C6 and C7 are UNVERIFIED. They are plotted in Halpern's figures, which I could not read as images; two searches for the paper's table failed.
- Halpern says the model shows about 17° at 2:15 am, against his observed 10°. That suggests C7 is near 2:15, but it is my inference.
- The model holds trim near 5° from 12:40 to 1:45 because it assumes inflow stops once inside and outside levels equalise, then resumes when water overtops the bulkhead between BR 5 and BR 4 (`halpern-trim-heel-2017`). Halpern considers some of its inputs (taken from the 1912 Report) overestimated.
- Model against observation is therefore debated: at 12:40 the model gives 4.5° where observation gives about 3°; at 2:15 it gives about 17° against 9–10°.

#### B3.3 Waterline position on the hull for a given trim

- While trim is below about 10°, the ship appears to pivot about a fixed point on the original waterline, 578–590 ft aft of the FP; Halpern uses 585 ft (178.3 m) (`halpern-afpp`, `halpern-list-205-2026`). estimated.
- Rise of the sea above the original waterline at a station x ft aft of the FP, on the centre line: (585 − x) × tan(trim). Halpern's worked example: (585 − 220) × tan 6° = 38.4 ft at boat D.
- Trim from draughts: arctan((draught forward − draught aft) / 850 ft).
- Water aboard against trim is roughly linear up to C5: about 5,000 long tons per degree of trim change (26,438 tons for the 5.3° change from C0 to C5). My division = estimated.
- Fitch et al. argue the pivot moves aft once BR 5 floods. debated.

#### B3.4 Heel / list (Halpern 2023 trendline points)

Positive = starboard. All = estimated.

| Time | Min | List | Basis | Source |
|---|---|---|---|---|
| 11:40 pm | 0 | 2° port (assumed) | Pre-existing slight port list (Beesley, the Chamberses); Halpern's coal calculation gives about 3°. He notes no list was reported at impact and that using 0° barely changes the curve | `halpern-list-trim-2023-2` |
| 11:50 pm | 10 | 5° starboard | Inclinometer in the wheelhouse, 5–10 min after impact (Hichens, AI p. 450–451); Halpern's heeling-moment calculation gives 5.15° | same; `halpern-initial-list` |
| 12:55 am | 75 | about 3° starboard | Trendline; boat 6 lay against the ship's side | same |
| 1:05 am | 85 | 2° starboard | Boat 8 cleared the side (Crawford, BI 17944); slight starboard list at boat 1 (Symons, BI 11440) | same |
| 1:15–1:25 am | 95–105 | within about 1° of upright | Trendline | same |
| 1:20 am | 100 | 0° | "She was not listing at all" when boat 9 reached the water (Ward, AI p. 599) | same |
| 1:30 am | 110 | about 2½° port | Trendline; port list noted at boat 14 | same |
| 1:33–1:35 am | 113–115 | about 3½–4° port | Trendline; boats 13 and 15 against the starboard side | same |
| 1:50 am | 130 | 10° port | 2½ ft gap at boat 10 (Evans, AI p. 676–677); "heavy list to port" (Bride, BI 16551) | same; `halpern-trim-heel-2017` |
| 2:05 am | 145 | 15° port (2023); range 10½° to 15° (2026); 10° (2017) | Geometry at boat D: water at A deck on the port side, 46 ft off the centre line, with the centre-line water level 18–22 ft below the Boat deck | `halpern-list-trim-2023-2`; `halpern-list-205-2026`; `halpern-trim-heel-2017` |
| 2:10 am | 150 | up to about 15° port | Trendline | `halpern-list-trim-2023-2` |

- The 2:05 value is debated. Halpern 2023: 15°. Fitch, Layton and Wormstedt 2026: about 10°, holding that 15° would have made launching and the Woolner jump implausible (VIA Halpern). Halpern 2026: "somewhere from about 10° to 15°", with 13° if the centre-line water was 20 ft below the Boat deck.
- Halpern elsewhere: the ship "never listed more than about 10–15 degrees" while boats were being launched (`halpern-low-angle-break`).
- After 1:50 the fitted curves flatten and turn back toward starboard. Halpern warns this may be a curve-fitting artefact.
- 1912 view: Wilding gathered "the list has been quite small as long as there were any boats" (Day 19, Q20228); the Attorney-General summarised it as slight to starboard, then slight to port, serious only at the end.
- Cause of the starboard list: water confined to starboard of the firemen's tunnel in Nos. 2 and 3 holds, the BR 5 starboard bunker, and free surface in BR 6 (`halpern-initial-list`). Cause of the port list: Scotland Road on E deck (Wilding Q20246–20250). estimated.

#### B3.5 The brief's expected values, checked

| Expected | Result |
|---|---|
| Starboard list about 5° within minutes | Confirmed: 5° at 5–10 min (Hichens). I read this through Halpern, not in the US transcript. |
| Upright about 1:00–1:20 | Narrowed: still about 2° starboard at 1:05; upright about 1:20 (Ward). |
| Port list 9–10° by 1:50–2:05 | 10° at 1:50 is supported. At 2:05 it is 10° to 15°, debated. |
| Trim 4–5° around 1:00–1:30 | Slightly high for observations: 3.2° at 12:55, 4.0° at 1:20, about 5° at 1:45. The Hackett & Bedford model gives 4.5–5.1° from 12:40 to 1:45. |
| Trim 8–10° around 2:00–2:05 | Not supported by observations: 6–7° at 2:05, 10° only at 2:15 (9° per Fitch et al.). |
| Rapid increase after about 2:15 | Confirmed qualitatively: lurch at about 2:15, break and lights out about 2:17, gone 2:20. No angle-against-time data after 2:15 was found. |

#### B3.6 Wilding's 1912 flooding-by-compartment plan (static, no times)

Source: `halpern-flooding-by-compartment`, quoting Wilding. estimated (1912 calculation).

| Condition | Flooded | Stated result |
|---|---|---|
| B1 | Forepeak tank | small trim change |
| B2 | + No. 1 hold | — |
| B3 | + No. 2 hold | firemen's passage floods |
| B4 | + No. 3 hold | — |
| B5 | + BR 6 | water over the top of bulkhead A; "eventual foundering of the ship" |
| B6 | + BR 5 | forecastle entirely under water, and the fore end of B deck |
| B7 | + BR 4 partly | waterline about parallel to the forecastle head; stern out of water about as far as the base of the mainmast |

- Wilding's assumed permeabilities: 5% of flooded volume taken by structure; cargo spaces about one-quarter occupied (Day 19, Q20299–20300). established as his assumptions.
- The waterline of condition B (first five compartments) corresponds to his 16,000 tons at about 40 minutes (Q20422).

#### B3.7 Stettler & Thomas / JMS analysis

UNVERIFIED. The Encyclopedia Titanica copy returned HTTP 403 and search snippets carried no numbers. Known only: GHS hydrostatic and progressive-flooding model, MAESTRO finite-element model; supports a low-angle break (VIA `halpern-low-angle-break`).

### B4. Water mass aboard

| Time | Mass | Source | Certainty |
|---|---|---|---|
| t = 0, initial inflow rate | 13.3 long tons/s (13.5 t/s) for 11.67 sq ft at 25 ft head, falling as the levels rise | `halpern-12-square-feet` | estimated |
| first 40 min, mean rate | 6.7 long tons/s (16,000 tons / 2,400 s) — this is where "about 7 t/s" comes from; it is an average, not the initial rate | derived from Wilding Q20422 | estimated |
| extra inflow if steaming ahead | +5.5% at 8 kn (14 tons/s); +21% in Halpern's worst case (16.0 tons/s) | `halpern-12-square-feet` | estimated |
| about 12:20 am (40 min) | about 16,000 long tons (16,260 t) in the forepeak, holds 1–3 and BR 6, "a few minutes more or less" | Wilding, Day 19, Q20422 | estimated |
| 12:40 am (model C4) | 23,607 long tons (23,986 t) | `hackett-bedford-1996` VIA `halpern-afpp` | estimated |
| 1:45 am (model C5) | 26,438 long tons (26,862 t) | same | estimated |
| model C6 (9.42° trim) | 32,741 long tons (33,266 t) | same | estimated; time UNVERIFIED |
| model C7 (16.25° trim) | 35,312 long tons (35,879 t) | same | estimated; time UNVERIFIED |
| near the end, 35,000–39,000 t | Only the C7 figure was found. Nothing above 36,000 t was verified | — | UNVERIFIED above C7 |

- Pumps: five ballast and bilge pumps at 250 tons/hour and three bilge pumps at 150 tons/hour, about 1,700 tons/hour in all (`brit-inquiry-report-machinery`; the total is my sum). The Report says the pumps "could not possibly have coped". established.

---

## C. Open questions / could not verify

1. Funnel height. 175 ft above keel (82½ ft above the Boat deck) against 163 ft 8 in (about 71 ft). Neither read in a primary source; the brief's 62–63 ft is unconfirmed. Needs the H&W rigging plan or Beveridge et al. 2008.
2. Funnel cross-section 24 ft 6 in × 19 ft and rake 2 in/ft: consistent across secondary sources, but seen only in snippets and a model-maker's page.
3. Exact fore-and-aft stations of funnels, masts, expansion joints, compass platform, docking bridge, staircase dome and each davit pair. Funnel stations given here are derived from bulkhead positions.
4. Mast heights (reference level of "155 ft"), mast rake, masthead height.
5. Frame numbers for bulkheads and features; frame-spacing breakdown. A frame table would let every station be stated exactly.
6. Hull offsets: bilge radius, tumblehome, waterline half-breadths, stern profile, exact stem and counter overhangs. Only coefficients were found. Halpern's 25-station half-breadths exist as figures.
7. Paint scheme beyond "buff funnels, black tops, red bottom".
8. Centre propeller: 17 ft three-bladed against 16 ft 6 in four-bladed. Halpern's article was not opened.
9. Hackett & Bedford 1996: times for C1, C2, C3, C6, C7, and any heel output. The paper was not reachable; needs a library copy of RINA Transactions.
10. Stettler & Thomas 2013: no data obtained.
11. Fitch, Layton and Wormstedt 2026: read only through Halpern's rebuttal. Their own trim and list figures should be taken from their article at wormstedt.com before a `debated` record is finalised.
12. Halpern's fitted polynomials are not published as coefficients. Only the control points above are available; any curve between them is the modeller's interpolation.
13. No quantitative trim or heel data after 2:15 am (break-up phase) was found.
14. 1996 sonar survey: lengths and positions of the six openings; the Matthias / Polaris Imaging attribution.
15. Transcription doubts in the online Report: F deck "25 ft 6 in" at the bow (probably 15 ft 6 in); shifted cells in the deck-height table; Wilding's "about 500 feet" (probably 200). Check against a scan of the printed Report.
16. Depth 64 ft 9 in (Report) against 64 ft 6 in (Wikipedia); gross tonnage 46,328 against 46,329; A-deck length about 500 ft against 546 ft; waterplane area 59,899 against 59,889 sq ft.
17. US Inquiry page references (Hichens, Ward, Evans, Bright, Rowe, Woolner, Lightoller) were taken from Halpern and not opened on titanicinquiry.org. They are quick to confirm there.
18. Squash-court flooding observation and the "hissing air" detail: not found.
19. Maximum speed, and the date of British Inquiry Day 19 (Day 20's header reads Monday 10 June 1912).
