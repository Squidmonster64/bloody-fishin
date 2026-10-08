# TestFlight preparation and acceptance checklist

Prepared: 8 October 2026 (AWST)

## Build readiness

- [x] Floot project configured with proposed bundle ID and opaque 1024px icon.
- [x] Safe-area-aware mobile layout and native system-bar colours configured.
- [x] Floot helper tests and TypeScript check pass.
- [x] Repository tests, TypeScript check and production build pass.
- [ ] Owner confirms iPhone-only versus universal device family.
- [ ] Release payload no longer contains copied BOM forecast text, or licence is recorded.
- [ ] Support URL, privacy URL, copyright owner and reviewer contact supplied.
- [ ] Native build/publish explicitly approved.
- [ ] Apple distribution signing/App Store Connect record verified.
- [ ] Export-compliance answers completed.

## Phone acceptance — 375px to 430px

- [x] Initial live forecast resolves to a clear GOOD/POOR state.
- [x] Now, Days and Hourly navigation works without horizontal overflow.
- [x] Core controls meet a 44px minimum target in the Floot implementation.
- [x] Model attribution, safety copy and official BOM link are visible.
- [x] Custom-location helper stores, loads and removes local entries in tests.
- [ ] Add/select/delete a custom spot on a physical iPhone.
- [ ] VoiceOver order, labels and dynamic-type behaviour verified on device.
- [ ] Native share sheet verified on device.
- [ ] Offline launch, stale timestamp and retry verified on device.
- [ ] Light/dark system changes do not reduce legibility (app intentionally remains dark).
- [ ] Rotate and background/foreground without losing the current location.

## Forecast acceptance

- [x] Floot consumes the existing `/brief.json` authority rather than reimplementing scoring.
- [x] Missing marine values are shown as unavailable, not zero.
- [x] Failed live loads can fall back to the last successful local cache.
- [x] Attribution is present in both GitHub and Floot clients.
- [ ] Compare one Fremantle response against the GitHub public brief at the same generated timestamp.
- [ ] Confirm link-only BOM behaviour in the release candidate.

## TestFlight receipt

- [ ] App Store Connect accepts bundle ID, version and build number.
- [ ] Build processing completes without signing or export-compliance errors.
- [ ] Internal tester receives invitation and installs the build.
- [ ] Launch and acceptance pass on at least one current iPhone and one small-screen iPhone.
- [ ] External testing, if wanted, is separately approved and Beta App Review completes.

The build is “prepared” until every applicable receipt above is captured. It is not “on TestFlight” merely because Floot produced an archive.
