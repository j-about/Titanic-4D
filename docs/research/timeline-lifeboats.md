# Titanic, night of 14–15 April 1912 — chronology, lifeboats, rockets, wireless, lights

Research notes for the dataset (not code). Compiled 2026-11-14.

## Conventions used in these notes

- **Clock times are Titanic ship's time (Apparent Time Ship, ATS) in unadjusted 14 April hours** unless a cell says otherwise. This is the time base used by Halpern, by Wormstedt/Fitch/Behe (WFB) and by Fitch/Layton/Wormstedt (FLW).
- Wireless logs (procès-verbaux, PVs) were kept in **New York time (NYT, 75th meridian mean time, GMT − 5 h)** or in **GMT**; one ship (Birma) logged in her own local time. Every wireless row below gives the logged NYT first and the conversion second. Conversion used by Halpern and by Paul Lee: **Titanic ATS = NYT + 2 h 02 min = GMT − 2 h 58 min**. The 1912 British report's times imply **NYT + 1 h 50 min**; the 1912 US Senate report used **NYT + 1 h 33 min**. See section 7.
- Certainty: `established` (primary evidence, broad consensus) / `estimated` (derived or approximate; method stated) / `debated` (competing positions stated with holders).
- Provenance flags: everything is **read on the page by me** unless flagged `FROM-MEMORY` (not seen in any source I fetched; lower its certainty) or `SECONDHAND` (I read a page that reports what another work says; I did not see that other work).
- `UNVERIFIED` = I looked and could not confirm.
- "BI 12345" = British Wreck Commissioner's Inquiry question number; "AI p. 123" = US Senate Inquiry transcript page. Where I give them inside a Halpern/WFB citation, they are the references *those authors* give; I only opened the testimony pages listed under "Sources consulted".
- Short quotations are from the 1912 transcripts and are under 25 words.

---

## Sources consulted

### Fetched and read (in whole or in the parts stated)

| id | Source | Fetched? |
|---|---|---|
| `flw-new-study-2026` | Tad Fitch, J. Kent Layton & Bill Wormstedt, *Titanic: The Lifeboat Launching Sequence – A New Study* (PDF, 253 pp.; title page reads "Version 1.4, May 2026", file name says v. 1.3; PDF created 23 May 2026). https://wormstedt.com/titanic/TITANIC_THE%20LIFEBOAT%20LAUNCHING%20SEQUENCE_A%20NEW%20STUDY_v.%201.3.pdf | Yes (curl). Read: introduction, opening of section 1, "Final summary of findings and revisions" (pp. 243–252); keyword searches in the rest. **Not read cover to cover.** |
| `flw-launch-table-2026` | Same authors, chart "Launch Times Re-Examined – 2026 Version" (image "April 11 chart.jpg"). https://wormstedt.com/titanic/lifeboats/2026%20Launch%20Times.html | Yes (image viewed). This is the latest revision of the WFB sequence that I could find. |
| `wfb-lifeboat-sequence` | Bill Wormstedt, Tad Fitch & George Behe, with contributions by Sam Halpern and J. Kent Layton, "Titanic: The Lifeboat Launching Sequence Re-Examined" (orig. *The Titanic Commutator* no. 155, 2001; web revisions 2009, 2010, 2012, Dec 2022, Feb 2023). http://wormstedt.com/Titanic/lifeboats/lifeboatarticle.htm (frame of http://wormstedt.com/Titanic/lifeboats/lifeboats.htm) | Yes (curl). Read: introduction, "Distress rockets and QM Rowe", "Launch time of the first lifeboat", "Combined launch sequence and timings" (opening), boat 2 / last rocket passage, collapsibles C/D/A/B, conclusion. |
| `wfb-table-1` | Same article, Table 1 "British Inquiry Launch Times – 1912". http://wormstedt.com/Titanic/lifeboats/lifeboattable1.htm | Yes |
| `wfb-table-2` | Same article, Table 2 "Launch Times Re-Examined" (2001–2023 version). http://wormstedt.com/Titanic/lifeboats/lifeboattable2.htm | Yes |
| `brit-inquiry-report` | Wreck Commissioner's Court (Lord Mersey), *Report on the Loss of the "Titanic" (s.s.)*, 30 July 1912, as transcribed by the Titanic Inquiry Project. Sections read: The Collision (`…/BOTReport/botRepCollision.php`), Flooding in the first 10 minutes (`botRepFlooding.php`), Gradual effect of the damage (`botRepGradEff.php`), Final effect of the damage (`botRepFinEff.php`), The Boats (`BOTRepBoats.php`), Means taken to procure assistance (`botRepAssist.php`), Rescue by the S.S. Carpathia (`botRepRescue.php`), Electrical installation (`botRepElec.php`), Circumstances in connection with the S.S. Californian (`botRepCalifornian.php`, skimmed). Base: https://www.titanicinquiry.org/BOTInq/BOTReport/ | Yes (curl) |
| `us-inquiry-report` | US Senate, Committee on Commerce, *"Titanic" Disaster: Report* (Senate Report 806, 28 May 1912), Titanic Inquiry Project transcription. Pages read: `AmInqRep05.php` (collision, flooding, distress calls sent), `AmInqRep06.php` (distress calls heard, vessels in vicinity, Californian), `AmInqRep07.php` (lifeboats, ship sinking). Base: https://www.titanicinquiry.org/USInq/USReport/ | Yes (curl) |
| `brit-inquiry-day-13-boxhall` | British Inquiry, Day 13, testimony of Fourth Officer Joseph G. Boxhall, questions 15337 ff. https://www.titanicinquiry.org/BOTInq/BOTInq13Boxhall01.php | Yes (Q15340–15430 read) |
| `brit-inquiry-day-15-rowe` | British Inquiry, Day 15, testimony of Quartermaster George T. Rowe, Q17584 ff. https://www.titanicinquiry.org/BOTInq/BOTInq15Rowe01.php | Yes (Q17600–17699 read) |
| `brit-inquiry-day-07-stone` | British Inquiry, Day 7, testimony of Herbert Stone, Second Officer of the Californian, Q7799 ff. https://www.titanicinquiry.org/BOTInq/BOTInq07Stone01.php | Yes (Q7820–7940 read) |
| `brit-inquiry-day-07-gibson` | British Inquiry, Day 7, testimony of James Gibson, apprentice, Californian. https://www.titanicinquiry.org/BOTInq/BOTInq07Gibson01.php | Yes (selected answers) |
| `brit-inquiry-day-14-bride` | British Inquiry, Day 14, testimony of Harold S. Bride, junior Marconi operator. https://www.titanicinquiry.org/BOTInq/BOTInq14Bride02.php and `…Bride03.php` | Yes (Q16480–16580 read) |
| `us-inquiry-day-01-rostron` | US Senate Inquiry, Day 1, testimony of Captain Arthur H. Rostron (Carpathia). https://www.titanicinquiry.org/USInq/AmInq01Rostron01.php | Yes (selected passages) |
| `halpern-chronology-2023` | Samuel Halpern, "Chronology of Events with References and Notes", revised 28 March 2023 (35 pp.; first published in Halpern et al., *Report into the Loss of the SS Titanic – A Centennial Reappraisal*, The History Press, 2011). https://www.titanicology.com/Titanica/Chronology03-28-2023.pdf | Yes (curl). Read from 11:30 p.m. 14 April to 9:00 a.m. 15 April, plus notes 27–87. Time base: NYT (24 h) and "Bridge time" columns. **Uses Halpern's own 2023 lifeboat times**, not WFB/FLW. |
| `halpern-master-of-time` | Samuel Halpern, "Titanic's Master of Time", second print 10 Nov 2019. http://www.titanicology.com/Titanica/TitanicsMasterOfTime.pdf | Yes (read in full except diagrams) |
| `halpern-1h33` | Samuel Halpern, "1 Hour and 33 Minutes – A Time Difference Gone Wrong". https://www.titanicology.com/Titanica/1hour33minutes.pdf | Yes (read main text) |
| `halpern-dozen-rockets` | Samuel Halpern, "It May Have Been a Dozen or It May Have Been More". http://www.titanicology.com/Californian/ItMayHaveBeenADozen.pdf | Yes (read in full) |
| `halpern-what-color` | Samuel Halpern, "Signals of Distress – What Color Were They?", revised Feb 2021. http://www.titanicology.com/Californian/WhatColorWereThey.pdf | Yes (first 3 pp. and footnotes read; middle skimmed by keyword) |
| `halpern-lifeboats-list-trim-1` | Samuel Halpern, "Lifeboats, Launch Times, List and Trim – Part I" (2023). http://www.titanicology.com/Titanica/LifeboatLaunchTimesList&TrimPart1.pdf | Yes (pp. 1–3 read; rest keyword-searched) |
| `halpern-lifeboats-list-trim-2` | Same, Part II. http://www.titanicology.com/Titanica/LifeboatLaunchTimesList&TrimPart2.pdf | Yes (revised table, "Explanation of timing", trim data points, summary read) |
| `lee-desperate-dialogue` | Paul Lee, "Titanic: A Desperate Dialogue" (transcription and collation of the wireless PVs, with commentary). http://www.paullee.com/titanic/pv.php | Yes (curl). Read: introduction, the message table from 10:25 p.m. to 12:30 a.m. NYT, analysis of first and last messages. |
| `lifeboat-project-occupants` | Bill Wormstedt (project lead), George Behe, Tad Fitch, Ioannis Georgiou, Bob Godfrey, Cathy Jutilla-Lamet, Don Lynch, Mike Poirier, Craig Stringer, Geoff Whitfield, "Titanic: Which People Were in What Lifeboat – A New Study" (page says "Revision date – 11/13/26"). https://wormstedt.com/Lifeboat_Project/Lifeboat_Project_Survivors.html | Yes (curl). Used only to count named assignments per boat (see section 2 notes). |
| `wikipedia-lifeboats` | Wikipedia, "Lifeboats of the Titanic". https://en.wikipedia.org/wiki/Lifeboats_of_the_Titanic | Partly. Read through the WebFetch tool's summariser, first 100,000 characters only (cut off before the collapsibles). Used **only as a pointer** to Wormstedt & Fitch (2011) page numbers. `SECONDHAND`. |
| `beesley-1912` | Lawrence Beesley, *The Loss of the S.S. Titanic* (1912), Project Gutenberg e-book 6675. https://www.gutenberg.org/cache/epub/6675/pg6675.txt | Partly. Read through the WebFetch summariser (characters 0–200,000). Quotations are as returned by that tool; re-check against the text before publishing them. |
| `websearch-rostron-547` | WebSearch result summary for Rostron's "5.47 GMT" message (snippets from encyclopedia-titanica.org and titanicology.com pages by Halpern). | Search snippet only |

### Attempted, not obtained

