/**
 * PrintView — white-background print-friendly forecast.
 * Triggered by window.print() after rendering this overlay.
 * Shows only the variables the user has toggled on, for the next 7 days.
 * Uses @media print CSS to hide everything else and show only this panel.
 */
import { useEffect, useRef } from "react";
import type { AppData, HourRow } from "@/lib/fishingEngine";
import { rateSL20, windColor, swellColor, degToCompass, fmt } from "@/lib/fishingEngine";
import type { FishingState } from "@/hooks/useFishingData";

interface Props {
  data: AppData;
  vis: FishingState["vis"];
  onClose: () => void;
}

// Columns driven by vis toggles
interface ColDef {
  key: string;
  label: string;
  visKey?: keyof FishingState["vis"];
  always?: boolean;
}

const COLS: ColDef[] = [
  { key: "datetime", label: "Date / Hour", always: true },
  { key: "fish",     label: "Fish %",  always: true },
  { key: "sl20",     label: "SL20",    always: true },
  { key: "wind",     label: "Wind",    visKey: "wind" },
  { key: "gust",     label: "Gust",    visKey: "wind" },
  { key: "winddir",  label: "Dir",     visKey: "wind" },
  { key: "swell",    label: "Swell",   visKey: "swell" },
  { key: "period",   label: "Period",  visKey: "swell" },
  { key: "wave",     label: "Wave",    visKey: "swell" },
  { key: "tide",     label: "Tide",    visKey: "tide" },
  { key: "temp",     label: "Temp",    visKey: "temp" },
  { key: "rain",     label: "Rain%",   visKey: "rain" },
];

function slPrintColor(label: string): string {
  if (label === "Excellent") return "#16a34a";
  if (label === "Go")        return "#2563eb";
  if (label === "Marginal")  return "#d97706";
  return "#dc2626";
}

function PrintRow({ row, cols }: { row: HourRow; cols: ColDef[] }) {
  const sl = rateSL20(row.windKt, row.swellH, row.swellP, row.waveH);
  const dt = new Date(row.time);
  const dayLabel = row.isDayStart
    ? dt.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })
    : "";

  return (
    <tr style={{
      backgroundColor: row.golden ? "#fefce8" : "white",
      borderBottom: "1px solid #e5e7eb",
    }}>
      {cols.map(col => {
        switch (col.key) {
          case "datetime":
            return (
              <td key="datetime" style={{ padding: "4px 6px", whiteSpace: "nowrap", borderRight: "1px solid #e5e7eb" }}>
                {row.isDayStart && (
                  <div style={{ fontSize: 9, color: "#c2410c", fontWeight: 700, lineHeight: 1.2 }}>{dayLabel}</div>
                )}
                <div style={{ fontFamily: "monospace", fontSize: 11, color: "#111" }}>{row.hourLabel}</div>
                {row.golden && <span style={{ fontSize: 8, color: "#d97706", fontWeight: 700 }}>⭐ GOLDEN</span>}
              </td>
            );
          case "fish":
            return (
              <td key="fish" style={{ padding: "4px 6px", textAlign: "center", whiteSpace: "nowrap" }}>
                <span style={{ fontWeight: 700, color: "#ea580c", fontSize: 11 }}>{row.fishScore}%</span>
                <span style={{ color: "#ca8a04", fontSize: 9, marginLeft: 2 }}>{"★".repeat(row.fishStars)}</span>
              </td>
            );
          case "sl20":
            return (
              <td key="sl20" style={{ padding: "4px 6px", textAlign: "center", whiteSpace: "nowrap" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: slPrintColor(sl.label) }}>{sl.label}</span>
              </td>
            );
          case "wind":
            return (
              <td key="wind" style={{ padding: "4px 6px", textAlign: "center", whiteSpace: "nowrap", fontSize: 11, color: windColor(row.windKt) }}>
                {row.windKt != null ? `${Math.round(row.windKt)}kt` : "—"}
              </td>
            );
          case "gust":
            return (
              <td key="gust" style={{ padding: "4px 6px", textAlign: "center", whiteSpace: "nowrap", fontSize: 11, color: windColor(row.gustKt) }}>
                {row.gustKt != null ? `${Math.round(row.gustKt)}kt` : "—"}
              </td>
            );
          case "winddir":
            return (
              <td key="winddir" style={{ padding: "4px 6px", textAlign: "center", whiteSpace: "nowrap", fontSize: 11, color: "#374151" }}>
                {degToCompass(row.windDir)}
              </td>
            );
          case "swell":
            return (
              <td key="swell" style={{ padding: "4px 6px", textAlign: "center", whiteSpace: "nowrap", fontSize: 11, color: swellColor(row.swellH) }}>
                {row.swellH != null ? `${fmt(row.swellH)}m` : "—"}
              </td>
            );
          case "period":
            return (
              <td key="period" style={{ padding: "4px 6px", textAlign: "center", whiteSpace: "nowrap", fontSize: 11, color: "#374151" }}>
                {row.swellP != null ? `${fmt(row.swellP, 0)}s` : "—"}
              </td>
            );
          case "wave":
            return (
              <td key="wave" style={{ padding: "4px 6px", textAlign: "center", whiteSpace: "nowrap", fontSize: 11, color: swellColor(row.waveH) }}>
                {row.waveH != null ? `${fmt(row.waveH)}m` : "—"}
              </td>
            );
          case "tide":
            return (
              <td key="tide" style={{ padding: "4px 6px", textAlign: "center", whiteSpace: "nowrap", fontSize: 11, color: "#7c3aed" }}>
                {row.seaLevel != null ? `${fmt(row.seaLevel)}m` : "—"}
              </td>
            );
          case "temp":
            return (
              <td key="temp" style={{ padding: "4px 6px", textAlign: "center", whiteSpace: "nowrap", fontSize: 11, color: "#b45309" }}>
                {row.temp != null ? `${fmt(row.temp, 0)}°C` : "—"}
              </td>
            );
          case "rain":
            return (
              <td key="rain" style={{ padding: "4px 6px", textAlign: "center", whiteSpace: "nowrap", fontSize: 11, color: "#2563eb" }}>
                {row.rainProb != null ? `${row.rainProb}%` : "—"}
              </td>
            );
          default:
            return <td key={col.key} />;
        }
      })}
    </tr>
  );
}

