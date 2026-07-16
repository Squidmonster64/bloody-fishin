/**
 * SummaryView — Daily cards each with an hourly fishing % strip.
 */
import { useState } from "react";
import type { AppData, DayData, HourRow } from "@/lib/fishingEngine";
import { rateSL20, windColor, swellColor, degToCompass, fmt } from "@/lib/fishingEngine";

interface Props { data: AppData; }

function StarRow({ stars }: { stars: number }) {
  return (
    <span className="text-yellow-400 text-[11px]">
      {"★".repeat(stars)}{"☆".repeat(5 - stars)}
    </span>
  );
}

function HourCell({ row }: { row: HourRow }) {
  const sl = rateSL20(row.windKt, row.swellH, row.swellP, row.waveH);
  return (
    <div className={`flex flex-col items-center gap-0.5 rounded px-1 py-1 min-w-[44px] flex-shrink-0
      ${row.golden ? "ring-1 ring-yellow-400 bg-yellow-400/10" : "bg-[#0d1f3c]"}`}>
      <span className="text-[9px] text-[#7a9bb5] font-mono">{row.hourLabel}</span>
      <span className="text-[12px] font-bold" style={{ color: "#ff6b35" }}>{row.fishScore}%</span>
      <StarRow stars={row.fishStars} />
      <span className="text-[9px] font-bold px-1 rounded" style={{ backgroundColor: sl.bg, color: sl.fg }}>
        {sl.label === "Excellent" ? "EXC" : sl.label === "Marginal" ? "MAR" : sl.label}
      </span>
      {row.windKt != null && (
        <span className="text-[9px]" style={{ color: windColor(row.windKt) }}>{Math.round(row.windKt)}kt {degToCompass(row.windDir)}</span>
      )}
      {row.swellH != null && (
        <span className="text-[9px]" style={{ color: swellColor(row.swellH) }}>{fmt(row.swellH)}m</span>
      )}
    </div>
  );
}

function DayCard({ day }: { day: DayData }) {
  const [expanded, setExpanded] = useState(false);
  const dt = new Date(day.date + "T12:00:00");
  const dateLabel = dt.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "short" });
  const sl9 = rateSL20(day.morning?.windKt, day.morning?.swellH, day.morning?.swellP, day.morning?.waveH);

  return (
    <div className={`bg-[#0d1f3c] border rounded-xl overflow-hidden transition-all duration-200
      ${day.isGolden ? "border-yellow-400/60 shadow-lg shadow-yellow-400/10" : "border-[#1e3a5f]"}`}>
      {/* Card header */}
      <button className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-[#1e3a5f]/30 transition-colors min-h-[60px]"
        onClick={() => setExpanded(e => !e)}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-white text-sm">{dateLabel}</span>
            {day.isGolden && <span className="text-yellow-400 text-xs font-bold">⭐ GOLDEN DAY</span>}
          </div>
          <div className="flex flex-wrap gap-2 mt-1 text-xs">
            <span className="text-[#7a9bb5]">{day.moonEmoji} {day.moonName}</span>
            <span className="text-[#7a9bb5]">🌅 {day.sunrise} 🌇 {day.sunset}</span>
            {day.maxWind != null && <span style={{ color: windColor(day.maxWind) }}>💨 {Math.round(day.maxWind)}kt max</span>}
            {day.maxSwell != null && <span style={{ color: swellColor(day.maxSwell) }}>🌊 {fmt(day.maxSwell)}m max</span>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[#ff6b35] font-bold text-sm">{day.peakFish}%</span>
            <StarRow stars={day.bestFishStars} />
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ backgroundColor: sl9.bg, color: sl9.fg }}>
            {sl9.label}
          </span>
          <span className="text-[#7a9bb5] text-[10px]">{expanded ? "▲ less" : "▼ hourly"}</span>
        </div>
      </button>

      {/* Tide extremes */}
      {day.tideExtremes.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 pb-2 text-xs">
          {day.tideExtremes.map((t, i) => (
            <span key={i} className={`font-semibold ${t.type === "High" ? "text-[#3ecf8e]" : "text-[#7eb8f7]"}`}>
              {t.type === "High" ? "▲" : "▼"} {t.type} {fmt(t.height)}m @ {t.time.slice(11, 16)}
            </span>
          ))}
        </div>
      )}

      {/* Hourly strip — always show top 6 golden hours, expand for all */}
      <div className="overflow-x-auto px-3 pb-3 scrollbar-hide">
        <div className="flex gap-1 min-w-max">
          {(expanded ? day.rows : day.rows).map(row => (
            <HourCell key={row.time} row={row} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function SummaryView({ data }: Props) {
  return (
    <div className="overflow-y-auto p-3 flex flex-col gap-3 pb-8">
      <div className="flex items-center gap-2 text-xs text-[#7a9bb5] mb-1">
        <span>📍 {data.location.name}</span>
        <span>·</span>
        <span>🌐 {data.timezone}</span>
        <span className="ml-auto text-yellow-400">⭐ = SL20 Go+ & 4★+ fishing</span>
      </div>
      {data.daily.map(day => (
        <DayCard key={day.date} day={day} />
      ))}
    </div>
  );
}
