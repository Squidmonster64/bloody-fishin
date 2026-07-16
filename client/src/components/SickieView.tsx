/**
 * SickieView — Sickie Forecast tab with configurable vessel criteria.
 * Windows require >= minWindowHours consecutive hours meeting all thresholds.
 * Each window shows daylight/night flag and full hourly breakdown.
 */
import { useState, useMemo } from "react";
import type { AppData, HourRow } from "@/lib/fishingEngine";
import { rateSL20, fmt, windColor, swellColor } from "@/lib/fishingEngine";
import {
  meetsCriteria, isDaylight,
  VESSEL_PRESETS, DEFAULT_CRITERIA,
  type SickieCriteria, type VesselPreset,
} from "@/lib/sickieCriteria";

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
  hasDaylight: boolean;
  allNight: boolean;
}

function buildWindows(data: AppData, criteria: SickieCriteria): SickieWindow[] {
  // Build daylight lookup by date
  const daylightByDate: Record<string, { sunrise: string; sunset: string }> = {};
  data.daily.forEach(d => { daylightByDate[d.date] = { sunrise: d.sunrise, sunset: d.sunset }; });

  const windows: SickieWindow[] = [];
  let current: HourRow[] = [];

  for (const row of data.merged) {
    if (meetsCriteria(row, criteria)) {
      current.push(row);
    } else {
      if (current.length >= criteria.minWindowHours) flush(current, windows, daylightByDate);
      current = [];
    }
  }
  if (current.length >= criteria.minWindowHours) flush(current, windows, daylightByDate);
  return windows;
}

function flush(
  hours: HourRow[],
  windows: SickieWindow[],
  daylightByDate: Record<string, { sunrise: string; sunset: string }>
) {
  const first = hours[0];
  const last = hours[hours.length - 1];
  const dt = new Date(first.dateStr + "T12:00:00");
  const dateLabel = dt.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "short" });
  const peakFish = Math.max(...hours.map(h => h.fishScore));
  const peakStars = Math.max(...hours.map(h => h.fishStars));
  const winds = hours.map(h => h.windKt).filter((v): v is number => v != null);
  const swells = hours.map(h => h.swellH).filter((v): v is number => v != null);
  const sl = rateSL20(first.windKt, first.swellH, first.swellP, first.waveH);

  const dl = daylightByDate[first.dateStr];
  const daylightHours = dl
    ? hours.filter(h => isDaylight(h.hour, dl.sunrise, dl.sunset))
    : hours;
  const hasDaylight = daylightHours.length > 0;
  const allNight = daylightHours.length === 0;

  windows.push({
    date: first.dateStr, dateLabel,
    startHour: first.hourLabel,
    endHour: last.hourLabel,
    hours, peakFish, peakStars,
    minWind: winds.length ? Math.min(...winds) : null,
    maxSwell: swells.length ? Math.max(...swells) : null,
    slLabel: sl.label, slBg: sl.bg, slFg: sl.fg,
    hasDaylight, allNight,
  });
}

// ─── Criteria Config Panel ────────────────────────────────────────────────────

