# Card 01. Remove the fishing score from every boating window and ranking

Phase 1A. Effort S. Depends on: nothing.
Base: `Squidmonster64/bloody-fishin`, branch `codex/cloudflare-worker` @ `93078fc`. Line numbers refer to that commit.

## Goal

A boating window must depend on boating conditions only. Today the default window needs 4-star fishing, so the moon decides whether a window exists [M]. Fishing stars can also turn a Marginal night hour into a "next usable window" [M].

## Files and functions to touch

| File:line | What is there now [M] |
|---|---|
| `server/briefing.ts:70-75` | `VESSELS` presets. `minStars` is 3, 4, 3, 3 |
| `server/briefing.ts:156` | `minStars` read from the query, default from the preset |
| `server/briefing.ts:174` | `eligible`: `hour.fishStars < criteria.minStars` fails the hour |
| `server/briefing.ts:346-348` | `bestUpcoming` sorted by `bestFishScore` first |
| `client/src/lib/sickieCriteria.ts:43,49,55,61,67` | Presets. `minFishStars` 3, 4, 3, 3, 4 |
| `client/src/lib/sickieCriteria.ts:48` | Preset description ends "4★+ fishing" |
| `client/src/lib/sickieCriteria.ts:80` | `meetsCriteria`: fishing gate |
| `client/src/lib/decisionBrief.ts:129-137` | `isUsefulHour`. Line 135 accepts 4 stars with a Marginal rating, or with no marine data |
| `client/src/lib/decisionBrief.ts:152-154` | Window reason text "fishing outlook (marine incomplete)" and "N★ fishing" |
| `client/src/lib/decisionBrief.ts:195-196` | `buildBestWindows` score adds `peakStars * 8` |
| `client/src/lib/decisionBrief.ts:295` | Risk line "Boatable, but fishing score is soft" |
| `client/src/components/SickieView.tsx:151,238` | Criteria chip and "Min Fishing Stars" selector |

## Behaviour change

1. Set the default `minStars` / `minFishStars` to **1** in every preset on both server and client. One star is the lowest value, so the gate never bites by default.
2. Keep the `minStars` URL parameter and the Sickie selector working as an **explicit opt-in overlay**. When the user sets it above 1, windows are still filtered. Label them "with bite-time filter" in the chip (`SickieView.tsx:151`) and in the `/brief` filter line (`server/briefing.ts:411`).
3. `isUsefulHour` becomes: not thunderstorm, marine fields present, and `slRank >= 2`. Delete the fishing branch at line 135. An hour with no marine data is never "useful".
4. `buildBestWindows` ranking: remove the stars term. Rank by vessel rank, then longer window, then earlier start.
5. `bestUpcoming` on the server: sort by `durationHours` descending, then earliest start. Not by fishing score.
6. Remove the risk line at `decisionBrief.ts:295`. Remove "N★ fishing" and "fishing outlook (marine incomplete)" from window reasons.
7. Change the sl20 preset description to drop "4★+ fishing".

No wind, gust, swell or rain limit changes in this card.

## Tests to add

| Test | Input | Expected |
|---|---|---|
| Fixture W1 (server) | Three daylight hours 07:00 to 09:00: wind 8, gust 11, swell 0.8 @ 12, chop 0.2, rain 0%, `fishStars` 2. Default sl20 | `makeWindows` returns one window, 07:00 to 10:00 |
| Fixture W1 (client) | Same rows through `meetsCriteria` with `VESSEL_PRESETS.sl20.criteria` | every row passes |
| Fixture W3 | Hours 04:00 and 05:00, wind 18, gust 23, `slRank` 1, `fishStars` 4 | `buildChronologicalWindows` returns no window |
| No marine, 4 stars | Two hours with `swellH`, `waveH`, `windWaveH` null, `fishStars` 5 | `isUsefulHour` false for both |
| Opt-in still works | W1 rows with `?minStars=4` | no window |
| Fixture W9 | Two windows: 3 h with 5 stars on day 3; 6 h with 2 stars tomorrow | `bestUpcoming` and `buildBestWindows()[0]` are tomorrow's window |

Existing tests to update: `client/src/lib/decisionWindows.test.ts:92-150` expects the later 5-star window to be `best[0]`. It should still pass, because that window is also Excellent against Go. Confirm, do not assume. `client/src/lib/decisionBrief.test.ts:104-110` should pass unchanged.

## Acceptance criteria

- `grep -rn "fishStars" server/briefing.ts client/src/lib/decisionBrief.ts` shows no use inside `eligible`, `isUsefulHour` or any sort, other than the opt-in filter and display fields.
- `/brief.json` default `query.criteria.minStars` is 1.
- `pnpm check` and `pnpm test` pass.

## What NOT to change

- `fishingScore` itself (`shared/scoring.ts:157-199`). The score is still computed and displayed.
- `isGolden` (`shared/scoring.ts:64-82`). Golden still needs 4 stars. That is a fishing badge, not a boating call.
- Wind, gust, swell, chop and rain limits. Card 07 owns them.
- The `fishScore`, `fishStars`, `bestFishScore`, `bestFishStars` fields in `/brief.json`. Other clients read them.

## Deploy

Deploy only with the owner's explicit approval. Open a PR against `codex/cloudflare-worker` and stop.
