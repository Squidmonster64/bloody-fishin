# Bloody Fishin — Floot migration report

Date: 17 September 2026
Status: engineering draft prepared; NOT release-ready; NOT published.

## Source and platform

- Repository: Squidmonster64/bloody-fishin.
- Branch: codex/floot-mobile-migration.
- Verified source main SHA: b93a9ef7901fb15549a9ad2efc11558c9f30ef1b.
- Railway deployment d261c8c5-847a-4b0a-89a2-67ca5cd37526 reports SUCCESS at that same SHA. GitHub and deployed source agree.
- Floot project: Bloody Fishin, 8f69d9aa-f2c4-4d24-8a48-d2835507560d. Created, imported and typechecked; unpublished.
- Floot checkpoint: Mobile adapters and safety checks, 9ad10f95-c60c-48dc-b027-0e16e3836ece.

## Architecture and decisions

Reuse the merged React interface. Add a read-only `/forecast` route on Railway that returns the full AppData contract by calling the existing provider/assembly module and shared scoring functions. Existing browser builds retain direct provider fetching when VITE_FORECAST_API_BASE is unset. Mobile uses the production server adapter. Configure local server testing with VITE_FORECAST_API_BASE=http://localhost:<port>/.

The existing `/brief.json` is a condensed briefing: it does not contain the complete chart/hourly data needed to reuse the interface. It cannot substitute for `/forecast` without feature loss. Production currently returns HTML at `/forecast`; the adapter detects this and shows an error instead of misinterpreting it as forecast data. A separate, explicitly approved production deployment is required before live mobile parity can be checked.

The source generator scripts/prepare-floot.py copies the reachable modules, adjusts import paths and bundles compiled styles into Floot items. A source hash manifest is included in Floot. Scoring source is maintained in this repository; generated copies must not be edited independently. No scoring formulas or thresholds changed. The existing Express service remains on Railway.

Floot's documented Capacitor wrapper is used for native packaging. Custom service workers are unsupported by Floot, so none was introduced. A database was not introduced: local forecast and saved-spot persistence reuse the existing device storage model.

## Adaptations implemented

- Environment-based full-forecast transport; coordinate/day validation, timeout, JSON validation and location/horizon identity checks.
- Additive Railway `/forecast` route with input validation, existing rate limiting and cross-origin reads.
- Current-location permission flow with denied, timeout and unavailable states and manual-location fallback.
- iOS location purpose string configured on Floot.
- Timestamped cached forecasts; nested Date revival; malformed cache rejection and location/horizon checks.
- Cached or stale current Decision view becomes OUTLOOK and suppresses current boating ratings and upcoming recommendation windows. Historical numeric data remains available under a visible saved-forecast banner.
- Minute-based freshness refresh in Decision view.
- Last selected location/day range survives reload.
- Request sequencing prevents older location responses replacing newer selections.
- Saved-spot export/import with validation and coordinate-based duplicate prevention; existing storage key preserved.
- Native Web Share enhancement with readable public forecast-link fallback.
- Compare-spots requests use the same transport adapter.
- Location/control and cache action targets adjusted to 44px.
- Optional notification, camera and background-refresh interfaces declared; implementations deferred.

## Regression findings and proposed corrections

1. Cached recent data could be labelled Live and still provide a current boating call. Two new regression tests failed before the fix and pass afterward.
2. Existing provider timestamps were interpreted in the host timezone and converted again to the requested timezone. Under UTC, Perth 00:00 became 08:00. A regression test failed with [8, 15] instead of [0, 7]. The draft reads provider-local hours directly and uses a stable UTC carrier for labels and moon-date calculation. No formulas changed. This correction is proposed in the unmerged branch and must be reviewed before production deployment.
3. The brief recorded 83 baseline tests. Actual baseline was 78 Vitest tests plus 6 Node tests = 84.

## Verification

