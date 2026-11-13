# Card 04. Swell height downgrades at any period

Phase 1A. Effort S. Depends on: card 02.
Base: `Squidmonster64/bloody-fishin`, branch `codex/cloudflare-worker` @ `93078fc`.

## Goal

Big swell must be able to downgrade a call whatever its period. Today swell only counts when the model period is under 10 s [M]. A 4 m, 14 s swell with 10 kt of wind rates "Go" [M, by reading `shared/scoring.ts:52-61`].

## Files and functions to touch

| File:line | What is there now [M] |
|---|---|
| `shared/scoring.ts:36` | Missing period defaults to 9 s |
| `shared/scoring.ts:43` | `periodFactor`: 1.0, 0.80, 0.60, 0.45, 0.35 |
| `shared/scoring.ts:52` | Avoid: `period < 8 && swell > 2.0` is the only swell rule |
| `shared/scoring.ts:55` | Marginal: `period < 8 && swell > 1.2`, or `period < 10 && swell × factor > 1.35` |
| `shared/scoring.ts:37,46` | Total wave height is used only to infer chop |
| `shared/scoring.ts:13-22` | Doc comment says clean long-period swell "is treated more gently" |
| `client/src/components/SickieView.tsx:285` | Explainer repeats that claim |
| `shared/scoring.test.ts:41-53` | Existing swell tests |

## Behaviour change

Add two rules to the rating, at any period. Numbers are proposals for skipper validation [J], except 1.5 m, which is the owner's own stated ceiling [R].

| Swell height (model `swell_wave_height`) | New effect |
|---|---|
| over **1.5 m** | at least Marginal. Reason `swell` |
| over **2.2 m** | Outside (legacy label Avoid). Reason `swell` |

Keep the existing short-period rules: under 8 s, over 1.2 m is Marginal and over 2.0 m is Avoid. Reason `short-swell`.

The 8 to 10 s rule (`swell × 0.8 > 1.35`, which is swell over 1.69 m) is now always weaker than the 1.5 m rule. Remove it and remove `periodFactor`, so no dead code remains.

Put the four numbers in one named constants block with the comment "proposal, pending skipper validation".

Update the doc comment at `shared/scoring.ts:13-22` and the explainer at `SickieView.tsx:285` to say: swell over 1.5 m is Marginal and over 2.2 m is outside limits at any period; short-period swell is judged more harshly.

Known limit of this rule [R]: the model swell is open-shelf swell. Inside Gage Roads and Cockburn Sound the real swell is lower. Card 12 adds a per-spot exposure factor. Until then this rule will read cautious at sheltered spots on big-swell days. That is the safe direction.

## Tests to add

| Test | Input (wind / gust, chop, swell @ period) | Expected |
|---|---|---|
| Fixture A4 | 10 / 13, 0.3, 4.0 @ 14 | `outside`, reason `swell` |
| Fixture A5 | 10 / 13, 0.3, 1.8 @ 13 | `marginal`, reason `swell` |
| Fixture A6 | 10 / 13, 0.3, 1.6 @ 9 | `marginal`, reason `swell` |
| Fixture A7 | 8 / 11, 0.2, 1.4 @ 12 | `inside` (legacy Go) |
| Boundary | 8 / 11, 0.2, 1.5 @ 12 | `inside` |
| Boundary | 8 / 11, 0.2, 1.51 @ 12 | `marginal` |
| Boundary | 8 / 11, 0.2, 2.2 @ 12 | `marginal` |
| Boundary | 8 / 11, 0.2, 2.21 @ 12 | `outside` |
| Fixture A8 | 10 / 13, 0.3, 1.3 @ 7 | `marginal`, reason `short-swell` |
| Fixture A9 | 8 / 11, 0.2, 2.1 @ 7 | `outside`, reason `short-swell` |
| Missing period | 8 / 11, 0.2, 1.8 @ null | `marginal` (height rule does not need a period) |

Existing tests that must still pass unchanged: `shared/scoring.test.ts:13-53`. In particular line 49-53 (long period is rated no worse than short period at 1.2 m) still holds.

## Acceptance criteria

- No swell height above 2.2 m can produce `inside` or `marginal` for any period.
- `periodFactor` no longer exists.
- `pnpm check` and `pnpm test` pass.

## What NOT to change

- Wind, gust and chop thresholds.
- The vessel presets' `maxSwell` values. Card 07 owns them.
- Do not add a total-sea (`waveH`) limit here. It needs the exposure factor from card 12 to be meaningful.

## Deploy

Deploy only with the owner's explicit approval. Open a PR against `codex/cloudflare-worker` and stop.
