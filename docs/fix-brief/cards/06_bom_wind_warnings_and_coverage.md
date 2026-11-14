# Card 06. Read BOM wind warnings, cover Rottnest, and say when warnings were not checked

Phase 1A. Effort M. Depends on: card 02.
Base: `Squidmonster64/bloody-fishin`, branch `codex/cloudflare-worker` @ `93078fc`.
Revised 14 Nov 2026 against real BOM pages saved that day (see "Read this first").

## Goal

An official wind warning must override the call. When the app has not checked warnings, it must say so and must not show a positive call. Today only the word "thunderstorm" is read [M]. Every Rottnest spot is outside the coverage box [M].

BOM covers Perth with two separate forecast zones [M, BOM map page, 14 Nov 2026]:

| Zone | BOM page | Product | Covers |
|---|---|---|---|
| Perth Local Waters | `https://www.bom.gov.au/wa/forecasts/perth-waters.shtml` (fetched today) | IDW11400 | Two Rocks to Dawesville, **inshore** from Rottnest |
| Perth Coast | `https://www.bom.gov.au/wa/forecasts/perth-coast.shtml` (**new**) | IDW11280 | Two Rocks to Dawesville, **offshore** from Rottnest |

This card reads warnings from both pages. The owner approved adding the Perth Coast page on 14 Nov 2026.

## Read this first

- **The warning markup is verified against a real page.** On 14 Nov 2026 a Strong Wind Warning was current for Perth Coast only. Real pages from that 1:01 pm WST issue are in `server/fixtures/bom/`:
  - `perth-coast-2026-11-14-strong-wind.html`: the warning sits inside the day's own section, after `<h2>Forecast for Saturday until midnight</h2>`, as `<p class="marine warning">Strong Wind Warning for Saturday for Perth Coast</p>` [M].
  - `perth-waters-2026-11-14-strong-wind-current.html`: the same day's Local Waters page. No warning applied inshore (winds 10–20 kt), and the page has none. Its only warning text is the generic link "View the current warnings for Western Australia" [M]. That link must **not** count as a warning.
  - `marine-wind-warning-IDW20100-2026-11-14.html`: a trimmed copy of BOM's separate state warning page, kept for reference only. Do not fetch or parse IDW20100.
- **Not yet seen:** a Local Waters page with a warning on it. Both pages use the same template, so the same `<p class="marine warning">… for <Weekday> for <Area></p>` line is expected [J]. Gale, Storm Force and Hurricane Force wording is also from memory [J]. Say both in the PR.
- Scraping BOM pages is outside BOM's default terms [R]. This card adds one more page under that same gate. It does not resolve the gate.
- Tests must not fetch BOM. Use the fixtures above and mocked `fetch`.

## Files and functions to touch

| File:line | What is there now [M] |
|---|---|
| `shared/officialMarine.ts:1-16` | `OfficialMarineDay` and `OfficialMarine` types. Only flag is `thunderstorm` |
| `shared/officialMarine.ts:18-20` | `inPerthWaters`: lat -32.65 to -31.45, lon **115.55** to 115.78 |
| `server/officialMarine.ts:3-4` | One `source` URL and one `area` string |
| `server/officialMarine.ts:7-31` | `parseOfficialMarine`. Splits the page by `<h2>`. Sets `thunderstorm` |
| `server/officialMarine.ts:33-43` | `getOfficialMarine`: one fetch, one 5-minute cache, `outside-coverage`, `unavailable` or parsed |
| `server/briefing.ts:289-295` | Whole-day thunderstorm override |
| `client/src/lib/fishingEngine.ts:370` | Same override on the legacy direct path |
| `client/src/pages/Home.tsx:69-74` | "Official marine outlook" panel |
| `server/officialMarine.test.ts:15-19` | Pins `inPerthWaters(-32, 115.46)` to false |

## Behaviour change

### 1. Parse warnings (same parser for both pages)

Add to `OfficialMarineDay`: `windWarning: "none" | "strong" | "gale" | "storm" | "hurricane"`.

