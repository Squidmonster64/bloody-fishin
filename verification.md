# Verification Notes

## Live Preview — 15 August 2026

The forecast loaded successfully for Fremantle Offshore after the recalibration. Conditions with 1–8 kt winds and 1.5–1.9 m swell are now shown as **Go** or **Excellent**, rather than blanket **Avoid** ratings. The live graph spans the full five-day selected range and the hourly strip retains the selected day.

The desktop preview confirms the location field, date selector, print button, saved-spots button, and four main tabs are available. The next release adds the final print-graph and mobile-specific checks.

## Corrective Release Check

The graph tab loaded a five-day Fremantle forecast with low winds (1–8 kt) and a 1.5–1.9 m swell as **Go** or **Excellent**, confirming the new wind-chop and swell-period model no longer rates these conditions Avoid. The Print control opens a graph-print confirmation that explicitly confirms the loaded range and selected variables; it does not present an hourly table.

## Graph Rendering Investigation

The managed preview loaded the five-day Fremantle forecast and rendered the graph canvas successfully after the initial Open-Meteo loading state. The live graph contains wind, swell, fishing percentage, and tide series across the full range. The next check is the published public domain, to distinguish a deployment or cache issue from a rendering issue.

The published production domain was also tested from a fresh browser session. It showed the initial loading state, then rendered the five-day forecast graph and hourly cards successfully. This indicates the checkpoint preview image was captured before the external forecast request completed, rather than the chart failing to initialise.

## Mobile Interaction and AI Access Release

The updated preview loaded the full forecast graph, showed the explicit `+`, `−`, and Reset Zoom controls, and displayed the revised instruction that phone users should use those controls while one-finger gestures remain available for normal page scrolling. The controls bar also exposes the new AI Data entry point.

The AI Data panel was opened successfully in the updated preview. It generated public weather and marine JSON links for the active Fremantle location and five-day range, plus a ready-to-copy LLM prompt. The browser console reported no client-side errors after the panel opened.

## Vessel Preset Release

The updated preview loaded the vessel-preset build without startup errors and entered the normal external forecast loading state. The next check opens the Sickie tab once the forecast response is available.

The Sickie tab loaded successfully with the SL20/Half-cabin profile, displaying its active wind, swell, and minimum-window summary. The expanded profile editor is the next interaction being checked.

The expanded editor exposed built-in vessels plus adjustable steady wind, gust, groundswell, wind-chop, rain, fishing-star, SL20, daylight, and duration criteria. The Save Current form opened with vessel emoji, name, and optional notes fields.

A temporary vessel profile was successfully named, saved, added to the profile list, and made active. The active profile header was then corrected to show the saved vessel identity and notes instead of a generic Custom label.

## iPhone SE Planning Toolkit

The updated app exposed compact Compare and Brief actions alongside the existing controls. During a live refresh, the saved forecast graph, hourly strip, and full selected range remained visible beneath a clear refresh notice, confirming the offline-cache experience no longer blanks the planner.

The comparison sheet opened in a compact phone-safe layout and began a live comparison request for Johnny Big Boy. A bounded fallback is being added so slow or unavailable upstream data cannot leave this sheet in an indefinite loading state.

The comparison sheet now has a 15-second bounded request with a plain-language retry state. The compact Fishing Briefing sheet opened successfully and included the selected spot, date range, peak wind, peak swell, fishing score, highlighted hour, plus native Share and Copy actions.

The Sickie tab loaded with the expanded active-vessel summary, including steady wind, gust, wind-chop, groundswell mode, daylight and duration thresholds. Calendar export is attached to each qualifying window; the current SL20 thresholds did not return a qualifying three-hour window in this forecast, so the control is not shown until a window exists.

Switching to the Offshore Cruiser preset produced two qualifying Sickie windows. Each compact window card displayed a touch-sized Calendar action alongside its time range, conditions, and hourly strip, confirming the export trigger appears only where it is useful.

The next Sickie window's Calendar action successfully generated `bloody-daves-2026-08-16-fishing-window.ics`, confirmed in the browser download history.

## Manual Forecast Refresh

The updated controls now show a prominent coral-outlined Refresh action next to the compact iPhone-safe planning actions. A successful live refresh completed and removed the refresh-in-progress message while retaining the graph and hourly data.

Clicking Refresh triggered the explicit in-place loading message while the cached graph remained usable. The live request completed successfully, restored the ready-state button, and displayed the refreshed forecast without a blank-screen transition.
