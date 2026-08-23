/**
 * DecisionView — mobile-first go/no-go home.
 * Progressive disclosure: decision → windows → conditions → detail links → why/raw.
 */
import { useMemo, useState } from "react";
import type { AppData } from "@/lib/fishingEngine";
import { fmt, windColor, swellColor } from "@/lib/fishingEngine";
import {
  buildDecisionBrief,
  formatSwellLine,
  formatTideLine,
  formatWindLine,
  type GoNoGo,
} from "@/lib/decisionBrief";
import type { ViewType } from "@/hooks/useFishingData";

interface Props {
  data: AppData;
  fetchedAt?: string | null;
  cacheSavedAt?: string | null;
  onOpenView: (view: ViewType) => void;
  onRefresh: () => void;
}

const GO_STYLES: Record<GoNoGo, { bar: string; badge: string; label: string }> = {
  go: { bar: "from-[#0d2a22] via-[#0a1628] to-[#0a1628]", badge: "bg-[#3ecf8e]/20 text-[#3ecf8e] border-[#3ecf8e]/40", label: "GO" },
  caution: { bar: "from-[#2a2210] via-[#0a1628] to-[#0a1628]", badge: "bg-[#f5a623]/20 text-[#f5a623] border-[#f5a623]/40", label: "CAUTION" },
  "no-go": { bar: "from-[#2a1212] via-[#0a1628] to-[#0a1628]", badge: "bg-[#e05c5c]/20 text-[#e05c5c] border-[#e05c5c]/40", label: "NO-GO" },
  outlook: { bar: "from-[#12202a] via-[#0a1628] to-[#0a1628]", badge: "bg-[#7eb8f7]/15 text-[#7eb8f7] border-[#7eb8f7]/30", label: "OUTLOOK" },
};

const FRESH_STYLES = {
  live: "text-[#3ecf8e]",
  recent: "text-[#7eb8f7]",
  stale: "text-[#f5a623]",
  unknown: "text-[#7a9bb5]",
} as const;

function Metric({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="min-w-0 py-2">
      <p className="text-[10px] uppercase tracking-[0.14em] text-[#7a9bb5] font-semibold">{label}</p>
      <p className="mt-1 text-base font-bold tabular-nums truncate" style={{ color: color ?? "#f0f6fc" }}>
        {value}
      </p>
    </div>
  );
}

