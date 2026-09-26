# Offshore forecast corrections — 26 September 2026

Production: https://weather.bloodydaves.com; Railway bloody-fishin; main branch.

## Verified defects and changes

- Both browser and public brief now request `cell_selection=sea` for weather, preserving the selected latitude/longitude. Previously the weather endpoint defaulted to land. Provider grid coordinates are retained separately from requested coordinates.
- Provider local timestamps are interpreted in the forecast timezone, independent of the browser/server timezone. The brief starts with the current local hour. Past decision windows are excluded and date/gap boundaries split displayed windows.
- Shared boating ratings include gusts: >=21 kt Marginal, >=28 kt Avoid, <=14 kt required for Excellent/golden. These are conservative app thresholds, not BOM warning categories. SL20 window preset also caps gusts at 14 kt.
- Graph includes a dashed gust trace and downwind arrows. Compass labels retain the meteorological FROM convention; north is up.
- Fresh BOM Perth Local Waters text is fetched with a five-minute cache and a 24-hour maximum issue age. A conservative inshore bounding region prevents unrelated locations receiving this forecast. Unavailable/outside-coverage status is explicit. This is a regional outlook, not a full warning service.
- BOM thunderstorm dates and model thunderstorm codes prevent positive boating/golden ratings. BOM daily storm outlook is conservatively applied to the whole day.
- Old browser forecast caches are invalidated. Mean swell period and model sea-level datum are labelled explicitly.

## Live source comparison before deployment

For Fremantle Offshore (-32.06, 115.65), weather grid changes from (-32.09139, 115.760864) to (-32.09139, 115.65217). Exact point interpolation is not promised: weather models return grid cells.

| Date | Old maximum wind kt | Sea-grid maximum kt |
|---|---:|---:|
| 27 Sep | 8.0 | 11.7 |
| 28 Sep | 12.4 | 16.6 |
| 29 Sep | 8.9 | 14.5 |
| 30 Sep | 12.1 | 18.8 |
| 1 Oct | 8.3 | 13.9 |
| 2 Oct | 11.6 | 19.7 |
| 3 Oct | 10.0 | 16.9 |

BOM issued 19:01 WST 26 Sep: Sunday SE 10–15 kt easing below 10; Monday W/NW 10–15; Tuesday S 10–15, variable morning, W 10–15 afternoon; Wednesday W 15–20 turning S/SW. Corrected point-model winds broadly correlate, with Monday's 16.6 kt slightly above BOM's regional range. Do not tune model values to force equality.

Sources: https://www.bom.gov.au/wa/forecasts/perth-waters.shtml ; https://reg.bom.gov.au/wa/forecasts/fremantle.shtml ; https://www.seabreeze.com.au/weather/wind-forecast/perth ; https://open-meteo.com/en/docs ; https://open-meteo.com/en/docs/marine-weather-api

## Limits

BOM local-waters text currently extends only through Wednesday. Seven-day exact official equivalence is not available. Hourly point-model rain probability is not daily probability; mean swell period is not necessarily peak wave period; mean-sea-level heights are not chart-datum tide heights. These remain distinct quantities rather than being adjusted to agree. Fishing scores are app heuristics, not official forecasts.

## Verification

Type check and production build pass. 88 Vitest tests and 6 suite tests pass, including coordinate/unit requests, browser/brief parity, timezone handling, gust boundaries, arrow direction, fresh/stale BOM parsing and geographic exclusion. A real provider call returns the corrected sea grid, local 22:00 start and fresh BOM outlook.
