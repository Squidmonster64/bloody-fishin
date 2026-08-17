export interface ForecastPrintPayload {
  image: string;
  locationName: string;
  timezone: string;
  rangeLabel: string;
  generatedAt: string;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] ?? character);
}

/**
 * Prints from a document that contains only static HTML and an embedded PNG.
 * This deliberately avoids Safari's fragile live-DOM print compositor path.
 */
export function openStandaloneForecastPrint(payload: ForecastPrintPayload) {
  const printWindow = window.open("", "BloodyDaveForecastPrint", "popup,width=1120,height=760");
  if (!printWindow) return false;

  const locationName = escapeHtml(payload.locationName);
  const timezone = escapeHtml(payload.timezone);
  const rangeLabel = escapeHtml(payload.rangeLabel);
  const generatedAt = escapeHtml(payload.generatedAt);

  printWindow.opener = null;
  printWindow.document.open();
  printWindow.document.write(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Forecast Graph — Bloody Dave's Fishing Planner</title>
<style>
  @page { size: landscape; margin: 10mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; background: #fff; color: #111827; font-family: Arial, Helvetica, sans-serif; }
  main { width: 100%; max-width: 1120px; margin: 0 auto; padding: 14px; }
  header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #374151; padding-bottom: 10px; margin-bottom: 10px; }
  h1 { margin: 0; font-size: 21px; letter-spacing: .04em; }
  p { margin: 4px 0 0; color: #374151; font-size: 12px; }
  .meta { text-align: right; font-size: 12px; color: #374151; }
  .legend { display: flex; gap: 12px; flex-wrap: wrap; margin: 0 0 10px; font-size: 10px; color: #374151; }
  #forecast-graph { width: 100%; height: auto; display: block; border: 0; }
  footer { border-top: 1px solid #d1d5db; margin-top: 8px; padding-top: 6px; color: #6b7280; font-size: 10px; }
  .manual { margin: 20px 0; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; }
  .manual button { min-height: 44px; padding: 10px 16px; background: #ea580c; color: #fff; border: 0; border-radius: 7px; font-weight: 700; }
  @media print { main { padding: 0; max-width: none; } .manual { display: none !important; } }
</style></head><body><main>
  <header><div><h1>BLOODY DAVE'S FISHING PLANNER</h1><p>📍 ${locationName} · 🌐 ${timezone}</p></div><div class="meta"><strong>${rangeLabel}</strong><br>Generated ${generatedAt}</div></header>
  <div class="legend"><span><b>Excellent</b> = calm wind / minimal chop</span><span><b>Go</b> = manageable runabout conditions</span><span><b>Marginal</b> = caution advised</span><span><b>★ Golden shade</b> = Golden Window conditions</span></div>
  <img id="forecast-graph" src="${payload.image}" alt="Selected forecast graph">
  <div class="manual"><strong>Your forecast graph is ready.</strong><p>On iPhone, wait until the full graph is visible, then use Safari <b>Share → Print</b> (recommended) or tap the button below.</p><button onclick="window.print()">Print graph</button></div>
  <footer>Planning guide only. Check official marine warnings, local conditions and your vessel limits before departure.</footer>
</main><script>
  const graph = document.getElementById('forecast-graph');
  async function markImageReady() {
    try { if (graph.decode) await graph.decode(); } catch (error) {}
    document.body.setAttribute('data-graph-ready', 'true');
  }
  if (graph.complete) markImageReady();
  else graph.addEventListener('load', markImageReady, { once: true });
</script></body></html>`);
  printWindow.document.close();
  return true;
}