Give `parseOfficialMarine` the zone it is reading (`source`, `area` and the BOM area name, `"Perth Local Waters"` or `"Perth Coast"`). Match on cleaned text, case-insensitive:

| Phrase | Level |
|---|---|
| "Strong Wind Warning" | strong |
| "Gale Warning" | gale |
| "Storm Force Wind Warning" | storm |
| "Hurricane Force Wind Warning" | hurricane |

Rules:
1. Look first inside each day's own `<h2>` section. This is where the real page puts it.
2. Then look in the whole page for "<phrase> for <weekday>" and map the weekday to the parsed date.
3. If the line names an area ("… for Perth Coast"), count it only when the area is this page's own area. If it names no area, count it.
4. If a warning phrase is on the page and no day can be worked out, apply it to **every** parsed day.
5. Link text that only points to the warnings list ("View the current warnings for …") has none of the phrases above, so rules 1 to 4 already skip it. Add a test so it stays that way.
6. Take the highest level found for a day.

### 2. Which pages a spot needs [J, proposal for skipper validation]

| Spot is in | Pages read | Warnings for a date | Checked when |
|---|---|---|---|
| `inPerthWaters` (inshore) | Local Waters | Local Waters only. A Perth Coast-only warning does **not** apply, as on 14 Nov | Local Waters is `available` |
| `inPerthCoast` (offshore of Rottnest) | Local Waters **and** Perth Coast | Highest of the two. The trip there crosses Local Waters | **both** are `available` |
| neither | none | none | never (`outside-coverage`) |

Thunderstorm: for an offshore spot, true if either page says so.

### 3. Coverage boxes [J, proposal for skipper validation]

- `inPerthWaters`: move the west edge from 115.55 to **115.49**. This takes in Thomson Bay (115.543), Salmon Bay (115.526), Parker Point (115.512) and Parakeet Bay (115.507) from the app's own list (`fishingEngine.ts:154-157`).
- New `inPerthCoast`: same latitudes, lon **115.00** up to (not including) 115.49. This holds Rottnest West (115.467). The BOM page gives no seaward edge; 115.00 is a conservative choice [J]. Put both edges in named constants.
- This replaces the earlier `nearPerthWaters` idea. There is no "Perth Coast not read" cap any more.
- Whether the south-side Rottnest bays belong under Local Waters or Perth Coast is a skipper question.

### 4. Fetch

- `getOfficialMarine(lat, lon)` fetches only the pages the spot needs, in parallel.
- Same timeout (10 s), 5-minute cache **per URL**, and 24 h staleness for each page.
- If any needed page fails or is stale, `warningsChecked` is false. Never treat a failed page as "no warning".

### 5. Result shape

Add to `OfficialMarine`:
- `warningsChecked: boolean`. True only when every page the spot needs was read and is fresh.
- `zones: Array<{ area, source, status, issued }>`, one entry per page read.

Keep `status`, `source`, `area`, `issued` and `days` for the spot's own zone (Local Waters for inshore, Perth Coast for offshore), so existing callers keep working. `status` is `available` only when every page needed is available. `days[].windWarning` and `days[].thunderstorm` are the combined values from section 2.

### 6. Apply warnings to the call (legacy labels until card 07)

| Condition | Effect on `assessHour` for every hour of that date |
|---|---|
| strong | `outside`, reason `warning`. Card 07 relaxes this to a Marginal cap for the `offshore` preset only |
| gale, storm or hurricane | `outside`, reason `warning`, for every preset |
| `warningsChecked` false | No better than `marginal`, reason `warning-unchecked` |

The cap for unchecked warnings is a proposal [J]. It means spots outside Perth, such as Shark Bay and overseas, can never show better than Marginal. The alternative is a banner with no cap. Put the choice in one constant, `WARNINGS_UNCHECKED_CAP = "marginal"`, so the owner can decide.

### 7. Show it

