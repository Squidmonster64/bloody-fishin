# Card 03. Daylight gate on every positive label

Phase 1A. Effort S. Depends on: card 02.
Base: `Squidmonster64/bloody-fishin`, branch `codex/cloudflare-worker` @ `93078fc`.

## Goal

No hour outside daylight may show a positive boating label. Today the live feed rates midnight to 05:00 "Go" [M, Fremantle, 15 Nov 2026], and the headline can say "Good to go now" at night [M].

## Files and functions to touch

| File:line | What is there now [M] |
|---|---|
| `shared/scoring.ts` `assessHour` (added by card 02) | Ignores `daylight` |
| `shared/scoring.ts:129-136` | `isDaylightHour`: the whole hour bucket must sit between sunrise and sunset. Returns false if either time is missing |
| `server/briefing.ts:260` | `daylight` computed per hour |
| `server/briefing.ts:162` | `daylightOnly` is off by default in `mode=wind` |
| `server/briefing.ts:73` | `offshore` preset has `daylightOnly: false` |
| `client/src/lib/decisionBrief.ts:129-137` | `isUsefulHour`: no daylight test |
| `client/src/lib/decisionBrief.ts:214-221` | `assessGoNoGo`: no daylight test |
| `client/src/components/SickieView.tsx:52` | Daylight passes when the sunrise lookup is missing (`!daylight ||`) |
| `client/src/components/DecisionView.tsx:54-60,194-216` | Timeline tone and label |
| `worker/reader.ts:48,131` | Default machine brief uses `mode=wind` |

## Behaviour change

1. In `assessHour`: if `daylight === false`, the state is `outside` and `reasons` includes `dark`. This applies even when wind and sea are calm.
2. If `daylight === null` (sunrise or sunset missing), the state is `no-call` with reason `missing-data`. Fixture C5.
3. Display for reason `dark`: the text "Night" in the muted colour, not red. In the timeline (`DecisionView.tsx:208,215`) show "—" and "Night". Card 08 replaces this text with the final wording.
4. `isUsefulHour` and `assessGoNoGo` read the state from `callForRow`. A dark hour is never useful and never "go".
5. `SickieView.tsx:52`: a missing sunrise lookup **fails** the hour when the profile is daylight-only.
6. `server/briefing.ts:162`: make `daylightOnly` default to true in `mode=wind` as well. `daylight=0` or `daylight=false` turns it off.
7. Leave `offshore` at `daylightOnly: false` for windows in this card. Its hourly label still shows "Night" at night. Whether a large vessel may get a positive call at night is a skipper question (see SOURCES_AND_GAPS).
8. `/brief.json`: `sl20` becomes `null` for dark hours. The new `call.state` is `outside` with reason `dark`. The Markdown table (`server/briefing.ts:428`) prints "Night".

Proposal for skipper validation [J]: the gate uses the existing whole-bucket rule. An hour that ends after sunset is dark. The stricter "finish one hour before sunset" rule belongs to the trip logic in card 16.

## Tests to add

| Test | Input | Expected |
|---|---|---|
| Fixture A2 | 8 / 090 / 11, chop 0.2, swell 0.8 @ 12, 02:00, sunrise 05:10, sunset 18:55 | `outside`, reasons `["dark"]`, serialised `sl20` null |
| Fixture A3 | 13.3 / 114 / 16.7, chop 0.54, swell 1.32 @ 10.7, 00:00 | `outside`, `dark` |
| Sunset bucket | A1 conditions, hour 18, sunset 18:08 | `outside`, `dark` |
| Sunrise bucket | A1 conditions, hour 5, sunrise 05:10 | `outside`, `dark` |
| First full hour | A1 conditions, hour 6, sunrise 05:10 | `inside` |
| Fixture C5 | A1 conditions, sunrise "" | `no-call`, `missing-data` |
| Headline at night | `buildDecisionBrief` with `when` = 02:10 local, calm rows | `goNoGo` is not `"go"`. Headline does not contain "Good to go" or "Excellent window" |
| Fixture W3 | Night hours, 4 stars | no window from `buildChronologicalWindows` |
| Fixture W7 | `buildBrief({ spot: "freo", mode: "wind" })` with mocked calm night hours | `nextWindows` has no window that starts or ends in the dark |
| Opt-out | Same with `daylight=0` | night window is returned |

Existing test to check: `client/src/lib/decisionBrief.test.ts:128-136` expects `"go"` at 06:10 AWST with fixture sunrise 06:40. That hour is dark. Change the fixture time or sunrise so the test still exercises a daylight "go", and add the night case above. State the change in the PR.

## Acceptance criteria

- With a mocked 24-hour calm day, no hour before the first full daylight bucket or after the last one has state `inside` or `marginal` on any surface: `/brief.json`, `/brief`, Decision, Table, Summary, Graph, Sickie.
- `pnpm check` and `pnpm test` pass.

## What NOT to change

- `isDaylightHour` itself.
- Any wind, gust, swell or chop threshold.
- The fishing score. Night hours may still show a fishing indicator until card 10.

## Deploy

Deploy only with the owner's explicit approval. Open a PR against `codex/cloudflare-worker` and stop.
