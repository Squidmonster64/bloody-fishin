# Test fixtures: forecast scenarios and expected labels

Prepared 14 November 2026. For regression tests. Each card names the rows it must make pass.

Labels: **[M]** the "Now" column was worked out from the code at `93078fc` (`shared/scoring.ts:52-61`) or seen on the live feed. **[J]** every expected value after the fixes follows the proposed rules. The proposed limits are for skipper validation. If the skipper changes a limit, change the fixture with it and record who and when.

## 0. Conventions

- Spot is **Fremantle Offshore** (-32.06, 115.65), vessel preset **sl20**, unless the row says otherwise.
- Wind and gust in knots. Direction is degrees the wind blows **from**. Chop is the wind-wave height in metres. Swell is height in metres at mean period in seconds.
- "Day" means the whole hour bucket is between sunrise and sunset (`isDaylightHour`, `shared/scoring.ts:129-136`). Use sunrise 05:10 and sunset 18:55 unless stated.
- "BOM clear" means the BOM page was read, is under 24 h old, and holds no wind warning for that date.
- States: **Inside** = "Inside your limits". **Marginal** = "Marginal for your limits". **Outside** = "Outside your limits". **No call**.
- Boundary rule: a value equal to a limit is on the better side. 12.0 kt is Inside when the limit is 12. 12.1 kt is not.

### Limits used for the expected values [J]

| Preset | Wind in / marg | Gust in / marg | Chop in / marg | Swell in / marg (any period) | Swell under 8 s in / marg | Strong Wind Warning |
|---|---|---|---|---|---|---|
| tinnie | 8 / 12 | 12 / 16 | 0.3 / 0.5 | 1.2 / 1.8 | 1.0 / 1.5 | Outside |
| **sl20** | **12 / 16** | **16 / 21** | **0.4 / 0.7** | **1.5 / 2.2** | **1.2 / 2.0** | **Outside** |
| offshore | 15 / 20 | 20 / 26 | 0.6 / 1.0 | 2.0 / 3.0 | 1.5 / 2.2 | Marginal at best |
| kayak | 6 / 8 | 10 / 12 | 0.2 / 0.3 | 0.5 / 0.8 | 0.3 / 0.5 | Outside |

Above the second number is Outside. The sl20 swell figure of 1.5 m is the owner's own stated ceiling [R]. The rest are starting values from the go-window review, section 4.2 [R, J].

Legacy thresholds (cards 03 to 06, before card 07): Inside = today's Go or Excellent. Marginal and Outside = today's Marginal and Avoid, plus the new swell rule of card 04 (over 1.5 m Marginal, over 2.2 m Outside).

Phase 2 factors used [J]: sea-breeze allowance 1.2 on mean wind from 180° to 250° between 10:00 and 18:59 local in the Perth region. Weather-shore factor 0.8 inside a spot's sheltered sector. Gust-ratio rule: gust ÷ mean ≥ 1.5 and gust ≥ 18 kt drops one state. Swell exposure factor: Fremantle Offshore 0.5, Rottnest West 1.0 with reef flag, Port Coogee Marina 0.2 with sheltered sector 020° to 160°. Total sea = √(local swell² + chop²), limits 1.3 / 1.8 m for sl20. Reef-flag spots also test raw swell against 1.2 / 1.8 m.

---

## 1. Single-hour scenarios