| Check | Result |
|---|---|
| Clean dependency install | Passed using repository-pinned pnpm 10.4.1 via Corepack |
| Baseline tests | 84 passed |
| Final tests, runtime TZ=UTC | 98 Vitest + 6 Node = 104 passed |
| TypeScript check | Passed |
| Production bundle build | Passed; existing large-chunk advisory remains |
| Shared scoring source | Unchanged |
| Full mobile vs server brief fixed provider fixture | Matching fishing scores, stars, vessel ratings and tide rates |
| Floot typecheck | Clean |
| Floot tests | 4 spec files passed: 3 imported suites (34 cases) plus seeded theme suite; 2 seeded hook specs excluded by platform default |
| Floot browser inspection | Blocked: no active connected preview tab |
| Local visual test attempt | Blocked: no installed Chromium; browser download timed out |
| Native build | Not generated |

The default tests use fixed fixtures and mocked provider responses; no paid calls required. The generated style/module import typechecks, but that is not a native build or a responsive visual pass.

## Production smoke checks

Read-only checks during this session:

| Route | Result |
|---|---|
| / | HTTP 200 |
| /health | HTTP 200; ok=true; service=bloody-fishin |
| /brief | HTTP 200 |
| /brief.json | Valid JSON containing daily rain, swell-period and wind-chop summaries |
| /mcp | HTTP 200; JSON-RPC initialize returned protocolVersion=2025-03-26 and server version=1.0.0 |
| /forecast | Not deployed: HTTP 200 HTML SPA fallback; correctly rejected by new client |

No production, DNS, Cloudflare or Railway configuration/deployment was changed. No branch was merged. No native build allowance was consumed.

## Parity matrix and release checklist

| Surface | Source retained / implementation | Remaining gate |
|---|---|---|
| Shared scoring, moon helpers, thresholds | Retained, deterministic tests pass | Real provider/device parity |
| Daylight and timezone | Regression correction, boundary tests pass | Review correction and multi-zone device checks |
| Current decision, next useful, best upcoming | Existing interface retained; cached current calls gated | Live mobile walkthrough |
| Wind, swell, tide, water, hourly/daily charts | Existing components retained | All specified viewport sizes and gesture checks |
| Marine missing/horizon states | Existing rules retained; status survives transport | Partial-provider live/device checks |
| Saved spots, place search, custom coordinates | Retained; import/export added | Real iPhone file/share import/export |
| Sickie and vessel profiles | Retained unchanged | Native walkthrough |
| Brief, print and comparison | Retained; share fallback and common transport | Device print/share behaviour |
| Offline last-known forecast | Cache restoration and selection implemented | Actual native cold launch without connectivity; persistence/eviction testing |
| Control/suite links | Existing source and contracts retained | Native external navigation |
| Touch/accessibility | Existing labels/layout retained; selected targets increased | Full 44px, focus, contrast, screen-reader and reduced-motion review |
| Existing server routes | Retained and live-smoked | Post-deployment regression smoke |

Viewport gates still pending: 375×667, 390×844, 768×1024, 1024×768, 820×1180, 1180×820, 1440×900. Do not claim these passed.

## Release 1.1

Notification thresholds, background refresh, launch checklist and catch log/camera remain deferred. Platform interfaces are prepared for notifications, camera and background refresh. None is required for the first forecast-client release.

## Remaining actions and rollback

1. Review and approve the draft's additive endpoint and regression corrections before merging/deploying to Railway. The uploaded workflow explicitly reserves production changes and branch merges for approval.
2. Open the Floot preview in an active tab, verify live server connection after deployment, and complete responsive/device, cached/offline, sharing and accessibility gates.
3. Run platform production build checks when available. Do not infer build success from typecheck.
4. After all Release 1 gates pass, confirm the current Floot native-build allowance. User-only publishing is under Publish → Mobile.

Rollback: existing main and production remain at b93a9ef. Before any approved deployment, record the deployed release ID. Railway can redeploy that known-good commit. Floot checkpoints can restore imported source/configuration. Never remove Railway during this migration.

## Discovery limits

PRs #2, #9 and #17 were read and confirmed merged. All eight named historical branches were located; their heads were recorded during discovery. No linked Figma file was found in the current tracked source; visual direction is the merged application and PR descriptions. Historical handoff folders and individual commits on every old branch were not exhaustively inspected. These are not represented as completed checks.
