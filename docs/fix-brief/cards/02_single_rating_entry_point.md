# Card 02. One rating entry point (no behaviour change)

Phase 1A. Effort M. Depends on: nothing. Cards 03 to 08 depend on this.
Base: `Squidmonster64/bloody-fishin`, branch `codex/cloudflare-worker` @ `93078fc`.

## Goal

Make one function the only place an hour is rated. Today `rateSL20` is called directly from eleven places and windows are built by three different functions [M]. Any new rule (daylight, warnings, swell) would have to be added in each one. This card is plumbing. Labels on screen must not change.

## Files and functions to touch

| File:line | What is there now [M] |
|---|---|
| `shared/scoring.ts:23-62` | `rateSL20(windKt, swellH, swellP, waveH, windWaveH, gustKt, thunderstorm)` |
| `server/briefing.ts:270,293` | Two server call sites |
| `server/briefing.ts:369` | `sl20` label serialised per hour |
| `client/src/lib/fishingEngine.ts:51-79` | `HourRow` type. No `daylight` field. No rating reasons |
| `client/src/lib/forecastApi.ts:88-126` | `rowFromBrief`. Drops `hour.daylight`, `sunrise`, `sunset` |
| `client/src/lib/decisionBrief.ts:146,325` | Client call sites |
| `client/src/components/DecisionView.tsx:56,194` | Client call sites |
| `client/src/components/SickieView.tsx:77,406` | Client call sites |
| `client/src/components/TableView.tsx:16` | Client call site |
| `client/src/components/SummaryView.tsx:25,48` | Client call sites. Line 48 labels the day from the 09:00 row |
| `client/src/components/GraphView.tsx:324` | Client call site |
| `client/src/lib/decisionBrief.ts:146`, `SickieView.tsx:77` | A window is labelled from its **first** hour only |
| `shared/scoringAuthority.test.ts:17-40` | Parity test between shared and client re-exports |

## Behaviour change

1. Add to `shared/scoring.ts`:

   ```ts
   export type CallState = "inside" | "marginal" | "outside" | "no-call";
   export type ReasonCode = "wind" | "gust" | "chop" | "swell" | "short-swell" | "thunderstorm"
     | "dark" | "warning" | "warning-unchecked" | "missing-data" | "stale";
   export interface HourInput {
     windKt: number | null; gustKt: number | null; windDirDeg: number | null;
     swellH: number | null; swellP: number | null; waveH: number | null; windWaveH: number | null;
     thunderstorm: boolean; daylight: boolean | null;
   }
   export interface HourCall { state: CallState; legacy: SL20Rating; reasons: ReasonCode[]; }
   export function assessHour(input: HourInput): HourCall
   ```

2. In this card `assessHour` only wraps `rateSL20`. Mapping: Excellent and Go give `inside`. Marginal gives `marginal`. Avoid gives `outside`. If `hasMarineForVessel` is false the state is `no-call`. `reasons` lists which existing rule fired. `daylight` and `windDirDeg` are accepted and **ignored** in this card.
3. Add `daylight`, `sunrise` and `sunset` to `HourRow`. Fill them in `rowFromBrief` from the fields the server already sends.
4. Add one client helper, for example `callForRow(row: HourRow): HourCall` in `client/src/lib/fishingEngine.ts`. Replace all nine client call sites with it. Replace the two server call sites with `assessHour`.
5. Add `call: { state, reasons }` to each hour in `/brief.json` (`serializeHour`). Keep the `sl20` field exactly as it is.
6. Window label: use the **worst** hour in the window, not the first. This is the one visible change. It only makes a label worse, never better.
7. `rateSL20` stays exported. Nothing outside `shared/scoring.ts` may call it after this card.

## Tests to add

| Test | Input | Expected |
|---|---|---|
| Parity sweep | Every combination of wind {0, 8, 10, 14.9, 15, 20, 20.1}, gust {10, 14, 20, 21, 28}, chop {0.2, 0.35, 1.15, 1.6}, swell {0.4, 1.3, 2.1}, period {7, 9, 12, 14}, thunderstorm {false, true}, marine present | `assessHour(x).legacy.label === rateSL20(...).label` for all |
| Fixture A1 | 8 / 090 / 11, chop 0.2, swell 0.8 @ 12 | state `inside`, legacy "Excellent" |
| Fixture B3 | 15 / 090 / 19, chop 0.5, swell 1.0 @ 11 | `marginal`, reasons include `wind` |
| Fixture B5 | 20.1 / 270 / 26 | `outside`, reasons include `wind` |
| Fixture B7 | 8 / 090 / 28 | `outside`, reasons include `gust` |
| Fixture E1 | A1 with thunderstorm true | `outside`, reasons include `thunderstorm` |
| No marine | wind 8, gust 11, all marine null | `no-call` |
| Fixture W5 | Window of three rows: A1, A1, B3 | window label is Marginal |
| Row mapping | `rowFromBrief` on an hour with `daylight: false`, `sunrise`, `sunset` | row carries all three |
| Guard | A test that greps `client/src` and `server` for `rateSL20(` | no match outside `shared/scoring.ts` and test files |

## Acceptance criteria

- Every existing test passes unchanged, except window-label expectations that relied on the first hour.
- A snapshot of `/brief.json` for a mocked forecast differs from before only by the added `call` field.
- `pnpm check` and `pnpm test` pass.

## What NOT to change

- Any threshold in `rateSL20`.
- The visible label text (Excellent, Go, Marginal, Avoid). Card 08 owns wording.
- Window eligibility rules. Card 07 merges the three window builders.
- The `sl20` field name or values in `/brief.json`.

## Deploy

Deploy only with the owner's explicit approval. Open a PR against `codex/cloudflare-worker` and stop.