| ID | Wind / from / gust | Chop | Swell @ period | Time | BOM | Now [M] | After cards 03 to 06 | After card 07 | After Phase 2 | Cards |
|---|---|---|---|---|---|---|---|---|---|---|
| A1 | 8 / 090 / 11 | 0.2 | 0.8 @ 12 | 08:00 day | clear | Excellent | Inside | Inside | Inside | 02, 07 |
| A2 | 8 / 090 / 11 | 0.2 | 0.8 @ 12 | 02:00 night | clear | Excellent | Outside (dark) | Outside (dark) | Outside (dark) | 03 |
| A3 | 13.3 / 114 / 16.7 | 0.54 | 1.32 @ 10.7 | 00:00 night | clear | Go (live 15 Nov) | Outside (dark) | Outside (dark) | Outside (dark) | 03 |
| A4 | 10 / 225 / 13 | 0.3 | 4.0 @ 14 | 09:00 day | clear | Go | Outside (swell) | Outside (swell) | Outside (total sea 2.02 m) | 04 |
| A5 | 10 / 225 / 13 | 0.3 | 1.8 @ 13 | 09:00 day | clear | Go | Marginal (swell) | Marginal (swell) | Inside (local swell 0.9 m, total sea 0.95 m) | 04, 12 |
| A5r | same as A5, spot **Rottnest West** | | | | not confirmed | Go | Marginal | Marginal | Marginal (reef: raw swell 1.8 m) | 06, 12 |
| A6 | 10 / 225 / 13 | 0.3 | 1.6 @ 9 | 09:00 day | clear | Go | Marginal (swell) | Marginal (swell) | Inside (local swell 0.8 m) | 04, 12 |
| A7 | 8 / 200 / 11 | 0.2 | 1.4 @ 12 | 09:00 day | clear | Go | Inside | Inside | Inside | 04, 07 |
| A8 | 10 / 200 / 13 | 0.3 | 1.3 @ 7 | 09:00 day | clear | Marginal | Marginal | Marginal (short swell) | Marginal (short-period rule uses raw swell) | 04 |
| A9 | 8 / 200 / 11 | 0.2 | 2.1 @ 7 | 09:00 day | clear | Avoid | Outside | Outside | Outside | 04 |
| B1 | 14.7 / 200 / 18.7 | 0.7 | 1.2 @ 11 | 16:00 day | clear | Go (review's live example, 13 Nov [R]) | Inside | Marginal (wind, gust, chop) | Outside (sea-breeze allowance: 17.6 kt) | 07, 12 |
| B2 | 14.9 / 090 / 20 | 0.4 | 0.8 @ 11 | 10:00 day | clear | Go | Inside | Marginal (wind, gust) | Marginal | 07 |
| B3 | 15 / 090 / 19 | 0.5 | 1.0 @ 11 | 10:00 day | clear | Marginal | Marginal | Marginal | Marginal | 02 |
| B4 | 17 / 225 / 22 | 0.8 | 1.2 @ 11 | 14:00 day | clear | Marginal | Marginal | Outside (wind, gust, chop) | Outside | 07 |
| B5 | 20.1 / 270 / 26 | 1.0 | 1.5 @ 10 | 12:00 day | clear | Avoid | Outside | Outside | Outside | 02 |
| B6 | 8 / 090 / 21 | 0.2 | 0.4 @ 12 | 09:00 day | clear | Marginal | Marginal | Marginal (gust) | Outside (gust-ratio rule: 21 ÷ 8 = 2.6) | 07, 12 |
| B7 | 8 / 090 / 28 | 0.2 | 0.4 @ 12 | 09:00 day | clear | Avoid | Outside | Outside | Outside | 02 |
| B8 | 12 / 090 / 16 | 0.4 | 1.0 @ 11 | 09:00 day | clear | Go | Inside | Inside (all on the boundary) | Inside | 07 |
| B9 | 12.1 / 090 / 16 | 0.4 | 1.0 @ 11 | 09:00 day | clear | Go | Inside | Marginal (wind) | Marginal | 07 |
| B10 | 8 / 090 / 11 | 1.15 | 0.4 @ 12 | 09:00 day | clear | Marginal | Marginal | Outside (chop) | Outside | 07 |
| C1 | null / null / null | 0.2 | 0.5 @ 12 | 09:00 day | clear | Excellent (null treated as 0 kt) | No call | No call | No call | 05 |
| C2 | 8 / 090 / 11 | null | null (no marine fields) | 09:00 day | clear | Function returns Excellent; served as "Outlook only" | No call | No call | No call | 05 |
| C3 | 8 / 090 / null | 0.2 | 0.5 @ 12 | 09:00 day | clear | Excellent | No call | No call | No call | 05 |
| C4 | A1 conditions, saved forecast 7 h old | | | 08:00 day | clear | "Good to go now" plus a stale note | Headline "No call. Forecast is 7 h old. Refresh." | same | same | 05 |
| C5 | A1 conditions, sunrise and sunset missing | | | 08:00 | clear | Excellent | No call (daylight unknown) | No call | No call | 03, 05 |
| D1 | 9 / 120 / 12 | 0.3 | 1.1 @ 11 | 09:00 day | Strong Wind Warning for that date | Go | Outside (warning) | Outside (warning) | Outside | 06 |
| D1o | same as D1, preset **offshore** | | | | Strong Wind Warning | Go | Outside | Marginal (warning cap) | Marginal | 06, 07 |
| D2 | 9 / 120 / 12 | 0.3 | 1.1 @ 11 | 09:00 day | Gale Warning for that date | Go | Outside | Outside (every preset) | Outside | 06 |
| D3 | 9 / 120 / 12 | 0.3 | 1.1 @ 11 | 09:00 day | page unavailable or stale | Go | Marginal (warnings not checked) | Marginal | Marginal | 06 |
| D4 | A1 conditions, spot **Thomson Bay** (-31.999, 115.543) | | | 08:00 day | clear | Excellent, BOM status "outside-coverage" | Inside, BOM status "available" | Inside | Inside | 06 |
| D5 | A1 conditions, spot **Rottnest West** (-31.998, 115.467) | | | 08:00 day | clear on Local Waters; Perth Coast not read | Excellent | Marginal (warnings not confirmed here) | Marginal | Marginal | 06 |
| D6 | D5 with a Local Waters Strong Wind Warning | | | | warning | Excellent | Outside (warning) | Outside | Outside | 06 |
| D7 | A1 conditions, spot **Maldives (Male)** | | | 08:00 day | no source | Excellent | Marginal (warnings not checked) | Marginal | Marginal | 06 |
| E1 | A1 conditions, model weather code 95 that hour | | | 09:00 day | clear | Avoid | Outside (thunderstorm) | Outside | Outside | 02 |
| E2 | A1 conditions, BOM day text says "chance of a thunderstorm" | | | 09:00 day | clear | Avoid (live 14 Nov [M]) | Outside (unchanged whole-day rule) | Outside | Outside | 02 |

## 2. Window and headline scenarios

| ID | Scenario | Now [M] | Expected | Card |
|---|---|---|---|---|
| W1 | 07:00 to 09:59, three daylight hours of A1 conditions, rain 0%, fishing 2 stars | No qualifying window (`minStars: 4`) | Window 07:00 to 10:00 | 01 |
| W2 | W1 with rain chance 30% | No window | After 01: still none (rain cap 0%). After 07: window 07:00 to 10:00. Rain is a note, not a limit | 01, 07 |
| W3 | 04:00 to 05:59 night, 18 kt gusting 23, Marginal, fishing 4 stars | Counts as "next usable window" (`decisionBrief.ts:135`) | Not a window on any surface | 01, 03 |
| W4 | 06:00 to 08:59 day, 11 / 090 / 15, chop 0.3, swell 1.2 @ 11 | Hourly "Go" three times and "No qualifying window" | After 07: window 06:00 to 09:00, Inside | 07 |
| W5 | Three daylight hours: A1, A1, then 15 / 090 / 19 | Client window labelled from first hour: "Excellent" | After 02: window label is the worst hour. After 07: third hour is Marginal, so no three-hour window | 02, 07 |
| W6 | 09:00 Marginal, 10:00 Inside, 11:00 Marginal. Opened at 10:10 | "Good to go now" | Headline "Marginal for your limits. Conditions change within the hour." No window | 08 |
| W7 | Default machine brief (`mode=wind`), 8 kt at 01:00 to 04:00 | A night "window" is listed | After 03: no night window unless `daylight=0` is asked for | 03 |
| W8 | 08:00 Inside, 09:00 Inside, 10:00 Marginal. Opened at 08:05 | "Good to go now" | Headline "Inside your limits until 10:00." | 08 |
| W9 | "Best upcoming" with two windows: 3 h with 5 stars on day 3, 6 h with 2 stars tomorrow | Day 3 ranked first (fishing score) | Tomorrow's 6 h window ranked first (longer, sooner) | 01 |

## 3. Sea-breeze day, hour by hour (Phase 2, card 12)

Chop 0.3 m rising to 0.6 m, swell 1.0 m @ 11 s, BOM clear, daylight.

| ID | Time | Wind / from / gust | After card 07 | After card 12 | Why |
|---|---|---|---|---|---|
| S1 | 09:00 | 8 / 120 / 11 | Inside | Inside | Easterly, before 10:00 |
| S2 | 10:00 | 9 / 200 / 13 | Inside | Inside | 9 × 1.2 = 10.8 kt |
| S3 | 11:00 | 12 / 220 / 16 | Inside | Marginal | 12 × 1.2 = 14.4 kt |
| S4 | 12:00 | 14 / 225 / 19 | Marginal | Outside | 14 × 1.2 = 16.8 kt |
| S5 | 13:00 | 16 / 230 / 22 | Outside (gust 22) | Outside | |
| S6 | 08:00 | 14 / 100 / 15, chop 0.3, swell 0.3, spot **Port Coogee Marina** | Marginal (wind) | Inside | Weather shore: 14 × 0.8 = 11.2 kt |
| S7 | 08:00 | 14 / 225 / 15, same spot | Marginal | Marginal | Not in the sheltered sector. Before 10:00, so no sea-breeze allowance |
| S8 | 08:00 | 14 / 100 / 15, spot **Fremantle Offshore** | Marginal | Marginal | More than 3 nm of fetch from the east |

## 4. Lead time and model spread (Phase 2, cards 13 and 14)

| ID | Scenario | Expected | Card |
|---|---|---|---|
| L1 | A1 conditions, 30 h ahead | Inside | 13 |
| L2 | A1 conditions, 50 h ahead | Inside, marked "provisional" | 13 |
| L3 | A1 conditions, 80 h ahead | "Outlook only". No Inside call. Not part of any window | 13 |
| L4 | B5 conditions, 80 h ahead | "Outlook only", with the numbers shown | 13 |
| M1 | Three models 10, 11, 12 kt, all else A1 | Inside. Confidence high (spread 2 kt). Shown as "10 to 12 kt" | 14 |
| M2 | Three models 9, 11, 17 kt | Marginal. Confidence low (spread 8 kt). Shown as "9 to 17 kt (models differ by 8 kt)" | 14 |
| M3 | Three models 13, 17, 18 kt | Outside (two models over 16 kt) | 14 |
| M4 | Three models 11, 12, 15 kt | Marginal (not every model inside; spread 4 kt, medium) | 14 |
| M5 | One model returns null, others 10 and 11 kt | Inside is not allowed on two models. Marginal, "one model missing" | 14 |
| M6 | All models null | No call | 14 |

## 5. Route scenarios: Fremantle to Thomson Bay, preset sl20 (Phase 3, cards 15 to 17)

Route [R]: 10 nm, heading out 287°, heading back 107°. Leg time 30 min (10 nm at 22 kt, rounded up to 5 min); 40 min when marginal (15 kt). Speeds updated 14 Nov 2026 for the Whittley SL20 with Yamaha 150; see card 15. Stay at least 2 h. Trip must end one hour before sunset. Sunrise 05:10, sunset 18:55 unless stated. Low swell and chop unless stated. BOM clear.

| ID | Scenario | Expected trip call | Card |
|---|---|---|---|
| R1 | All day 8 / 090 / 11 | Inside. "Leave Thomson Bay by 17:25" (sunset − 1 h − 30 min) | 16 |
| R2 | Morning 8 kt easterly. 11:00 is 9 / 220. 12:00 is 11 / 225 (× 1.2 = 13.2 kt) and rising | Inside for departures up to 08:00. "Leave Thomson Bay by 10:30." Onset 12:00 | 16 |
| R3 | As R2 but onset at 09:00 | "Marginal: short window." Leave-by 07:30. Earliest arrival 05:40. Stay is 1 h 50 min | 16 |
| R4 | Onset at 07:00, wind stays Outside to sunset | "Outside your limits (no return slot)" | 16 |
| R5 | All day 11 / 287 / 14 (on the bow outbound) | Marginal. Out leg 11 × 1.15 = 12.65 kt. Return leg 11 × 0.9 = 9.9 kt, Inside. Trip is the worst leg | 15 |
| R6 | All day 11 / 017 / 14 (beam both ways) | Inside | 15 |
| R7 | Sunset 17:20. Departure asked for 14:00 | "Outside your limits (daylight)". Return would end 17:00, after 16:20 | 16 |
| R8 | R1 with a Strong Wind Warning | Outside (warning) | 16 |
| R9 | Same hour: Fremantle Offshore point 9 kt, Thomson Bay point 14 kt, beam | Leg uses 14 kt. Marginal | 15 |
| R10 | Return-leg hours: Outside, Outside, Inside for one hour, Outside | The single Inside hour does not count. No return slot in that stretch | 16 |
| R11 | Return at 08:00 into 11 / 100 / 14 | Return leg is a head sea: 12.65 kt. Marginal | 15 |
| R12 | Evening: wind eases to 10 / 200 / 13 at 17:00 and 18:00 in every model. Sunset 19:20 | Late return offered, Marginal at best. Leg must end by 18:20 | 16 |
| R13 | Any wind field null on either point for any hour of a leg | No call for that leg and for the trip | 15 |

## 6. Fishing display scenarios (Phase 1B)

| ID | Scenario | Now [M] | Expected | Card |
|---|---|---|---|---|
| F1 | Hour is daylight, Go, 4 stars, rain 0%, wind 13 kt | Golden on the live client path (`forecastApi.ts:124`). Not golden by `isGolden` (wind over 10) | Both paths call `isGolden`. Not golden | 09 |
| F2 | Share sheet for a day with peak score 75 | "peak fishing 75% (4★)" | No "%". "Bite-time guide: Prime time around 05:00" or the owner's chosen wording | 09 |
| F3 | Day whose highest score is at 02:00 (75) and whose best daylight in-limit hour scores 58 | Daily card shows 75 | Daily card uses 58 | 10 |
| F4 | Hour is Outside or dark, 4 stars | Stars at full strength | Indicator greyed, no highlight | 10 |
| F5 | Day 10 of a 14-day request (no marine data) | Stars and "Best fishing NN%" | No fishing indicator. "No marine data this far out" | 10 |
| F6 | Calendar export of a window | Title "Fishing window — [spot]" | Title "Boating window, inside your limits — [spot]". Description carries the planning-aid line and the BOM link | 10 |
| F7 | Rules note, last-checked date 70 days old | n/a | Specific closure text hidden. Generic "Check DPIRD rules before you fish" shown | 10 |
