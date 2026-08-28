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
import { useVesselProfiles, type VesselProfile } from "@/hooks/useVesselProfiles";
import { downloadSickieCalendarEvent } from "@/lib/calendar";

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
    const daylight = daylightByDate[row.dateStr];
    const daylightPasses = !criteria.daylightOnly || !daylight || isDaylight(row.hour, daylight.sunrise, daylight.sunset);
    if (meetsCriteria(row, criteria) && daylightPasses) {
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
  const sl = rateSL20(first.windKt, first.swellH, first.swellP, first.waveH, first.windWaveH);

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
  profiles,
  activeProfileId,
  onPresetChange,
  onProfileChange,
  onCriteriaChange,
  onSaveProfile,
  onDeleteProfile,
}: {
  criteria: SickieCriteria;
  preset: VesselPreset;
  profiles: VesselProfile[];
  activeProfileId: string | null;
  onPresetChange: (p: VesselPreset) => void;
  onProfileChange: (profile: VesselProfile) => void;
  onCriteriaChange: (c: SickieCriteria) => void;
  onSaveProfile: (name: string, emoji: string, notes: string) => void;
  onDeleteProfile: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileEmoji, setProfileEmoji] = useState("🚤");
  const [profileNotes, setProfileNotes] = useState("");

  function set<K extends keyof SickieCriteria>(key: K, val: SickieCriteria[K]) {
    onCriteriaChange({ ...criteria, [key]: val });
  }

  function saveProfile() {
    const name = profileName.trim();
    if (!name) return;
    onSaveProfile(name, profileEmoji || "🚤", profileNotes.trim());
    setProfileName("");
    setProfileEmoji("🚤");
    setProfileNotes("");
    setShowSave(false);
  }

  const activeProfile = activeProfileId ? profiles.find(profile => profile.id === activeProfileId) : undefined;
  const activeLabel = activeProfile?.name ?? VESSEL_PRESETS[preset].label;
  const activeEmoji = activeProfile?.emoji ?? VESSEL_PRESETS[preset].emoji;
  const activeDescription = activeProfile?.notes || (activeProfile ? "Saved vessel profile — changes are saved automatically" : VESSEL_PRESETS[preset].description);
  const criteriaSummary = [
    `Wind ≤${criteria.maxWindKt}kt`,
    criteria.maxGustKt != null ? `gust ≤${criteria.maxGustKt}kt` : null,
    criteria.maxWindWaveH != null ? `chop ≤${criteria.maxWindWaveH}m` : null,
    criteria.maxSwellH != null ? `swell ≤${criteria.maxSwellH}m` : "swell: model",
    criteria.maxRainProb != null ? `rain ≤${criteria.maxRainProb}%` : null,
    `${criteria.minFishStars}★+ fish`,
    criteria.daylightOnly ? "daylight" : null,
    `${criteria.minWindowHours}hr min`,
  ].filter(Boolean).join(" · ");

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
      {/* Toggle header */}
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--surface-raised)]/30 transition-colors min-h-[52px]"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">{activeEmoji}</span>
          <div className="text-left">
            <p className="text-[var(--text)] font-bold text-sm">{activeLabel}</p>
            <p className="text-[var(--text-muted)] text-[10px]">{activeDescription}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[var(--text-muted)]">{criteriaSummary}</span>
          <span className="text-[var(--text-muted)] text-xs">{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-[var(--border)] space-y-4">
          {/* Vessel preset buttons */}
          <div>
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mt-3 mb-2">Vessel Type</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(VESSEL_PRESETS) as VesselPreset[]).map(p => (
                <button key={p} onClick={() => onPresetChange(p)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold border transition-all min-h-[36px]
                    ${preset === p ? "bg-[var(--action)] border-[var(--action)] text-white" : "bg-[var(--app-bg)] border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--action)] hover:text-[var(--text)]"}`}>
                  {VESSEL_PRESETS[p].emoji} {VESSEL_PRESETS[p].label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-[var(--border)] pt-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div>
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">My Vessel Profiles</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Your saved profiles stay on this device. Edits to an active profile save automatically.</p>
              </div>
              <button onClick={() => setShowSave(v => !v)} className="min-h-[36px] flex-shrink-0 rounded border border-[var(--action)] px-2.5 text-xs font-bold text-[var(--action)] hover:bg-[var(--action)] hover:text-white">+ Save current</button>
            </div>
            {profiles.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {profiles.map(profile => (
                  <div key={profile.id} className={`flex items-center overflow-hidden rounded border ${activeProfileId === profile.id ? "border-[var(--action)] bg-[var(--action)]/15" : "border-[var(--border)] bg-[var(--app-bg)]"}`}>
                    <button onClick={() => onProfileChange(profile)} className="min-h-[38px] px-3 text-xs font-semibold text-[var(--text)]">{profile.emoji} {profile.name}</button>
                    <button onClick={() => onDeleteProfile(profile.id)} className="min-h-[38px] px-2 text-sm text-[var(--text-muted)] hover:text-red-400" title={`Delete ${profile.name}`} aria-label={`Delete ${profile.name}`}>×</button>
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-[var(--text-muted)]">Set your comfort limits, then save a named profile for each vessel.</p>}
            {showSave && (
              <div className="grid grid-cols-1 sm:grid-cols-[68px_1fr] gap-2 mt-3 rounded-lg border border-[var(--border)] bg-[var(--app-bg)] p-3">
                <input value={profileEmoji} onChange={e => setProfileEmoji(e.target.value)} maxLength={4} aria-label="Vessel emoji" className="min-h-[44px] rounded border border-[var(--border)] bg-[var(--surface)] px-3 text-lg text-[var(--text)]" />
                <input value={profileName} onChange={e => setProfileName(e.target.value)} placeholder="Vessel name, e.g. Dave's 5.5m centre console" className="min-h-[44px] rounded border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)]" />
                <input value={profileNotes} onChange={e => setProfileNotes(e.target.value)} placeholder="Optional notes: hull, crew or comfort limits" className="min-h-[44px] rounded border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] sm:col-span-2" />
                <div className="flex gap-2 sm:col-span-2"><button onClick={saveProfile} className="min-h-[42px] rounded bg-[var(--action)] px-4 text-sm font-bold text-white">Save vessel</button><button onClick={() => setShowSave(false)} className="min-h-[42px] rounded border border-[var(--border)] px-4 text-sm font-semibold text-[var(--text-muted)]">Cancel</button></div>
              </div>
            )}
          </div>

          {/* Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SliderField
              label="Max Wind Speed"
              value={criteria.maxWindKt}
              min={5} max={35} step={1}
              unit="kt"
              color="#3b82f6"
              onChange={v => set("maxWindKt", v)}
            />
            <OptionalSlider label="Max Wind Gust" value={criteria.maxGustKt} min={8} max={45} step={1} unit="kt" color="#60a5fa" onChange={v => set("maxGustKt", v)} />
            <OptionalSlider label="Max Groundswell" value={criteria.maxSwellH} min={0.2} max={3} step={0.1} unit="m" color="#10b981" onChange={v => set("maxSwellH", v)} />
            <OptionalSlider label="Max Wind Chop" value={criteria.maxWindWaveH} min={0.1} max={1.8} step={0.1} unit="m" color="#38bdf8" onChange={v => set("maxWindWaveH", v)} />
            <OptionalSlider label="Max Rain Chance" value={criteria.maxRainProb} min={0} max={100} step={5} unit="%" color="#60a5fa" onChange={v => set("maxRainProb", v)} />
            <div>
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Min Fishing Stars</p>
              <div className="flex gap-1">
                {([1,2,3,4,5] as const).map(s => (
                  <button key={s} onClick={() => set("minFishStars", s as SickieCriteria["minFishStars"])}
                    className={`flex-1 py-1.5 rounded text-sm font-bold border transition-all min-h-[36px]
                      ${criteria.minFishStars === s ? "bg-yellow-400 border-yellow-400 text-[var(--app-bg)]" : "bg-[var(--app-bg)] border-[var(--border)] text-[var(--text-muted)] hover:border-yellow-400"}`}>
                    {"★".repeat(s)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Min Boating Rating</p>
              <div className="flex gap-1">
                {([
                  { rank: 1 as const, label: "Marginal", color: "#f5a623" },
                  { rank: 2 as const, label: "Go", color: "#10b981" },
                  { rank: 3 as const, label: "Excellent", color: "#10b981" },
                ]).map(({ rank, label, color }) => (
                  <button key={rank} onClick={() => set("minSL20Rank", rank)}
                    className={`flex-1 py-1.5 rounded text-[10px] font-bold border transition-all min-h-[36px]
                      ${criteria.minSL20Rank === rank ? "text-[var(--app-bg)]" : "bg-[var(--app-bg)] border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text)]"}`}
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
            <button onClick={() => set("daylightOnly", !criteria.daylightOnly)}
              className={`min-h-[64px] rounded-lg border px-3 text-left transition-colors ${criteria.daylightOnly ? "border-yellow-400/70 bg-yellow-400/10 text-yellow-200" : "border-[var(--border)] bg-[var(--app-bg)] text-[var(--text-muted)]"}`}>
              <span className="block text-[10px] uppercase tracking-wider">Daylight-only windows</span>
              <span className="mt-1 block text-sm font-bold">{criteria.daylightOnly ? "☀️ On — night hours excluded" : "🌙 Off — night hours allowed"}</span>
            </button>
          </div>

          {/* Algorithm explanation */}
          <details className="mt-2">
            <summary className="text-[10px] text-[var(--text-muted)] cursor-pointer hover:text-[var(--text)] transition-colors">
              📖 How the algorithm works
            </summary>
            <div className="mt-2 text-[10px] text-[var(--text-muted)] space-y-1 leading-relaxed bg-[var(--app-bg)] rounded p-3 border border-[var(--border)]">
              <p><strong className="text-[var(--text)]">Boating Rank</strong> — Wind is primary: Go below 15kt, Marginal from 15–20kt, and Avoid above 20kt. Swell modifies the rating only when it is uncomfortable or unsafe: wind chop &gt;1.1m, very short-period swell, or steep short swell can downgrade it; clean long-period groundswell is discounted rather than judged from total wave height alone. Excellent is wind≤10kt, chop≤0.35m and swell&lt;1.0m. Always check official warnings and your vessel limits.</p>
              <p><strong className="text-[var(--text)]">Fishing Score (0–100%)</strong> — Fishing is calculated only from sun, moon and tide: moon phase, moon transit/underfoot, sunrise/sunset and tide movement. Weather is kept separate, so a rain or wind forecast cannot quietly alter the fishing score.</p>
              <p><strong className="text-[var(--text)]">Golden Window</strong> — The SL20 default is daylight, wind≤10kt, swell&lt;1.0m, rain chance 0%, fishing≥4★, and at least three consecutive qualifying hours.</p>
              <p><strong className="text-[var(--text)]">Vessel profile</strong> — Each hour must meet your steady wind, optional gust, groundswell, wind-chop, rain, fishing and SL20 limits. Every saved vessel keeps its own criteria.</p>
              <p><strong className="text-[var(--text)]">Window</strong> — Consecutive hours where ALL active criteria are met. Windows shorter than "Min Window Length" are discarded. With daylight-only enabled, night hours cannot qualify.</p>
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
        <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{label}</p>
        <span className="text-sm font-bold" style={{ color }}>{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer"
        style={{ accentColor: color }}
      />
      <div className="flex justify-between text-[9px] text-[var(--text-muted)] mt-0.5">
        <span>{min}{unit}</span><span>{max}{unit}</span>
      </div>
    </div>
  );
}

function OptionalSlider({ label, value, min, max, step, unit, color, onChange }: {
  label: string; value: number | null; min: number; max: number; step: number;
  unit: string; color: string; onChange: (v: number | null) => void;
}) {
  if (value == null) {
    return (
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{label}</p>
          <button onClick={() => onChange(min)} className="rounded border border-[var(--border)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-muted)] hover:border-[var(--action)] hover:text-[var(--text)]">No limit · Add</button>
        </div>
        <div className="min-h-[44px] rounded border border-dashed border-[var(--border)] bg-[var(--app-bg)] px-3 py-3 text-xs text-[var(--text-muted)]">Not used by this vessel profile</div>
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{label}</p>
        <button onClick={() => onChange(null)} className="rounded border border-[var(--border)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-muted)] hover:border-[var(--action)] hover:text-[var(--text)]">Remove limit</button>
      </div>
      <SliderField label="" value={value} min={min} max={max} step={step} unit={unit} color={color} onChange={onChange} />
    </div>
  );
}

// ─── Window Card ─────────────────────────────────────────────────────────────

function WindowCard({ win, idx, locationName, timezone }: { win: SickieWindow; idx: number; locationName: string; timezone: string }) {
  const isNext = idx === 0;
  const lastHour = win.hours[win.hours.length - 1];
  function addToCalendar() {
    downloadSickieCalendarEvent({
      locationName,
      timezone,
      date: win.date,
      startHour: win.hours[0].hour,
      endDate: lastHour.dateStr,
      endHour: lastHour.hour + 1,
      description: `Bloody Dave's Sickie window at ${locationName}. Peak fishing ${win.peakFish}% (${win.peakStars} stars). ${win.slLabel}. Wind from ${win.minWind?.toFixed(0) ?? "—"}kt; max swell ${win.maxSwell?.toFixed(1) ?? "—"}m.`,
    });
  }
  return (
    <div className={`rounded-xl border overflow-hidden
      ${isNext ? "border-yellow-400 shadow-lg shadow-yellow-400/20" : "border-[var(--border)]"}`}>
      {/* Header */}
      <div className={`px-4 py-3 flex items-center justify-between gap-2 flex-wrap
        ${isNext ? "bg-yellow-400/15" : "bg-[var(--surface)]"}`}>
        <div>
          {isNext && (
            <div className="text-yellow-400 text-xs font-bold uppercase tracking-wider mb-0.5">
              🎣 NEXT SICKIE WINDOW
            </div>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[var(--text)] font-bold text-sm">{win.dateLabel}</span>
            {win.allNight && <span className="text-[var(--text-muted)] text-[10px] bg-[var(--app-bg)] px-1.5 py-0.5 rounded">🌙 Night only</span>}
            {win.hasDaylight && !win.allNight && <span className="text-yellow-300 text-[10px] bg-[var(--app-bg)] px-1.5 py-0.5 rounded">☀️ Includes daylight</span>}
          </div>
          <div className="text-[var(--text-muted)] text-xs mt-0.5">
            {win.startHour} – {win.endHour}
            <span className="ml-2">({win.hours.length} hr{win.hours.length > 1 ? "s" : ""})</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[var(--action)] font-bold text-lg">{win.peakFish}%</span>
            <span className="text-yellow-400 text-sm">{"★".repeat(win.peakStars)}</span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ backgroundColor: win.slBg, color: win.slFg }}>
            {win.slLabel}
          </span>
        </div>
      </div>

      {/* Conditions */}
      <div className="px-4 py-2 bg-[var(--app-bg)] flex flex-wrap gap-3 text-xs border-t border-[var(--border)]">
        {win.minWind != null && <span style={{ color: windColor(win.minWind) }}>💨 Wind {Math.round(win.minWind)}kt</span>}
        {win.maxSwell != null && <span style={{ color: swellColor(win.maxSwell) }}>🌊 Swell {fmt(win.maxSwell)}m</span>}
        {win.hours[0].seaLevel != null && <span className="text-[#a78bfa]">Tide {fmt(win.hours[0].seaLevel)}m</span>}
        <button onClick={addToCalendar} className="ml-auto min-h-[32px] rounded border border-[var(--border)] px-2.5 text-xs font-bold text-[var(--action)] hover:border-[var(--action)] hover:text-[var(--text)]">📅 Calendar</button>
      </div>

      {/* Hourly strip */}
      <div className="overflow-x-auto px-3 py-2 bg-[var(--surface)] scrollbar-hide">
        <div className="flex gap-1 min-w-max">
          {win.hours.map(row => {
            const sl = rateSL20(row.windKt, row.swellH, row.swellP, row.waveH, row.windWaveH);
            return (
              <div key={row.time}
                className="flex flex-col items-center gap-0.5 bg-yellow-400/10 ring-1 ring-yellow-400/40 rounded px-1.5 py-1 min-w-[44px]">
                <span className="text-[9px] text-[var(--text-muted)] font-mono">{row.hourLabel}</span>
                <span className="text-[11px] font-bold" style={{ color: "#f59e0b" }}>{row.fishScore}%</span>
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
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const { profiles, addProfile, updateProfile, deleteProfile } = useVesselProfiles();

  function handlePresetChange(p: VesselPreset) {
    setPreset(p);
    setActiveProfileId(null);
    if (p !== "custom") setCriteria(VESSEL_PRESETS[p].criteria);
  }

  function handleCriteriaChange(c: SickieCriteria) {
    setCriteria(c);
    if (activeProfileId) {
      updateProfile(activeProfileId, { criteria: c });
    } else {
      setPreset("custom");
    }
  }

  function handleProfileChange(profile: VesselProfile) {
    setActiveProfileId(profile.id);
    setPreset("custom");
    setCriteria(profile.criteria);
  }

  function handleSaveProfile(name: string, emoji: string, notes: string) {
    const profile = addProfile({ name, emoji, notes, criteria });
    setActiveProfileId(profile.id);
    setPreset("custom");
  }

  function handleDeleteProfile(id: string) {
    deleteProfile(id);
    if (activeProfileId === id) {
      setActiveProfileId(null);
      setPreset("custom");
    }
  }

  const windows = useMemo(() => buildWindows(data, criteria), [data, criteria]);

  return (
    <div className="overflow-y-auto p-3 flex flex-col gap-3 pb-8">
      {/* Header */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
        <h2 className="text-[var(--action)] font-black text-lg" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
          🎣 Sickie Forecast
        </h2>
        <p className="text-[var(--text-muted)] text-xs mt-1">
          Upcoming windows where boating and fishing conditions both meet your vessel's thresholds.
          Windows shorter than the minimum are discarded.
        </p>
        <div className="flex flex-wrap gap-2 mt-2 text-xs">
          <span className="text-[var(--text-muted)]">📍 {data.location.name}</span>
          <span className="text-[var(--text-muted)]">·</span>
          <span className="text-[var(--text-muted)]">🌐 {data.timezone}</span>
        </div>
      </div>

      {/* Criteria config */}
      <CriteriaPanel
        criteria={criteria}
        preset={preset}
        profiles={profiles}
        activeProfileId={activeProfileId}
        onPresetChange={handlePresetChange}
        onProfileChange={handleProfileChange}
        onCriteriaChange={handleCriteriaChange}
        onSaveProfile={handleSaveProfile}
        onDeleteProfile={handleDeleteProfile}
      />

      {/* Results */}
      {windows.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
          <p className="text-4xl">😢</p>
          <p className="text-[var(--text-muted)] text-sm">No qualifying windows in the forecast period.</p>
          <p className="text-[var(--text-muted)] text-xs">Try relaxing the criteria above, extending the forecast range, or checking another location.</p>
        </div>
      ) : (
        <>
          <div className="text-xs text-[var(--text-muted)] px-1">
            Found <strong className="text-yellow-400">{windows.length}</strong> window{windows.length > 1 ? "s" : ""} ≥ {criteria.minWindowHours}hr in the next {data.daily.length} days
          </div>
          {windows.map((win, i) => (
            <WindowCard key={`${win.date}-${win.startHour}`} win={win} idx={i} locationName={data.location.name} timezone={data.timezone} />
          ))}
        </>
      )}
    </div>
  );
}
