# Titanic research notes — break-up, descent, wreck site, environment, human toll

Compiled 2026-11-14. Research notes only (no code). Every item carries source id(s) and a certainty
(`established` / `estimated` / `debated`). Tags used:

- `READ` = I read the statement on the page/PDF myself in this session.
- `SNIPPET` = seen only in a web-search result summary or a model-summarised fetch (not the raw page) — lower confidence.
- `POINTER` = read in Wikipedia wikitext, which attributes it to a book I did not consult (book + page given).
- `FROM-MEMORY` = not seen on any page this session; lower the certainty accordingly.
- `COMPUTED` = my own calculation (method stated).
- `UNVERIFIED` = could not find; what I tried is stated.

About 56 web requests were made (above the ~45 guideline; the excess went on the MAIB report, the 2010 mapping
sources and the inquiry testimony).

---

## 0. Sources consulted

| id | Full reference | URL | Fetched? |
|---|---|---|---|
| `bot-report-1912` | British Wreck Commissioner's Inquiry, *Report on the Loss of the "Titanic" (s.s.)*, Lord Mersey, 30 July 1912. Sections read: title/finding, "Crew and Passengers", "Weather Conditions", "The Collision", "Final Effect of the Damage", "Numbers Saved", "Circumstances in connection with the s.s. Californian" | https://www.titanicinquiry.org/BOTInq/BOTReport/botRep01.php (+ botRepCrewpax, botRepWeather, botRepCollision, botRepFinEff, botRepSaved, botRepCalifornian .php) | YES (curl), full text read |
| `bot-testimony-lee` | British Inquiry, Day 4, testimony of Reginald Lee (lookout), Q2401–2449 | https://www.titanicinquiry.org/BOTInq/BOTInq04Lee01.php | YES (curl), quoted questions read |
| `bot-testimony-boxhall` | British Inquiry, Day 13, testimony of Joseph G. Boxhall (4th officer), Q15323–15409 | https://www.titanicinquiry.org/BOTInq/BOTInq13Boxhall01.php | YES (curl), quoted questions read |
| `us-senate-report` | US Senate, Committee on Commerce, *Report* pursuant to S. Res. 283 ("Titanic" Disaster), Sen. William Alden Smith, 28 May 1912 (Report No. 806 — number FROM-MEMORY) | https://www.titanicinquiry.org/USInq/USReport/AmInqRep01.php … AmInqRep07.php | YES (curl), sections 02–07 read |
| `sname-mfp-2009-breakup` | Roy F. Mengot & Richard T. Woytowich, "The Breakup of Titanic: A Progress Report from the Marine Forensics Panel (SD-7)", joint meeting IMarEST/SNAME/SMPE/ASNE, New York, 16 April 2009 (16 pp.). Later published in SNAME *Marine Technology*, 2010 (journal issue not consulted; per search summary) | https://trmaarchive.com/articles/breakup/MFPBreakupPaper.pdf | YES (curl), whole PDF text read |
| `mengot-breakup-web` | Roy Mengot, "The Break-up of Titanic", *The Wreck of RMS Titanic* site (© 1997 and 2012), mirror hosted by Bill Wormstedt | https://wormstedt.com/RoyMengot/TitanicWreck/BREAKUP/Breakup.html | YES (curl), read. (Original domain wreckoftitanic.com: proxy 502, not reachable) |
| `mengot-bow-web` | Roy Mengot, "The bow section", same site (© 2012) | https://wormstedt.com/RoyMengot/TitanicWreck/BOW/bow.html | YES (curl), read |
| `halpern-collision-point` | Samuel Halpern, "Collision Point", titanicology.com (document metadata 2022) | https://www.titanicology.com/Titanica/CollisionPoint.htm | YES (curl), whole article read |
| `maib-1992-reappraisal` | Marine Accident Investigation Branch (UK Dept of Transport), *RMS "Titanic": Reappraisal of Evidence Relating to SS "Californian"*, 1992 (Deputy Chief Inspector Capt. James de Coverly; Inspector Capt. Thomas Barnett) | https://assets.publishing.service.gov.uk/media/54c15bf240f0b6158d000027/MAIBReport_ReappraisalOfEvidence-SSCalifornian-Titanic-1992.pdf | YES (curl), text layer read. NB: the scan's text layer drops most longitudes/positions |
| `bbc-2023-scan` | Rebecca Morelle & Alison Francis, "Titanic: First ever full-sized scans reveal wreck as never seen before", BBC News, 17 May 2023 | https://www.bbc.com/news/science-environment-65602182 | YES (curl), article text read |
| `bbc-2025-scan` | Rebecca Morelle & Alison Francis, "Titanic scan reveals ground-breaking details of ship's final hours", BBC News, April 2025 (8/9 April) | Read through a verbatim repost: https://blog.geogarage.com/2025/04/titanic-scan-reveals-ground-breaking.html | PARTLY: repost fetched with WebFetch (model-summarised, not raw). BBC URL itself not located |
| `smithsonian-2025-scan` | Smithsonian Magazine (Smart News), "See the Titanic in remarkable detail with a 3D scan that reveals new secrets of the doomed ship's final moments", April 2025 | https://www.smithsonianmag.com/smart-news/see-the-titanic-in-remarkable-detail-with-a-3D-scan-that-reveals-new-secrets-of-the-doomed-ships-final-moments-180986415/ | PARTLY: WebFetch (model-summarised) |
| `natgeo-2025-digital-resurrection` | National Geographic / Atlantic Productions, *Titanic: The Digital Resurrection* (documentary, premiered 11 April 2025) and associated NatGeo press statement | — | NO. Not fetched directly; its figures reach these notes only through `smithsonian-2025-scan`, `bbc-2025-scan` and search snippets |
| `magellan-2022-press` | Trade/press coverage of Magellan Ltd's 2022 scan (gCaptain "Titanic scan reveals amazing new details…", LiDAR News "Titanic 3D scan largest underwater map", Fox affiliates, May 2023) | https://gcaptain.com/titanic-scan-reveals-amazing-new-details-of-historic-wreck ; https://lidarnews.com/titanic-3d-scan-largest-underwater-map/ | NO — SNIPPET only (search summary) |
| `whoi-oceanus-quest-to-map` | "The Quest to Map Titanic" (interview with William Lange, WHOI Advanced Imaging & Visualization Lab), *Oceanus*, WHOI, c. 2012 | https://www.whoi.edu/oceanus/feature/the-quest-to-map-titanic/ | YES (curl), read |
| `archaeology-2012-delgado` | James P. Delgado, "Archaeology of Titanic", *Archaeology* magazine, May/June 2012 | https://archaeology.org/issues/may-june-2012/features/archaeology-of-titanic/ | YES (curl), read |
| `wikipedia-wreck` | Wikipedia, "Wreck of the Titanic" (wikitext, Nov 2026) — pointer only | https://en.wikipedia.org/wiki/Wreck_of_the_Titanic | YES (raw wikitext) |
| `wikipedia-sinking` | Wikipedia, "Sinking of the Titanic" (wikitext) — pointer only | https://en.wikipedia.org/wiki/Sinking_of_the_Titanic | YES (raw wikitext) |
| `wikipedia-californian` | Wikipedia, "SS Californian" (wikitext) — pointer only | https://en.wikipedia.org/wiki/SS_Californian | YES (raw wikitext) |
| `wikipedia-iceberg` | Wikipedia, "Iceberg that sank the Titanic" (wikitext) — pointer only | https://en.wikipedia.org/wiki/Iceberg_that_sank_the_Titanic | YES (raw wikitext) |
| `ballard-1987` | Robert D. Ballard, *The Discovery of the Titanic*, 1987 | — | NO (book). Cited only via `wikipedia-*`, `halpern-collision-point`, `maib-1992-reappraisal` |
| `halpern-weeks-2011` | S. Halpern (ed.), *Report into the Loss of the SS Titanic: A Centennial Reappraisal*, History Press, 2011 (chapter by Halpern & C. Weeks on the damage/sinking) | — | NO (book). Cited only via `wikipedia-*` |
| `long-2005-low-angle` | Roger Long's low-angle break hypothesis (History Channel expedition Aug 2005; documentary "Titanic's Final Moments: Missing Pieces", 2006; AP coverage Dec 2005) | e.g. https://www.nysun.com/article/national-titanic-doomed-before-it-set-sail-researchers-say | NO — SNIPPET only |
| `olson-2012-moon` | Donald W. Olson, Russell L. Doescher & Roger W. Sinnott, "Did the Moon Sink the Titanic?", *Sky & Telescope*, April 2012 | (press coverage: space.com/14802-supermoon-titanic-disaster.html etc.) | NO — SNIPPET only (Texas State press-release URL returned 404) |
| `maltin-refraction` | Tim Maltin, *A Very Deceiving Night* (2012) / "Titanic's Mirage"; Smithsonian Magazine 2012 "Did the Titanic sink because of an optical illusion?" | https://timmaltin.com/ ; smithsonianmag.com | NO — SNIPPET only. (MAIB Annex 4 on super-refraction was READ) |
| `noaa-2004-expedition` | NOAA Ocean Exploration, "R.M.S. Titanic Expedition 2004" | oceanexplorer.noaa.gov/explorations/04titanic/… | NO — every URL tried returned 404 (site restructured); web.archive.org connection reset |
| `encyclopedia-titanica-stats` | Encyclopedia Titanica, statistics pages | https://www.encyclopedia-titanica.org/titanic-statistics.html | NO — HTTP 403 with curl and WebFetch |
| `britannica-titanic` | Encyclopaedia Britannica, "Titanic" | https://www.britannica.com/topic/Titanic | NO — HTTP 403 with WebFetch |
| `own-computation` | Great-circle distances/bearings (haversine, mean Earth radius 6371.0088 km, 1 nm = 1.852 km) and lunar phase (Meeus, *Astronomical Algorithms*, ch. 49 series, main periodic terms) | scripts `gc.py`, `moon.py` in the scratchpad research folder | n/a |

