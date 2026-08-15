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
