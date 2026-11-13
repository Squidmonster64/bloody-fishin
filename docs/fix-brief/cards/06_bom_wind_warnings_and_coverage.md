# Card 06. Read BOM wind warnings, cover Rottnest, and say when warnings were not checked

Phase 1A. Effort M. Depends on: card 02.
Base: `Squidmonster64/bloody-fishin`, branch `codex/cloudflare-worker` @ `93078fc`.

## Goal

An official wind warning must override the call. When the app has not checked warnings, it must say so and must not show a positive call. Today only the word "thunderstorm" is read [M]. Every Rottnest spot is outside the coverage box [M].

No new data source. This card reads more from the page the app already fetches.

## Read this first

- **The warning markup on the BOM page is unverified.** I could not open the page (BOM blocks automated readers [R]) and the repo's only HTML fixture has no warning (`server/officialMarine.test.ts:4-5`) [M]. BOM marine forecasts normally carry a line such as "Strong Wind Warning for Saturday for Perth Local Waters" [J, from memory]. **Before coding, ask the owner for one saved copy of the page from a warning day.** Use it as the test fixture. If none is available, build to the phrase patterns below and mark the PR "parser not tested against a real warning page".
- Scraping BOM pages is outside BOM's default terms [R]. This card adds no new request and no new republished text. It does not resolve that gate.
- Tests must not fetch BOM.

## Files and functions to touch

| File:line | What is there now [M] |
|---|---|
| `shared/officialMarine.ts:1-16` | `OfficialMarineDay` and `OfficialMarine` types. Only flag is `thunderstorm` |
| `shared/officialMarine.ts:18-20` | `inPerthWaters`: lat -32.65 to -31.45, lon **115.55** to 115.78 |
| `server/officialMarine.ts:7-31` | `parseOfficialMarine`. Line 16 splits the page by `<h2>`. Line 27 sets `thunderstorm` |
| `server/officialMarine.ts:33-43` | `getOfficialMarine`: `outside-coverage`, `unavailable` or parsed result |
| `server/briefing.ts:289-295` | Whole-day thunderstorm override |
| `client/src/lib/fishingEngine.ts:370` | Same override on the legacy direct path |
| `client/src/pages/Home.tsx:69-74` | "Official marine outlook" panel |
| `server/officialMarine.test.ts:15-19` | Pins `inPerthWaters(-32, 115.46)` to false |

## Behaviour change

### 1. Parse warnings

Add to `OfficialMarineDay`: `windWarning: "none" | "strong" | "gale" | "storm" | "hurricane"`.
Add to `OfficialMarine`: `warningsChecked: boolean`. True only when status is `available`.

Match on cleaned text, case-insensitive:

| Phrase | Level |
|---|---|
| "Strong Wind Warning" | strong |
| "Gale Warning" | gale |
| "Storm Force Wind Warning" | storm |
| "Hurricane Force Wind Warning" | hurricane |

Assign to days like this. Look first inside each day's own section. Then look in the whole page for "<phrase> for <weekday>" and map the weekday to the parsed date. If a warning phrase is on the page and no day can be worked out, apply it to **every** parsed day. Take the highest level found for a day.

### 2. Apply warnings to the call (legacy labels until card 07)

| Condition | Effect on `assessHour` for every hour of that date |
|---|---|
| strong | `outside`, reason `warning`. Card 07 relaxes this to a Marginal cap for the `offshore` preset only |
| gale, storm or hurricane | `outside`, reason `warning`, for every preset |
| `warningsChecked` false (status `unavailable` or `outside-coverage`) | No better than `marginal`, reason `warning-unchecked` |

The cap for unchecked warnings is a proposal [J]. It means spots outside Perth, such as Shark Bay and overseas, can never show better than Marginal. The alternative is a banner with no cap. Put the choice in one constant, `WARNINGS_UNCHECKED_CAP = "marginal"`, so the owner can decide.

### 3. Coverage box [J, proposal for skipper validation]

BOM names the area "Two Rocks to Dawesville, inshore from Rottnest" (`server/officialMarine.ts:4`) [M].

- `inPerthWaters`: move the west edge from 115.55 to **115.49**. This takes in Thomson Bay (115.543), Salmon Bay (115.526), Parker Point (115.512) and Parakeet Bay (115.507) from the app's own list (`fishingEngine.ts:154-157`).
- New `nearPerthWaters`: same latitudes, lon 115.40 to 115.49. This holds Rottnest West (115.467). Here a Local Waters warning **applies** (`outside`), but a clear page does **not** count as checked, because the Perth Coast forecast is not read. State is capped at `marginal` with `warning-unchecked`.
- Whether the south-side Rottnest bays belong under Local Waters or Perth Coast is a skipper question.

### 4. Show it

- `Home.tsx:69`: when a warning is current, the summary line reads "BOM wind warning current: Strong Wind Warning" (or the level) in the danger colour. When `warningsChecked` is false it reads "Warnings not checked. Open the BOM forecast." Keep the existing link (`Home.tsx:74`).
- Use the app's own words. Do not copy more BOM text than is shown today.
- `/brief.json`: `officialMarine.days[].windWarning` and `officialMarine.warningsChecked`. `/brief` Markdown: one line under "Official marine outlook".

## Tests to add

| Test | Input | Expected |
|---|---|---|
| Parse strong | Fixture HTML with "Strong Wind Warning for Sunday for Perth Local Waters" and a Sunday 27 September section | that day `windWarning: "strong"`, other days `"none"` |
| Parse gale in section | "Gale Warning" inside the day's own block | `"gale"` |
| Parse, day unknown | Warning phrase with no weekday | every day `"strong"` |
| Parse none | Existing fixture (`officialMarine.test.ts:4-5`) | `"none"`, `warningsChecked` true |
| Fixture D1 | 9 / 120 / 12, chop 0.3, swell 1.1 @ 11, day, strong warning | `outside`, reason `warning` |
| Fixture D2 | same, gale | `outside` |
| Fixture D3 | same, status `unavailable` | `marginal`, `warning-unchecked` |
| Fixture D4 | `inPerthWaters(-31.999, 115.543)` | true. Calm hour, clear page: `inside` |
| Fixture D5 | `inPerthWaters(-31.998, 115.467)` false, `nearPerthWaters` true. Calm, clear page | `marginal`, `warning-unchecked` |
| Fixture D6 | D5 with a strong warning | `outside`, `warning` |
| Fixture D7 | (4.17, 73.51), calm | `marginal`, `warning-unchecked` |
| Existing pin | `inPerthWaters(-32, 115.46)` | still false |
| Thunderstorm unchanged | Fixture E2 | `outside`, `thunderstorm` |

## Acceptance criteria

- With a strong-wind fixture, no hour of the warned date is `inside` or `marginal` for the sl20 preset on any surface.
- With BOM unavailable, no hour anywhere is `inside`, and the screen says warnings were not checked.
- Thomson Bay reports `officialMarine.status: "available"`.
- `pnpm check` and `pnpm test` pass.

## What NOT to change

- The whole-day thunderstorm rule (`server/briefing.ts:290-294`). It is conservative and stays until the skipper decides otherwise.
- The fetch itself: URL, 5-minute cache, 24 h staleness (`server/officialMarine.ts:3,14,36`). Do not add a second BOM URL.
- Do not add more republished BOM text to `/brief` or the app.
- Do not call any BOM endpoint from tests or CI.

## Deploy

Deploy only with the owner's explicit approval. Open a PR against `codex/cloudflare-worker` and stop.
