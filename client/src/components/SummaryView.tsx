/**
 * SummaryView — Daily cards each with an hourly fishing % strip.
 */
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

function range(min: number | null | undefined, max: number | null | undefined, unit: string, decimals = 0) {
  if (min == null && max == null) return "—";
  const low = (min ?? max)!.toFixed(decimals);
  const high = (max ?? min)!.toFixed(decimals);
  return low === high ? `${high}${unit}` : `${low}–${high}${unit}`;
}

function HourCell({ row }: { row: HourRow }) {
  const sl = rateSL20(row.windKt, row.swellH, row.swellP, row.waveH, row.windWaveH, row.gustKt, row.thunderstorm);
  return (
    <div className={`flex flex-col items-center gap-0.5 rounded px-1 py-1 min-w-[44px] flex-shrink-0
      ${row.golden ? "ring-1 ring-yellow-400 bg-yellow-400/10" : "bg-[var(--surface)]"}`}>
      <span className="text-[9px] text-[var(--text-muted)] font-mono">{row.hourLabel}</span>
      <span className="text-[12px] font-bold" style={{ color: "#f59e0b" }}>{row.fishScore}/100</span>
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
  const dt = new Date(day.date + "T12:00:00");
  const dateLabel = dt.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "short" });
  const sl9 = rateSL20(day.morning?.windKt, day.morning?.swellH, day.morning?.swellP, day.morning?.waveH, day.morning?.windWaveH, day.morning?.gustKt, day.morning?.thunderstorm);

  return (
    <div className={`bg-[var(--surface)] border rounded-xl overflow-hidden transition-all duration-200
      ${day.isGolden ? "border-yellow-400/60 shadow-lg shadow-yellow-400/10" : "border-[var(--border)]"}`}>
      {/* Card header */}
      <div className="w-full text-left px-4 py-3 flex items-center gap-3 min-h-[60px]">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-[var(--text)] text-sm">{dateLabel}</span>
            {day.isGolden && <span className="text-yellow-400 text-xs font-bold">⭐ GOLDEN DAY</span>}
          </div>
          <div className="flex flex-wrap gap-2 mt-1 text-xs">
            <span className="text-[var(--text-muted)]">{day.moonEmoji} {day.moonName}</span>
            <span className="text-[var(--text-muted)]">🌅 {day.sunrise} 🌇 {day.sunset}</span>
            {day.maxWind != null && <span style={{ color: windColor(day.maxWind) }}>Wind {range(day.minWind, day.maxWind, "kt")}</span>}
            {day.maxSwell != null && <span style={{ color: swellColor(day.maxSwell) }}>Swell {range(day.minSwell, day.maxSwell, "m", 1)}</span>}
            {(day.minTemp != null || day.maxTemp != null) && <span>Temp {range(day.minTemp, day.maxTemp, "°C")}</span>}
            {day.maxRainChance != null && <span>Rain 0–{Math.round(day.maxRainChance)}% · {fmt(day.precipitationTotalMm, 1)}mm/day</span>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[var(--action)] font-bold text-sm" title="Heuristic planning index, not an observed bite probability">{day.peakFish}/100</span>
            <StarRow stars={day.bestFishStars} />
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ backgroundColor: sl9.bg, color: sl9.fg }}>
            {sl9.label}
          </span>
          <span className="text-[var(--text-muted)] text-[10px]">24-hour detail</span>
        </div>
      </div>

      {/* Tide extremes */}
      {day.tideExtremes.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 pb-2 text-xs">
          {day.tideExtremes.map((t, i) => (
            <span key={i} className={`font-semibold ${t.type === "High" ? "text-[var(--success)]" : "text-[var(--action)]"}`}>
              {t.type === "High" ? "▲" : "▼"} Model {t.type.toLowerCase()} {fmt(t.height)}m MSL @ {t.time.slice(11, 16)}
            </span>
          ))}
        </div>
      )}

      {/* Full local-day hourly strip, horizontally scrollable on phones. */}
      <div className="overflow-x-auto px-3 pb-3 scrollbar-hide">
        <div className="flex gap-1 min-w-max">
          {day.rows.map(row => (
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
      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-1">
        <span>📍 {data.location.name}</span>
        <span>·</span>
        <span>🌐 {data.timezone}</span>
        <span className="ml-auto text-yellow-400">⭐ = Boating Go+ & 4★+ fishing</span>
      </div>
      {data.daily.map(day => (
        <DayCard key={day.date} day={day} />
      ))}
    </div>
  );
}