- `Home.tsx:69`: when a warning is current, the summary line reads "BOM wind warning current: Strong Wind Warning (Perth Coast)" (level and zone) in the danger colour. When `warningsChecked` is false it reads "Warnings not checked. Open the BOM forecast." Keep the existing link (`Home.tsx:74`) and add the Perth Coast link when that page was read.
- Use the app's own words. Do not copy more BOM text than is shown today.
- `/brief.json`: `officialMarine.days[].windWarning`, `officialMarine.warningsChecked` and `officialMarine.zones`. `/brief` Markdown: one line under "Official marine outlook".

## Tests to add

| Test | Input | Expected |
|---|---|---|
| Real Perth Coast page | `perth-coast-2026-11-14-strong-wind.html`, now = 14 Nov 2026 14:00 AWST, area Perth Coast | 2026-11-14 `"strong"`; 15, 16 and 17 Nov `"none"` |
| Real Local Waters page | `perth-waters-2026-11-14-strong-wind-current.html`, same now, area Perth Local Waters | every day `"none"`; the "View the current warnings" link is not a warning |
| Wrong area | Perth Coast fixture parsed as area Perth Local Waters | every day `"none"` |
| Gale in section | Hand-made: the Perth Coast fixture with the Sunday section given `<p class="marine warning">Gale Warning for Sunday for Perth Coast</p>`. Label it made up | 15 Nov `"gale"` |
| Day unknown | Hand-made: warning line with no weekday. Label it made up | every day `"strong"` |
| Parse none | Existing fixture (`officialMarine.test.ts:4-5`) | `"none"`, `warningsChecked` true |
| Fixture D1 | 9 / 120 / 12, chop 0.3, swell 1.1 @ 11, day, strong warning | `outside`, reason `warning` |
| Fixture D2 | same, gale | `outside` |
| Fixture D3 | same, page unavailable or stale | `marginal`, `warning-unchecked` |
| Fixture D4 | `inPerthWaters(-31.999, 115.543)` true. Calm hour, Local Waters clear | `inside` |
| Fixture D4c | D4 on 14 Nov with the two real fixtures (Perth Coast warned, Local Waters clear) | `inside`. A Perth Coast warning does not apply inshore |
| Fixture D5 | Rottnest West (-31.998, 115.467): `inPerthWaters` false, `inPerthCoast` true. Calm, both pages clear | `inside` |
| Fixture D5u | D5 with Perth Coast page unavailable | `marginal`, `warning-unchecked` |
| Fixture D6 | D5 with a Local Waters Strong Wind Warning | `outside`, `warning` |
| Fixture D6c | D5 on 14 Nov with the two real fixtures | `outside`, `warning` |
| Fixture D7 | (4.17, 73.51), calm | `marginal`, `warning-unchecked` |
| Fetch | Mocked `fetch`: inshore spot requests only perth-waters; Rottnest West requests both | URLs as stated |
| Existing pin | `inPerthWaters(-32, 115.46)` | still false |
| Thunderstorm unchanged | Fixture E2 | `outside`, `thunderstorm` |

Pass a fixed `now` to the parser so the 14 Nov fixtures are not stale.

## Acceptance criteria

- With the real 14 Nov fixtures, no hour of 14 Nov is `inside` or `marginal` at Rottnest West for the sl20 preset on any surface, and Thomson Bay is not downgraded by the Perth Coast warning.
- With any needed BOM page unavailable, no hour at that spot is `inside`, and the screen says warnings were not checked.
- Thomson Bay reports `officialMarine.status: "available"`. Rottnest West reports two `zones`.
- `pnpm check` and `pnpm test` pass (see `.clinerules` for the known suite-nav failure).

## What NOT to change

- The whole-day thunderstorm rule (`server/briefing.ts:290-294`). It is conservative and stays until the skipper decides otherwise.
- Only these two BOM URLs. Do not fetch IDW20100 or any other BOM page.
- Timeout, cache length and 24 h staleness stay as they are, applied per page.
- Do not add more republished BOM text to `/brief` or the app.
- Do not call any BOM endpoint from tests or CI.

## Deploy

Deploy only with the owner's explicit approval. Open a PR against `codex/cloudflare-worker` and stop.
