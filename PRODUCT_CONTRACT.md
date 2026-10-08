# Bloody Fishin product contract

Last verified: 8 October 2026 (AWST)

Bloody Fishin is a decision-first fishing and small-boat planning aid. It is not an official forecast, warning service or substitute for skipper judgement.

## Product authority

- `shared/scoring.ts` owns fishing and vessel scoring thresholds.
- `server/briefing.ts` owns the public forecast/decision payload used by Floot.
- Open-Meteo supplies model weather and marine inputs.
- Saved spots, vessel profiles and the last successful forecast remain device-local.
- Bureau of Meteorology warnings remain the official safety source. The app links to them; it must not present model output as a BOM forecast.

## Behaviour that must survive packaging

- GOOD/POOR decision first, followed by wind, swell, tide/water and fishing measurements.
- Explicit unavailable/stale/error states and a usable last-successful cache.
- The existing conservative gust, thunderstorm and missing-marine-data rules.
- Named and coordinate locations, local saved/custom spots, five-day and hourly views, and native sharing.
- Visible provider attribution and the safety disclaimer.
- Public `/brief`, `/brief.json`, `/locations` and read-only `/mcp` routes remain backward compatible.

## Release constraints

- No public release or paid provider activation without David's explicit approval.
- Do not ship copied BOM forecast text unless a licence or written permission covering that use is recorded.
- Do not call a TestFlight/App Store build complete until upload receipt, App Store Connect processing, export-compliance state and tester install are verified.
