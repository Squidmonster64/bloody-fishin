# Card 05. Fail closed on missing or stale data

Phase 1A. Effort S. Depends on: card 02.
Base: `Squidmonster64/bloody-fishin`, branch `codex/cloudflare-worker` @ `93078fc`.

## Goal

A missing value must never be rated as calm. A stale forecast must never produce a positive headline. Today a null wind or gust is turned into 0 kt and can rate "Excellent" [M].

## Files and functions to touch

| File:line | What is there now [M] |
|---|---|
| `shared/scoring.ts:33-35` | `gustKt ?? 0`, `windKt ?? 0`, `swellH ?? 0` |
| `shared/scoring.ts:202-209` | `hasMarineForVessel`: true if any one of swell, wave or wind-wave is present |
| `shared/scoring.test.ts:55-58` | Test pins `rateSL20(8, null, null, null, null)` to "Excellent" |
| `server/briefing.ts:168-179` | `eligible` treats null as `Infinity` (already safe) |
| `client/src/lib/sickieCriteria.ts:81,83,84,85` | `meetsCriteria`: null wind, swell, chop and rain **pass** |
| `client/src/lib/forecastApi.ts:92` | `sl20: null` becomes `slRank` 0 |
| `client/src/lib/decisionBrief.ts:299-312` | `freshnessFromFetchedAt`. "stale" starts at 90 min. No effect on the call |
| `client/src/lib/decisionBrief.ts:239-243` | Headline "Good to go now" is built whatever the forecast age |

## Behaviour change

1. In `assessHour` (not in `rateSL20`): if `windKt` is null **or** `gustKt` is null, the state is `no-call` with reason `missing-data`. Fixtures C1 and C3.
2. If no marine field is present (`hasMarineForVessel` false), the state is `no-call`. Already true after card 02. Keep it. Fixture C2.
3. If swell height is null but total wave or wind-wave is present, treat swell as unknown: the state can be no better than `marginal`, reason `missing-data`. Do not substitute 0 m.
4. Client `meetsCriteria`: a null wind, gust, swell or chop **fails** the hour when the matching limit is set. A null rain chance fails only if a rain limit is set. This matches the server's `eligible`.
5. Stale forecast [J, from the go-window review 4.6]: in `buildDecisionBrief`, when the forecast age is over **6 hours**, set `goNoGo` to `"outlook"` and the headline to "No call. Forecast is N h old. Refresh before you plan." Between 3 and 6 hours keep the call and keep the existing stale banner. The two numbers go in a constants block.
6. `/brief.json`: add top-level `dataAgeNote` only if needed. The server always fetches live, so staleness is a client concern.
7. Replace the test at `shared/scoring.test.ts:55-58`. `rateSL20` may still return a label for nulls, but the new test asserts `assessHour` gives `no-call`.

## Tests to add

| Test | Input | Expected |
|---|---|---|
| Fixture C1 | wind null, gust null, chop 0.2, swell 0.5 @ 12, daylight | `no-call`, `missing-data` |
| Fixture C2 | 8 / 11, all marine null | `no-call` |
| Fixture C3 | wind 8, gust null, chop 0.2, swell 0.5 @ 12 | `no-call`, `missing-data` |
| Swell unknown | 8 / 11, chop 0.2, swell null, wave 0.6 | `marginal`, `missing-data` |
| Client null wind | `meetsCriteria({ windKt: null, gustKt: 11, slRank: 2, ... }, sl20)` | false |
| Client null swell | `meetsCriteria({ swellH: null, ... }, sl20)` with `maxSwellH` 0.99 | false |
| Client null swell, no limit | same with `maxSwellH: null` | true |
| Fixture C4 | `buildDecisionBrief(calm data, { cacheSavedAt: now − 7 h })` | `goNoGo` `"outlook"`, headline starts "No call" |
| 4 h old | same with now − 4 h | `goNoGo` `"go"`, `freshnessTone` `"stale"` |

Existing test to keep green: `client/src/lib/decisionWindows.test.ts:153-175` ("marine honesty") and `:177` ("never labels a saved copy as live").

## Acceptance criteria

- No code path turns a null wind, gust or swell into a number before a threshold comparison. `grep -n "?? 0" shared/scoring.ts` shows no hit on wind, gust or swell inside `assessHour`.
- Server `eligible` and client `meetsCriteria` give the same answer for every null combination in a shared test table.
- `pnpm check` and `pnpm test` pass.

## What NOT to change

- Display of the raw numbers. A missing value still shows "—".
- The 24 h staleness rule for the BOM page (`server/officialMarine.ts:14`).
- Thresholds.

## Deploy

Deploy only with the owner's explicit approval. Open a PR against `codex/cloudflare-worker` and stop.