| id | Source | Result |
|---|---|---|
| `time-and-again-2018` | Chirnside, Fitch, Georgiou, Hall, Halpern, Layton & Wormstedt, "Time & Again – Titanic's Final Hours" (Aug 2018). http://wormstedt.com/Titanic/Time_And_Again.html | Page reachable but only says "Coming Soon, Stay Tuned!". Content not available. |
| `halpern-rockets-lifeboats-time-changes` | Samuel Halpern, "Rockets, Lifeboats, and Time Changes", Encyclopedia Titanica. https://www.encyclopedia-titanica.org/rockets-lifeboats-and-time-changes.html | Not fetched (domain blocks plain requests; I spent my requests elsewhere). Known to me only through citations in `wfb-lifeboat-sequence` and `halpern-chronology-2023`. |
| `halpern-1235-carpathia` | Samuel Halpern, "12:35 AM Apparent Time Carpathia" (https://www.glts.org/articles/halpern/1235_ats_carpathia.html appeared in a search result). | Not fetched. Cited by `halpern-chronology-2023` note 76. |
| `centennial-reappraisal-2011` | Samuel Halpern et al., *Report into the Loss of the SS Titanic: A Centennial Reappraisal*, The History Press, 2011 (ch. 7 by Wormstedt & Fitch on the boats; lifeboat pickup table by Behe, p. 144). | Printed book, not consulted. Reached only via `halpern-chronology-2023` and `wikipedia-lifeboats`. |
| `on-a-sea-of-glass` | Fitch, Layton & Wormstedt, *On a Sea of Glass: The Life & Loss of the RMS Titanic* (Amberley). | Printed book, not consulted. |
| — | titanicinquiry.org `BOTReport/botRepBoats.php` (lower-case) and titanicology.com `Titanica/TimeAndAgain.pdf` | 404 (wrong guesses at URLs). |
| — | Wikipedia API (`api.php?action=parse`) | Returned a non-JSON error page. |

Web requests made: about 60 (over the ~40 guideline; the overrun came from titanicinquiry.org serving one page per report section and from finding Halpern's chronology late).

---

## 1. Timeline, 11:39 p.m. → 2:20 a.m. (Titanic ATS)

How to read the uncertainty column: for events timed from a logged wireless entry the ± covers both PV rounding (many PVs are to the nearest 5 min) and the choice of conversion; for lifeboats it is the ±5 min the authors themselves attach ("nearest five-minute mark"); for flooding observations it is the witness's own "about".

Lifeboat rows use the **FLW 2026** times (latest revision). Competing times are in section 2.

| # | Time (ATS) | ± | Event (neutral, one sentence) | Location | Sources | Certainty |
|---|---|---|---|---|---|---|
| 1 | 11:39 p.m. | 1 min | The lookouts strike the bell three times and telephone the bridge "Iceberg right ahead"; First Officer Murdoch orders the helm hard-a-starboard and works the engine telegraphs. | Crow's nest; bridge | `halpern-chronology-2023` (Hichens AI p. 450; Fleet BI 17280–81); `brit-inquiry-report` (Collision) | established (event); estimated (minute) |
| 2 | 11:40 p.m. | −0/+6 min | The ship strikes an iceberg on the starboard side forward; Murdoch closes the watertight doors and Captain Smith comes to the bridge. | Starboard bow, below waterline | `brit-inquiry-report` (Boats: "collision took place at 11.40 p.m. (ship's time)"); `us-inquiry-report` (11:46 p.m.); `halpern-chronology-2023` note 27 (accounts range 11:40–11:45) | established for 11:40 as the accepted time; see section 7 for the clock debate |
| 3 | 11:40 p.m. | 1 min | Water enters No. 6 boiler room about 2 ft above the stokehold plates and the forward starboard bunker of No. 5; Barrett and Hesketh pass through the closing watertight door. | Boiler rooms 6 and 5 | `brit-inquiry-report` (Flooding: Barrett 1868–74, 1917–21); `halpern-chronology-2023` | established |
| 4 | 11:41 p.m. | 1 min | Quartermaster Rowe reads the taffrail log on the poop (260 miles since noon); Smith, Murdoch and Boxhall look aft from the starboard bridge wing. | Poop (after bridge); bridge | `brit-inquiry-day-15-rowe` Q17607–17613; `halpern-chronology-2023` | established |
| 5 | 11:42 p.m. | 2 min | The engines are noticed to have stopped; Boxhall goes below to inspect the forward passenger spaces. | Engine room; forward decks | `halpern-chronology-2023` (Boxhall BI 15573; Dillon BI 3716–29; Lightoller BI 13743) | estimated (sequence from testimony) |
| 6 | 11:44 p.m. | 2 min | The engines turn slowly ahead for a short time; Quartermaster Olliver is sent to find the carpenter to take the draught of water. | Engine room; bridge | `halpern-chronology-2023` (Olliver AI pp. 526–537; Dillon BI 3716–29) | estimated |
| 7 | 11:45 p.m. | 3 min | Crew find air hissing from the forepeak tank vent as it fills; ice is seen on the forward well deck. | Forecastle; forward well deck | `halpern-chronology-2023` (Hemming BI 17716; Haines AI pp. 655–657); `us-inquiry-report` (First damage reported) | established |
| 8 | 11:46 p.m. | 3 min | The engines are stopped for the last time; Ismay reaches the bridge and is told by Smith that the ship has struck ice. | Bridge | `halpern-chronology-2023` (Dillon; Ismay BI 18505–14) | estimated |
| 9 | 11:47 p.m. | 3 min | Steam begins blowing off from the boiler safety valves at the funnels. | Funnels | `flw-launch-table-2026` | estimated |
| 10 | 11:50 p.m. | 3 min | A list of about 5° to starboard shows on the wheelhouse inclinometer. | Wheelhouse | `halpern-lifeboats-list-trim-2`; `halpern-chronology-2023` (Hichens AI p. 451) | established (observation); estimated (time) |
| 11 | 11:50 p.m. | 3 min | Boxhall returns from his first inspection and reports no damage seen; the carpenter reports the ship making water. | Bridge | `brit-inquiry-day-13-boxhall` Q15367–15370; `halpern-chronology-2023` | established |
| 12 | 11:50 p.m. | 3 min | Water stands about 8 ft above the double bottom in No. 6 boiler room and about 7 ft deep in No. 1 hold. | Boiler room 6; hold 1 | `brit-inquiry-report` (Flooding: Barrett 1926, 1937; Poingdestre 2821–2) | established |
| 13 | 11:50 p.m. | 5 min | Thomas Andrews is seen going aft along E deck toward the engine room. | E deck | `halpern-chronology-2023` (Johnston BI 3367–72) | estimated |
| 14 | 11:52 p.m. | 3 min | The lights go out in the stokeholds; firemen are called up and lamps are sent for. | Boiler rooms 5 and 4 | `halpern-chronology-2023` (Barrett BI 1957–61; Cavell BI 4215–18) and note 31 | established (event); estimated (time) |
| 15 | 11:52 p.m. | 3 min | Boxhall finds the mail hold flooding, the water within about 2 ft of G deck and rising. | Mail room, G deck / Orlop, hold 3 | `brit-inquiry-day-13-boxhall` Q15374–15376; `brit-inquiry-report` (Gradual effect) | established |
| 16 | 11:55 p.m. | 5 min | Water comes onto G deck around No. 1 hatch, and flooding is seen in the first-class baggage room near the squash court. | Hold 1; hold 3 (G deck, F deck landing) | `halpern-chronology-2023` (Symons BI 11354–56; Johnston BI 3395–97; Wheat BI 10901–18); `brit-inquiry-report` (Gradual effect) | established (observations); estimated (time) |
| 17 | 11:57 p.m. | 5 min | Smith is seen returning up the working staircase; Olliver is told to have the boatswain get the boats ready. | E deck stair; bridge | `halpern-chronology-2023` (Mackay BI 10697; Olliver AI pp. 535–536) | estimated |
| 18 | 12:00 a.m. | 5 min | The planned clock setback is not made; Boxhall reports the mail-room flooding to Smith and is sent to call the off-duty officers; the boatswain calls all hands to the boats. | Bridge; officers' quarters; forecastle | `halpern-chronology-2023` (Pitman AI p. 294; Boxhall BI 15378–85; Symons BI 11418); `brit-inquiry-day-13-boxhall` Q15377–15380 | established (events); debated (clock setback, section 7) |
| 19 | 12:00 a.m. | 5 min | Water is coming up No. 1 hatch and entering the firemen's quarters. | Hold 1, G deck | `brit-inquiry-report` (Gradual effect: Lee 2455, 2479, 2485) | established |
| 20 | 12:02 a.m. | 5 min | The stokehold lights come back on; men start drawing fires in No. 5 boiler room. | Boiler room 5 | `halpern-chronology-2023` (Barrett BI 2007–14; Hendrickson BI 4903–11) and note 34 | estimated |
| 21 | 12:05 a.m. | 5 min | The order is given to uncover the boats; covers are being removed on the port side while steam roars from the funnels. | Boat deck | `brit-inquiry-report` (Boats: "about 12.5 the order was given to uncover the 14 boats"); `halpern-chronology-2023` (Boxhall BI 15384–85; Pitman BI 14949–55) | established (event); estimated (time) |
| 22 | 12:10 a.m. | 5 min | Water is within six steps of E deck on the stairs down to the mail room; the watertight doors from the engine room forward to No. 4 boiler room are opened by hand. | E deck forward; engine and boiler rooms | `halpern-chronology-2023` (Robinson BI 13277–83; Dillon BI 3913); `halpern-lifeboats-list-trim-2`; `brit-inquiry-report` (Gradual effect) | established (observations); estimated (time) |
| 23 | 12:10 a.m. | 5 min | Smith and Andrews return from the mail room; a stewardess overhears Andrews say that three compartments have gone. | E deck forward | `halpern-chronology-2023` (Robinson BI 13277–83; Bullock, *Thomas Andrews Shipbuilder*) | estimated |
| 24 | 12:12 a.m. | 5 min | Smith orders the boats swung out and passengers called up with lifebelts. | Bridge; boat deck | `halpern-chronology-2023` (Hichens BI 1041–43; Ismay AI p. 3) and note 37; `brit-inquiry-report` (Boats) gives 12:20 for swinging out | estimated; the 12:12 vs 12:20 difference is unresolved |
| 25 | 12:15 a.m. | 5 min | Smith warns the wireless operators that a distress call may be needed; stewards rouse passengers; the chief baker sends bread to the boats. | Marconi room; passenger decks | `halpern-chronology-2023` (Bride, New York Times interview; Wheat BI 13229; Joughin BI 5924) | estimated |
| 26 | 12:22 a.m. | 5 min | Andrews tells Smith the ship cannot be saved and has an hour to an hour and a half left. | Bridge | `halpern-chronology-2023` (note 38: Mrs Warren put it about 45 min after the collision; Boxhall BI 15610) | estimated |
| 27 | 12:23 a.m. | 2 min | Quartermaster Hichens is relieved at the wheel and sent to uncover collapsible D. | Wheelhouse; port boat deck forward | `wfb-lifeboat-sequence` (Hichens; fn PR-11, PR-12) | established (Hichens's own clock time) |
| 28 | 12:25 a.m. | 5 min | A wooden bulkhead gives way and about 3 ft of water enters the seamen's quarters on E deck. | E deck forward (hold 2) | `brit-inquiry-report` (Gradual effect: Poingdestre 2844–45, "about 40 minutes after"); `halpern-chronology-2023` | established (observation); estimated (time) |
| 29 | 12:25 a.m. | 5 min | Smith orders women and children into the boats, then goes to the Marconi room and orders the call for assistance, giving a position. | Boat deck; Marconi room | `halpern-chronology-2023`; `brit-inquiry-day-14-bride` Q16503–16510; `brit-inquiry-report` (Boats: "about 12.30") | established (events); estimated (time) |
| 30 | 12:27 a.m. (10:25 p.m. NYT) | 3 min on the log; conversion debated | Phillips sends the first CQD with position 41°44′N, 50°24′W; it is received by Cape Race, Mount Temple and La Provence. | Marconi room | `us-inquiry-report` (10.25 p.m. New York time); `halpern-chronology-2023`; `lee-desperate-dialogue`; `halpern-lifeboats-list-trim-2`; `brit-inquiry-report` (Assistance: "At 12.15 a.m.") | established (NYT 10:25); **debated** (ship's time: 12:27 Halpern/Lee vs 12:15 British report) |
| 31 | 12:30 a.m. (10:28 NYT) | 3 min | Ypiranga logs Titanic's CQD with 41°44′N, 50°24′W, repeated about ten times. | — | `lee-desperate-dialogue` (PV Ypiranga); `halpern-chronology-2023` | established (log) |
| 32 | 12:35 a.m. | 3 min | Boxhall shows Smith his worked position, 41°46′N, 50°14′W, and takes it to the wireless cabin. | Chart room; Marconi room | `brit-inquiry-day-13-boxhall` Q15388–15391; `halpern-chronology-2023` (time by back-calculation from the 10:35 NYT message) | established (event); estimated (time) |
| 33 | 12:37 a.m. (10:35 NYT) | 3 min | Carpathia receives "Come at once. We have struck a berg. It's a CQD OM. Position 41.46 N, 50.14 W"; Cape Race logs the corrected position. | — | `lee-desperate-dialogue`; `halpern-chronology-2023`; `brit-inquiry-report` (Assistance: "By 12.25") | established (NYT); debated (ship's time) |
| 34 | 12:38 a.m. (10:36 NYT) | 3 min | Ypiranga logs the corrected position with the words that Titanic is sinking and can hear nothing for the noise of steam. | — | `lee-desperate-dialogue` (PV Ypiranga); `brit-inquiry-report` (Assistance: "At 12.26 … cannot hear for noise of steam") | established (log) |
| 35 | 12:40 a.m. | 5 min | Lifeboat No. 7 begins lowering, the first boat away. | Starboard, forward group | `flw-launch-table-2026`; `wfb-table-2`; `halpern-lifeboats-list-trim-2` | estimated (all modern studies agree; British report 12:45) |
| 36 | 12:42 a.m. (10:40 NYT) | 3 min | Mount Temple turns for the distress position; Frankfurt acknowledges Titanic's call with "OK, stand by". | — | `lee-desperate-dialogue`; `halpern-chronology-2023` (PV Mount Temple, PV Frankfurt) | established (log) |
| 37 | 12:43 a.m. | 5 min | Lifeboat No. 5 begins lowering with Third Officer Pitman in charge. | Starboard, forward group | `flw-launch-table-2026`; `wfb-lifeboat-sequence`; Halpern 12:45 | estimated |
| 38 | 12:45 a.m. | 5 min | The order is given to open the watertight doors aft of the engine room so a portable suction pipe can be brought forward. | Engine room, shaft tunnels | `halpern-chronology-2023` (Scott BI 5600–04; note 41, "quarter to one") | established (testimony) |
| 39 | 12:47 a.m. | 3 min | Boxhall fires the first socket distress signal from the starboard side of the bridge. | Starboard bridge rail, by boat No. 1 | `wfb-lifeboat-sequence`; `flw-launch-table-2026`; `halpern-dozen-rockets`; `brit-inquiry-report` (Assistance: "about … 12.45") | estimated (derivation in section 3) |
| 40 | 12:48 a.m. | 3 min | Rowe telephones the bridge from the poop to report a boat in the water and is told to bring more distress signals forward. | Poop (after bridge) → bridge | `brit-inquiry-day-15-rowe` Q17614–17624; `wfb-lifeboat-sequence`; `halpern-what-color` | established (event); estimated (time: Rowe said 12:25, see section 7) |
| 41 | 12:49 a.m. (10:47 NYT) | 3 min | Carpathia gives her position and says she is coming; Bride reports this to Smith. | Marconi room; bridge | `halpern-chronology-2023` (Cottam BI 17068, 17115; Bride AI pp. 148–149); `brit-inquiry-day-14-bride` Q16516–16527; `brit-inquiry-report` (Boats: "At 12.35") | established (event); estimated (time) |
| 42 | 12:55 a.m. | 5 min | Lifeboat No. 3 begins lowering. | Starboard, forward group | `flw-launch-table-2026`; `wfb-table-2`; `halpern-lifeboats-list-trim-2` | estimated |
| 43 | 12:55 a.m. (10:53 NYT) | 3 min | Titanic tells Carpathia she cannot read signals because of escaping steam; water is seen flowing down the first-class stairs from E deck to F deck. | Marconi room; E/F deck stairs | `halpern-chronology-2023` (Cottam AI pp. 105–106; Wheat BI 10956–72); `flw-new-study-2026` | established (testimony); estimated (time) |
| 44 | 12:57 a.m. (10:55 NYT) | 3 min | Mount Temple logs "MGY calling SOS", the first recorded use of SOS that night, in a call to Olympic. | Marconi room | `lee-desperate-dialogue` (PV Mount Temple; Mersey list "Titanic calls Olympic S.O.S."); `halpern-chronology-2023` | established (log) |
| 45 | 12:57 a.m. (12:45 Californian time) | 5 min | Second Officer Stone on the Californian sees the first of eight white rockets over the steamer to the south-east. | Californian upper bridge | `halpern-dozen-rockets`; `halpern-chronology-2023` (Stone's statement of 18 April) | established (sighting); estimated (time alignment) |
| 46 | 12:58 a.m. | 3 min | The steam stops blowing off. | Funnels | `flw-launch-table-2026`; `flw-new-study-2026` (sidebar, p. 249) | estimated |
| 47 | 1:00 a.m. | 5 min | Lifeboat No. 8 begins lowering, the first boat away on the port side according to FLW. | Port, forward group | `flw-launch-table-2026`; `flw-new-study-2026` | **debated** (FLW 1:00 and first; Halpern 1:05 and second; British report 1:10 and second) |
| 48 | 1:04 a.m. (11:02 NYT) | 3 min | Ypiranga logs Titanic sending "SOS–CQD" and her position. | — | `lee-desperate-dialogue`; `halpern-chronology-2023` | established (log) |
| 49 | 1:05 a.m. | 5 min | Emergency boat No. 1 begins lowering; it catches on a wire guy and reaches the water about 1:15. | Starboard, forwardmost davits | `flw-launch-table-2026`; `wfb-table-2`; `halpern-lifeboats-list-trim-2` | estimated (British report 1:10) |
| 50 | 1:10 a.m. | 5 min | Lifeboat No. 6 begins lowering; it halts at C deck while Major Peuchen climbs down the falls and reaches the water about 1:20. | Port, forward group | `flw-launch-table-2026`; `wfb-lifeboat-sequence` | **debated** (FLW 1:10; Halpern and British report 12:55) |
| 51 | 1:12 a.m. (11:10 NYT) | 5 min | Titanic gives Olympic her position and says she has struck an iceberg. | — | `lee-desperate-dialogue` (PV Olympic); `halpern-chronology-2023` | established (log) |
| 52 | 1:17 a.m. | 5 min | From boat No. 1 a lookout sees the water at the second row of portholes under the ship's name; water is coming over the stokehold plates in No. 4 boiler room. | Bow; boiler room 4 | `halpern-chronology-2023` (Symons BI 11490; Cavell BI 4248–65); `halpern-lifeboats-list-trim-2` (≈1:20) | estimated |
| 53 | 1:20 a.m. | 5 min | Lifeboat No. 16 begins lowering; the list, to starboard until now, is about nil. | Port, aft group | `flw-launch-table-2026`; `halpern-lifeboats-list-trim-2` (also 1:20) | estimated (British report 1:35) |
| 54 | 1:20 a.m. | 5 min | Most remaining firemen, trimmers and greasers are ordered out of the stokeholds and engine rooms to go on deck with lifebelts. | Boiler and engine rooms | `halpern-chronology-2023` (Dillon BI 3816–27; Scott BI 5838–39; Threlfall, *Bridgwater Mercury*) and note 52; `brit-inquiry-report` (Gradual effect: Dillon 3811) | established (three witnesses give 1:20) |
| 55 | 1:22 a.m. (11:20 NYT) | 3 min | Titanic to Olympic: "Captain says get your boats ready. Going down fast at the head." | Marconi room | `lee-desperate-dialogue` (PV Mount Temple, Olympic); `halpern-chronology-2023` note 53 | established (log) |
| 56 | 1:25 a.m. | 5 min | Lifeboat No. 14 begins lowering with Fifth Officer Lowe in charge; the ship now lists to port. | Port, aft group | `flw-launch-table-2026` | **debated** (FLW 1:25; Halpern and British report 1:30; Georgiou 1:40) |
| 57 | 1:28 a.m. (11:26 NYT) | 3 min | Frankfurt tells Titanic her captain will make for her; Titanic replies "OK, thanks". | — | `halpern-chronology-2023` (PV Ypiranga, PV Mount Temple) | established (log) |
| 58 | 1:30 a.m. | 5 min | Lifeboat No. 12 begins lowering. | Port, aft group | `flw-launch-table-2026` | **debated** (FLW 1:30; Halpern and British report 1:25; Georgiou 1:35) |
| 59 | 1:32 a.m. | 3 min | Lifeboat No. 9 begins lowering. | Starboard, aft group | `flw-launch-table-2026`; `flw-new-study-2026` p. 244 | **debated** (FLW 1:32; Halpern 1:15; British report 1:20; Georgiou 1:05) |
| 60 | 1:35 a.m. | 3 min | Lifeboat No. 11 begins lowering, loaded from A deck. | Starboard, aft group | `flw-launch-table-2026` | **debated** (FLW 1:35; Halpern and British report 1:25) |
| 61 | 1:35 a.m. | 10 min | The portable suction pipe is connected to the bilge system in No. 4 boiler room by about this time. | Boiler room 4 | `halpern-chronology-2023` (Wilding BI 20682–86; note 58) | estimated (Wilding's opinion of the time needed) |
| 62 | 1:37 a.m. | 3 min | Lifeboat No. 13 begins lowering, loaded from A deck. | Starboard, aft group | `flw-launch-table-2026` | debated (FLW 1:37; Halpern 1:30; British report 1:35) |
| 63 | 1:38 a.m. | 3 min | Lifeboat No. 15 begins lowering about half a minute after No. 13 and nearly comes down on top of it. | Starboard, aft group | `flw-launch-table-2026`; `halpern-chronology-2023` | debated (FLW 1:38; Halpern 1:33; British report 1:35) |
| 64 | 1:37 a.m. (11:35 NYT) | 3 min | Cape Race no longer hears Titanic directly. | — | `halpern-chronology-2023` (PV Virginian); `lee-desperate-dialogue` | established (log) |
| 65 | 1:39–1:42 a.m. (11:37–11:40 NYT) | 3 min | Titanic tells Olympic that women / passengers are being put off in small boats. | Marconi room | `lee-desperate-dialogue`; `halpern-chronology-2023` notes 60–61 | established (several PVs) |
| 66 | 1:42 a.m. | 3 min | Emergency boat No. 2 begins lowering with Fourth Officer Boxhall in charge. | Port, forwardmost davits | `flw-launch-table-2026`; `flw-new-study-2026` pp. 246–248 | estimated (FLW 2026 1:42; WFB to 2023, Halpern and British report 1:45) |
| 67 | 1:43 a.m. (11:41 NYT) | 3 min | Mount Temple logs Titanic: "CQD. Engine room flooded". | Marconi room | `lee-desperate-dialogue`; `halpern-chronology-2023` | established (log) |
| 68 | 1:45–1:47 a.m. (11:43–11:45 NYT) | 3 min | Titanic tells Olympic the weather is clear and calm; Bride tells Baltic "Engine room getting flooded" while Phillips is outside. | Marconi room | `lee-desperate-dialogue` (PV Olympic, Baltic); `halpern-chronology-2023` note 62 | established (log) |
| 69 | 1:49 a.m. (11:47 NYT) | 3 min | Baltic says she is rushing to Titanic; Olympic's message about lighting all boilers is acknowledged; this is the last Mount Temple hears of Titanic. | — | `us-inquiry-report` (Mount Temple last heard 11.47 p.m. NYT); `halpern-chronology-2023` note 63 | established (log) |
| 70 | 1:50 a.m. | 5 min | Lifeboats No. 10 and No. 4 begin lowering; No. 4 is loaded through the A deck promenade windows. | Port, aft group (10); port, forward group (4) | `flw-launch-table-2026`; `wfb-table-2` | estimated for No. 10 (Halpern agrees; British report 1:20); **debated** for No. 4 (FLW 1:50; Halpern and British report 1:55) |
| 71 | 1:52 a.m. | 3 min | The last distress signal is fired, by Rowe under Captain Smith's direction; Phillips returns to the cabin reporting the forward well deck awash and a marked list to port. | Starboard bridge rail; Marconi room | `wfb-lifeboat-sequence`; `flw-launch-table-2026`; `halpern-dozen-rockets` (1:53); `halpern-chronology-2023`; `brit-inquiry-day-14-bride` Q16548–16553 | estimated (method in section 3) |
| 72 | 1:55 a.m. (11:53 NYT) | 5 min | Birma hears Titanic say women and children are in the boats and she cannot last much longer. | — | `halpern-chronology-2023` (Marconi office form of SS Birma) | established (log); estimated (time, Birma logged local time) |
| 73 | 1:57 a.m. (11:55 NYT) | 5 min | Carpathia hears her last message from Titanic, "Engine room full up to boilers"; Smith tells the operators they can do no more. | Marconi room | `lee-desperate-dialogue` (Mersey list); `halpern-chronology-2023` (Bride's report of 27 April; Cottam BI 17193–201); `brit-inquiry-report` (Assistance: "At 1.45") | established (NYT); debated (ship's time 1:57 vs 1:45) |
| 74 | 2:00 a.m. | 5 min | Collapsible C begins lowering with Rowe in charge and J. Bruce Ismay aboard. | Starboard, davits of boat No. 1 | `flw-launch-table-2026`; `wfb-lifeboat-sequence`; `halpern-lifeboats-list-trim-2`; `brit-inquiry-day-15-rowe` Q17627–17643, 17686–17699 | estimated (all modern studies 2:00; British report 1:40 — see section 2) |
| 75 | 2:00 a.m. (11:58 NYT) | 3 min | Asian hears Titanic calling CQD/SOS and answers without reply. | — | `lee-desperate-dialogue` (PV Asian); `halpern-chronology-2023` | established (log) |
| 76 | 2:05 a.m. | 5 min | Collapsible D begins lowering, the last boat lowered by davits; the forecastle head is going under and the forward well deck is submerged. | Port, davits of boat No. 2 | `flw-launch-table-2026`; `wfb-lifeboat-sequence` (Bright; Rowe); `brit-inquiry-report` (2:05); Georgiou 2:10 | estimated |
| 77 | 2:07 a.m. | 5 min | Phillips sends a last CQD without reply as the power fails; the operators leave the cabin and Bride climbs to the officers' quarters roof where collapsible B is being freed. | Marconi room; roof of officers' quarters | `brit-inquiry-day-14-bride` Q16566–16580; `halpern-chronology-2023` note 67 (Bride: about 10 min before the end, AI p. 158); `halpern-lifeboats-list-trim-2` gives 2:10 | estimated |
| 78 | 2:12 a.m. (12:10 a.m. NYT) | — | Virginian's operator logs hearing Titanic "very faintly, his power greatly reduced". | — | `lee-desperate-dialogue` (PV Virginian); `halpern-chronology-2023` note 68 | **debated** (not heard by nearer ships; attribution doubted by Halpern and Lee) |
| 79 | 2:15 a.m. | 2 min | The bow takes a sudden plunge and water sweeps onto the bridge and forward boat deck; collapsibles A and B float off, B upside down. | Bridge; forward boat deck | `flw-launch-table-2026`; `wfb-lifeboat-sequence`; `halpern-chronology-2023` (Lightoller AI pp. 90–91, BI 14052) | estimated (FLW 2:15; Halpern's table 2:17; Georgiou 2:17–2:18) |
| 80 | 2:15 a.m. | 2 min | Chief Baker Joughin, on A deck aft, hears a sound like iron parting and notes a quarter past two on his watch; the lights are still on. | A deck pantry, aft of third funnel | `halpern-chronology-2023` (Joughin BI 6040–49, 6359–64) | established (testimony; clock time read from a watch) |
| 81 | between 2:15 and 2:20 a.m. | — | The forward funnel falls, close to the overturned collapsible B. | Forward funnel, port side water | `wfb-lifeboat-sequence` ("nearly crushed when the forward funnel fell"); `lee-desperate-dialogue` (Gracie quoting Lightoller and Thayer) | established (event); minute `UNVERIFIED` — I found no source giving one |
| 82 | 2:17 a.m. | 1 min | All the lights go out; the hull breaks apart aft of amidships and the stern settles back. | Whole ship; break near after expansion joint | `halpern-lifeboats-list-trim-2`; `halpern-chronology-2023` (Symons BI 11510–25; Dillon BI 3858) | **debated in 1912** (both inquiry reports concluded she sank intact); break-up now accepted from the wreck (`FROM-MEMORY` for the wreck lying in two main sections) |
| 83 | 2:17 a.m. (2:05 Californian time) | 2 min | On the Californian the steamer's lights disappear; Gibson is sent to tell Captain Lord. | Californian upper bridge | `brit-inquiry-day-07-gibson` Q7533, 7565; `halpern-dozen-rockets`; `halpern-chronology-2023` note 70 | established (Gibson's clock time); estimated (12-minute offset) |
| 84 | 2:18–2:20 a.m. | 1 min | The stern rises to a steep angle; the fourth funnel falls aft. | Stern | `halpern-chronology-2023` (Symons BI 11512; Dillon BI 3861–76) | estimated (final angle of the stern remains debated — see open questions) |
| 85 | 2:20 a.m. | 1 min | The stern disappears below the surface. | Wreck site about 41°43.5′N, 49°56.8′W | `brit-inquiry-report` (Final effect: "disappeared at 2.20 a.m.", Lee 2558); `us-inquiry-report` ("12.47 a.m., New York time"); `halpern-chronology-2023` (Pitman's watch AI p. 294; note 71) | established |
| 86 | 2:22 and 2:29 a.m. (12:20 and 12:27 a.m. NYT) | — | Virginian logs two faint "V"s and then a blurred "CQ" that ends abruptly, which her operator attributes to Titanic. | — | `lee-desperate-dialogue` (PV Virginian); `us-inquiry-report`; `brit-inquiry-report` (Assistance: last message "C.Q." at "2.17") | **debated** (1912 reports accept it as Titanic's last signal; Halpern and Lee attribute it to another station because 12:27 NYT is after the sinking on a 2 h 02 min offset) |

### Notes on the timeline

- **Rows 30, 33, 34, 73, 86 — the "old" ship's times.** The British report gives 12:15 (first CQD), 12:25 (Carpathia hears), 12:26 ("cannot hear for noise of steam"), 1:45 ("Engine room full up to boilers") and 2:17 (last "CQ"). Set against the NYT log times 10:25, 10:35, 10:36, 11:55 and 12:27 these all sit exactly 1 h 50 min later, so they are the same log entries converted with a different offset — not independent observations. Record them as the competing position, holder "British Inquiry report 1912".
- **Captain Smith's and Andrews's inspections (rows 13, 17, 23, 26).** These are reconstructed by Halpern from stewards' sightings (Johnston, Mackay, Robinson) and from third-hand reports; none has a clock time. His note 30 says there is no evidence that Smith or Andrews actually met Chief Engineer Bell. Treat the minutes as `estimated` at best.
- **Row 24 (swing-out order).** British report: order to uncover about 12:05, order to swing out 12:20, women and children about 12:30, No. 7 lowered about 12:45. Halpern: 12:05 / 12:12 / 12:25 / 12:40.
- **Row 82 (break-up).** British report, Final effect: "The ship did not break in two" (Lightoller 14075). US report: "the preponderance of evidence is to the effect that she assumed an almost end-on position and sank intact". Halpern's chronology follows Symons, who described the ship splitting abaft the after expansion joint as the lights went out, two to three minutes before the stern went.
- **Events I could not time at all:** the moment the bridge telegraphs were finally abandoned; the moment the well deck first went awash (bracketed only by Phillips's report at about 1:50); the exact minute of the first funnel's fall.

---

## 2. Lifeboat launching sequence

### 2.1 Launch times: latest WFB/FLW revision and the competing sequences

"Launch time" in all the modern studies means the time the boat **started** lowering from the deck (stated on `flw-launch-table-2026` and in `wfb-lifeboat-sequence`). The authors call their times approximations to the nearest five minutes; the 2026 revision tightens four starboard-aft boats and No. 2 to "about" a given minute.

| Order (FLW 2026) | Boat | FLW 2026 | WFB 2001–2023 | Halpern 2023 | Georgiou 2012–16 | British Inquiry 1912 |
|---|---|---|---|---|---|---|
| 1 | 7 | 12:40 | 12:40 | 12:40 | 12:40 | 12:45 |
| 2 | 5 | 12:43 | 12:43 (table row 12:45) | 12:45 | 12:50 | 12:55 |
| 3 | 3 | 12:55 | 12:55 | 12:55 | 12:55 | 1:00 |
| 4 | 8 | 1:00 | 1:00 | 1:05 | 1:20 | 1:10 |
| 5 | 1 | 1:05 | 1:05 | 1:05 | 1:00 | 1:10 |
| 6 | 6 | 1:10 | 1:10 | 12:55 | 12:55 | 12:55 |
| 7 | 16 | 1:20 | 1:20 | 1:20 | 1:30 | 1:35 |
| 8 | 14 | 1:25 | 1:25 | 1:30 | 1:40 | 1:30 |
| 9 | 12 | 1:30 | 1:30 | 1:25 | 1:35 | 1:25 |
| 10 | 9 | 1:32 | 1:30 | 1:15 | 1:05 | 1:20 |
| 11 | 11 | 1:35 | 1:35 | 1:25 | 1:10 | 1:25 |
| 12 | 13 | 1:37 | 1:40 | 1:30 | 1:15 | 1:35 |
| 13 | 15 | 1:38 | 1:41 | 1:33 | 1:25 | 1:35 |
| 14 | 2 | 1:42 | 1:45 | 1:45 | 1:50 | 1:45 |
| 15 | 10 | 1:50 | 1:50 | 1:50 | 1:45 | 1:20 |
| 16 | 4 | 1:50 | 1:50 | 1:55 | 1:55 | 1:55 |
| 17 | C | 2:00 | 2:00 | 2:00 | 2:00 | 1:40 |
| 18 | D | 2:05 | 2:05 | 2:05 | 2:10 | 2:05 |
| 19 | A | 2:15 (floated off) | 2:15 (floated off) | 2:17 (washed off) | 2:17 | "Floated off when the ship sank" |
| 20 | B | 2:15 (floated off, upside down) | 2:15 (floated off) | 2:17 (washed off) | 2:18 | "Floated off when the ship sank" |

Sources for the columns: FLW 2026 — `flw-launch-table-2026`, `flw-new-study-2026` (final summary). WFB 2001–2023 — `wfb-table-2`, and as tabulated in `halpern-lifeboats-list-trim-1`. Halpern 2023 — `halpern-lifeboats-list-trim-2` ("Lifeboat Launch Times and Related Events"); cross-checked against his times as quoted by FLW in `flw-new-study-2026`. Georgiou — "The Lifeboat Story" (nine parts, *Atlantic Daily Bulletin* / Titanic-Verein Schweiz, Dec 2012–Mar 2016), **as tabulated by Halpern** in `halpern-lifeboats-list-trim-1` (`SECONDHAND`; I did not see Georgiou's articles). British Inquiry — `brit-inquiry-report` (The Boats), matching `wfb-table-1`.

Certainty of the sequence as a whole: **`debated`**. Three modern sequences (FLW; Halpern; Georgiou) disagree with each other and with the 1912 table. What they agree on, per FLW's own list (`flw-new-study-2026`, introduction and final summary) and the tables above:

- No. 7 first, at about 12:40; starboard forward order 7, 5, 3, 1 (all four sequences and the British report).
- First rocket about 12:47, after No. 5 started down and before No. 3.
- Nos. 3 and 1 at about 12:55 and 1:05 (FLW and Halpern).
- No. 16 at 1:20 and No. 10 at 1:50 (FLW and Halpern).
- Collapsible C about 2:00 and D about 2:05 (FLW and Halpern; Georgiou has D at 2:10); A and B swept off as the forward boat deck submerged, 2:15–2:18.

Where they disagree (holders):

- **No. 8 vs No. 6.** FLW: 8 first (1:00), then 6 (1:10). Halpern and the British report: 6 first (12:55), then 8 (1:05 / 1:10). Georgiou: 6 at 12:55, 8 at 1:20.
- **Aft port order.** FLW: 16, 14, 12, 10. Halpern: 16, 12, 14, 10. British report: 10, 12, 14, 16.
- **No. 9 relative to No. 14.** FLW: 14 (1:25) before 9 (1:32), resting on Able Seaman McGough working the falls of 14 and then leaving in 9. Halpern: 9 (1:15) before 14 (1:30).
- **Starboard aft boats 9–15.** FLW 1:32–1:38; Halpern 1:15–1:33; British report 1:20–1:35; Georgiou 1:05–1:25.
- **No. 4.** FLW 1:50; Halpern 1:55.
- **Collapsible C.** British report 1:40. WFB attribute that figure to a passenger's or Rowe's watch that had been put back 23 minutes, and to Quartermaster Bright's guess of twenty minutes between C and D; they place C at 2:00, about five minutes before D.

Confirmation or correction of the baseline markers I was given:

| Baseline | Finding |
|---|---|
| No. 7 ≈ 12:40 | Confirmed (FLW, Halpern, Georgiou). British report 12:45. |
| No. 5 ≈ 12:43–12:45 | Confirmed (FLW 12:43; Halpern 12:45). British report 12:55. |
| First rocket ≈ 12:45–12:47 | Confirmed: 12:47 (WFB, FLW, Halpern). British report "about 12.45". |
| No. 8 at 1:00 | FLW only. Halpern 1:05, British report 1:10, Georgiou 1:20. Mark debated. |
| No. 1 at 1:05 | Confirmed (FLW, Halpern). British report 1:10, Georgiou 1:00. |
| C ≈ 2:00 | Confirmed (FLW, Halpern, Georgiou). British report 1:40. |
| D ≈ 2:05 | Confirmed (FLW, Halpern, British report). Georgiou 2:10. |
| A and B washed off ≈ 2:15 | FLW 2:15. Halpern 2:17. Georgiou 2:17 / 2:18. |
| *Changes since the 2023 WFB table* | **No. 9 → 1:32, No. 13 → 1:37, No. 15 → 1:38, No. 2 → 1:42** (FLW 2026). No. 11 stays at 1:35. |

### 2.2 Per-boat data

Capacities: 65 for each of the 14 lifeboats, 40 for each emergency cutter (1 and 2), 47 for each Engelhardt collapsible; total 1,178 (`brit-inquiry-report`, The Boats — `established`). The US report says 1,176.

Davit layout (`halpern-lifeboats-list-trim-1`, `brit-inquiry-report` — `established`): sixteen pairs of davits in four groups of four. Odd numbers starboard, even numbers port, numbered from forward. Forward groups: 1, 3, 5, 7 (starboard) and 2, 4, 6, 8 (port). Aft groups: 9, 11, 13, 15 (starboard) and 10, 12, 14, 16 (port). The cutters 1 and 2 hung swung out, abreast the bridge. Collapsibles C and D lay on the boat deck by the davits of 1 and 2; A and B were on the roof of the officers' quarters beside the first funnel, A to starboard and B to port.

"Loading officers" are those FLW list as seen working at the boat at some point during loading or lowering; the chart's own footnote says this does not mean they stayed throughout. "In charge in the boat" is from `halpern-chronology-2023`. Occupancy columns are explained under the table.

| Boat | Side | Group / davit position | FLW 2026 time | Loading officers (FLW 2026 chart) | In charge in the boat | Capacity | Occupancy (W&F 2011, SECONDHAND) | Occupancy claimed in 1912 evidence (British report) | Notes |
|---|---|---|---|---|---|---|---|---|---|
| 7 | Starboard | Forward group, 4th davit pair from forward | 12:40 | Murdoch, Lowe | Lookout Hogg | 65 | 28 | 27 | First boat away. |
| 5 | Starboard | Forward group, 3rd | 12:43 | Murdoch, Pitman, Lowe | Third Officer Pitman | 65 | 36 | 41 | First rocket went up while it was going down. |
| 3 | Starboard | Forward group, 2nd | 12:55 | Murdoch, Lowe | AB Moore | 65 | 32 | 50 | |
| 8 | Port | Forward group, 4th | 1:00 | Smith, Wilde, Lightoller | AB Jones | 65 | 27 | 39 | Told to row for the light on the horizon. |
| 1 | Starboard | Forward group, 1st (emergency cutter) | 1:05 | Smith, Murdoch, Lowe | Lookout Symons | 40 | 12 | 12 | Hung up on a wire guy; reached the water about 1:15. |
| 6 | Port | Forward group, 3rd | 1:10 | Smith, Lightoller | QM Hichens | 65 | 24 | 28 | Halted at C deck for Major Peuchen; reached the water about 1:20. |
| 16 | Port | Aft group, 4th (aftermost) | 1:20 | Moody | Master-at-Arms Bailey | 65 | 53 | 56 | |
| 14 | Port | Aft group, 3rd | 1:25 | Smith, Wilde, Murdoch, Lowe | Fifth Officer Lowe | 65 | 40 | 63 | After falls hung up; dropped the last few feet. |
| 12 | Port | Aft group, 2nd | 1:30 | Smith, Wilde, Lightoller | AB Poingdestre (Wikipedia: AB Clench, later Poingdestre) | 65 | 41 | 42 | Last boat picked up by Carpathia, with Lightoller aboard. |
| 9 | Starboard | Aft group, 1st | 1:32 | Murdoch, Moody | Boatswain's Mate Haines | 65 | 40 | 56 | |
| 11 | Starboard | Aft group, 2nd | 1:35 | Smith, Murdoch, Moody ("on A Deck", with a question mark on the chart) | AB Humphreys | 65 | 50 | 70 | Loaded from A deck. |
| 13 | Starboard | Aft group, 3rd | 1:37 | Murdoch, Moody (on A deck) | Leading Fireman Barrett | 65 | 55 | 64 | Swept aft by a pump discharge and nearly landed on by No. 15 (Halpern chronology). |
| 15 | Starboard | Aft group, 4th (aftermost) | 1:38 | Smith, Murdoch, Moody (on A deck) | Fireman Dymond | 65 | 66 | 70 | Started down about 30 s after No. 13. |
| 2 | Port | Forward group, 1st (emergency cutter) | 1:42 | Wilde, Smith | Fourth Officer Boxhall | 40 | 18 | 26 | Boxhall: "between 25 and 30 were in her" (BI Day 13, Q15428). Rowed round the stern. First boat picked up. |
| 10 | Port | Aft group, 1st | 1:50 | Murdoch, Moody (chart marks Moody with "?") | AB Buley | 65 | 57 | 55 | |
| 4 | Port | Forward group, 2nd | 1:50 | Lightoller, Smith | QM Perkis | 65 | 30 (about 34 at launch per Wikipedia text) | 40 | Lowered to A deck early in the night; loaded there once the promenade windows were opened. |
| C | Starboard | Collapsible, launched from the davits of No. 1 | 2:00 | Wilde, Murdoch | QM Rowe | 47 | 43 | 71 | Rowe counted 39 aboard (BI Day 15, Q17643). Ismay and W. Carter aboard. |
| D | Port | Collapsible, launched from the davits of No. 2 | 2:05 | Wilde, Lightoller | QM Bright | 47 | 20 | 44 | Last boat lowered. Water was only 10–15 ft below the port boat deck. Two men jumped in from A deck. |
| A | Starboard | Collapsible, roof of officers' quarters; got down to the boat deck upright | 2:15 (floated off) | Murdoch, Moody | none | 47 | 13 | not counted | Being hooked to the falls of No. 1's davits when the deck went under; floated off part-swamped. |
| B | Port | Collapsible, roof of officers' quarters; landed upside down on the boat deck | 2:15 (floated off) | Lightoller | none (Lightoller took charge on the upturned hull) | 47 | 28 | not counted | Floated off inverted; about 30 men stood on it (US report); nearly struck by the falling forward funnel. |

Occupancy — read this before using the numbers:

- **"W&F 2011" column**: figures Wikipedia attributes to Wormstedt & Fitch, ch. 7 of `centennial-reappraisal-2011`, pp. 137–141, as reported to me by the WebFetch summariser reading `wikipedia-lifeboats`. Two removes from the book, and the summariser did not read the collapsibles' section of the page (the C, D, A, B values come from the article's tally table). The twenty values sum to 713, i.e. essentially the 712 survivors, so they are **not uniformly "at launch"** figures: Nos. 14 and 12, for example, are affected by transfers at sea, and A and B are people who reached them from the water. Certainty `estimated`, flag `SECONDHAND`; verify against the book before the dataset is published.
- **"1912 evidence" column**: the British report's own table of what witnesses claimed (`brit-inquiry-report`, The Boats; `established` as a record of testimony). The report itself calls the figures "quite unreliable": they total 854 in 18 boats against 712 actually saved, and it estimates that only about 652 can have left the ship in boats. Use this column only as the competing 1912 position.
- **Cross-check I computed** from `lifeboat-project-occupants` (719 names: 712 survivors plus 7 who died in boats). Counting people assigned to exactly one boat "from Titanic" (firm or with a single "?"): 7: 23; 5: 37; 3: 26; 1: 12; 9: 33; 11: 42; 13: 43; 15: 33; C: 21; A: 19; 8: 25; 6: 20; 16: 9; 14: 30; 12: 12; 2: 17; 10: 30; 4: 46; D: 26; B: 24. Total 528; a further 96 names have no boat assigned and the rest are split between two or more candidate boats. These are **lower bounds on named occupants**, not occupancy estimates (third-class survivors are heavily under-assigned, hence 16 and 12). Method: my own count of the HTML table; `estimated`. Note that the "from Titanic" figure for No. 4 (46) includes men pulled from the water, and A and B are by definition people who reached them after the ship went down.

### 2.3 Other points from FLW 2026 worth recording

- Port list: FLW's chart marks the list as starboard for boats from 12:40 to 1:10, nil at 1:20, and port from 1:25 on. They put the port list at roughly 10° when No. 10 and collapsible D were lowered (`wfb-lifeboat-sequence`). Halpern's regression gives about 10° at No. 10 and up to 15° at D (`halpern-lifeboats-list-trim-2`). Rowe estimated 6° when he left in C (BI Day 15, Q17678). `debated` in magnitude.
- Captain Smith is reported at Nos. 8, 6, 2 and also 1, 14, 12, 11, 15 and 4; Murdoch at 7, 5, 3, 1, 11, 13, 15, 10, C, A and briefly 14; Ismay at 7, 5, 3, 16, 9, 11, 15, 2 and C (`flw-new-study-2026`, final summary, citing Behe, *The Triumvirate*, 2024).
- FLW moved No. 2 to 1:42 because a 1:45 start left too little time for the boat to row round the stern before 2:20 in their 3-D reconstruction, and because Boxhall's reported words to Rostron ("My boat cleared away at 1.45", Bisset, *Tramps and Ladies*, 1959) may refer to casting off rather than starting down.

---

## 3. Distress rockets (socket distress signals)

| Item | Finding | Sources | Certainty |
|---|---|---|---|
| Type | Socket distress signals made by the Cotton Powder Company, fired from a socket in the rail; they rose with a luminous tail, burst with a loud report and threw out stars. Boxhall: "The socket distress signal" (BI Day 13, Q15396); "You see a luminous tail behind them and then they explode in the air and burst into stars." (Q15397) | `brit-inquiry-day-13-boxhall`; `halpern-dozen-rockets`; `halpern-what-color` | established |
| Firing position | Socket on the starboard side of the forebridge, on the rail close to emergency boat No. 1. A second socket was on the port side of the after (docking) bridge on the poop and was not used. | `halpern-what-color`; `brit-inquiry-report` (Assistance: "from a socket by No. 1 emergency boat on the Boat deck"); `wfb-lifeboat-sequence` | established |
| Stock carried | 36 signals: 24 in a box on the forebridge and 12 in the quartermasters' locker under the poop. A box holding 17 unfired signals was photographed at the wreck in 2004. | `halpern-dozen-rockets`; `halpern-what-color` | established (36 on the passenger certificate); estimated (the 24 + 12 split is Halpern's inference) |
| Who fired | Fourth Officer Boxhall in charge until he left in boat No. 2; Quartermasters George Rowe and Arthur Bright brought two boxes from the poop and helped; after Boxhall left, Captain Smith directed and Rowe fired at least the last one. Rowe: "The fourth Officer and myself" were also Morsing (BI Day 15, Q17661). | `brit-inquiry-day-13-boxhall` Q15394, 15420; `brit-inquiry-day-15-rowe` Q17683–17685; `wfb-lifeboat-sequence` (Hardy AI; Mrs Douglas); `halpern-dozen-rockets` | established (Boxhall, Rowe, Bright); estimated (that Rowe, not Boxhall, fired the last) |
| First fired | About 12:47 a.m. Derivation (WFB, adopted by Halpern): Boxhall had just fired one and was returning the lanyard to the wheelhouse when Rowe's call came; Rowe timed his sighting of the boat at 12:25, taken to be on a watch (or in a frame of mind) already 23 min back, i.e. 12:48 unadjusted; Hichens left the wheel at 12:23 and saw no rocket until he was at boat No. 6. | `wfb-lifeboat-sequence`; `halpern-lifeboats-list-trim-2`; `halpern-dozen-rockets` | estimated |
| First fired — 1912 position | "about the time that No. 7 boat was lowered (12.45 a.m.)" | `brit-inquiry-report` (Assistance) | — |
| Last fired | About 1:52 a.m. (WFB/FLW) or 1:53 (Halpern's model). Derivation: Stone put the last rocket he saw at about 1:40 Californian time ("I saw the last of the rockets as near as I can say about 1.40", BI Day 7, Q7935); Californian clocks are taken as 12 min behind Titanic's; Rowe then had about eight minutes at collapsible C before it lowered at 2:00. | `wfb-lifeboat-sequence`; `flw-launch-table-2026`; `halpern-dozen-rockets`; `brit-inquiry-day-07-stone` | estimated |
| Last fired — other positions | Rowe: "From about a quarter to one to about 1.25." (BI Day 15, Q17684) — WFB shift this by 23 min to 1:48. British report: firing "continued until Mr. Boxhall left the ship at about 1.45"; "Distress signals were fired until two hours after the collision (1.45 a.m.)". | `brit-inquiry-day-15-rowe`; `brit-inquiry-report` (Assistance; Final effect) | debated |
| Interval | Boxhall: "Well, probably five minutes; I did not take any times." (BI Day 13, Q15399). Rowe later wrote he was told to fire one every five to six minutes (letter to E. Kamuda, 16 Aug 1968, cited by Halpern). Stone thought three to four minutes (BI Day 7, Q7842), which Halpern calls subjective. | `brit-inquiry-day-13-boxhall`; `halpern-dozen-rockets`; `brit-inquiry-day-07-stone` | estimated (about 5–6 min) |
| Number fired | **Debated.** British report: "In all, Mr. Boxhall fired about eight rockets"; "The number sent up by the 'Titanic' was about eight. The 'Californian' saw eight." Boxhall: "I could not say, between half a dozen and a dozen, I should say, as near as I could tell." (BI Day 13, Q15395). Lightoller: "somewhere about eight"; Pitman: a dozen or more; Bright: about half a dozen after he and Rowe arrived; Rowe implied about seven fired by himself (last four as quoted by Halpern). Halpern concludes 11 or 12 were fired over about an hour, eight of them seen from the Californian. | `brit-inquiry-report` (Assistance; Californian); `brit-inquiry-day-13-boxhall`; `halpern-dozen-rockets` | debated: "about eight" (British Inquiry 1912) vs "11 or 12" (Halpern). Nobody aboard counted. |
| Colour | White. Boxhall: "Just white stars, bright" (AI, quoted by Halpern). Stone: "white rockets" (BI Day 7, Q7829, 7841). Gibson saw a flash on deck, a streak, then a burst of white stars (statement of 18 April, quoted by Halpern). British report: "throwing off white stars". Lightoller: "Principally white, almost white". A minority of survivors spoke of colours; Don Lynch and Parks Stephenson suggested on television in 2012 that the signals burst into coloured balls; Halpern disputes this as a misreading of colour-enhanced wreck imagery. | `halpern-what-color`; `brit-inquiry-day-07-stone`; `brit-inquiry-report` (Assistance) | established (white, on the weight of officers on both ships); the coloured-stars claim is a minority position (Lynch/Stephenson 2012, as reported by Halpern) |
| What the Californian's officers reported | Stone saw a flash he took for a shooting star at about 12:45 Californian time, then four more through glasses, "white rockets bursting in the sky", and told Captain Lord by speaking tube at "just about 1.10" (BI Day 7, Q7829–7841). Lord asked whether they were company's signals. Gibson arrived, and they saw three more. Stone to Gibson: "Look at her now; she looks very queer out of the water; her lights look queer." (Gibson, BI Day 7, Q7515). At "Five minutes past two by the wheelhouse clock" (Q7565) Gibson was sent to tell Lord the ship had disappeared to the south-west and "has fired altogether eight rockets" (Q7552, 7609). Stone called Lord again at about 2:40. Halpern states the two ships were too far apart for the reports to be heard. | `brit-inquiry-day-07-stone`; `brit-inquiry-day-07-gibson`; `brit-inquiry-report` (Californian); `halpern-dozen-rockets` | established (testimony) |
| Distance of the Californian | Lord: 19 to 19½ miles. British report: "probably … not more than eight to ten miles". US report: nearer than 19 miles. Halpern: 12 to at most about 14 nautical miles, bearing about 315° true from Titanic. | `brit-inquiry-report` (Californian); `us-inquiry-report`; `halpern-dozen-rockets` fn 12 | debated |

### Halpern's modelled firing times (a model, not observations)

Halpern assumes one signal every six minutes from 12:47 and "about a dozen" in all. None of these individual times is attested; use them only if the visualization needs evenly spaced placeholders, and label them `estimated (uniform 6-minute model, Halpern)`.

| Signal | Titanic ATS | Californian ATS | Seen from Californian (Halpern's matching) |
|---|---|---|---|
| 1 | 12:47 | 12:35 | Not seen (Stone at the speaking tube with Lord) |
| 2 | 12:53 | 12:41 | Not seen |
| 3 | 12:59 | 12:47 | 1st (taken for a shooting star) |
| 4 | 1:05 | 12:53 | 2nd |
| 5 | 1:11 | 12:59 | 3rd |
| 6 | 1:17 | 1:05 | 4th |
| 7 | 1:23 | 1:11 | 5th; Lord informed |
| 8 | 1:29 | 1:17 | Not seen (Stone briefing Gibson) |
| 9 | 1:35 | 1:23 | 6th (Gibson sees the flash on deck through glasses) |
| 10 | 1:41 | 1:29 | 7th |
| 11 | 1:47 | 1:35 | Possibly not fired (Boxhall leaving in No. 2), or missed |
| 12 | 1:53 | 1:41 | 8th and last |

Source: `halpern-dozen-rockets`. The 12-minute Titanic–Californian offset rests on the two ships' noon longitudes (local apparent noon at 2:58 p.m. GMT for Titanic, 3:10 p.m. GMT for Californian).

---

## 4. Wireless

**All contemporary wireless times come from station logs (procès-verbaux) kept in New York time or GMT, not in Titanic's ship's time.** (Olympic, Mount Temple, Baltic, Virginian, Frankfurt, Ypiranga, Asian and Cape Race in NYT; Caronia and Celtic in GMT; Birma in her own local time.) Titanic's own log was lost. Any "ship's time" for a message is a conversion. `lee-desperate-dialogue` and `halpern-chronology-2023` both say many PVs round to the nearest five minutes and differ from one another by a few minutes for the same exchange.

Operators: John G. ("Jack") Phillips, senior (lost); Harold S. Bride, junior (survived). Call sign MGY. Bride's account: Smith came in, "gave us to understand he wanted us to call C.Q.D." (BI Day 14, Q16504), gave the position, and Phillips sent it; the first ships Bride remembered answering were Frankfurt, then Carpathia, then Olympic, then Baltic (Q16513–16541). `lee-desperate-dialogue` points out that the logs give a different order of first hearers (Mount Temple/Cape Race/La Provence at 10:25, Carpathia at 10:35).

| NYT (as logged) | GMT | ATS, Halpern/Lee (NYT + 2:02) | ATS in British report (≈ NYT + 1:50) | Message / event | Heard or logged by | Sources | Certainty |
|---|---|---|---|---|---|---|---|
| 10:25 p.m. | 3:25 a.m. | 12:27 a.m. | 12:15 a.m. | First CQD, position 41°44′N, 50°24′W, "require assistance" | Cape Race (MCE), Mount Temple (MLQ), La Provence (MLP) | `us-inquiry-report`; `lee-desperate-dialogue`; `halpern-chronology-2023`; `brit-inquiry-report` | established (NYT); debated (ATS) |
| 10:28 | 3:28 | 12:30 | — | CQD with 41°44′N, 50°24′W, repeated about ten times | Ypiranga (DYA) | `lee-desperate-dialogue` | established |
| 10:35 | 3:35 | 12:37 | 12:25 | "Come at once. We have struck a berg. It's a CQD OM. Position 41.46 N 50.14 W" — corrected position (Boxhall's) | Carpathia (MPA); Cape Race logs the correction ("5 or six miles difference") | `lee-desperate-dialogue`; `halpern-chronology-2023`; `brit-inquiry-report` | established (NYT); debated (ATS) |
| 10:36 | 3:36 | 12:38 | 12:26 | Corrected position; "we have collision with iceberg, sinking. Can hear nothing for noise of steam" | Ypiranga | `lee-desperate-dialogue`; `brit-inquiry-report` | established |
| 10:40 | 3:40 | 12:42 | — | Titanic asks Frankfurt to tell her captain to come; Frankfurt "OK, stand by". Mount Temple turns round. Caronia relays to Baltic. | Frankfurt (DFT), Mount Temple, Caronia (MRA), Cape Race | `lee-desperate-dialogue`; `halpern-chronology-2023` | established |
| ≈10:47 | 3:47 | 12:49 | 12:35 (when Smith was told) | Carpathia gives her position and says she is coming | Carpathia | `halpern-chronology-2023` note 43; `brit-inquiry-report` (Boats) | estimated |
| 10:48 | 3:48 | 12:50 | — | Frankfurt gives position; asks "What is the matter with you?"; Titanic: struck iceberg and sinking, tell captain to come | Mount Temple; Ypiranga (10:46) | `lee-desperate-dialogue`; `us-inquiry-report` | established |
| 10:55 | 3:55 | 12:57 | — | "MGY calling SOS" — first logged SOS, to Olympic (MKC); Celtic hears "I require immediate assistance" | Mount Temple; Celtic (MLC, logged 3:55 GMT) | `lee-desperate-dialogue`; `halpern-chronology-2023` | established |
| 11:02 | 4:02 | 1:04 | — | "SOS–CQD" and position | Ypiranga | `lee-desperate-dialogue` | established |
| 11:10 | 4:10 | 1:12 | — | Titanic gives Olympic 41.46 N, 50.14 W: "We have struck an iceberg"; Olympic about 505 miles away. Baltic and Virginian (MGN) also hear the call. | Olympic; Baltic (MBC); Virginian | `lee-desperate-dialogue`; `halpern-chronology-2023` | established |
| 11:12–11:17 | 4:12–4:17 | 1:14–1:19 | — | Titanic to Asian (MKL): "Want immediate assistance"; position repeated | Asian | `lee-desperate-dialogue` | established |
| 11:20 | 4:20 | 1:22 | — | To Olympic: "Captain says get your boats ready. Going down fast at the head." (Mersey list: "We are in collision with berg. Sinking head down … Come soon as possible.") | Olympic, Mount Temple, Baltic; Caronia (4:15 GMT) | `lee-desperate-dialogue`; `halpern-chronology-2023` note 53 | established |
| 11:25–11:26 | 4:25 | 1:27–1:28 | — | Frankfurt: "Our captain will go for you"; Titanic: "OK, thanks" | Mount Temple, Ypiranga | `lee-desperate-dialogue`; `us-inquiry-report` | established |
| 11:35 | 4:35 | 1:37 | — | Olympic: "4.24 a.m. G.M.T. 40.52 N., 61.18 W. Are you steering southerly to meet us? Haddock." Reply: "We are putting the women off in the boats." Cape Race hears Titanic no more. | Olympic, Mount Temple, Baltic, Virginian, Ypiranga | `lee-desperate-dialogue`; `halpern-chronology-2023` notes 59–60 | established |
| 11:40 | 4:40 | 1:42 | — | To Olympic: "Tell captain we are putting the passengers off in small boats." | Olympic, Ypiranga; Birma (as 1:30 local) | `lee-desperate-dialogue` | established |
| 11:41 | 4:41 | 1:43 | — | "CQD. Engine room flooded." | Mount Temple | `lee-desperate-dialogue` | established |
| 11:45 | 4:45 | 1:47 | — | Olympic asks the weather: "clear and calm". Bride to Baltic: "Engine room getting flooded." | Olympic, Baltic | `lee-desperate-dialogue`; `halpern-chronology-2023` | established |
| 11:47–11:50 | 4:47–4:50 | 1:49–1:52 | — | Baltic: "We are rushing to you" (243 miles east). Olympic: "Am lighting up all possible boilers as fast as can", acknowledged. Last heard by Mount Temple (11:47). | Baltic, Olympic, Mount Temple, Ypiranga | `us-inquiry-report`; `lee-desperate-dialogue`; `halpern-chronology-2023` note 63 | established |
| 11:55 | 4:55 | 1:57 | 1:45 | Last signals heard by Carpathia: "Engine room full up to boilers" | Carpathia (Mersey list) | `lee-desperate-dialogue`; `brit-inquiry-report` | established (NYT); debated (ATS) |
| 11:58 | 4:58 | 2:00 | — | Titanic calling CQD/SOS; Asian answers, no reply | Asian | `lee-desperate-dialogue` | established |
| 12:05 a.m. | 5:05 | 2:07 | — | Cape Race tells Virginian it has not heard Titanic for about half an hour, "his power may be gone" | Virginian PV | `lee-desperate-dialogue` | established |
| 12:10 | 5:10 | 2:12 | — | Virginian: "Hear MGY calling very faintly. His power greatly reduced." Mount Temple hears Olympic, Frankfurt and Baltic calling Titanic without reply. | Virginian only | `lee-desperate-dialogue`; `halpern-chronology-2023` note 68 | debated (attribution) |
| 12:20 | 5:20 | (2:22) | — | Virginian hears two faint "V"s in a spark like Titanic's | Virginian only | `lee-desperate-dialogue`; `halpern-chronology-2023` note 72 | debated |
| 12:27 | 5:27 | (2:29) | 2:17 | Virginian: "MGY calls CQ. Unable to make out his signal. Ended very abruptly as if power suddenly switched off." | Virginian only | `us-inquiry-report`; `brit-inquiry-report`; `lee-desperate-dialogue`; `halpern-chronology-2023` note 73 | **debated**: last signal from Titanic (both 1912 reports) vs not from Titanic at all (Halpern; Lee), since on a 2 h 02 min offset it falls nine minutes after the sinking; Cottam on Carpathia, much nearer, heard nothing (BI 17147 per Halpern) |

Notes:

- **Positions transmitted.** First 41°44′N, 50°24′W (Cape Race, Ypiranga, and Captain Moore's evidence for Mount Temple), then from 10:35 p.m. NYT the corrected 41°46′N, 50°14′W worked out by Boxhall (`brit-inquiry-day-13-boxhall` Q15389–15391: "I submitted the position to the Captain first, and he told me to take it to the marconi room"). `established`. The Mount Temple PV itself has 41.44 N, 50.14 W written at 10:25 (`lee-desperate-dialogue`). The wreck lies about 13 nautical miles east of Boxhall's position (`halpern-1h33`); Halpern gives the collision position as about 41°45.5′N, 49°55′W and the wreck (centre of the boiler field) as 41°43.5′N, 49°56.8′W (`halpern-chronology-2023`).
- **CQD first, SOS later.** First CQD 10:25 p.m. NYT; first logged SOS 10:55 p.m. NYT (Mount Temple PV), thereafter both used together. `established`. The story that Bride suggested SOS to Phillips comes from Bride's New York Times interview — `FROM-MEMORY`, not checked here.
- **Ships that answered or relayed:** Frankfurt, Carpathia, Mount Temple, Olympic, Baltic, Caronia, Celtic, Asian, Virginian, Ypiranga, Birma, Cincinnati (DDC), La Provence; shore station Cape Race (`lee-desperate-dialogue`, `us-inquiry-report`). The Californian "heard none of the Titanic's messages; she had only one Marconi operator on board and he was asleep" (`brit-inquiry-report`).
- **Distances when first called** (US report): Mount Temple about 49 miles, Carpathia 58, Birma 70, Frankfurt 153, Virginian about 170, Baltic about 243, Olympic about 512.
- **Loss of power.** Bride: "the power was failing us and I do not think we were getting a spark, as there were no replies" (BI Day 14, Q16566); the set took its power from the ship's dynamos (he says "From the engine room", Q16568). The British report notes the Marconi set also had "an independent storage battery and coil" and could be switched to the emergency circuit (`brit-inquiry-report`, Electrical installation).
- **Time of the first call relative to the collision.** British report 12:15 (35 min after); Halpern and Lee 12:27 (47 min after); US report: "Within 15 or 20 minutes the Captain visited the wireless room". Lee remarks that 47 minutes "seems extremely late" but accepts it.
- **Last genuine transmission.** Halpern: last CQD about 2:07, cabin abandoned about ten minutes before the break-up (`halpern-chronology-2023` note 67; 2:10 in `halpern-lifeboats-list-trim-2`). Lee: the last indisputable message was probably about 11:55 p.m.–midnight NYT (≈ 2:00 ATS). British report: 2:17. `debated`.

---

## 5. Electric lighting and power

| Item | Finding | Sources | Certainty |
|---|---|---|---|
| Main generating plant | Four 400 kW, 100 V DC engine-and-dynamo sets in their own watertight compartment immediately aft of the turbine room, at inner-bottom (tank top) level; steam from the single-ended boilers in boiler rooms 1 and 2 (and two in No. 4), with connections allowing steam from any boiler. Combined output 16,000 A. | `brit-inquiry-report` (Electrical installation); `halpern-master-of-time` fn 1 | established |
| Emergency (auxiliary) sets | Two 30 kW engine-and-dynamo sets "on a platform in the turbine engine room casing on saloon deck level, 20 ft. above the waterline", with their own steam pipe along the working passage above E deck from boiler rooms 2, 3 and 5. | `brit-inquiry-report` (Electrical installation) | established |
| Emergency circuit | A separate circuit fed by the 30 kW sets carried 500 lamps throughout passenger, crew and machinery spaces and on the boat deck; by change-over switches it could also feed the Marconi set, the mast, side and stern lights, all bridge lights, the Morse lanterns, five arc lamps and the four electric boat winches. The ship had about 10,000 lamps in all. | `brit-inquiry-report` (Electrical installation) | established (as fitted). Whether, when and how the change-over was actually used that night: `UNVERIFIED`. |
| Stokehold lights fail and return | The lights went out in the stokeholds (reported in boiler rooms 5 and 4) roughly 10–12 min after the collision and came back roughly ten minutes later; lamps were fetched meanwhile. | `halpern-chronology-2023` (Barrett BI 1957–61, 2007–14; Cavell BI 4215–18; notes 31, 34) | established (event); estimated (11:52 → 12:02) |
| Deck and cabin lights during the sinking | The lights stayed on throughout. British report: "There were no lights burning then [at the final plunge], though they kept alight practically until the last" (citing Lee 2558 and Pearcey 10454). Beesley, watching from boat 13, wrote that they shone with the same brilliance but that fewer were visible as rows went under. | `brit-inquiry-report` (Final effect); `beesley-1912` (via summariser) | established |
| Lights still on at 2:15 | Joughin read his watch at a quarter past two on A deck with the lights still on. | `halpern-chronology-2023` (Joughin BI 6040–49, 6359–64) | established (testimony) |
| Final failure | The lights went out at about 2:17, as the ship pitched and broke, two to three minutes before the stern disappeared (Symons's estimate). Beesley: her lights "went out suddenly, came on again for a single flash, then went out altogether". From the Californian the steamer's lights disappeared at 2:05 by her wheelhouse clock, which Halpern equates to 2:17 Titanic time. | `halpern-chronology-2023` (Symons BI 11510–25; note 70); `halpern-lifeboats-list-trim-2`; `beesley-1912` (via summariser; re-check wording); `brit-inquiry-day-07-gibson` Q7565 | estimated (2:17 ± 1); the single-flash detail rests on Beesley |
| Dimming / reddish glow | **`UNVERIFIED`.** I found no primary testimony in the pages I read describing the lights turning red or orange. A web search returned only blogs and forum posts asserting a reddish glow as steam pressure to the dynamos fell. The nearest primary indications of falling power are Bride on the wireless spark (BI Day 14, Q16566–16570), the Virginian's "his power greatly reduced" (disputed attribution), and Stone's remark from ten or more miles away that "her lights look queer" (Gibson, BI Day 7, Q7515), which Halpern discusses together with the disappearance of her red sidelight as she listed and trimmed down, without mentioning dimming. `FROM-MEMORY`: I recall modern accounts (including *On a Sea of Glass*) citing survivors who described the lights burning red or dull towards the end, but I cannot name a witness or a question number with confidence. If the visualization shows a red shift, flag it as an interpretive choice. | search snippet; `brit-inquiry-day-14-bride`; `halpern-dozen-rockets` | unverified |
| Why the lights lasted | Halpern's reading: power fell as steam pressure to the dynamo engines dropped (`halpern-chronology-2023` note 65). The fires in the forward boiler rooms were being drawn from about midnight. | `halpern-chronology-2023` | estimated (interpretation) |
| Engineers at their posts | Engineers were working pumps and a portable suction pipe (ordered about 12:45, carried forward about 1:05, connected in boiler room 4 by about 1:35). At about 1:20 most firemen, trimmers and greasers were ordered up on deck (Dillon, Scott, Threlfall). Rostron's private message to Haddock on 15 April reported "all engineers gone". | `halpern-chronology-2023` (Scott BI 5600–04, 5838–39; Dillon BI 3816–27; Wilding BI 20682–86; Carpathia–Olympic messages) | established that no engineer officer survived (Rostron's message as quoted by Halpern); how many stayed below to the end, and who kept the dynamos running, is not established by anything I read |
| Number of engineers lost; who was at the dynamos | `FROM-MEMORY`: commonly given as 35 engineering officers lost (25 engineers, 6 electricians, 2 boilermakers, plumber, clerk), and that Greaser Thomas Ranger and others testified about work in the electric engine room. Not verified in this session. | — | unverified |

---

## 6. Carpathia and the rescue

Time-reference warning: Rostron's times are **Carpathia ship's time**, which was not Titanic's.

- Rostron's own statement: "The New York time at 12:35 was 10:45 p. m. Sunday night." (US Inquiry Day 1) — i.e. Carpathia = NYT + 1 h 50 min, which would put Carpathia 12 min behind Titanic's NYT + 2 h 02 min.
- Halpern: Carpathia ATS was 1 h 57 min ahead of NYT (`halpern-chronology-2023` note 76, citing his "12:35 AM Apparent Time Carpathia", which I did not read) — i.e. Carpathia 5 min behind Titanic. His chronology therefore puts 4:10 Carpathia time at 4:15 Titanic time.
- `debated`: Rostron's stated 1 h 50 min vs Halpern's 1 h 57 min. Either way, after 2:20 a.m. "Titanic time" is only a bookkeeping convention.

| Carpathia time | Titanic ATS (Halpern, +5 min) | Event | Sources | Certainty |
|---|---|---|---|---|
| 12:35 a.m. (Rostron) | 12:37 by the 10:35 NYT log | Carpathia receives the distress call and turns; 58 miles away, course N 52° W | `us-inquiry-day-01-rostron`; `us-inquiry-report`; `brit-inquiry-report` (Rescue) | established (event); the 12:35 = 10:45 NYT equation is Rostron's and conflicts with the 10:35 NYT log time |
| 2:40 a.m. | ≈2:45 | Rostron sees a green flare about half a point on the port bow: "At 2:40, I saw a flare" (US Day 1). The British report identifies it as one of Boxhall's flares from boat No. 2. | `us-inquiry-day-01-rostron`; `brit-inquiry-report` (Rescue) | established |
| 2:45 a.m. onward | ≈2:50 | Carpathia fires company's rockets "at 2:45 a. m. and every quarter of an hour after to reassure Titanic" | `us-inquiry-day-01-rostron` | established |
| — (1:16 and 1:25 a.m. NYT) | 3:18 and 3:27 | Caronia hears a ship say "We are firing rockets. Lookout for rockets"; Carpathia sends "If you are there, we are firing rockets" | `halpern-chronology-2023` (PV Caronia, PV Mount Temple) | established (logs) |
| ≈3:30 a.m. (boat estimate) | — | From boat 13, Beesley notes "a faint far-away gleam in the southeast" (a rocket), then a ship's lights | `beesley-1912` (via summariser) | estimated (one witness's "as nearly as I can judge") |
| 2:45–4:00 a.m. | — | Carpathia alters course repeatedly to avoid icebergs | `us-inquiry-day-01-rostron`; `brit-inquiry-report` | established |
| 4:00 a.m. | ≈4:05 | Rostron stops his engines ("At 4 o'clock I stopped"); British report: stopped at 4:05 | `us-inquiry-day-01-rostron`; `brit-inquiry-report` | established |
| 4:10 a.m. | 4:15 | First boat alongside: No. 2, Boxhall. "At 4:10 I got the first boat alongside." (US Day 1) | `us-inquiry-day-01-rostron`; `brit-inquiry-report`; `halpern-chronology-2023` | established |
| ≈4:45 | ≈4:50 | Boat No. 1 | `halpern-chronology-2023` (Behe's pickup table, `centennial-reappraisal-2011` p. 144) | estimated, SECONDHAND |
| ≈5:45 | ≈5:50 | Collapsible C (later set adrift) | same | estimated |
| ≈6:00 | ≈6:05 | No. 5 | same | estimated |
| ≈6:15 | ≈6:20 | Nos. 7 and 9 | same | estimated |
| ≈6:30 | ≈6:35 | No. 13 | same | estimated; Beesley, who was in No. 13, wrote "We rowed up to her about 4.30" — an unresolved two-hour conflict |
| ≈6:45 | ≈6:50 | No. 16 | same | estimated |
| ≈7:00 | ≈7:05 | No. 11 | same | estimated |
| ≈7:15 | ≈7:20 | No. 14 and collapsible D (both later set adrift) | same | estimated |
| ≈7:30 | ≈7:35 | Nos. 3, 8 and 15 (15 later set adrift) | same | estimated |
| ≈8:00 | ≈8:05 | Nos. 4, 6 and 10 (4 later set adrift) | same | estimated |
| ≈8:15 | ≈8:20 | Last boat, No. 12, with Lightoller at the helm | `halpern-chronology-2023` | estimated; Wikipedia (citing the same p. 144) says about 8:30 |
| ≈8:30 | ≈8:35 | All survivors and the last boat aboard; 13 boats taken up (6 on the foredeck, 7 in davits) | `halpern-chronology-2023` (Rostron's report to Cunard, 19 April) | established (Rostron's report) |
| ≈8:50 | ≈8:55 | Carpathia gets under way to search the area, then leaves; Californian stays to search | `halpern-chronology-2023` | established |

Other points:

- The British report says it was "8 a.m. before they had all been picked up" and that Rostron took aboard 13 lifeboats, two emergency boats and two collapsibles, 712 persons, one of whom died shortly afterwards. The US report says 706 saved. Rostron's wireless to Olympic on 15 April said "about 675". Record 712 as the British report's figure; the 712/706 difference is a known discrepancy I did not resolve here.
- **Correction to the baseline I was given:** "last boat (No. 12) ≈ 8:30 a.m." — Halpern's chronology has No. 12 arriving at about 8:15 Carpathia time and everyone aboard by about 8:30. Use 8:15–8:30 with certainty `estimated`.
- Boats A and B never reached Carpathia as such: A was abandoned after its survivors were taken into No. 14 (`lifeboat-project-occupants` shows A's survivors arriving in 14), and the men on B were taken into Nos. 4 and 12 (`us-inquiry-report`).
- The Californian learned of the sinking by wireless from about 3:25 a.m. NYT (Mount Temple, then Frankfurt and Virginian); Mount Temple's PV has Carpathia and Californian both in sight at 6:00 a.m. NYT (`halpern-chronology-2023`). The time Californian came alongside Carpathia was not checked here.

---

## 7. Time references

### 7.1 Positions on the Titanic–New York–GMT offset

| Position | Offset | Holder | Basis | Source |
|---|---|---|---|---|
| A | Titanic ATS = NYT + 2 h 02 min = GMT − 2 h 58 min | Samuel Halpern; adopted by Wormstedt, Fitch, Behe, Layton; described by Paul Lee as the "more probable" figure | Clocks were set for local apparent noon of 14 April at about 44°31′W (estimated noon position 43°02′N, 44°31′W), where apparent noon fell at 2:58 p.m. GMT. Supported by Bride: the two Marconi-room clocks differed by "about 2 hours". | `halpern-1h33`; `halpern-master-of-time`; `halpern-chronology-2023`; `lee-desperate-dialogue` |
| B | Titanic ATS = NYT + 1 h 33 min = GMT − 3 h 27 min | US Senate report 1912; Boxhall ("At 11.46 p.m., ship's time, it was 10.13 Washington time, or New York time"); Lightoller repeated 5:47 GMT; Rostron's message | Hence the US report's "11.46 p.m. ship's time, or 10.13 p.m. New York time" for the collision and "12.47 a.m., New York time" for the sinking. Halpern argues this offset is an error tied to Boxhall's distress-position calculation: the extra 35 min of run at 22 knots is 12.8 miles, the distance between Boxhall's position and the wreck. | `us-inquiry-report`; `halpern-1h33` |
| C | Titanic ATS ≈ NYT + 1 h 50 min | Implied by the times in the British report (12:15, 12:25, 12:26, 1:45, 2:17 against NYT 10:25, 10:35, 10:36, 11:55, 12:27); Paul Lee says this figure "is strongly believed by many" | Not stated as an offset in the report sections I read; it is my inference from the pairs. It equals Rostron's stated Carpathia offset and Halpern's Californian offset. Who introduced it into the 1912 message list is `UNVERIFIED`. | `brit-inquiry-report`; `us-inquiry-report`; `lee-desperate-dialogue` |

Certainty of the offset: `debated` historically; position A is the one used by all the modern timeline work I read. I am not settling it.

Related offsets (Halpern): Californian ATS = Titanic ATS − 12 min (noon at 3:10 p.m. GMT); Carpathia ATS = NYT + 1 h 57 min; Mount Temple ATS = NYT + 1 h 46 min (her 12:26 a.m. = 10:40 p.m. NYT); Virginian = NYT + 1 h 30 min (`halpern-dozen-rockets`; `halpern-chronology-2023` notes 76, 78 and the 12:42 row).

### 7.2 Were the clocks put back before the collision?

Planned adjustment for the night of 14–15 April: 47 minutes in all, in two steps of 23 and 24 minutes — the first just before midnight (lengthening the 8-to-12 watch), the second in the first half hour after the change of watch (`halpern-master-of-time`, citing AI p. 451).

| Position | Holder | Argument | Source |
|---|---|---|---|
| No setback was made; 11:40 p.m. and 2:20 a.m. are unadjusted 14 April time | Samuel Halpern; the "Time & Again" group (Chirnside, Fitch, Georgiou, Hall, Halpern, Layton, Wormstedt); FLW | The Magneta slave clocks could not run backward: a setback froze them for 23 minutes, so they would have read close to midnight, not 11:40. Hichens timed the collision at "20 minutes to 12" after 1 h 40 min at the wheel. Haines: "The right time, without putting the clock back, was 20 minutes to 12." Pitman, asked whether the clocks were put back: "No; we had something else to think of." The smoking rooms, due to close at midnight, were still open. | `halpern-master-of-time`; `halpern-chronology-2023` (12:00 row: "Clocks not put back because of the accident") |
| The ship's clocks were not changed, but **some individuals' watches or reckoning were**: Rowe, isolated on the poop, routinely set his watch back 23 min at midnight (or thought in adjusted time), so his "12:25" for the boat in the water is 12:48 and his "1:25" for the end of the rockets is 1:48; the "1:40" for collapsible C in the British report is likewise 23 min slow | Wormstedt, Fitch & Behe; Halpern uses the same reasoning (planned change of watch at 12:23 unadjusted) | Makes Rowe's times consistent with Boxhall's and with Rowe's own "twenty minutes" between C leaving and the sinking. Rowe in 1963 denied adjusting his watch; WFB note his late statements contradict each other. | `wfb-lifeboat-sequence`; `halpern-lifeboats-list-trim-2` |
| The first (23- or 24-minute) setback had already been made before the collision, so that "11:40" is partly adjusted time | "Some Titanic enthusiasts" (Halpern's words; he names nobody). `FROM-MEMORY`: I recall this being argued by David Gittins and by Senan Molony among others; I did not verify those attributions in this session. | Rests on crew members who gave the impression that they were due on watch soon after the accident (e.g. lookouts Hogg and Evans relieving Fleet and Lee about twenty minutes after the collision). Halpern attributes this to confusion and to crew reckoning time by bells and word of mouth. | `halpern-master-of-time` (as the position he rejects) |

Consequence if the third position were right: every post-collision time in these notes would shift by about 23–24 min relative to NYT/GMT, and the wireless alignment would change. Keep the offset as a dataset parameter with a source id rather than baking it in.

### 7.3 Rostron's "5.47 GMT"

- The message (Carpathia to Olympic, logged about 4:10 p.m. NYT on 15 April): "Titanic foundered about 2.20am, 5.47 GMT, in 41.46 north. 50.14 west" (`halpern-chronology-2023`, citing Booth & Coughlan, *Titanic – Signals of Disaster*).
- 5:47 GMT minus 2:20 is 3 h 27 min, i.e. position B above (NYT + 1 h 33 min). On position A, 2:20 a.m. ATS is 5:18 a.m. GMT (12:18 a.m. NYT, as in Halpern's chronology).
- Why it is considered erroneous — Halpern's explanations (both his; I found no independent treatment):
  1. `halpern-chronology-2023` note 83: a longitude given for Carpathia in an earlier message that day, 51°45′W, corresponds to a local mean time exactly 3 h 27 min behind GMT, and "it was this time difference that later shows up" in the message to Olympic.
  2. `halpern-1h33`: the same 3 h 27 min is implied by Boxhall's 11:46 p.m. = 10:13 p.m. NYT, which Halpern ties to the 13-mile westward error of the distress position.
  3. `websearch-rostron-547` (search snippet of a Halpern article, not read in full): someone mistook 1 h 33 min for the Titanic–New York difference and added 3 h 27 min to 2:20.
- Holders of the contrary view (that 5:47 GMT is correct): the US Senate report's time base; Boxhall and Lightoller in 1912. I found no modern author defending it in what I read.
- Certainty that the foundering was at 2:20 a.m. ship's time: `established` (Pitman's, Mrs Thayer's and Miss Minahan's independent watch readings, both inquiry reports). Its GMT equivalent: `debated` (5:18 Halpern; 5:47 Rostron/US Senate).

---

## Open questions / could not verify

1. **Reddish or dimming lights.** No primary witness found in the sources read. Needs a targeted search of the inquiry transcripts and of *On a Sea of Glass* before the visualization commits to a colour change. Also unverified: Beesley's exact wording (obtained through a summarising tool).
2. **Exact minute of the first funnel's fall**, and its order relative to lights-out (2:17) and the break. Sources read only place it after collapsible B floated off.
3. **Angle and mechanics of the break-up** and the attitude of the stern before it sank. Halpern has an article titled "Why A Low Angle Break?" (seen in his publication list, not read); the British report describes the ship reaching the perpendicular unbroken. Not researched here.
4. **Lifeboat occupancy at launch.** The per-boat figures attributed to Wormstedt & Fitch (2011) reached me second-hand through Wikipedia and a summariser; they sum to the survivor total and so mix "at launch" with "at Carpathia". The book (pp. 137–141, 144) should be checked directly. No per-boat occupancy table appears in `wfb-lifeboat-sequence` or in the parts of `flw-new-study-2026` I read.
5. **Who was in charge of boat No. 12** at launch (Poingdestre per Halpern; Clench then Poingdestre per Wikipedia) and of boat No. 7 beyond "Lookout Hogg" (Halpern).
6. **Georgiou's sequence** is known to me only through Halpern's table; his original articles were not consulted.
7. **Halpern's ET article "Rockets, Lifeboats, and Time Changes"**, his "12:35 AM Apparent Time Carpathia" and the "Time & Again" paper (web page still says "Coming Soon") were not read. The Carpathia offset of 1 h 57 min rests on a citation only.
8. **Origin of the 1 h 50 min offset** behind the British report's message times: inferred by me from paired times, not found stated.
9. **Named proponents of the pre-collision clock setback**: `FROM-MEMORY` only.
10. **Number of engineers lost and who tended the dynamos to the end**: `FROM-MEMORY`; Ranger's, Scott's and Dillon's testimony pages were not opened (only cited through Halpern).
11. **The SOS anecdote** (Bride suggesting it to Phillips) and Bride's New York Times interview: not checked.
12. **Captain Smith's and Andrews's inspection times** (11:50–12:22) are Halpern's reconstruction from stewards' sightings; "See Section 7" of the *Centennial Reappraisal*, which he cites for the 12:22 and 12:25 rows, was not consulted.
13. **712 vs 706 survivors** (British vs US report) not reconciled here.
14. **FLW's "steam starts 11:47 / stops 12:58"**: the stop time is argued in a sidebar I read; I did not locate their argument for the 11:47 start.
15. **`flw-new-study-2026` was not read in full** (253 pages). Sections 2–5 were only keyword-searched; details there (individual witness citations for each boat) are available in the extracted text if needed.
16. **Version label of the FLW PDF**: the URL says v. 1.3, the title page says "Version 1.4, May 2026". Cite the title page.
