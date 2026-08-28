/**
 * TableView — Hourly data table with frozen Date/Hour column.
 * Highlights golden rows (SL20 Go+ AND 4★+ fishing).
 */
import type { AppData, HourRow } from "@/lib/fishingEngine";
import { rateSL20, windColor, swellColor, degToCompass, fmt } from "@/lib/fishingEngine";

interface Props { data: AppData; }

function GoldenBadge() {
  return <span className="text-yellow-400 text-[9px] font-bold ml-1">⭐</span>;
}

function Row({ row }: { row: HourRow }) {
  const sl = rateSL20(row.windKt, row.swellH, row.swellP, row.waveH, row.windWaveH);
  const dt = new Date(row.time);
  const dayLabel = row.isDayStart
    ? dt.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })
    : "";

  return (
    <tr className={`border-b border-[var(--border)]/50 text-xs transition-colors
      ${row.golden ? "bg-yellow-400/8 hover:bg-yellow-400/15" : "hover:bg-[var(--surface-raised)]/30"}`}>
      {/* Frozen date/hour column */}
      <td className="sticky left-0 bg-[var(--surface)] px-2 py-1.5 whitespace-nowrap border-r border-[var(--border)] z-10 min-w-[90px]">
        {row.isDayStart && (
          <div className="text-[9px] text-[var(--action)] font-bold leading-tight">{dayLabel}</div>
        )}
        <div className="font-mono text-[var(--warm-text)]">{row.hourLabel}</div>
        {row.golden && <GoldenBadge />}
      </td>
      {/* Fish % */}
      <td className="px-2 py-1.5 text-center whitespace-nowrap">
        <span className="font-bold" style={{ color: "#f59e0b" }}>{row.fishScore}%</span>
        <span className="text-yellow-400 text-[10px] ml-1">{"★".repeat(row.fishStars)}</span>
      </td>
      {/* SL20 */}
      <td className="px-2 py-1.5 text-center whitespace-nowrap">
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: sl.bg, color: sl.fg }}>
          {sl.label}
        </span>
      </td>
      {/* Wind */}
      <td className="px-2 py-1.5 text-center whitespace-nowrap" style={{ color: windColor(row.windKt) }}>
        {row.windKt != null ? `${Math.round(row.windKt)}kt` : "—"}
      </td>
      <td className="px-2 py-1.5 text-center whitespace-nowrap text-[var(--text-muted)]">
        {degToCompass(row.windDir)}
      </td>
      <td className="px-2 py-1.5 text-center whitespace-nowrap" style={{ color: windColor(row.gustKt) }}>
        {row.gustKt != null ? `${Math.round(row.gustKt)}kt` : "—"}
      </td>
      {/* Swell */}
      <td className="px-2 py-1.5 text-center whitespace-nowrap" style={{ color: swellColor(row.swellH) }}>
        {row.swellH != null ? `${fmt(row.swellH)}m` : "—"}
      </td>
      <td className="px-2 py-1.5 text-center whitespace-nowrap text-[var(--text-muted)]">
        {row.swellP != null ? `${fmt(row.swellP, 0)}s` : "—"}
      </td>
      <td className="px-2 py-1.5 text-center whitespace-nowrap text-[var(--text-muted)]">
        {degToCompass(row.swellDir)}
      </td>
      {/* Wave */}
      <td className="px-2 py-1.5 text-center whitespace-nowrap" style={{ color: swellColor(row.waveH) }}>
        {row.waveH != null ? `${fmt(row.waveH)}m` : "—"}
      </td>
      {/* Tide */}
      <td className="px-2 py-1.5 text-center whitespace-nowrap text-[#a78bfa]">
        {row.seaLevel != null ? `${fmt(row.seaLevel)}m` : "—"}
      </td>
      {/* Temp */}
      <td className="px-2 py-1.5 text-center whitespace-nowrap text-[var(--warning)]">
        {row.temp != null ? `${fmt(row.temp, 0)}°` : "—"}
      </td>
      {/* Rain */}
      <td className="px-2 py-1.5 text-center whitespace-nowrap text-[#60a5fa]">
        {row.rainProb != null ? `${row.rainProb}%` : "—"}
      </td>
    </tr>
  );
}

export function TableView({ data }: Props) {
  return (
    <div className="overflow-y-auto h-full pb-8">
      <div className="px-3 py-2 text-xs text-[var(--text-muted)] flex flex-wrap gap-2 border-b border-[var(--border)]">
        <span>📍 {data.location.name}</span>
        <span>·</span>
        <span>🌐 {data.timezone}</span>
        <span className="ml-auto text-yellow-400">⭐ = Boating Go+ & 4★+ fishing</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse" style={{ minWidth: "700px" }}>
          <thead className="sticky top-0 z-20 bg-[var(--surface)]">
            <tr className="border-b-2 border-[var(--border)] text-[var(--text-muted)] text-[10px] uppercase tracking-wider">
              <th className="sticky left-0 bg-[var(--surface)] px-2 py-2 text-left border-r border-[var(--border)] z-30 min-w-[90px]">Date / Hour</th>
              <th className="px-2 py-2 text-center whitespace-nowrap">Fish %</th>
              <th className="px-2 py-2 text-center whitespace-nowrap">Boating</th>
              <th className="px-2 py-2 text-center whitespace-nowrap">Wind</th>
              <th className="px-2 py-2 text-center whitespace-nowrap">Dir</th>
              <th className="px-2 py-2 text-center whitespace-nowrap">Gust</th>
              <th className="px-2 py-2 text-center whitespace-nowrap">Swell</th>
              <th className="px-2 py-2 text-center whitespace-nowrap">Period</th>
              <th className="px-2 py-2 text-center whitespace-nowrap">Swell Dir</th>
              <th className="px-2 py-2 text-center whitespace-nowrap">Wave</th>
              <th className="px-2 py-2 text-center whitespace-nowrap">Tide</th>
              <th className="px-2 py-2 text-center whitespace-nowrap">Temp</th>
              <th className="px-2 py-2 text-center whitespace-nowrap">Rain%</th>
            </tr>
          </thead>
          <tbody>
            {data.merged.map(row => (
              <Row key={row.time} row={row} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
