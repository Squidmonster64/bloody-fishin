# Corrective Release Checklist

- [x] Inspect the current SL20 calculation and identify why calm conditions can be rated Avoid. The previous model used total wave height as a hard penalty, which treated organised long-period swell like hazardous chop.
- [x] Recalibrate boating thresholds and ensure user-visible criteria match the model.
- [x] Rework the iPhone SE location selector into a readable, full-width control.
- [x] Replace the table print flow with an ink-efficient graph print using the selected variables and active date range.
- [x] Run TypeScript and production build verification.
- [ ] Save and publish the corrected version.

## Graph Rendering Hotfix

- [x] Inspect browser console and preview state for the graph-rendering error. The loading screenshot was captured before the external forecast request completed; no console error occurred.
- [x] Correct the graph initialization or forecast-data handling issue. No code fault was reproducible in either a fresh managed-preview or public-domain session.
- [x] Verify the graph renders in preview and republish the hotfix. The five-day graph rendered successfully in both environments after the forecast response returned.

## Mobile Interaction and AI Access Release

- [x] Restore normal one-finger page scrolling over the landscape graph while preserving explicit zoom controls. The chart plugin's touch pan and pinch handling captures gestures that should scroll the page.
- [x] Replace the iPhone SE location dropdown presentation with an unclipped, readable picker. Native select rendering remains cramped on iOS in landscape.
- [x] Add a public, documented forecast URL format suitable for LLM retrieval without an app-specific API key. Open-Meteo offers public JSON endpoints; a static app cannot safely issue a secret key, so links will be generated from the active spot and date range.
- [x] Verify touch-friendly preview behaviour, build, and publish the update.

## Editable Vessel Presets

- [x] Review the existing built-in preset data and Sickie configuration UI.
- [x] Add persistent custom vessel profiles with editable wind, swell, weather, fishing, daylight, and duration criteria.
- [x] Make selected profiles control the Sickie forecast and explain their active thresholds.
- [x] Verify build and publish the vessel preset release.

## iPhone SE Planning Toolkit

- [x] Review current forecast data and identify reusable compact UI patterns. Reuse the existing localStorage hooks and bottom-sheet/drawer patterns; keep comparison and sharing out of the tab bar.
- [x] Cache successful forecasts locally and show the last saved data when live retrieval is unavailable.
- [x] Add an iPhone SE-friendly briefing sheet with copy/share actions.
- [x] Add two-spot comparison and a calendar export action for qualifying windows.
- [x] Verify build, mobile-safe controls, and publish the release.