---

## 1. Break-up

### 1.1 Reference model — SNAME Marine Forensics Panel (Mengot & Woytowich)

| # | Statement | Source | Certainty |
|---|---|---|---|
| B1 | The ship broke in two at or very near the surface; the wreck (two main sections) confirmed this in 1985. | `sname-mfp-2009-breakup` (abstract, conclusions) READ | established |
| B2 | Initial hull failure was at or near the double bottom and the ship "effectively broke bottom-up": bottom structure in compression fails first, failure runs across the breadth, up round the bilge, then up the side shell; the neutral axis rises until only the top strakes (Y and Z sheer strakes) with B deck (the strength deck) remain, and these broke last. | `sname-mfp-2009-breakup` READ; `mengot-breakup-web` READ | debated (best-supported engineering reconstruction; authors themselves call it a progress report and say "we cannot prove that this reconstruction is accurate") |
| B3 | Trim at failure: "As Titanic tipped about 15-17 degrees during the final plunge … a failure occurred either at the keel or in the keelson bracing flanking the tank top." | `sname-mfp-2009-breakup` (Conclusions) READ | estimated (authors' figure; the paper's own stress run uses flooding condition "C-7" from Hackett & Bedford 1996, "not necessarily the condition in which the breakup began") |
| B4 | List at break-up: "upwards of 10 degrees to port". | `mengot-breakup-web` READ | estimated |
| B5 | Where the bottom failed: three finite-element "hot spot" candidates — manholes aft of Frame 22 (least likely), the change of double-bottom depth at **Frame 25 aft** (most likely; "coincides with the break between the two double bottom pieces"), and the ends of the extra engine-bed girders at Frame 29. Frame 25 is inside Boiler Room No. 1, just forward of the forward bulkhead of the Reciprocating Engine Room (watertight bulkhead at Frame 30 aft; tank boundary at Frame 29). Double bottom deepens there from 63 in to 75–76 in under the engines. | `sname-mfp-2009-breakup` READ; `mengot-breakup-web` READ | estimated (location of the *initial* failure); debated (which of the three) |
| B6 | Upper end of the failure "is at or near the aft expansion joint in the superstructure"; but "the lay of the wreck is not consistent with a break aft of the #3 funnel at the expansion joint": the tears through the interior decks of the bow section "follow a largely vertical path through the boiler uptake for No. 3 funnel"; Mengot places the clean, knife-like break at the back of the bow section about 6 ft (2 m) behind the No. 3 funnel uptake's forward doublers, with the aft cracks "along the expansion joint". | `sname-mfp-2009-breakup` READ; `mengot-breakup-web` READ | estimated |
| B7 | So the break is not a single plane "between funnels 3 and 4": a whole section of hull between the back of the bow section (at the No. 3 funnel uptake) and the front of the stern section (reciprocating engine room) came apart. Delgado: "some 70 feet of Titanic's 882-foot length … between two of the deck funnels" fully disintegrated, releasing two reciprocating-engine cylinders, the five boilers of No. 1 boiler room, coal, galley contents etc. Wikipedia (citing Cohen 2012 on the 2010 survey) words this as a break "between funnel numbers two and three, and not funnel numbers three and four". | `archaeology-2012-delgado` READ; `wikipedia-wreck` POINTER | established (a missing mid-section exists); debated (how to label its position relative to the funnels — "between 3 and 4" is the traditional wording; flag for the lead engineer) |
| B8 | Two double-bottom pieces lie upside-down on the seabed away from bow and stern, "coming primarily from beneath Boiler Rooms #1 and #2". Surveyed/documented for engineering study by the History Channel expedition of 2005 (programme "Titanic's Achilles Heel" per Mengot); known since 1993 per Mengot; "not the first expedition to locate or photograph these pieces" per the paper. | `sname-mfp-2009-breakup` READ; `mengot-breakup-web` READ | established |
| B9 | Key physical evidence: the bar keel (19.5 × 3 in section) at the aft end of the aft piece is bent into an "S" over ~3 ft, with an opposite bend at the aft end of the forward piece — consistent with large compressive load, not tension. Woytowich calls it the "smoking gun". | `sname-mfp-2009-breakup` READ; `mengot-breakup-web` READ | established (observation); estimated (interpretation) |
| B10 | Engineering figures (condition C-7, revised by George Edwards): max bending moment ≈ 1.71 million ton-feet inside Boiler Room No. 2; neutral axis 398 in above keel; ≈ 22 ksi tension at B deck vs ≈ 18.4 ksi compression at keel (keel stress ≈ 83 % of deck stress), but bottom joints had only 42–56 % of the strength of the doubled sheer strake. Global buckling ruled out as *initial* mode (needs ≈ 3× the load); rivet-joint failure at hot spots (≈ 29–32 ksi) is the candidate. | `sname-mfp-2009-breakup` READ | estimated |
| B11 | Sequence (paper, steps 1–4 and Figs 8–10; Mengot's "Condition 1/2"): (1) bottom fails at ~Frame 25; (2) failure spreads across the bottom, round the bilge, a double-riveted landing in the side fails over 60–70 ft; bottom pieces are effectively separated; (3) a structural hinge forms in the uppermost strakes/decks near the aft expansion joint; "as the hull bends, the stern of the ship comes back down into the water" (the stern settles back — matches witnesses who saw it "right itself"); (4) the flooding bow pulls the forward end of the stern down, the bending moment reverses, the stern tips up again; shell plating peels off the stern's forward half (≈ 160–175 ft), opening engine/turbine/dynamo spaces so the stern floods and sinks within minutes. The paper deliberately stops the reconstruction at step 4. | `sname-mfp-2009-breakup` READ; `mengot-breakup-web` READ | debated |
| B12 | Duration: Mengot gives "the 15-20 second break-up process"; after the break the stern "hung there for a period of 5 minutes or less". Witnesses: Buley — stern "floated 5 minutes"; Symons — stern gone 2–3 min after the break. | `mengot-breakup-web` READ; `sname-mfp-2009-breakup` READ (Buley, US p. 268-9); `halpern-collision-point` READ (Symons) | estimated |
| B13 | Maximum stern angle after the break cannot be determined: "the stern could have assumed almost any conceivable trim angle, while the bow could have remained at a relatively shallower trim angle." | `sname-mfp-2009-breakup` READ | estimated / open |
| B14 | The stern probably rotated before going under (uneven port/starboard tearing; a connection on one side only "may have generated a moment tending to rotate the stern"); Mengot cites testimony "that the stern rotated half way around before its final plunge". Wikipedia quotes J. Thayer that she "gradually [turned] her deck away from us" (Ballard 1987 p. 29). | `sname-mfp-2009-breakup` READ; `mengot-breakup-web` READ; `wikipedia-sinking` POINTER | debated |
| B15 | Timing relative to 2:20: Halpern equates Californian's 2:05 (Gibson: "Five minutes past two by the wheelhouse clock") with 2:17 Titanic time (12-min clock difference) and takes "3 minutes before 2:20 a.m., when all of her lights went out" as the moment "the ship apparently broke apart" (Symons, boat 1). I found **no** source that states "2:17–2:18" for the break as such; it follows from lights-out ≈ 2:17 + break immediately after. | `halpern-collision-point` READ | estimated (derived from testimony; method: clock-offset reconciliation) |
| B16 | No. 1 funnel: the opening of the (forward) expansion joint as the bow bent down "caused funnel stays to snap, causing the No. 1 funnel to fall forward" — while still at the surface. | `sname-mfp-2009-breakup` READ | estimated |
| B17 | Why the engineering staff died in such proportion: a bottom-up failure would instantly flood the Reciprocating Engine Room (their command post). | `sname-mfp-2009-breakup` READ | estimated (authors' inference) |

### 1.2 Competing models (record as `debated`)

| # | Model | Holder | What it says | Status / who disputes | Source |
|---|---|---|---|---|---|
| C1 | "Sank intact" | 1912 inquiries | US: "the preponderance of evidence is to the effect that she assumed an almost end-on position and sank intact." British report: "The ship did not break in two" (citing Lightoller Q14075) and "did eventually attain the perpendicular". | Refuted by the wreck (1985). Many survivors (Symons, Buley, Osman, Ranger, Bright, Crowe, Joughin, Thayer…) had described a break. Mengot notes the British inquiry "solicited no passenger testimony". | `us-senate-report` READ; `bot-report-1912` READ; `sname-mfp-2009-breakup` READ; `mengot-breakup-web` READ |
| C2 | Top-down break at the aft expansion joint, high stern angle (1997 Cameron film) | "Best thinking available" in 1996–97; supported by the 1996 Gibbs & Cox finite-element stress analysis shown in Discovery Channel's "Titanic: Anatomy of a Disaster" and the SNAME 1997 paper (Garzke et al., *Trans. SNAME* 1997) | Hull cracks at the top behind funnel 3 at the expansion joint and tears downward; the double bottom acts as a hinge that drags the stern up/down. | Mengot & Woytowich: the 1996 FE model treated the superstructure as part of the hull girder and so turned the expansion joint into a false "hot spot"; a top-down break releases the tension and leaves no energy for the second clean break forward of funnel 3, and a bent double bottom could not pull the stern down — "largely invalidate the theory of a top-down break at the expansion joint". Cameron himself revised it in "Titanic: The Final Word" (2012) to an asymmetric top-down break forward of funnel 3 (per Mengot). | `sname-mfp-2009-breakup` READ; `mengot-breakup-web` READ |
| C2a | Film angle "~45°" and the 2012 Cameron-panel figure "~23°" | — | — | FROM-MEMORY; neither number was found on a page read this session. UNVERIFIED. | — |
| C2b | Angle/stress assumptions of the Garzke et al. 1997 SNAME paper ("~35–45°?") | — | — | UNVERIFIED — the paper was not consulted; only its existence and reference were READ in `sname-mfp-2009-breakup` (ref. [2]). AP 2005 quotes Garzke: "We all agree that the ship did sink at a shallow angle" (SNIPPET). | `long-2005-low-angle` SNIPPET |
| C3 | Low-angle break (~10–11°) starting at the aft expansion joint | Roger Long, naval architect (History Channel expedition 2005; "Titanic's Final Moments: Missing Pieces", 2006) | Stern at "10 or 11 degrees rather than 30 degrees or so" when the hull failed; expansion-joint design failed first; keel pieces interpreted as torn in tension. | Parks Stephenson rejected it and held ~30° (AP, SNIPPET). A History Channel-commissioned simulation (2007 programme "Titanic's Achilles Heel") found the expansion joints strong enough (SNIPPET, via Wikipedia "Titanic conspiracy theories"). Mengot/Woytowich read the same keel pieces as compression failures. | `long-2005-low-angle` SNIPPET |
| C4 | "Both regions critical" | Stettler & Thomas, "Flooding and Structural Forensic Analysis of the Sinking of the RMS Titanic" (2012) | Confirms/refines the 1996 stress levels; both keel and strength deck were in the failure zone; does not identify which failed first. | As characterised by Mengot; paper itself not consulted. | `mengot-breakup-web` READ |
| C5 | Hackett & Bedford 1996 flooding model | C. Hackett & J. G. Bedford (Harland & Wolff), RINA/IMarE N. Ireland, March 1996 | Critical point when six forward compartments are flooded and boiler room 4 about half full; the ship then tips into the final plunge — "roughly 2 AM, about 20 minutes before the ship disappeared" (Mengot's summary of condition C7). | Used as input by the MFP, not a rival. Note the tension with B15 (break ≈ 2:17): Mengot's page says "the break-up occurred about this time" right after describing C7 at ~2 AM. | `mengot-breakup-web` READ |
| C6 | Stern angle at/after break | Ballard 1987 p. 202: stern reached 30–45° (POINTER). British report: "perpendicular", with rumbling "at an angle of 50 or 60 degrees". US report: "almost perpendicular". Long: ≤ 11° at failure. Stephenson: ~30°. MFP: 15–17° at initial failure, stern angle afterwards indeterminate. | — | Range in sources: ~11° … ~90°. | `wikipedia-sinking` POINTER; `bot-report-1912` READ; `us-senate-report` READ; others as above |

### 1.3 What the 2022 Magellan scan and the 2025 analyses add

| # | Statement | Source | Certainty |
|---|---|---|---|
| D1 | NatGeo statement: the scan shows the ship was "violently torn" in two, ripping through first-class cabins, rather than splitting cleanly. | `smithsonian-2025-scan` (summarised fetch) | estimated (interpretation by documentary analysts; no peer-reviewed paper found) |
| D2 | A boiler room at the rear of the bow section (where the ship split) is visible; some boilers are concave, "which suggests they were still operating as they plunged into the water". | `bbc-2025-scan` (summarised fetch). Search snippets (CNN) name it Boiler Room Two — SNIPPET | estimated |
| D3 | A valve on the deck of the stern is in the open position, indicating steam was still flowing to the electricity-generating system — consistent with accounts that the engineers (led by Joseph Bell) kept the lights on to the end. | `bbc-2025-scan`, `smithsonian-2025-scan` (summarised fetches) | estimated |
| D4 | A porthole glass probably smashed by the iceberg — fits survivor reports of ice entering cabins. | `bbc-2025-scan` (summarised fetch) | estimated |
| D5 | Simulation led by Prof. Jeom-Kee Paik (University College London) using a structural model from the blueprints plus speed/direction/position: a glancing blow left a line of punctures along a narrow strip of hull, each "the size of A4 pieces of paper", spread across **six** compartments (the ship could float with four flooded). Simon Benson (Univ. of Newcastle): the margin between sinking and not sinking is holes "about the size of a piece of paper"; collision contact lasted 6.3 s (Benson, via ABC). The damaged lower bow is buried in sediment, so the punctures themselves are **not** visible on the scan. | `bbc-2025-scan`, `smithsonian-2025-scan` (summarised fetches) | estimated (simulation) |
| D6 | The scan is said to corroborate Lightoller's account of First Officer Murdoch being swept away while launching a boat (davit position). | `smithsonian-2025-scan` (summarised fetch) | debated (documentary claim) |
| D7 | Anything the 2022 scan says specifically about the Mengot/Woytowich bottom-up model (support or contradiction) | — | UNVERIFIED — nothing found in the pages reached; `natgeo-2025-digital-resurrection` not accessed |

---

## 2. Final plunge — sequence and timings (ship's time)

All clock times in the last 10 minutes are reconstructions; the British report itself says "the later stages of the sinking cannot be stated with any precision, owing to a confusion of the times".

| Time | Event | Source | Certainty |
|---|---|---|---|
| 1:35 | Forecastle deck not yet under water (Lee Q2541). | `bot-report-1912` READ | established (testimony) |
| ~1:45 | Last distress rockets ("until two hours after the collision", Rowe Q17685); fore well deck under water. | `bot-report-1912` READ | estimated |
| ~1:50 | Forecastle head close to the water (Lightoller Q14081, "about half an hour before she disappeared"). | `bot-report-1912` READ | estimated |
| ~2:00 | Hackett/Bedford condition C7: six compartments flooded, BR 4 half full; ship starts tipping into the final plunge. | `mengot-breakup-web` READ | estimated (model) |
| ~2:05 | Collapsible D (last boat lowered from davits) leaves; A deck under water, water coming up the stairway under the boat deck almost immediately after. (Clock time 2:05 for D is FROM-MEMORY; the order of events is READ.) | `bot-report-1912` READ | estimated |
| ~2:15 | Trim increases rapidly as water enters through deck openings; a wave sweeps aft along the boat deck; collapsibles A and B float off; bridge goes under ("the vessel … seemed to take a dive", Lightoller Q14052). | `wikipedia-sinking` POINTER (Barratt 2010 p. 131; Lynch 1998 p. 117); `bot-report-1912` READ | estimated |
| ~2:15–2:17 | Forward funnel falls (stays part as the forward expansion joint opens). | `sname-mfp-2009-breakup` READ; `wikipedia-sinking` POINTER | estimated |
| ~2:17 | All lights go out (≈ 3 min before the end; = 2:05 a.m. on Californian's clock). | `halpern-collision-point` READ | estimated |
| ~2:17–2:18 | Hull fails (bottom-up per MFP, trim ≈ 15–17°, list ≈ 10° to port); stern settles back, then tips up again; break-up lasts ~15–20 s. | `sname-mfp-2009-breakup`, `mengot-breakup-web`, `halpern-collision-point` READ | estimated / debated (see §1) |
| 2:17–2:20 | Stern stands at a steep angle (range in sources ~30–45° … "perpendicular"), possibly rotating, for "5 minutes or less" (2–3 min per Symons). | see C6, B12, B14 | debated |
| 2:20 | Stern disappears. British report: "The ship disappeared at 2.20 a.m." US report: "sinking at 12.47 a.m., New York time". | `bot-report-1912` READ; `us-senate-report` READ | established (conventional time) |

Notes for the timeline engine:
- Collision time: British report "a little before 11.40"; US report "11.46 p.m. ship's time, or 10.13 p.m. New York time". The US report therefore uses a 1 h 33 min ship-to-New-York offset; Halpern (via `wikipedia-sinking` footnote) uses 2 h 02 min ahead of EST = 2 h 58 min behind GMT. `debated` — choose one convention and document it.
- Halpern: Titanic clocks were ~12 min ahead of Californian clocks (`halpern-collision-point` READ).
- Duration collision → foundering: "two hours and forty minutes" (`bot-report-1912` READ).
- Trim history (POINTER, Halpern & Weeks 2011 pp. 109, 118 via `wikipedia-sinking`): ~4.5° after the first hour, ~5° during the second hour, rapidly increasing after ~2:15. Wikipedia is internally inconsistent about 1:30 ("about ten degrees" vs "not more than 5 degrees") — check the book.

---

## 3. Descent of the two sections (all `estimated`)

| # | Statement | Who | Source |
|---|---|---|---|
| E1 | Bow: "began the five minute journey to the bottom"; did **not** simply plane away — a repeated tip-and-level motion, forward speed peaking ~10 knots when tipped, average forward speed 5–6 knots; fall-to-travel ratio 6:1, giving ~2,000 ft (600 m) between the bow and the centre of the wreck site. | Mengot | `mengot-bow-web` READ |
| E2 | Bow descended at ~45° and planed forward ~1 ft per 6 ft of descent. | Halpern & Weeks 2011 p. 127 | `wikipedia-wreck` POINTER |
| E3 | Bow struck at ~20 knots (≈ 10 m/s). | Halpern & Weeks 2011 p. 127 | `wikipedia-wreck` POINTER |
| E4 | Bow struck prow-first at a shallow angle at 25–30 mph (≈ 11–13 m/s; ≈ 22–26 kn). Mengot: the *rear* of the bow section hit at 25–30 mph, the stem striking first while "tilted at a steep angle", the rest carrying on down an "almost vertical line". Note the disagreement on impact attitude (shallow vs steep). | Ballard 1987 p. 206; Mengot | `wikipedia-sinking` POINTER; `mengot-bow-web` READ |
| E5 | Both sections took "about 5–6 minutes" to fall 3,795 m. COMPUTED implication: mean vertical speed 10.5–12.7 m/s (≈ 20–25 kn), consistent with E3/E4. | Wikipedia (attribution unclear, near a cite of Uchupi, Ballard & Lange 1986) | `wikipedia-sinking` POINTER; `own-computation` |
| E6 | Impact damage to bow: stem buried ~60 ft (18 m) at the anchors; two bends — under the forward well-deck cranes (Ballard ~6°, Marschall/Cameron footage ~10°) and ~4° under the forward expansion joint; keel fractured in two places; forward hatch cover blown off ahead of the bow. | Mengot; Halpern & Weeks | `mengot-bow-web` READ; `sname-mfp-2009-breakup` READ ("upwards of 10 degrees"); `wikipedia-wreck` POINTER |
| E7 | Stern: fell almost vertically, probably rotating; 2010 sonar map interpreted as showing it "rotated like a helicopter blade" (AP, March 2012); BBC: it "corkscrewed into the sea floor". | Ballard 1987 p. 206; AP 2012; BBC 2023 | `wikipedia-sinking`, `wikipedia-wreck` POINTER; `bbc-2023-scan` READ |
| E8 | Stern struck rudder-first, "steeply enough" to cause a ~10° starboard bend under the 2nd-class entrance; rudder buried ~50 ft (15 m); centre propeller buried; wing propeller shafts bent up nearly 20°; decks pancaked; poop deck peeled forward-to-aft and folded back on itself. | Mengot; Pellegrino 2012 (treat Pellegrino with caution); Halpern & Weeks p. 128 | `mengot-breakup-web` READ; `wikipedia-wreck` POINTER |
| E9 | Implosion: true implosion damage is "surprisingly limited" to the after well-deck area and starboard edges of D–F decks (the last narrow compartments pulled under before flooding); the wrecked forward half of the stern is break-up, rapid-flooding and impact damage, not implosion. The older account (Ballard/Butler) attributes more of the stern's destruction to implosion. Cork from the refrigerated spaces surfaced shortly after the stern vanished. | Mengot; MFP footnote 2 | `mengot-breakup-web` READ; `sname-mfp-2009-breakup` READ; `wikipedia-sinking` POINTER |
| E10 | Stern descent speed / duration as separate figures (e.g. "stern slower, ~X knots") | — | UNVERIFIED — no source reached gives a distinct stern figure beyond E5 |
| E11 | Heavy items (the five single-ended boilers from boiler room 1) fell "almost straight" down, so the boiler cluster marks the surface break-up/foundering point (the "hypocentre"). | Ballard; MAIB (de Coverly, Barnett); Halpern | `maib-1992-reappraisal` READ; `halpern-collision-point` READ; `wikipedia-wreck` POINTER |

---

## 4. Wreck site

### 4.1 Positions and geometry

| # | Item | Value | Source | Certainty |
|---|---|---|---|---|
| W1 | Centre of boiler field (Ballard) | 41°43′32″N 49°56′49″W (= 41°43.5′N 49°56.8′W) | `halpern-collision-point` READ (footnote 9, attributing Ballard); `wikipedia-wreck` POINTER (Ballard 1987 p. 199: "the centre of the boiler field") | established |
| W2 | "Position of the boilers and stern section" used by MAIB as the foundering position | 41°43.6′N 49°56.9′W | `maib-1992-reappraisal` READ (latitude legible in the scan; longitude confirmed from Halpern's verbatim quotation) | established |
| W3 | Bow section | 41°43′57″N 49°56′49″W | SNIPPET only (search summary quoting an unidentified site that lists bow / stern / boilers coordinates); widely repeated; origin said to be Ballard 1987 — FROM-MEMORY | estimated (not verified on a page I read) |
| W4 | Stern section | 41°43′35″N 49°56′54″W | SNIPPET (same); consistent with W2 (41°43.6′N 49°56.9′W) | estimated |
| W5 | Bow–stern separation | "about 600 m (1,970 ft / 2,000 ft)": `mengot-bow-web` READ ("1970 feet (600 meters) from the stern section"); `bbc-2025-scan` ("about 600 m"); `wikipedia-wreck`. BUT `bbc-2023-scan` READ says "separated by about 800m (2,600ft)". COMPUTED from W3/W4: 0.37 nm = **690 m** centre-to-centre, stern bearing 190° true from the bow. | as listed; `own-computation` | estimated — the figures differ because of what is measured (gap between nearest ends vs. distance between reference points); record ~600 m as the usual figure with a 600–800 m range |
| W6 | Bow → boiler field | COMPUTED from W1/W3: 0.42 nm (≈ 770 m), bearing 180° (boiler field due south of the bow point) | `own-computation` | estimated |
| W7 | Depth | "3,800m (12,500ft)" (`bbc-2023-scan` READ; `bbc-2025-scan`); "12,500 feet" (`smithsonian-2025-scan`; `wikipedia-wreck`); "12,000 feet" (`whoi-oceanus-quest-to-map` caption, rounded); 3,795 m (`wikipedia-sinking`); "3840 metres (12,600 feet)" (SNIPPET, unidentified site); Seiffert: "almost 4,000m" (`bbc-2023-scan`). Britannica's "3,810 m": UNVERIFIED (403). | as listed | established as ≈ 3,800 m (≈ 12,500 ft); exact bow/stern depths UNVERIFIED |
| W8 | Location description | ~325 nmi (≈ 600 km) SSE of Newfoundland (`wikipedia-wreck`); "375 miles southeast of Halifax" (as printed; hard to reconcile with the Newfoundland figure — do not reuse) (`archaeology-2012-delgado` READ); "about 400 miles off Canada" (`smithsonian-2025-scan`) | as listed | estimated |
| W9 | Bow embedded | "dug into the bottom roughly 60 feet (18 meters) at the anchors. At the rear it sits almost on top of the mud" (`mengot-bow-web` READ); "up to 20 m" (`wikipedia-sinking` POINTER) | as listed | estimated |
| W10 | Section lengths | Bow ~450 ft (137 m) (Mengot) / ~470 ft (Wikipedia); stern ~350 ft (Wikipedia) | `mengot-bow-web` READ; `wikipedia-wreck` POINTER | estimated |
| W11 | Orientation on the seabed | Bow pointing roughly north / NNE; stern facing roughly the opposite way (rotated ~180°), lying south-south-west of the bow | Headings: FROM-MEMORY — **no page reached this session states the headings**. Only the relative position (stern 190° true from bow) is COMPUTED from W3/W4 (`own-computation`). | UNVERIFIED (headings); estimated (relative position) |
| W12 | Debris fields (1985–86 picture) | Two fields, each ~2,000–2,600 ft (600–800 m) long, trailing south-west from bow and stern; ~2 sq mi; densest near the stern | `wikipedia-wreck` POINTER (Ballard 1987 pp. 150, 207) | estimated |
| W13 | Full site extent (2010 picture) | "a roughly three-by-five-mile area that encompasses the full extent of the wreck" (Delgado) — i.e. ≈ 15 sq mi ≈ 4.8 × 8 km ≈ 39 km² (COMPUTED conversion, statute miles). Lange: REMUS could "map 15 to 20 square miles of seafloor". Wikipedia gives "3 × 5 nmi". Smithsonian: 15 square miles of seafloor mapped. | `archaeology-2012-delgado` READ; `whoi-oceanus-quest-to-map` READ; `wikipedia-wreck`; `smithsonian-2025-scan` | established (≈ 3 × 5 mi surveyed); note statute-vs-nautical ambiguity |
| W14 | "Artifact field" near the stern | > 60 major features and tens of thousands of artefacts; includes five boilers from boiler room 1, two reciprocating-engine cylinders, 51 tons of coal, pieces of hull, base of funnel 3 deckhouse | `archaeology-2012-delgado` READ; `wikipedia-wreck` POINTER | established |
| W15 | "Big Piece" | A ~22-ton piece of doubled sheer-strake side plating; MFP footnote: from "several feet forward of the second expansion joint", recovered by the 1998 expedition. Mengot's web page says starboard side "just aft of the expansion joint", ~25 ft wide, recovered "in 1997" [sic]. Wikipedia: 20 tons, 15 × 25 ft, four portholes, C–D deck cabins, failed lift in 1996, raised 1998. | `sname-mfp-2009-breakup` READ; `mengot-breakup-web` READ; `wikipedia-wreck` POINTER | established (existence, 1998 recovery); debated (exact original location, weight 20 vs 22 t) |

### 4.2 Discovery and surveys

| # | Statement | Source | Certainty |
|---|---|---|---|
| S1 | Wreck found in the early morning of 1 September 1985 by *Argo* (unmanned towed video/sonar vehicle) towed by WHOI's R/V *Knorr*; expedition led by Robert Ballard (WHOI). | `archaeology-2012-delgado` READ; `maib-1992-reappraisal` READ; `bbc-2023-scan` READ (video caption); `wikipedia-sinking` | established |
| S2 | Joint US–French expedition (IFREMER as co-discoverer). Jean-Louis Michel as co-leader and the French ship *Le Suroît* (sonar search phase): FROM-MEMORY. | `wikipedia-sinking` ("joint US-French expedition"); `archaeology-2012-delgado` READ ("codiscoverers IFREMER") | established (joint expedition); FROM-MEMORY (Michel, Le Suroît) |
| S3 | 1986: Ballard returned with *Atlantis II*, *Alvin* and *Jason Jr.*; 1987: *Nautile* recovered the first ~1,800 artefacts; RMS Titanic Inc. raised ~5,000 artefacts over seven expeditions 1987–2004. | `archaeology-2012-delgado` READ; `wikipedia-wreck` | established |
| S4 | NOAA expeditions 2003 and 2004 (2004: NOAA Ship *Ronald H. Brown*, 27 May–12 June 2004, with Ballard) — partial photomosaics, deterioration studies. | `archaeology-2012-delgado` READ ("two by NOAA in 2003–2004"); dates and ship from search snippets only (SNIPPET) | established (existence); SNIPPET (dates) |
| S5 | 2010 expedition: led by David Gallo (WHOI); paid for by RMS Titanic Inc.; partners WHOI, Waitt Institute, Phoenix International, NOAA, US National Park Service; ship *Jean Charcot* from St John's, August 2010; two AUVs (12.5 ft long, 28 in diameter, ~1 ton, rated ~20,000 ft, up to 22 h per dive, multibeam + side-scan + sub-bottom sonar + camera) "mowing the lawn", plus ROV *Remora* with HD/3-D cameras; first comprehensive site map (sonar + optical mosaics, ~225 optical mosaics; published 2012); three hurricanes interrupted work. | `archaeology-2012-delgado` READ; `whoi-oceanus-quest-to-map` READ | established |
| S5a | AUV model name "REMUS 6000": the WHOI article says "REMUS vehicles"; the "6000" designation is FROM-MEMORY (consistent with the ~20,000 ft rating). "Over 130,000 high-resolution images": `wikipedia-wreck` only (POINTER). | as listed | estimated |
| S6 | 2022 scan: carried out in summer 2022 by Magellan Ltd (deep-sea mapping) with Atlantic Productions; submersibles remotely controlled from a ship; "more than 200 hours" surveying; "more than 700,000 images"; first full-sized digital scan ("digital twin"); first revealed by BBC News on 17 May 2023. | `bbc-2023-scan` READ | established |
| S7 | Figures attributed to NatGeo/Magellan: 715,000 photos + "millions of laser scans/measurements"; 16 terabytes incl. 4K video; three weeks of data collection at the site; model accurate "down to the rivet". | `bbc-2025-scan` (photo caption: 715,000 photos and millions of laser scans); `smithsonian-2025-scan` (three weeks, 16 TB, 715,000 photos, 4K video) — both via summarised fetch | established (figures consistently reported); raw NatGeo page not read |
| S8 | Two ROVs named *Romeo* and *Juliet*; "six-week expedition" (vs "three weeks" at depth); "largest underwater 3D scan" is Magellan's own claim (its CEO: about ten times larger than any previous underwater 3D model). BBC 2023 wording is weaker: Seiffert called it "the largest underwater scanning project he'd ever undertaken". | `magellan-2022-press` SNIPPET; `bbc-2023-scan` READ | estimated (SNIPPET); treat "largest" as a self-reported claim |
| S9 | July 2024: RMS Titanic Inc. expedition, first in 14 years (high-resolution imaging). | `wikipedia-wreck` POINTER | established (pointer) |

---

## 5. Positions

### 5.1 Reported and reconstructed positions

| # | Position | Coordinates | Holder / source | Certainty |
|---|---|---|---|---|
| P1 | CQD/SOS position worked out by Boxhall (second position transmitted) | 41°46′N 50°14′W | `bot-report-1912` READ (title page: "in lat. 41° 46' N., long. 50° 14' W."); `bot-testimony-boxhall` READ (Q15389); `us-senate-report` READ ("41.46 north latitude and 50.14 west longitude") | established (as the position transmitted; wrong as the true position) |
| P2 | First distress position (Capt. Smith's) | 41°44′N 50°24′W | Coordinates FROM-MEMORY. Consistency check: `wikipedia-sinking` says the first position was "roughly 20 nmi west" of the true one, and COMPUTED distance wreck→P2 is 20.3 nm on 271° true. | estimated (coordinates not read on a primary page) |
| P3 | Foundering position (boiler field) | 41°43′32″N 49°56′49″W | see W1 | established |
| P4 | MAIB collision position | ≈ 41°47′N 49°55′W (11:45 p.m.) | `halpern-collision-point` READ (quoting MAIB); `maib-1992-reappraisal` READ (lat legible) | estimated (method: run the current back 2 h 35 min from the wreck, + ½ mile) |
| P5 | Halpern final stopping point (~midnight) | 41°45.9′N 49°55.8′W | `halpern-collision-point` READ | estimated (method: drift 2 h 20 min back from boiler field at 1.09 kn / 196.7° true) |
| P6 | Halpern collision point | ≈ 41°45.5′N 49°55′W ("about a mile and a half south" of MAIB's) | `halpern-collision-point` READ | estimated (P5 minus ~¾ mile W and ~½ mile N of post-collision travel) |
| P7 | Local current | Set ~196.7° true, drift 1.09 kn (Halpern); 196.2° / 1.23 kn, "something like 1¼ knots", "about south by west" (MAIB) | `halpern-collision-point` READ; `maib-1992-reappraisal` READ | estimated |
| P8 | Wreckage/flotsam position logged by Californian, 11:20 a.m. 15 April | 41°33′N 50°01′W (a DR position); Halpern's corrected EP 41°33.9′N 50°0.6′W | `bot-report-1912` READ; `halpern-collision-point` READ | estimated |

### 5.2 Distance and bearing, CQD position vs wreck

| # | Statement | Source | Certainty |
|---|---|---|---|
| P9 | MAIB: the wreck was found "in a position some 13 miles from that accepted by the 1912 Inquiry". | `maib-1992-reappraisal` READ (p. 1) | established |
| P10 | COMPUTED great circle, bow point (W3) → CQD (P1): **12.99 nm (24.06 km), bearing 279° true** (i.e. the CQD position is ~13 nm W by N of the wreck; the wreck is ~13 nm on 099° true, E by S, from the CQD position). Boiler field (W1) → CQD: 13.06 nm, 281°. MAIB point (W2) → CQD: 12.99 nm, 281°. | `own-computation` | established (arithmetic), given the coordinates |
| P11 | Wikipedia gives "about 13.5 nmi" for Boxhall's error and "roughly 20 nmi" for Smith's; a secondary site (titanicofficers.com, SNIPPET) gives "20 miles and 13 miles too far to the west". | `wikipedia-sinking` POINTER; SNIPPET | estimated |
| P12 | "About 13 nautical miles … per a secondary source citing the NOAA 2004 expedition": UNVERIFIED as a NOAA statement. All NOAA Ocean Explorer 2004-expedition URLs tried returned 404 and two targeted searches found no NOAA page stating the figure. The number itself is confirmed independently (P9, P10). Recommend citing `maib-1992-reappraisal` + `own-computation` instead of NOAA. | `noaa-2004-expedition` (not reached) | UNVERIFIED (attribution); established (number) |
| P13 | Why Boxhall was wrong: MAIB suggests "the wrong distance being allowed along the course line from the last known position"; the true collision point lies practically on his 266° course line. | `maib-1992-reappraisal` READ (quoted in `halpern-collision-point`) | debated (cause of the error) |
| P14 | Mount Temple went to the CQD position (west of the ice field) and never sighted Titanic's actual position; Californian passed Mount Temple there ~7:30 a.m. and "saw no wreckage there". | `maib-1992-reappraisal` READ; `bot-report-1912` READ | established |

---

## 6. Environment that night

| # | Statement | Source | Certainty |
|---|---|---|---|
| N1 | "From 6 p.m. onwards to the time of the collision the weather was perfectly clear and fine. There was no moon, the stars were out, and there was not a cloud in the sky." | `bot-report-1912` READ (Weather Conditions) | established |
| N2 | Air temperature fell 10 °F in slightly less than two hours; 33 °F by about 7:30 p.m., eventually 32 °F (0 °C). | `bot-report-1912` READ | established |
| N3 | Lee (British Day 4): Q2401 "A clear, starry night overhead, but at the time of the accident there was a haze right ahead." Q2402 "There was no moon." Q2403 no wind "barring what the ship made herself"; Q2404 "Quite a calm sea."; Q2405 cold: "Very, freezing." | `bot-testimony-lee` READ | established (testimony) |
| N4 | US report: weather clear the whole voyage, sea calm, "bright starlight every night"; distress messages reported weather "calm and clear". | `us-senate-report` READ | established |
| N5 | Sea "like glass, so smooth that the stars were clearly reflected" (Gracie 1913 p. 247). | `wikipedia-sinking` POINTER | established (testimony; pointer) |
| N6 | Sea temperature ≈ −2 °C (≈ 28 °F). | `wikipedia-sinking` POINTER (unattributed sentence near Butler 1998). The "28 °F" form and its inquiry origin (Lightoller / Californian readings) are FROM-MEMORY. | estimated |
| N7 | Moon: COMPUTED new moon 17 April 1912 ≈ 11:40 UT (Meeus series; previous full moon 1 April ≈ 22:04 UT). At the sinking (≈ 05:18 UT 15 April if ship time = GMT − 2 h 58 min) the Moon was ≈ 2.3 days before new — a thin waning crescent (≈ 6 % illuminated, elongation ≈ 27–28° west of the Sun), which only rises shortly before the Sun; it was below the horizon throughout collision and sinking. Compute exact rise time with the ephemeris. | `own-computation`; testimony "no moon" in N1/N3 | established (no Moon in the sky); estimated (phase figures, my calculation) |
| N8 | Haze — conflicting testimony. Lee: haze "right ahead … extending more or less round the horizon", and (Q2408) "My mate happened to pass the remark to me. He said, 'Well; if we can see through that we will be lucky.'" Boxhall (British Day 13, Q15339–40): "I never saw any haze whatever." Fleet: slight haze, "nothing to talk about"; Lightoller: none; Capt. Lord described a "soft horizon" (all three POINTER via Halpern 2011 pp. 85–88). | `bot-testimony-lee` READ; `bot-testimony-boxhall` READ; `wikipedia-sinking` POINTER | debated |
| N9 | Refraction/mirage hypothesis: Tim Maltin argues a strong thermal inversion (cold Labrador Current water under warmer air) produced super-refraction — a raised false horizon / "refraction haze" that hid the berg's outline and distorted the view between Titanic and Californian (and scrambled Morse-lamp signals). | `maltin-refraction` SNIPPET | debated |
| N9a | Earlier and independent: MAIB 1992 (de Coverly) considers "abnormal ('super-') refraction" as the only way Californian could have seen Titanic at 17–20 miles, but thinks it "more likely that she was not seen"; Annex 4 reproduces the Mariner's Handbook note (super-refraction favoured by temperature inversion, calm, cold sea). | `maib-1992-reappraisal` READ | debated |
| N9b | Critics: Halpern attributes the lookouts' "haze" to an indistinct ("soft") horizon on a dark, flat-calm night rather than a mirage (POINTER, Halpern 2011 pp. 85–88). A specific published rebuttal of Maltin was not located (UNVERIFIED). | `wikipedia-sinking` POINTER | debated |
| N10 | Ice: a field of pack ice "stretched from far to the north to far to the south … 5 to 6 miles in width" (Halpern, from Californian and Mount Temple evidence); around Californian "loose ice extending for a distance of not more than two or three miles in the direction of the Titanic" (British report). Titanic stopped on the **east** side of the field; the CQD position lay on its **west** side. Flat calm is itself now read as a sign of nearby pack ice (Halpern 2011 p. 85, POINTER). ~400 bergs crossed 48°N in April 1912 (Bigg & Wilton 2014, POINTER). | `halpern-collision-point` READ; `bot-report-1912` READ; `wikipedia-sinking`, `wikipedia-iceberg` POINTER | established (ice field); estimated (dimensions) |
| N11 | Swell / breeze getting up towards dawn (Lightoller's account of Collapsible B) | FROM-MEMORY — not found on a page read this session | UNVERIFIED |
| N12 | Carpathia picked up the survivors from ~4:00 a.m.; her lights first seen ~3:30. | `wikipedia-sinking` POINTER (Bartlett 2011 p. 238) | established (pointer) |

### 6.1 Heading

| # | Statement | Source | Certainty |
|---|---|---|---|
| H1 | Course before the collision: 266° true (= S 86° W true); speed ≈ 22½ knots (US report: "not less than 21 knots"). | `halpern-collision-point` READ ("the 266° true course line used by … Boxhall"; "approach course was 266° true"); `us-senate-report` READ. The "S 86° W" wording in the inquiry transcript itself: FROM-MEMORY. | established |
| H2 | Avoiding action: hard-a-starboard (helm order → bow to port); "had turned about two points to port before the collision" (≈ 22.5°; ~37 s and ~466 yd from Olympic trials); berg sighted at about 500 yards. | `bot-report-1912` READ (The Collision) | established (court finding); estimated (figures) |
| H3 | Heading while sinking: Halpern — after the berg passed, port helm was ordered (Olliver), the ship swung to starboard and ended pointing roughly north; QM Rowe said "her head was facing north" (compass, i.e. magnetic; variation ≈ 2 points W, so ≈ NNW true); possibly "North-by-West ½ West magnetic" at final stop, swinging slowly back towards magnetic north (British Inquiry Q17667–17674, as cited by Halpern); ship travelled ~¾ mile W and ~½ mile N after the collision. | `halpern-collision-point` READ | debated |
| H4 | Counter-view: MAIB (de Coverly): "initially she went to port and the balance of evidence seems to be that afterwards her heading did not much change" — hence her port (red) light would not have been open to a ship to the north-west. | `maib-1992-reappraisal` READ | debated |
| H5 | Bow found pointing roughly north on the seabed (argument that she pointed north at the surface) | FROM-MEMORY; see W11 | UNVERIFIED this session |

### 6.2 Iceberg (render generic; all `estimated`/`debated`)

| # | Statement | Source | Certainty |
|---|---|---|---|
| I1 | Lee (British Day 4): Q2439 "It was higher than the forecastle"; forecastle head ≈ 55 ft above water (Attorney-General, Q2441). Q2441: "It was a dark mass that came through that haze and there was no white appearing until it was just close alongside the ship". Q2442: one side "seemed to be black, and the other side seemed to be white". Q2447: first seen at "half a mile or more; it might have been less". | `bot-testimony-lee` READ | established (testimony); estimated (size) |
| I2 | Other witnesses (POINTER via Fitch, Layton & Wormstedt and the inquiry pages): Fleet — a black object slightly higher than the forecastle; QM Olliver — about boat-deck height, "not white" but "a kind of dark blue"; QM Rowe — about 100 ft high, passed < 10 ft from the docking bridge; AB Scarrott — like "the Rock of Gibraltar looking at it from Europa Point", only much smaller; passengers — 75–100 ft. | `wikipedia-iceberg` POINTER | estimated |
| I3 | Summary size used by Bigg & Wilton (Weather, 2014): 50–100 ft (15–30 m) high, ~400 ft (~125 m) long. | `wikipedia-iceberg` POINTER | estimated |
| I4 | Ice fell on the forward well deck (e.g. ~2 ft of ice in the starboard scuppers, steward Littlejohn). | `wikipedia-iceberg` POINTER | established (testimony, pointer) |
| I5 | Candidate photographs: (a) chief steward of *Prinz Adalbert*, morning of 15 April — berg with a red smear at the base; (b) Capt. W. F. Wood, *Etonian*, 12 April, 41°30′N 49°30′W; (c) Capt. de Carteret, cable ship *Minia* (body-recovery voyage) — favoured by Bigg & Wilton; (d) *Carpathia* passengers Bernice Palmer and Hope Chapin, dawn 15 April. The *Bremen* photograph (Stephan Rehorek, 20 April): FROM-MEMORY, not in the pages read. | `wikipedia-iceberg` POINTER | debated — none can be verified as "the" berg |

---

## 7. SS Californian and the "mystery ship" (all `debated`)

| # | Position / claim | Holder | Source |
|---|---|---|---|
| K1 | Californian stopped at 10:20/10:21 p.m. ship's time at 42°05′N 50°07′W by her master's reckoning, heading ENE by compass, slowly swinging to starboard through the night. (The titanicinquiry.org transcription of the British report prints "42° 5' N., 57° 7' W." once — a typo; the same page later gives "42° 5' N.; 50° 7' W.".) | Capt. Stanley Lord (log, written up from a destroyed scrap log) | `bot-report-1912` READ; `us-senate-report` READ |
| K2 | That position is "about 19 miles N. by E." of the CQD position; equivalently the CQD position bore "S. 16° W. (true), 19 miles" from Californian. US report: "distant in a northerly direction 19 1/2 miles according to the Captain's figures". COMPUTED: 19.7 nm, CQD bearing 195° true from K1 (K1 bears 015° from CQD) — agrees. | Lord; both 1912 inquiries (as his claim) | `bot-report-1912` READ; `us-senate-report` READ; `own-computation` |
| K3 | COMPUTED relative to the *actual* wreck (boiler field): K1 is 22.8 nm away on 341° true (NNW); relative to Halpern's collision point: 21.5 nm on 336°. So "north-north-west of Titanic" is right for the true position, while "N by E" applies to the erroneous CQD position. | `own-computation` | — |
| K4 | British court (Mersey): "I am satisfied that this position is not accurate"; the ship seen was Titanic; by Lord's own estimate of the steamer he watched "the two vessels were about five miles apart"; "I am advised that the distance was probably greater, though not more than eight to ten miles." | Lord Mersey and assessors | `bot-report-1912` READ |
| K5 | US Senate: Californian "was nearer the Titanic than the 19 miles reported by her captain"; her officers and crew saw the distress signals and failed to respond. | Senator Smith's committee | `us-senate-report` READ |
| K6 | MAIB 1992, Inspector (Capt. Barnett): Titanic was seen by Californian; the ships were "between 5 and 10 miles apart … probably nearer five" (summary: "probably further East and only 5 to 7 miles off"). | Capt. Thomas Barnett | `maib-1992-reappraisal` READ |
| K7 | MAIB 1992, Deputy Chief Inspector (de Coverly, whose view forms the report's conclusion): Californian was "between 17 and 20 miles from TITANIC – most likely about 18 miles", "bearing about NW by N from her"; Titanic was probably not seen (or only by abnormal refraction); the ship seen by Californian was "more probably … another, unidentified, vessel". Both men agreed the rockets were seen and "proper action was not taken"; even with prompt action Californian "would probably … have reached the scene at just about the time of sinking" (minimum 17 miles) and realistically later. | Capt. James de Coverly | `maib-1992-reappraisal` READ |
| K8 | Halpern (*Strangers on the Horizon*, 2019): ~12 nautical miles, Californian to the NNW of Titanic | Samuel Halpern | FROM-MEMORY for the figure — the book is only listed in `wikipedia-californian`; not verified. The collision-point article READ does treat Californian's observers as seeing Titanic stop at 11:40 Californian time. |
| K9 | Lord's defenders ("Lordites": Leslie Harrison, Peter Padfield, Senan Molony): ~19–20+ miles, a third ship between them | as named | Names/books POINTER (`wikipedia-californian`); distance figure is Lord's own (K2) |
| K10 | What Californian saw: Lord put the approaching steamer at 6–7 miles at 11:00 and ~5 miles when her green light showed; Groves saw her stop at 11:40 and "put her lights out"; Stone and Gibson saw eight white rockets between ~12:45 and ~1:40; ship "disappeared" bearing SW ½ W (compass) about 2:05–2:40 a.m. Californian time. Stone Q7976. | Californian officers | `bot-report-1912` READ |
| K11 | "Mystery ship" seen from Titanic: Boxhall (British Day 13, Q15388–15393) saw "two masthead lights of a steamer", by glasses "probably about half a point on the port bow"; he tried the Morse lamp and thought her near enough to signal (Q15408). US report: "Sixteen witnesses from the Titanic … testified to seeing the light of a ship in the distance" and boats were told to pull for it. Boxhall and Lowe estimates of ~5 miles: POINTER. | Titanic witnesses | `bot-testimony-boxhall` READ; `us-senate-report` READ; `wikipedia-californian` POINTER |
| K12 | MAIB objection to identity: Lord and Stone saw the other ship's **red** (port) light, implying she swung markedly to starboard, whereas (MAIB) Titanic's heading "did not much change"; Stone also noticed a change of bearing. Counter (Halpern, H3): Titanic did swing to starboard/north after the collision, which would open her red light to a ship to the NNW. | de Coverly vs Halpern | `maib-1992-reappraisal` READ; `halpern-collision-point` READ |
| K13 | Other candidates: Norwegian sealer *Samson* (Henrik Naess's later claim of being ~10 miles off) — mentioned by MAIB without endorsement; generally regarded as discredited (FROM-MEMORY). *Mount Temple* was ~49 miles W of the CQD position per the US report (41°25′N 51°14′W). | — | `maib-1992-reappraisal` READ; `us-senate-report` READ |
| K14 | Other ships' distances in the US report: Carpathia 58 miles (course N 52° W); Birma 70; Frankfurt 153 SW; Virginian ~170; Baltic ~243 SE; Olympic ~512 W. | `us-senate-report` READ | established (as reported in 1912) |

---

## 8. Human toll (counts by source — keep them distinct)

### 8.1 British Wreck Commissioner's report (1912) — READ on titanicinquiry.org

| Group | On board | Saved | Lost (computed = on board − saved) | % saved (as printed) |
|---|---|---|---|---|
| 1st class | 325 | 203 | 122 | 62.46 |
| 2nd class | 285 | 118 | 167 | 41.40 |
| 3rd class | 706 | 178 | 528 | 25.21 |
| **Passengers** | **1,316** | **499** | **817** | 37.94 |
| Deck dept | 66 | 43 | 23 | 65.15 |
| Engine dept | 325 | 72 | 253 | 22.15 |
| Victualling dept (incl. 23 women, 20 saved) | 494 | 97 | 397 | 19.63 |
| **Crew** | **885** | **212** | **673** | 23.95 |
| **Total** | **2,201** | **711** | **1,490** | 32.30 |

- Further detail READ: 1st class adult males 57 of 175, adult females 140 of 144, all 6 children saved; 2nd class adult males 14 of 168, females 80 of 93, all 24 children saved; 3rd class adult males 75 of 462, females 76 of 165, male children 13 of 48, female children 14 of 31. Overall: adult males 338 of 1,167; adult females 316 of 425; children 57 of 109.
- The report's formal heading speaks of "the loss of 1,490 lives" (READ) — this is the British inquiry's figure.
- **The figure "1,503 lost" is NOT in the report pages I read.** It is commonly attributed to the British Board of Trade's (revised) casualty return — FROM-MEMORY. Do not label 1,503 as "British inquiry"; label 1,490 as such.
- Certainty: `established` as the court's 1912 count; the true number is `debated` across sources.
- The eight bandsmen are counted among 2nd-class passengers (READ).

### 8.2 US Senate report (1912) — READ on titanicinquiry.org

| Group | On board | Saved | Lost |
|---|---|---|---|
| 1st class | 329 (156 w&c, 173 men) | 199 | 130 |
| 2nd class | 285 (128, 157) | 119 | 166 |
| 3rd class | 710 (224, 486) | 174 | 536 |
| **Passengers** | **1,324** | **492** | **832** |
| Crew | 899 (23 women, 876 men) | 214 | 685 |
| **Total** | **2,223** | **706** | **1,517** |

- Percent saved as printed: 1st 60, 2nd 42, 3rd 25, crew 24, total 32.
- Transcription note: the summary table on titanicinquiry.org prints third-class men on board as "476", but the body of the report and the column totals require 486.
- Certainty: `established` as the committee's 1912 count.

### 8.3 Other counts

| Source | Aboard | Survivors | Victims | Status |
|---|---|---|---|---|
| Encyclopedia Titanica | 2,208 | 712 | 1,496 | UNVERIFIED on ET itself (HTTP 403 via curl and WebFetch). A third-party statistics blog that uses ET data shows 712 survivors of 2,208 (SNIPPET). Class/crew breakdown not obtained. |
| Board of Trade surveyor Eber Sharpe (British Inquiry Day 26) | 2,207 at departure from Queenstown (1,316 passengers + 891 crew) | — | — | `wikipedia-sinking` POINTER |
| Wikipedia summary | "over 2,200" | 710 (rescued by Carpathia) | 1,490–1,517 (range across sources) | `wikipedia-sinking` POINTER |
| BBC 2023/2025 | — | — | "more than 1,500" / "about 1,500" | `bbc-2023-scan` READ; `bbc-2025-scan` |
| Britannica | — | — | — | UNVERIFIED (403) |

Other figures READ: lifeboat capacity 1,176 vs 706 saved (US report); the British report names 1,316 passengers incl. 109 children (6 / 24 / 79 by class).

Recommendation for the dataset: store each count with its source id; display a range (≈ 1,490–1,517 lost; 705–713 saved) rather than a single number.

---

## 9. Sky (context only — positions to be computed from an ephemeris)

| # | Statement | Source | Certainty |
|---|---|---|---|
| Y1 | No Moon in the sky during collision and sinking; cloudless; stars brilliant; no wind; sea flat calm (stars reflected in the water). | N1, N3, N5, N7 | established |
| Y2 | New Moon 17 April 1912 ≈ 11:40 UT (COMPUTED). FROM-MEMORY: this new Moon produced the hybrid solar eclipse of 17 April 1912. | `own-computation` | estimated |
| Y3 | Olson, Doescher & Sinnott (*Sky & Telescope*, April 2012) is **not** about the sky that night: it argues that on 4 January 1912 a full Moon occurred within minutes of an exceptionally close lunar perigee (closest in > 1,400 years), one day after Earth's perihelion, raising unusually high spring tides that could have refloated grounded Labrador/Newfoundland bergs so that more drifted south into the shipping lanes by April. Olson: "we don't claim to know exactly where the Titanic iceberg was in January 1912". | `olson-2012-moon` SNIPPET | debated (hypothesis) |
| Y4 | Published list of which bright stars/planets were up, Milky Way, zodiacal light, aurora (reported by some survivors — FROM-MEMORY), meteors: nothing sourced this session. Derive from the ephemeris for ≈ 41.73°N, 49.95°W; state the UT convention used (see §2 note on ship's time). | — | UNVERIFIED |
| Y5 | Sunrise / first light: a waning-crescent Moon rising just before dawn and Venus as morning star | FROM-MEMORY, not sourced | UNVERIFIED |
| Y6 | Starlight was the only illumination of the berg: with no swell there was no surf line at its base; Zeusler (USCG, 1925): a medium berg visible ~1 nm on a clear moonless night; Lightoller and Smith expected 3–4 nm. | `wikipedia-iceberg` POINTER (Halpern) | estimated |

---

## 10. Open questions / could not verify

1. **NOAA 2004 expedition statement of "13 nautical miles"** — NOAA Ocean Explorer 2004 pages are gone (404 at every URL tried; Wayback Machine connection reset). The figure is independently supported by MAIB ("some 13 miles") and by my computation (12.99–13.06 nm, bearing ≈ 279–281° true from wreck to CQD position). Cite those instead.
2. **Bow and stern coordinates** (41°43′57″N 49°56′49″W; 41°43′35″N 49°56′54″W) — seen only in a search summary; need Ballard 1987 (p. 199 and appendix) or the Uchupi/Ballard/Lange 1986 site paper. The boiler-field coordinate is solid.
3. **Bow–stern separation**: 600 m (Mengot, BBC 2025, Wikipedia) vs 800 m (BBC 2023) vs 690 m computed from the unverified coordinates. Decide what is being measured (nearest ends vs centres) and take it from the 2010 or 2022 site map if obtainable.
4. **Seabed headings of bow and stern** — not found on any page read. Needs Ballard 1987, the 2010 site map, or the Magellan model.
5. **Exact depths of bow and stern** and Britannica's figures — Britannica returned 403.
6. **Encyclopedia Titanica totals and class breakdown** (2,208 / 712 / 1,496) — ET returned 403 to curl and WebFetch.
7. **"1,503 lost"** — not in the British report pages read (which give 1,490). Its provenance (Board of Trade return) needs a citation.
8. **Smith's first distress position 41°44′N 50°24′W** — from memory; verify in the wireless evidence (US Inquiry, Cottam/Bride; Marconi procès-verbal) or Halpern.
9. **"S 86° W true"** wording — verify in Boxhall/Pitman testimony; 266° true is confirmed via Halpern.
10. **Garzke et al. 1997 SNAME paper and the 1996 Gibbs & Cox analysis** — the angle and stress assumptions were not read; only Mengot/Woytowich's criticism of them was.
11. **1997 film "~45°" and Cameron 2012 "~23°"** — from memory only.
12. **Roger Long's 10–11° hypothesis and Stephenson's rebuttal** — search-snippet level; get the 2005 AP article or Long's own write-up.
13. **Halpern's Californian distance (~12 nm)** — from memory; needs *Strangers on the Horizon* (2019) or his titanicology articles.
14. **Marine Technology 2010 citation details** (volume/issue/pages) of the Mengot–Woytowich paper — only the 2009 meeting version was read.
15. **National Geographic's own 2025 page** — not read. ROV names (*Romeo*, *Juliet*), "six weeks", and the "largest underwater 3D scan" claim rest on trade-press snippets; the BBC and Smithsonian texts were read through a summarising fetch rather than raw.
16. **Whether the 2022 scan supports or contradicts the bottom-up model** — no source found.
17. **Stern descent speed/duration as distinct from the bow's** — no source found.
18. **Sea temperature "28 °F"**, **dawn swell/breeze**, **aurora**, **planets visible**, **Bremen/Rehorek photograph**, **Le Suroît / Jean-Louis Michel** — from memory, not sourced this session.
19. **Break location wording** — "between funnels 3 and 4 at the aft expansion joint" is the traditional (top-down) description. The MFP places the initial failure in the double bottom at Frame 25 under Boiler Room No. 1 (forward of the reciprocating engine room), the bow section's aft edge at the No. 3 funnel uptake, and the upper failure near the aft expansion joint; the 2010 survey is summarised (Wikipedia, citing Cohen 2012) as a break "between funnels two and three". The visualisation should show a ~70 ft zone of disintegration rather than a single plane.
20. **Ship's-time ↔ GMT offset** (2 h 58 min per Halpern vs the 1912 US report's 1 h 33 min New York difference) — pick and document one before computing the sky.
21. **Trim angle at 1:30** — Wikipedia contradicts itself (≈ 5° vs ≈ 10°) citing the same book; check Halpern & Weeks 2011 pp. 109–118.