export function DecisionView({ data, fetchedAt, cacheSavedAt, onOpenView, onRefresh }: Props) {
  const [showWhy, setShowWhy] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const brief = useMemo(
    () => buildDecisionBrief(data, { fetchedAt: fetchedAt ?? data.fetchedAt, cacheSavedAt }),
    [data, fetchedAt, cacheSavedAt],
  );
  const style = GO_STYLES[brief.goNoGo];
  const c = brief.conditions;

  return (
    <div className="overflow-y-auto pb-10">
      {/* DECISION SUMMARY */}
      <section
        className={`relative overflow-hidden border-b border-[#1e3a5f] bg-gradient-to-b ${style.bar} px-4 pt-4 pb-5`}
        aria-label="Decision summary"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 0%, #7eb8f7 0%, transparent 45%), radial-gradient(circle at 90% 30%, #ff6b35 0%, transparent 35%)",
          }}
        />
        <div className="relative space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#7a9bb5] font-semibold">Now · {brief.nowLabel}</p>
              <h2 className="mt-1 text-xl font-black text-white leading-tight truncate" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", letterSpacing: "0.04em", fontSize: "1.65rem" }}>
                {brief.locationName}
              </h2>
            </div>
            <span className={`shrink-0 rounded border px-2.5 py-1 text-xs font-black tracking-wider ${style.badge}`}>
              {style.label}
            </span>
          </div>

          <div>
            <p className="text-2xl sm:text-3xl font-black text-white leading-tight" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", letterSpacing: "0.03em" }}>
              {brief.headline}
            </p>
            <p className="mt-2 text-sm text-[#c5d6e8] leading-relaxed max-w-xl">{brief.supporting}</p>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className={FRESH_STYLES[brief.freshnessTone]}>{brief.freshnessLabel}</span>
            {brief.currentSl && (
              <span className="font-bold px-2 py-0.5 rounded" style={{ backgroundColor: brief.currentSl.bg, color: brief.currentSl.fg }}>
                SL20 {brief.currentSl.label}
              </span>
            )}
            {brief.current && (
              <span className="text-[#ff6b35] font-bold">{brief.current.fishStars}★ fish · {brief.current.fishScore}%</span>
            )}
            <button
              type="button"
              onClick={onRefresh}
              className="ml-auto min-h-[36px] rounded border border-[#1e3a5f] px-2.5 text-[#7eb8f7] hover:border-[#ff6b35] hover:text-white"
            >
              Refresh
            </button>
          </div>

          {(brief.risks[0] || brief.marineMissing) && (
            <p className="text-xs leading-relaxed text-[#f5c16c] border-l-2 border-[#f5a623]/70 pl-3">
              {brief.risks[0] ?? "Marine swell/tide feed is incomplete for this hour."}
            </p>
          )}
        </div>
      </section>

      {/* BEST WINDOWS */}
      <section className="px-4 pt-5 pb-2 border-b border-[#1e3a5f]/80" aria-label="Best windows">
        <div className="flex items-end justify-between gap-2 mb-3">
          <div>
            <h3 className="text-[11px] uppercase tracking-[0.16em] text-[#7a9bb5] font-bold">Best windows</h3>
            <p className="text-sm text-[#c5d6e8] mt-1">Next useful fishing / boating stretches</p>
          </div>
          <button
            type="button"
            onClick={() => onOpenView("sickie")}
            className="text-xs font-semibold text-[#ff6b35] min-h-[36px] px-1"
          >
            Sickie →
          </button>
        </div>
        {brief.bestWindows.length === 0 ? (
          <p className="text-sm text-[#7a9bb5] pb-3">No clear useful window in this range. Check the graph for the least-bad hours.</p>
        ) : (
          <ul className="space-y-0 divide-y divide-[#1e3a5f]/80">
            {brief.bestWindows.map(w => (
              <li key={`${w.date}-${w.startHour}`} className="py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white text-sm">
                    {w.dateLabel} · {w.startHour}–{w.endHour}
                  </p>
                  <p className="text-xs text-[#7a9bb5] mt-0.5 truncate">{w.reason}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: w.sl.bg, color: w.sl.fg }}>
                    {w.sl.label}
                  </span>
                  <p className="text-xs text-[#ff6b35] font-bold mt-1">{w.peakStars}★ · {w.hours}h</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* KEY CONDITIONS */}
      <section className="px-4 pt-5 pb-4 border-b border-[#1e3a5f]/80" aria-label="Key conditions">
        <h3 className="text-[11px] uppercase tracking-[0.16em] text-[#7a9bb5] font-bold mb-1">Key conditions</h3>
        <p className="text-sm text-[#c5d6e8] mb-3">What matters for the ramp and the first hour offshore</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <Metric label="Wind" value={formatWindLine(c)} color={windColor(c.windKt)} />
          <Metric label="Gusts" value={c.gustKt != null ? `${Math.round(c.gustKt)} kt` : "—"} color={windColor(c.gustKt)} />
          <Metric label="Swell" value={formatSwellLine(c)} color={swellColor(c.swellH)} />
          <Metric label="Rain" value={c.rainProb != null ? `${Math.round(c.rainProb)}%` : "—"} />
          <Metric label="Air temp" value={c.temp != null ? `${fmt(c.temp, 0)}°C` : "—"} />
          <Metric label="Next tide" value={formatTideLine(brief.nextTide)} />
        </div>
        {brief.risks.length > 1 && (
          <ul className="mt-3 space-y-1.5">
            {brief.risks.slice(1).map(risk => (
              <li key={risk} className="text-xs text-[#f0c27a] leading-relaxed">· {risk}</li>
            ))}
          </ul>
        )}
      </section>

      {/* DETAIL / CHARTS */}
      <section className="px-4 pt-5 pb-4 border-b border-[#1e3a5f]/80" aria-label="Detail and charts">
        <h3 className="text-[11px] uppercase tracking-[0.16em] text-[#7a9bb5] font-bold mb-1">Detail</h3>
        <p className="text-sm text-[#c5d6e8] mb-3">Charts, daily strips and hourly table when you need more</p>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["graph", "Charts"],
              ["summary", "Daily"],
              ["table", "Hourly table"],
              ["sickie", "Sickie windows"],
            ] as const
          ).map(([view, label]) => (
            <button
              key={view}
              type="button"
              onClick={() => onOpenView(view)}
              className="min-h-[48px] rounded-lg border border-[#1e3a5f] bg-[#0d1f3c]/80 px-3 text-left text-sm font-semibold text-white hover:border-[#ff6b35] transition-colors"
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* WHY + RAW */}
      <section className="px-4 pt-5 pb-2" aria-label="Why and raw data">
        <button
          type="button"
          onClick={() => setShowWhy(v => !v)}
          className="w-full flex items-center justify-between min-h-[44px] text-left"
          aria-expanded={showWhy}
        >
          <span className="text-[11px] uppercase tracking-[0.16em] text-[#7a9bb5] font-bold">Why this call</span>
          <span className="text-[#7a9bb5] text-xs">{showWhy ? "Hide" : "Show"}</span>
        </button>
        {showWhy && (
          <ul className="mt-1 mb-4 space-y-2 animate-in fade-in duration-200">
            {brief.why.map(line => (
              <li key={line} className="text-sm text-[#c5d6e8] leading-relaxed">· {line}</li>
            ))}
            <li className="text-xs text-[#7a9bb5] leading-relaxed pt-1">
              Planning aid only — not a substitute for official marine warnings, local knowledge or skipper judgement.
            </li>
          </ul>
        )}

        <button
          type="button"
          onClick={() => setShowRaw(v => !v)}
          className="w-full flex items-center justify-between min-h-[44px] text-left border-t border-[#1e3a5f]/80 mt-1 pt-1"
          aria-expanded={showRaw}
        >
          <span className="text-[11px] uppercase tracking-[0.16em] text-[#7a9bb5] font-bold">Raw hour</span>
          <span className="text-[#7a9bb5] text-xs">{showRaw ? "Hide" : "Show"}</span>
        </button>
        {showRaw && brief.current && (
          <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-xs animate-in fade-in duration-200">
            <div><dt className="text-[#7a9bb5]">Time</dt><dd className="text-white font-mono">{brief.current.label}</dd></div>
            <div><dt className="text-[#7a9bb5]">Wave</dt><dd className="text-white font-mono">{fmt(brief.current.waveH)} m</dd></div>
            <div><dt className="text-[#7a9bb5]">Wind wave</dt><dd className="text-white font-mono">{fmt(brief.current.windWaveH)} m</dd></div>
            <div><dt className="text-[#7a9bb5]">Sea level</dt><dd className="text-white font-mono">{fmt(brief.current.seaLevel)} m</dd></div>
            <div><dt className="text-[#7a9bb5]">Tide rate</dt><dd className="text-white font-mono">{fmt(brief.current.tideRate, 2)} m/h</dd></div>
            <div><dt className="text-[#7a9bb5]">Timezone</dt><dd className="text-white font-mono truncate">{brief.timezone}</dd></div>
          </dl>
        )}
      </section>
    </div>
  );
}
