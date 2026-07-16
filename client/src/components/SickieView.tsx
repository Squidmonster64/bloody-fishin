/**
 * SickieView — "Sickie Forecast" tab.
 * Shows all upcoming windows where SL20 ≥ Go AND fishing ≥ 4★.
 * Groups consecutive golden hours into windows.
 */
import type { AppData, HourRow } from "@/lib/fishingEngine";
import { rateSL20, fmt, windColor, swellColor, degToCompass } from "@/lib/fishingEngine";

interface Props { data: AppData; }

interface SickieWindow {
  date: string;
  dateLabel: string;
  startHour: string;
  endHour: string;
  hours: HourRow[];
  peakFish: number;
  peakStars: number;
  minWind: number | null;
  maxSwell: number | null;
  slLabel: string;
  slBg: string;
  slFg: string;
}

function buildWindows(data: AppData): SickieWindow[] {
  const windows: SickieWindow[] = [];
  let current: HourRow[] = [];

  for (const row of data.merged) {
    if (row.golden) {
      current.push(row);
    } else {
      if (current.length > 0) {
        flush(current, windows, data);
        current = [];
      }
    }
  }
  if (current.length > 0) flush(current, windows, data);
  return windows;
}

function flush(hours: HourRow[], windows: SickieWindow[], data: AppData) {
  const first = hours[0];
  const last = hours[hours.length - 1];
  const dt = new Date(first.dateStr + "T12:00:00");
  const dateLabel = dt.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "short" });
  const peakFish = Math.max(...hours.map(h => h.fishScore));
  const peakStars = Math.max(...hours.map(h => h.fishStars));
  const winds = hours.map(h => h.windKt).filter((v): v is number => v != null);
  const swells = hours.map(h => h.swellH).filter((v): v is number => v != null);
  const sl = rateSL20(first.windKt, first.swellH, first.swellP, first.waveH);
  windows.push({
    date: first.dateStr, dateLabel,
    startHour: first.hourLabel,
    endHour: last.hourLabel,
    hours,
    peakFish, peakStars,
    minWind: winds.length ? Math.min(...winds) : null,
    maxSwell: swells.length ? Math.max(...swells) : null,
    slLabel: sl.label, slBg: sl.bg, slFg: sl.fg,
  });
}

function WindowCard({ win, idx }: { win: SickieWindow; idx: number }) {
  const isNext = idx === 0;
  return (
    <div className={`rounded-xl border overflow-hidden transition-all
      ${isNext ? "border-yellow-400 shadow-lg shadow-yellow-400/20" : "border-[#1e3a5f]"}`}>
      {/* Header */}
      <div className={`px-4 py-3 flex items-center justify-between gap-2 flex-wrap
        ${isNext ? "bg-yellow-400/15" : "bg-[#0d1f3c]"}`}>
        <div>
          {isNext && (
            <div className="text-yellow-400 text-xs font-bold uppercase tracking-wider mb-0.5">
              🎣 NEXT SICKIE WINDOW
            </div>
          )}
          <div className="text-white font-bold text-sm">{win.dateLabel}</div>
          <div className="text-[#7a9bb5] text-xs mt-0.5">
            {win.startHour} – {win.endHour}
            <span className="ml-2 text-[#7a9bb5]">({win.hours.length} hr{win.hours.length > 1 ? "s" : ""})</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[#ff6b35] font-bold text-lg">{win.peakFish}%</span>
            <span className="text-yellow-400 text-sm">{"★".repeat(win.peakStars)}</span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ backgroundColor: win.slBg, color: win.slFg }}>
            {win.slLabel}
          </span>
        </div>
      </div>

      {/* Conditions summary */}
      <div className="px-4 py-2 bg-[#0a1628] flex flex-wrap gap-3 text-xs border-t border-[#1e3a5f]">
        {win.minWind != null && (
          <span style={{ color: windColor(win.minWind) }}>💨 Wind {Math.round(win.minWind)}kt</span>
        )}
        {win.maxSwell != null && (
          <span style={{ color: swellColor(win.maxSwell) }}>🌊 Swell {fmt(win.maxSwell)}m</span>
        )}
        {win.hours[0].swellDir != null && (
          <span className="text-[#7a9bb5]">Swell from {degToCompass(win.hours[0].swellDir)}</span>
        )}
        {win.hours[0].seaLevel != null && (
          <span className="text-[#a78bfa]">🌊 Tide {fmt(win.hours[0].seaLevel)}m</span>
        )}
      </div>

      {/* Hourly strip */}
      <div className="overflow-x-auto px-3 py-2 bg-[#0d1f3c] scrollbar-hide">
        <div className="flex gap-1 min-w-max">
          {win.hours.map(row => {
            const sl = rateSL20(row.windKt, row.swellH, row.swellP, row.waveH);
            return (
              <div key={row.time} className="flex flex-col items-center gap-0.5 bg-yellow-400/10 ring-1 ring-yellow-400/40 rounded px-1.5 py-1 min-w-[44px]">
                <span className="text-[9px] text-[#7a9bb5] font-mono">{row.hourLabel}</span>
                <span className="text-[11px] font-bold" style={{ color: "#ff6b35" }}>{row.fishScore}%</span>
                <span className="text-yellow-400 text-[9px]">{"★".repeat(row.fishStars)}</span>
                <span className="text-[9px] font-bold px-1 rounded" style={{ backgroundColor: sl.bg, color: sl.fg }}>
                  {sl.label === "Excellent" ? "EXC" : sl.label === "Marginal" ? "MAR" : sl.label}
                </span>
                {row.windKt != null && (
                  <span className="text-[9px]" style={{ color: windColor(row.windKt) }}>{Math.round(row.windKt)}kt</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function SickieView({ data }: Props) {
  const windows = buildWindows(data);

  return (
    <div className="overflow-y-auto p-3 flex flex-col gap-3 pb-8">
      {/* Header */}
      <div className="bg-[#0d1f3c] border border-[#1e3a5f] rounded-xl p-4">
        <h2 className="text-[#ff6b35] font-black text-lg" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
          🎣 Sickie Forecast
        </h2>
        <p className="text-[#7a9bb5] text-xs mt-1">
          All upcoming windows where boating is <strong className="text-[#3ecf8e]">SL20 Go or better</strong> AND
          fishing is <strong className="text-yellow-400">4★ or higher</strong> — perfect excuse to chuck a sickie.
        </p>
        <div className="flex flex-wrap gap-2 mt-2 text-xs">
          <span className="text-[#7a9bb5]">📍 {data.location.name}</span>
          <span className="text-[#7a9bb5]">·</span>
          <span className="text-[#7a9bb5]">🌐 {data.timezone}</span>
        </div>
      </div>

      {windows.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
          <p className="text-4xl">😢</p>
          <p className="text-[#7a9bb5] text-sm">No golden windows in the forecast period.</p>
          <p className="text-[#7a9bb5] text-xs">Try extending the forecast range or check another location.</p>
        </div>
      ) : (
        <>
          <div className="text-xs text-[#7a9bb5] px-1">
            Found <strong className="text-yellow-400">{windows.length}</strong> sickie window{windows.length > 1 ? "s" : ""} in the next {data.daily.length} days
          </div>
          {windows.map((win, i) => (
            <WindowCard key={`${win.date}-${win.startHour}`} win={win} idx={i} />
          ))}
        </>
      )}
    </div>
  );
}
