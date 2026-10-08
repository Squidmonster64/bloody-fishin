# iOS packaging and store readiness

Status date: 8 October 2026 (AWST)

Priority: P1

Repository: `Squidmonster64/bloody-fishin`

Floot project: `Bloody Fishin` (`d8f73250-46e7-4e3b-a262-ae62df01fa61`)

Proposed bundle ID: `com.bloodydaves.fishin`

## Decision

Use Floot's Capacitor-based native wrapper for iOS. Do not create a second React Native or Expo implementation. The wrapper should host the focused mobile client, while the existing Express briefing service remains the calculation and scoring authority.

This split avoids duplicating the tested scoring, forecast, tide/solunar, cache and public briefing behaviour. It also gives the App Store build native system bars, safe-area handling, sharing and device packaging without changing the public web app.

Floot's native build currently travels through its publish workflow, which also publishes the web app. Because this sprint explicitly forbids public release, no native build or publish has been started. The project is configured but unpublished.

## Verified product state

### GitHub source

- `main` baseline: `090eb78`.
- React 19/Vite client and Express service.
- 19 Vitest files / 88 tests passed; 7 suite/attribution tests passed after this change.
- TypeScript check and production build passed.
- Existing production build warning: the main JavaScript chunk is about 630 kB (about 202 kB gzip), above Vite's 500 kB advisory threshold. This is not a functional failure but should be addressed before a performance-sensitive release.
- Existing public service provides `/brief`, `/brief.json`, `/locations` and read-only `/mcp`.

### Floot mobile client

- Full current product shell: Decision/live window, Charts, Daily, Hourly and Sickie views.
- Grouped location catalogue, 3/5/7/10/14-day range selection, exact coordinate entry, device-local saved spots, compare, briefing/share and print.
- Configurable Sickie vessel criteria with calendar export for qualifying windows.
- Live data from `https://weather.bloodydaves.com/brief.json`; no copied scoring implementation.
- Local cached fallback, saved/custom locations, retry and share-link behaviour.
- Safe-area-aware fixed navigation and 44 px minimum controls.
- Visible Open-Meteo/model attribution and official BOM link.
- Dark Bloody Dave marine visual system; no 5M co-branding.
- Responsive presentation follows the recovered Figma hierarchy without replacing the repository/live-app product contract.
- The Recharts payload is lazy-loaded only when Charts opens, reducing the initial decision/live-window load.
- Floot typecheck is clean and three helper/product-contract spec files pass.
- Connected-preview browser acceptance confirms the live window, all five view transitions, grouped spot catalogue, all five range choices, Compare, Briefing, saved/exact-coordinate management and Print dispatch. The inspected viewport had no horizontal overflow.
- Fresh full-parity screenshots passed at iPhone SE 375x667, current iPhone 393x852 and iPad 820x1180 on 8 October 2026. The phone captures preserve the primary live-window card, five-tab navigation and controls without horizontal clipping; the iPad capture preserves all five views, the decision card, six-measurement grid and expanded next-hours grid.
- Mac visual acceptance is still pending. Floot's Desktop preset and custom 1024x768/1440x900 captures reported the requested target but rendered the 375px responsive canvas, so they are not accepted as desktop evidence. Earlier reduced-client screenshots are superseded and must not be used as evidence.
- Floot device family is explicitly set to universal iPhone and iPad.
- Floot publish status: unpublished, no custom domain, no mobile build started.

### Mac distribution

Use the same universal iPhone/iPad build on Apple-silicon Macs. Apple documents that eligible iPhone and iPad apps can be offered through the Mac App Store without a port because they use the same frameworks, resources and runtime. This is an iPad-compatible app on Mac, not a native AppKit or Mac Catalyst target.

After a build is uploaded, enable the TestFlight group's Apple-silicon Mac testing and complete a real Mac acceptance pass. App Store Connect compatibility must be verified only after that pass; no Mac availability setting was changed in this sprint.

Apple references reviewed 8 October 2026:

- [Manage availability of iPhone and iPad apps on Macs with Apple silicon](https://developer.apple.com/help/app-store-connect/manage-your-apps-availability/manage-availability-of-iphone-and-ipad-apps-on-macs-with-apple-silicon)
- [Test iPhone and iPad apps on Macs with Apple silicon](https://developer.apple.com/help/app-store-connect/test-a-beta-version/test-iphone-and-ipad-apps-on-macs-with-apple-silicon)

## Forecast-data licensing decision

### Open-Meteo

Open-Meteo's free API terms are for non-commercial use and require attribution. Its commercial plan supplies a customer endpoint/API key and commercial-use licence. Therefore:

- A free, ad-free private beta may use the free endpoint only while it remains within the provider's current non-commercial terms and limits.
- Any paid app, subscription, advertising, paid business use or other commercial distribution is blocked until the commercial plan is approved and configured.
- Attribution to Open-Meteo and the underlying model provider must remain visible.

No paid plan was activated in this sprint.

### Bureau of Meteorology

The current server scrapes Perth Local Waters HTML and republishes the forecast text. BOM's published copyright/data-service material does not establish that this reuse is licensed for public App Store distribution. The release-safe default is therefore:

- Link users to the official BOM marine warning/forecast page.
- Do not bundle, cache or republish BOM forecast text in the App Store/TestFlight client until written permission or a suitable data licence is recorded.
- Keep the app's model-derived scoring clearly distinct from official warnings.

This is a release gate. The current production endpoint has not been changed during store preparation.

### TimeAPI.io

The legacy browser client calls TimeAPI.io for coordinate-to-timezone lookup. The Floot client instead consumes the backend timezone returned with the Open-Meteo-derived brief, so the iOS package does not need a separate TimeAPI call. This removes a release dependency whose site currently describes the service as free but does not publish a sufficiently specific commercial licence in the material reviewed.

## iOS decisions still requiring owner/account confirmation

1. Confirm that TestFlight remains free, ad-free and non-commercial. Otherwise approve the Open-Meteo commercial plan first.
2. Provide the support URL/contact and privacy-policy URL that will be maintained publicly.
3. Decide whether to obtain BOM reuse permission or ship link-only BOM access.

## Release gates

- [x] Repository baseline identified and reproducible.
- [x] Mobile client implemented in Floot.
- [x] Forecast provider attribution visible.
- [x] 1024x1024 opaque RGB app icon prepared.
- [x] Store metadata, privacy notes, review notes and TestFlight checklist drafted.
- [ ] BOM copied-text path removed/disabled for the native release payload, or licence recorded.
- [x] Universal iPhone and iPad device family confirmed and configured.
- [ ] Full-parity responsive preview accepted at iPhone SE, current iPhone, iPad and Mac/desktop sizes.
- [ ] Support and privacy URLs supplied and reachable.
- [ ] Native build explicitly approved.
- [ ] Build uploaded and processed in App Store Connect.
- [ ] Internal TestFlight install completed on a physical iPhone.
- [ ] Internal TestFlight install completed on a physical iPad and Apple-silicon Mac.
- [ ] Public/external TestFlight or App Store release separately approved.
