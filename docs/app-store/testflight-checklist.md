# TestFlight preparation and acceptance checklist

Prepared: 8 October 2026 (AWST)

## Build readiness

- [x] Floot project configured with proposed bundle ID and opaque 1024px icon.
- [x] Safe-area-aware mobile layout and native system-bar colours configured.
- [x] Floot helper tests and TypeScript check pass.
- [x] Repository tests, TypeScript check and production build pass.
- [x] Universal iPhone and iPad device family confirmed by owner and configured in Floot.
- [x] Fresh screenshots confirm the full-parity Floot rebuild at 375x667, 393x852, 820x1180 and 1440x900 on 8 October 2026. Earlier reduced-client screenshots are superseded.
- [ ] Release payload no longer contains copied BOM forecast text, or licence is recorded.
- [ ] Support URL, privacy URL, copyright owner and reviewer contact supplied.
- [ ] Native build/publish explicitly approved.
- [ ] Apple distribution signing/App Store Connect record verified.
- [ ] Export-compliance answers completed.

## Phone acceptance — iPhone SE 375x667 through current iPhone

- [x] Initial live forecast resolves to a clear GOOD/POOR state in the rebuilt preview.
- [x] Decision, Charts, Daily, Hourly and Sickie navigation works without horizontal overflow.
- [x] Core controls meet a 44px minimum target in the Floot implementation.
- [x] Model attribution, safety copy and official BOM link are visible.
- [x] Custom-location helper stores, loads and removes local entries in tests.
- [ ] Add/select/delete a custom spot on a physical iPhone.
- [ ] VoiceOver order, labels and dynamic-type behaviour verified on device.
- [ ] Native share sheet verified on device.
- [ ] Offline launch, stale timestamp and retry verified on device.
- [ ] Light/dark system changes do not reduce legibility (app intentionally remains dark).
- [ ] Rotate and background/foreground without losing the current location.

## iPad and Apple-silicon Mac acceptance

- [x] iPad preview uses the Figma tablet hierarchy without losing current functionality.
- [x] Mac/desktop preview uses the two-column Figma desktop hierarchy without losing current functionality; all controls and tabs remain visible without horizontal overflow.
- [ ] Install and operate the processed build on a physical iPad.
- [ ] Enable the internal TestFlight group's Apple-silicon Mac testing, install on a Mac and verify keyboard, pointer, window resizing and sharing.
- [ ] After the Mac pass, verify Apple-silicon compatibility in App Store Connect and decide whether to make the iOS app available on the Mac App Store.

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
- [ ] Launch and acceptance pass on iPad and Apple-silicon Mac.
- [ ] External testing, if wanted, is separately approved and Beta App Review completes.

The build is “prepared” until every applicable receipt above is captured. It is not “on TestFlight” merely because Floot produced an archive.
