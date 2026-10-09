# Floot full-screen parity audit

Audited: 9 October 2026 (AWST)

Floot project: `Bloody Fishin` (`d8f73250-46e7-4e3b-a262-ae62df01fa61`)

Floot version accepted: `1791495107929`

Reference implementation: this repository at `0200dd51b7d6118157a66f421adaed01d6d9aee9`, with `PRODUCT_CONTRACT.md` as the acceptance authority.

## Verdict

The reduced-client regressions found at the start of this audit were restored in Floot. The accepted preview now preserves the Bloody Dave branding, decision hierarchy, chart formatting and arrows, detailed daily and hourly data, Sickie profiles and criteria, saved-spot management, cache behaviour and utility workflows from the reference product.

No paid service was activated. No Floot production/web publish, native build, TestFlight upload or App Store release was performed: Floot's available publish action is a production publish, while the owner's instruction is beta-only.

## Confirmed working

- Bloody Dave portrait, product name, suite navigation and provider/safety footer are present.
- Decision, Charts, Daily, Hourly and Sickie navigation works.
- Grouped locations, exact-coordinate entry, 3/5/7/10/14-day choices, refresh, Compare, Brief, Print and My Spots controls are present.
- The selected range owns the chart/daily/hourly/Sickie/compare request horizon; `hours=all` is used rather than the compact 36-hour response.
- Daily again shows per-day ranges, sunrise/sunset, tide extrema and hourly fishing/boating/wind/swell cells.
- Charts retain the six established variable names, directional wind arrows, zoom, golden-hour shading, day inspection and tide extrema.
- Sickie retains the five source presets, range sliders, optional limits, saved named vessel profiles, notes and detailed hourly windows.
- Compare completed a live five-day Fremantle Offshore versus Johnny Big Boy request.
- There was no document-level horizontal overflow in the connected desktop DOM inspection.
- Fresh responsive captures were inspected at 375x667, 820x1180 and 1440x900.
- Floot TypeScript check is clean. All three standard spec files and both explicitly-run hook spec files pass.

## Restored parity items

### Decision

- GOOD/POOR/OUTLOOK and GO/CAUTION/NO-GO are restored.
- The 16-hour G/P/O timeline, direct detail links, reason list, raw-hour data and detailed freshness state are restored.
- The 375x667 verdict card no longer clips.

### Charts

- Reset/zoom controls, golden-hour shading, selected-day picker, condition summary, hourly strip and tide extrema are restored without removing wind arrows.

### Daily

- Per-day ranges and every available hourly cell remain restored.
- Moon phase/name/illumination display is implemented and becomes populated by the backward-compatible public-brief additions in this release.
- The current partial day intentionally contains future hours only, matching the live planning contract.

### Hourly

- The operational table now has 14 columns, including score /100, boating call, direction, period, swell direction, total wave, chop, MSL, temperature and rain chance/amount.
- Daily precipitation totals, golden-row legend/highlighting and the frozen Date/Hour column are restored.

### Sickie

- Saved named vessel profiles, emoji/notes, update/delete management and device persistence are restored.
- Range sliders, optional-limit controls, algorithm explanation, detailed window metrics, hourly strips and calendar export are restored.

### Utilities

- **Print:** dedicated landscape graph document, selected series, wind arrows, golden shading and popup-blocker recovery are restored.
- **My Spots:** save-current, notes, rename/edit, notes display and saved date are restored.
- **Compare:** auto-load, score /100, winner highlighting and golden flags are restored.
- **Brief:** exact date span, marine horizon/warning, best highlighted hour, score /100 and copy/share feedback are restored.
- **Cache/status:** detailed freshness, saved-copy clearing and retry states are restored.
- **Long range:** the days 9–14 marine-horizon warning is global across all views.

## Deliberate difference, not a regression

The native/client surface links to the official Bureau of Meteorology marine forecast instead of republishing copied BOM forecast text. Keep this link-only behaviour unless a suitable reuse licence or written permission is recorded.

## Acceptance coverage

`helpers/productParity.spec.tsx` now asserts the restored decision timeline/details, complete hourly headings, chart zoom/day detail, Sickie controls/profile editor and utility entry points. `helpers/forecastClient.spec.tsx` covers saved-spot updates and selective cache clearing. Connected-preview tests additionally exercised Compare, Brief, Print and My Spots because the headless Radix dialog focus trap is not a reliable jsdom interaction target.

## Acceptance status

- Responsive shell: passed in preview at iPhone SE 375x667, iPad 820x1180 and Mac 1440x900.
- Full functional parity: passed in connected preview across Decision, Charts, Daily, Hourly and Sickie at 5- and 14-day horizons.
- Physical-device acceptance: not run in this audit.
- TestFlight/App Store readiness: still gated by Apple account/signing, support/privacy URLs and physical-device acceptance; no build or public release was attempted.