function CriteriaPanel({
  criteria,
  preset,
  onPresetChange,
  onCriteriaChange,
}: {
  criteria: SickieCriteria;
  preset: VesselPreset;
  onPresetChange: (p: VesselPreset) => void;
  onCriteriaChange: (c: SickieCriteria) => void;
}) {
  const [open, setOpen] = useState(false);

  function set<K extends keyof SickieCriteria>(key: K, val: SickieCriteria[K]) {
    onCriteriaChange({ ...criteria, [key]: val });
  }

  return (
    <div className="bg-[#0d1f3c] border border-[#1e3a5f] rounded-xl overflow-hidden">
      {/* Toggle header */}
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#1e3a5f]/30 transition-colors min-h-[52px]"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">{VESSEL_PRESETS[preset].emoji}</span>
          <div className="text-left">
            <p className="text-white font-bold text-sm">{VESSEL_PRESETS[preset].label}</p>
            <p className="text-[#7a9bb5] text-[10px]">{VESSEL_PRESETS[preset].description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#7a9bb5]">Wind ≤{criteria.maxWindKt}kt · Swell ≤{criteria.maxSwellH ?? "any"}m · {criteria.minWindowHours}hr min</span>
          <span className="text-[#7a9bb5] text-xs">{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-[#1e3a5f] space-y-4">
          {/* Vessel preset buttons */}
          <div>
            <p className="text-[10px] text-[#7a9bb5] uppercase tracking-wider mt-3 mb-2">Vessel Type</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(VESSEL_PRESETS) as VesselPreset[]).map(p => (
                <button key={p} onClick={() => onPresetChange(p)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold border transition-all min-h-[36px]
                    ${preset === p ? "bg-[#ff6b35] border-[#ff6b35] text-white" : "bg-[#0a1628] border-[#1e3a5f] text-[#7a9bb5] hover:border-[#ff6b35] hover:text-white"}`}>
                  {VESSEL_PRESETS[p].emoji} {VESSEL_PRESETS[p].label}
                </button>
              ))}
            </div>
          </div>

          {/* Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SliderField
              label="Max Wind Speed"
              value={criteria.maxWindKt}
              min={5} max={35} step={1}
              unit="kt"
              color="#7eb8f7"
              onChange={v => set("maxWindKt", v)}
            />
            <SliderField
              label="Max Swell Height"
              value={criteria.maxSwellH ?? 3}
              min={0.2} max={3} step={0.1}
              unit="m"
              color="#3ecf8e"
              onChange={v => set("maxSwellH", v)}
            />
            <div>
              <p className="text-[10px] text-[#7a9bb5] uppercase tracking-wider mb-1">Min Fishing Stars</p>
              <div className="flex gap-1">
                {([1,2,3,4,5] as const).map(s => (
                  <button key={s} onClick={() => set("minFishStars", s as SickieCriteria["minFishStars"])}
                    className={`flex-1 py-1.5 rounded text-sm font-bold border transition-all min-h-[36px]
                      ${criteria.minFishStars === s ? "bg-yellow-400 border-yellow-400 text-[#0a1628]" : "bg-[#0a1628] border-[#1e3a5f] text-[#7a9bb5] hover:border-yellow-400"}`}>
                    {"★".repeat(s)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-[#7a9bb5] uppercase tracking-wider mb-1">Min SL20 Rating</p>
              <div className="flex gap-1">
                {([
                  { rank: 1 as const, label: "Marginal", color: "#f5a623" },
                  { rank: 2 as const, label: "Go", color: "#3ecf8e" },
                  { rank: 3 as const, label: "Excellent", color: "#3ecf8e" },
                ]).map(({ rank, label, color }) => (
                  <button key={rank} onClick={() => set("minSL20Rank", rank)}
                    className={`flex-1 py-1.5 rounded text-[10px] font-bold border transition-all min-h-[36px]
                      ${criteria.minSL20Rank === rank ? "text-[#0a1628]" : "bg-[#0a1628] border-[#1e3a5f] text-[#7a9bb5] hover:border-white"}`}
                    style={criteria.minSL20Rank === rank ? { backgroundColor: color, borderColor: color } : {}}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <SliderField
              label="Min Window Length"
              value={criteria.minWindowHours}
              min={1} max={8} step={1}
              unit="hrs"
              color="#a78bfa"
              onChange={v => set("minWindowHours", v)}
            />
          </div>

          {/* Algorithm explanation */}
          <details className="mt-2">
            <summary className="text-[10px] text-[#7a9bb5] cursor-pointer hover:text-white transition-colors">
              📖 How the algorithm works
            </summary>
            <div className="mt-2 text-[10px] text-[#7a9bb5] space-y-1 leading-relaxed bg-[#0a1628] rounded p-3 border border-[#1e3a5f]">
              <p><strong className="text-white">SL20 Rank</strong> — Effective swell = max(wave_height, swell_height − period_bonus). Period bonus: +0.25m for ≥14s, +0.10m for ≥11s, −0.20m for ≤7s. Ranks: Excellent (wind≤8kt, eff≤0.5m), Go (≤15kt, ≤1.0m), Marginal (≤20kt, ≤1.5m), Avoid (else).</p>
              <p><strong className="text-white">Fishing Score (0–100%)</strong> — Base 35pts. Moon phase: new/full +20, near +13, quarter +5. Moon transit/underfoot within 30min +22, 1hr +17, 1.5hr +10, 2hr +5. Sunrise/sunset within 30min +15, 1hr +10, 1.5hr +4. Tide rate: fast +12, moderate +10, slow +5, slack −4. Wind: calm−moderate +4, strong −6 to −30. Rain &gt;70% −8.</p>
              <p><strong className="text-white">Window</strong> — Consecutive hours where ALL criteria are met. Windows shorter than "Min Window Length" are discarded.</p>
              <p><strong className="text-white">Daylight flag</strong> — Hours between sunrise and sunset for that day.</p>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

function SliderField({ label, value, min, max, step, unit, color, onChange }: {
  label: string; value: number; min: number; max: number; step: number;
  unit: string; color: string; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <p className="text-[10px] text-[#7a9bb5] uppercase tracking-wider">{label}</p>
        <span className="text-sm font-bold" style={{ color }}>{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer"
        style={{ accentColor: color }}
      />
      <div className="flex justify-between text-[9px] text-[#3a5a7a] mt-0.5">
        <span>{min}{unit}</span><span>{max}{unit}</span>
      </div>
    </div>
  );
}

// ─── Window Card ─────────────────────────────────────────────────────────────

function WindowCard({ win, idx }: { win: SickieWindow; idx: number }) {
  const isNext = idx === 0;
  return (
    <div className={`rounded-xl border overflow-hidden
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
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-bold text-sm">{win.dateLabel}</span>
            {win.allNight && <span className="text-[#7a9bb5] text-[10px] bg-[#0a1628] px-1.5 py-0.5 rounded">🌙 Night only</span>}
            {win.hasDaylight && !win.allNight && <span className="text-yellow-300 text-[10px] bg-[#0a1628] px-1.5 py-0.5 rounded">☀️ Includes daylight</span>}
          </div>
          <div className="text-[#7a9bb5] text-xs mt-0.5">
            {win.startHour} – {win.endHour}
            <span className="ml-2">({win.hours.length} hr{win.hours.length > 1 ? "s" : ""})</span>
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

      {/* Conditions */}
      <div className="px-4 py-2 bg-[#0a1628] flex flex-wrap gap-3 text-xs border-t border-[#1e3a5f]">
        {win.minWind != null && <span style={{ color: windColor(win.minWind) }}>💨 Wind {Math.round(win.minWind)}kt</span>}
        {win.maxSwell != null && <span style={{ color: swellColor(win.maxSwell) }}>🌊 Swell {fmt(win.maxSwell)}m</span>}
        {win.hours[0].seaLevel != null && <span className="text-[#a78bfa]">Tide {fmt(win.hours[0].seaLevel)}m</span>}
      </div>

      {/* Hourly strip */}
      <div className="overflow-x-auto px-3 py-2 bg-[#0d1f3c] scrollbar-hide">
        <div className="flex gap-1 min-w-max">
          {win.hours.map(row => {
            const sl = rateSL20(row.windKt, row.swellH, row.swellP, row.waveH);
            return (
              <div key={row.time}
                className="flex flex-col items-center gap-0.5 bg-yellow-400/10 ring-1 ring-yellow-400/40 rounded px-1.5 py-1 min-w-[44px]">
                <span className="text-[9px] text-[#7a9bb5] font-mono">{row.hourLabel}</span>
                <span className="text-[11px] font-bold" style={{ color: "#ff6b35" }}>{row.fishScore}%</span>
                <span className="text-yellow-400 text-[9px]">{"★".repeat(row.fishStars)}</span>
                <span className="text-[9px] font-bold px-1 rounded" style={{ backgroundColor: sl.bg, color: sl.fg }}>
                  {sl.label === "Excellent" ? "EXC" : sl.label === "Marginal" ? "MAR" : sl.label}
                </span>
                {row.windKt != null && (
                  <span className="text-[9px]" style={{ color: windColor(row.windKt) }}>{Math.round(row.windKt)}kt</span>
                )}
                {row.swellH != null && (
                  <span className="text-[9px]" style={{ color: swellColor(row.swellH) }}>{fmt(row.swellH)}m</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Main Export ─────────────────────────────────────────────────────────────

export function SickieView({ data }: Props) {
  const [preset, setPreset] = useState<VesselPreset>("sl20");
  const [criteria, setCriteria] = useState<SickieCriteria>(DEFAULT_CRITERIA);

  function handlePresetChange(p: VesselPreset) {
    setPreset(p);
    if (p !== "custom") setCriteria(VESSEL_PRESETS[p].criteria);
  }

  function handleCriteriaChange(c: SickieCriteria) {
    setCriteria(c);
    setPreset("custom");
  }

  const windows = useMemo(() => buildWindows(data, criteria), [data, criteria]);

  return (
    <div className="overflow-y-auto p-3 flex flex-col gap-3 pb-8">
      {/* Header */}
      <div className="bg-[#0d1f3c] border border-[#1e3a5f] rounded-xl p-4">
        <h2 className="text-[#ff6b35] font-black text-lg" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
          🎣 Sickie Forecast
        </h2>
        <p className="text-[#7a9bb5] text-xs mt-1">
          Upcoming windows where boating and fishing conditions both meet your vessel's thresholds.
          Windows shorter than the minimum are discarded.
        </p>
        <div className="flex flex-wrap gap-2 mt-2 text-xs">
          <span className="text-[#7a9bb5]">📍 {data.location.name}</span>
          <span className="text-[#7a9bb5]">·</span>
          <span className="text-[#7a9bb5]">🌐 {data.timezone}</span>
        </div>
      </div>

      {/* Criteria config */}
      <CriteriaPanel
        criteria={criteria}
        preset={preset}
        onPresetChange={handlePresetChange}
        onCriteriaChange={handleCriteriaChange}
      />

      {/* Results */}
      {windows.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
          <p className="text-4xl">😢</p>
          <p className="text-[#7a9bb5] text-sm">No qualifying windows in the forecast period.</p>
          <p className="text-[#7a9bb5] text-xs">Try relaxing the criteria above, extending the forecast range, or checking another location.</p>
        </div>
      ) : (
        <>
          <div className="text-xs text-[#7a9bb5] px-1">
            Found <strong className="text-yellow-400">{windows.length}</strong> window{windows.length > 1 ? "s" : ""} ≥ {criteria.minWindowHours}hr in the next {data.daily.length} days
          </div>
          {windows.map((win, i) => (
            <WindowCard key={`${win.date}-${win.startHour}`} win={win} idx={i} />
          ))}
        </>
      )}
    </div>
  );
}