export function PrintView({ data, vis, onClose }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  // Determine active columns
  const activeCols = COLS.filter(c => c.always || (c.visKey && vis[c.visKey]));

  // Limit to next 7 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + 7);
  const rows = data.merged.filter(r => new Date(r.time) <= cutoff);

  const generatedAt = new Date().toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" });

  useEffect(() => {
    // Trigger print after a short delay to allow render
    const t = setTimeout(() => {
      window.print();
    }, 300);
    return () => clearTimeout(t);
  }, []);

  // Listen for afterprint to close
  useEffect(() => {
    const handler = () => onClose();
    window.addEventListener("afterprint", handler);
    return () => window.removeEventListener("afterprint", handler);
  }, [onClose]);

  return (
    <>
      {/* Screen overlay — shown on screen, hidden during print */}
      <div className="print:hidden fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full text-center">
          <p className="text-2xl mb-2">🖨️</p>
          <h3 className="font-bold text-gray-900 text-lg mb-1">Print Forecast</h3>
          <p className="text-gray-600 text-sm mb-4">
            Printing <strong>{rows.length}</strong> hourly rows for the next 7 days.<br />
            Active columns: {activeCols.filter(c => !c.always).map(c => c.label).join(", ") || "Date/Hour, Fish%, SL20 only"}.
          </p>
          <p className="text-gray-500 text-xs mb-4">
            The print dialog should open automatically. White background — minimal ink.
          </p>
          <div className="flex gap-2">
            <button onClick={() => window.print()}
              className="flex-1 bg-orange-500 text-white font-bold py-2.5 rounded-lg hover:bg-orange-600 transition-colors">
              Print Now
            </button>
            <button onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 font-semibold py-2.5 rounded-lg hover:bg-gray-200 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Print content — hidden on screen, shown during print */}
      <div ref={printRef} className="print-only hidden print:block">
        {/* Print header */}
        <div style={{ borderBottom: "2px solid #374151", paddingBottom: 8, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 900, color: "#111", margin: 0, letterSpacing: 1 }}>
                BLOODY DAVE'S FISHING PLANNER
              </h1>
              <p style={{ fontSize: 11, color: "#374151", margin: "2px 0 0" }}>
                📍 {data.location.name} · {data.location.lat.toFixed(4)}, {data.location.lon.toFixed(4)} · 🌐 {data.timezone}
              </p>
            </div>
            <div style={{ textAlign: "right", fontSize: 10, color: "#6b7280" }}>
              <div>Generated: {generatedAt}</div>
              <div>Next 7 days · {rows.length} hourly rows</div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: 16, marginBottom: 8, fontSize: 9, color: "#374151", flexWrap: "wrap" }}>
          <span><strong style={{ color: "#16a34a" }}>Excellent</strong> = Wind≤8kt, Swell≤0.5m</span>
          <span><strong style={{ color: "#2563eb" }}>Go</strong> = Wind≤15kt, Swell≤1.0m</span>
          <span><strong style={{ color: "#d97706" }}>Marginal</strong> = Wind≤20kt, Swell≤1.5m</span>
          <span><strong style={{ color: "#dc2626" }}>Avoid</strong> = Exceeds above</span>
          <span><strong style={{ color: "#d97706" }}>⭐ Golden</strong> = SL20 Go+ & 4★+ fishing</span>
        </div>

        {/* Table */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr style={{ backgroundColor: "#f3f4f6", borderBottom: "2px solid #374151" }}>
              {activeCols.map(col => (
                <th key={col.key} style={{
                  padding: "5px 6px",
                  textAlign: col.key === "datetime" ? "left" : "center",
                  fontSize: 9,
                  fontWeight: 700,
                  color: "#374151",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  whiteSpace: "nowrap",
                  borderRight: "1px solid #e5e7eb",
                }}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <PrintRow key={row.time} row={row} cols={activeCols} />
            ))}
          </tbody>
        </table>

        {/* Footer */}
        <div style={{ marginTop: 10, borderTop: "1px solid #e5e7eb", paddingTop: 6, fontSize: 9, color: "#9ca3af", display: "flex", justifyContent: "space-between" }}>
          <span>Bloody Dave's Fishing Planner · Powered by Open-Meteo (open-meteo.com)</span>
          <span>Printed {generatedAt}</span>
        </div>
      </div>
    </>
  );
}
