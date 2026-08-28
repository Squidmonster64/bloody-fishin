/**
 * DecisionView — go/don't-go home.
 * Location + GOOD/POOR window + compact GO, then Wind/Swell/Tide/Water and a timeline.
 * Visual recovery only; briefing helpers and the vessel scorer are unchanged.
 */
import { useMemo, useState } from "react";
import type { AppData, HourRow } from "@/lib/fishingEngine";
import { fmt, hasMarineForVessel, rateSL20, windColor, swellColor } from "@/lib/fishingEngine";
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

const GO_STYLES: Record<GoNoGo, { badge: string; label: string }> = {
  go: { badge: "text-[var(--success)]", label: "GO" },
  caution: { badge: "text-[var(--warning)]", label: "CAUTION" },
  "no-go": { badge: "text-[var(--danger)]", label: "NO-GO" },
  outlook: { badge: "text-[var(--text-muted)]", label: "OUTLOOK" },
};

const FRESH_STYLES = {
  live: "text-[var(--success)]",
  recent: "text-[var(--sand)]",
  stale: "text-[var(--warning)]",
  unknown: "text-[var(--text-muted)]",
} as const;

function windowKind(goNoGo: GoNoGo): "GOOD" | "POOR" | "OUTLOOK" {
  if (goNoGo === "go") return "GOOD";
  if (goNoGo === "outlook") return "OUTLOOK";
  return "POOR";
}

function formatWaterLine(row: HourRow | null, seaLevel: number | null): string {
  if (!row) return "—";
  const chop = row.windWaveH != null ? `Chop ${fmt(row.windWaveH)} m` : null;
  const sea = seaLevel != null ? `sea ${fmt(seaLevel)} m` : null;
  if (chop && sea) return `${chop} · ${sea}`;
  return chop ?? sea ?? (row.waveH != null ? `Wave ${fmt(row.waveH)} m` : "—");
}

function hourTone(row: HourRow): "good" | "poor" | "outlook" {
  if (!hasMarineForVessel(row)) return "outlook";
  const sl = rateSL20(row.windKt, row.swellH, row.swellP, row.waveH, row.windWaveH);
  if (sl.label === "Avoid" || sl.label === "Marginal") return "poor";
  if (sl.rank >= 2) return "good";
  return "poor";
}

function SlPill({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: bg, color: fg }}>
      {label}
    </span>
  );
}

function SlUnavailable() {
  return (
    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--text-muted)]">
      Boating n/a
    </span>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">{label}</p>
      <p className="mt-0.5 text-[13px] font-semibold tabular-nums leading-tight truncate text-[var(--text)]" style={color ? { color } : undefined}>
        {value}
      </p>
    </div>
  );
}

export function DecisionView({ data, fetchedAt, cacheSavedAt, onOpenView, onRefresh }: Props) {
  const [showWhy, setShowWhy] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const brief = useMemo(
    () =>
      buildDecisionBrief(data, {
        fetchedAt: fetchedAt ?? data.fetchedAt,
        cacheSavedAt,
      }),
    [data, fetchedAt, cacheSavedAt],
  );
  const style = GO_STYLES[brief.goNoGo];
  const kind = windowKind(brief.goNoGo);
  const c = brief.conditions;

  const nextGood = brief.nextUseful
    ? `${brief.nextUseful.dateLabel} ${brief.nextUseful.startHour}–${brief.nextUseful.endHour}`
    : null;
  const windowLine =
    kind === "GOOD"
      ? nextGood ?? brief.nowLabel
      : kind === "OUTLOOK"
        ? "vessel call unavailable"
        : nextGood
          ? `now · next GOOD ${nextGood}`
          : "now · no clear GOOD window in range";

  const timeline = useMemo(() => {
    if (!brief.current) return data.merged.slice(0, 16);
    const i = data.merged.findIndex(r => r.time === brief.current!.time);
    const start = i < 0 ? 0 : i;
    return data.merged.slice(start, start + 16);
  }, [data.merged, brief.current]);

  return (
    <div className="overflow-y-auto overflow-x-hidden pb-8">
      <section className="px-3 sm:px-4 pt-3 pb-2" aria-label="Decision summary">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
              {brief.locationName} · {brief.nowLabel}
            </p>
            <p className="mt-1 text-[15px] sm:text-base font-semibold text-[var(--text)] leading-snug">
              <span className={kind === "GOOD" ? "text-[var(--success)]" : kind === "POOR" ? "text-[var(--danger)]" : "text-[var(--text-muted)]"}>
                {kind}
              </span>
              <span className="text-[var(--text-muted)] font-medium"> window </span>
              <span className="tabular-nums">{windowLine}</span>
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className={`text-[11px] font-bold tracking-[0.14em] ${style.badge}`}>{style.label}</p>
            {brief.currentSl ? (
              <div className="mt-1">
                <SlPill label={`Boating ${brief.currentSl.label}`} bg={brief.currentSl.bg} fg={brief.currentSl.fg} />
              </div>
            ) : (
              <div className="mt-1">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--text-muted)]">
                  Boating unavailable
                </span>
              </div>
            )}
          </div>
        </div>

        <p className="mt-1.5 text-[13px] text-[var(--warm-text)] leading-snug max-w-3xl">{brief.supporting}</p>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
          <span className={FRESH_STYLES[brief.freshnessTone]}>{brief.freshnessLabel}</span>
          {brief.current && (
            <span className="text-[var(--sand)] font-semibold">
              {brief.current.fishStars}★ fish · {brief.current.fishScore}%
            </span>
          )}
          <button
            type="button"
            onClick={onRefresh}
            className="ml-auto min-h-[32px] rounded border border-[var(--border)] px-2 text-[var(--text-muted)] hover:text-[var(--action)] hover:border-[var(--action)]"
          >
            Refresh
          </button>
        </div>

        {(brief.risks[0] || brief.marineMissing) && (
          <p className="mt-2 text-[11px] leading-snug text-[var(--warning)] border-l-2 border-[var(--warning)] pl-2">
            {brief.risks[0] ?? "Marine swell/tide feed is incomplete for this hour."}
          </p>
        )}
      </section>

      <section className="px-3 sm:px-4 py-2 border-y border-[var(--border)]" aria-label="Key conditions">
        <div className="grid grid-cols-2 min-[700px]:grid-cols-4 gap-x-4 gap-y-2">
          <Stat label="Wind" value={formatWindLine(c)} color={windColor(c.windKt)} />
          <Stat label="Swell" value={formatSwellLine(c)} color={swellColor(c.swellH)} />
          <Stat label="Tide" value={formatTideLine(brief.nextTide)} />
          <Stat label="Water" value={formatWaterLine(brief.current, c.seaLevel)} />
        </div>
      </section>

      <section className="px-3 sm:px-4 py-2" aria-label="Next hours">
        <div className="flex items-baseline justify-between gap-2 mb-1.5">
          <h3 className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)] font-semibold">Timeline</h3>
          <p className="text-[10px] text-[var(--text-muted)]">G good · P poor</p>
        </div>
        <div className="overflow-x-auto scrollbar-hide -mx-3 px-3 sm:-mx-4 sm:px-4">
          <div className="flex gap-1 min-w-max">
            {timeline.map(row => {
              const tone = hourTone(row);
              const sl = rateSL20(row.windKt, row.swellH, row.swellP, row.waveH, row.windWaveH);
              return (
                <div
                  key={row.time}
                  className={`flex flex-col items-center gap-0.5 min-w-[44px] px-1 py-1 rounded ${
                    row.golden ? "bg-[color-mix(in_srgb,var(--sand)_12%,transparent)]" : ""
                  }`}
                >
                  <span className="text-[9px] font-mono text-[var(--text-muted)]">{row.hourLabel}</span>
                  <span
                    className={`text-[10px] font-bold ${
                      tone === "good" ? "text-[var(--success)]" : tone === "poor" ? "text-[var(--danger)]" : "text-[var(--text-muted)]"
                    }`}
                  >
                    {tone === "good" ? "G" : tone === "poor" ? "P" : "—"}
                  </span>
                  <span className="text-[9px] tabular-nums" style={{ color: windColor(row.windKt) }}>
                    {row.windKt != null ? `${Math.round(row.windKt)}kt` : "—"}
                  </span>
                  {hasMarineForVessel(row) ? (
                    <span className="text-[8px] font-bold leading-none" style={{ color: sl.fg }}>
                      {sl.label === "Excellent" ? "EXC" : sl.label === "Marginal" ? "MAR" : sl.label}
                    </span>
                  ) : (
                    <span className="text-[8px] text-[var(--text-muted)]">n/a</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-3 sm:px-4 py-2 border-t border-[var(--border)]" aria-label="Next usable window">
        <div className="flex items-baseline justify-between gap-2 mb-1">
          <h3 className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)] font-semibold">Next usable</h3>
          <button type="button" onClick={() => onOpenView("sickie")} className="text-[11px] font-semibold text-[var(--action)] min-h-[32px]">
            Sickie →
          </button>
        </div>
        {brief.nextUseful ? (
          <div className="flex items-start justify-between gap-3 text-[13px]">
            <p className="min-w-0 text-[var(--text)]">
              <span className="font-semibold">
                {brief.nextUseful.dateLabel} · {brief.nextUseful.startHour}–{brief.nextUseful.endHour}
              </span>
              <span className="block text-[12px] text-[var(--text-muted)] mt-0.5">{brief.nextUseful.reason}</span>
            </p>
            <div className="text-right shrink-0 space-y-0.5">
              {brief.nextUseful.vesselAssessment ? (
                <SlPill label={brief.nextUseful.sl.label} bg={brief.nextUseful.sl.bg} fg={brief.nextUseful.sl.fg} />
              ) : (
                <SlUnavailable />
              )}
              <p className="text-[11px] text-[var(--sand)] font-semibold">
                {brief.nextUseful.peakStars}★ · {brief.nextUseful.hours}h
              </p>
            </div>
          </div>
        ) : (
          <p className="text-[13px] text-[var(--text-muted)]">No clear useful window left in this forecast range.</p>
        )}
      </section>

      <section className="px-3 sm:px-4 py-2 border-t border-[var(--border)]" aria-label="Best upcoming windows">
        <h3 className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)] font-semibold mb-1.5">Best upcoming</h3>
        {brief.bestWindows.length === 0 ? (
          <p className="text-[13px] text-[var(--text-muted)]">No ranked windows in this range.</p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {brief.bestWindows.map(w => (
              <li key={`${w.date}-${w.startHour}`} className="flex items-start gap-3 py-1.5">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-[var(--text)]">
                    {w.dateLabel} · {w.startHour}–{w.endHour}
                  </p>
                  <p className="text-[12px] text-[var(--text-muted)] truncate">{w.reason}</p>
                </div>
                <div className="text-right shrink-0 space-y-0.5">
                  {w.vesselAssessment ? (
                    <SlPill label={w.sl.label} bg={w.sl.bg} fg={w.sl.fg} />
                  ) : (
                    <SlUnavailable />
                  )}
                  <p className="text-[11px] text-[var(--sand)] font-semibold">
                    {w.peakStars}★ · {w.hours}h
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="px-3 sm:px-4 py-2 border-t border-[var(--border)]" aria-label="Detail">
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[12px] font-semibold">
          {(
            [
              ["graph", "Charts"],
              ["summary", "Daily"],
              ["table", "Hourly"],
              ["sickie", "Sickie"],
            ] as const
          ).map(([view, label]) => (
            <button
              key={view}
              type="button"
              onClick={() => onOpenView(view)}
              className="min-h-[32px] text-[var(--action)] hover:underline"
            >
              {label} →
            </button>
          ))}
        </div>
      </section>

      <section className="px-3 sm:px-4 pt-1 pb-2" aria-label="Why and raw data">
        <button
          type="button"
          onClick={() => setShowWhy(v => !v)}
          className="w-full flex items-center justify-between min-h-[36px] text-left"
          aria-expanded={showWhy}
        >
          <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)] font-semibold">Why this call</span>
          <span className="text-[var(--text-muted)] text-[11px]">{showWhy ? "Hide" : "Show"}</span>
        </button>
        {showWhy && (
          <ul className="mb-2 space-y-1.5">
            {brief.why.map(line => (
              <li key={line} className="text-[13px] text-[var(--text)] leading-snug">
                · {line}
              </li>
            ))}
            <li className="text-[11px] text-[var(--text-muted)] leading-snug pt-1">
              Planning aid only — not a substitute for official marine warnings, local knowledge or skipper judgement.
            </li>
          </ul>
        )}

        <button
          type="button"
          onClick={() => setShowRaw(v => !v)}
          className="w-full flex items-center justify-between min-h-[36px] text-left border-t border-[var(--border)]"
          aria-expanded={showRaw}
        >
          <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)] font-semibold">Raw hour</span>
          <span className="text-[var(--text-muted)] text-[11px]">{showRaw ? "Hide" : "Show"}</span>
        </button>
        {showRaw && brief.current && (
          <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12px]">
            <div>
              <dt className="text-[var(--text-muted)]">Time</dt>
              <dd className="text-[var(--text)] font-mono">{brief.current.label}</dd>
            </div>
            <div>
              <dt className="text-[var(--text-muted)]">Wave</dt>
              <dd className="text-[var(--text)] font-mono">{fmt(brief.current.waveH)} m</dd>
            </div>
            <div>
              <dt className="text-[var(--text-muted)]">Wind wave</dt>
              <dd className="text-[var(--text)] font-mono">{fmt(brief.current.windWaveH)} m</dd>
            </div>
            <div>
              <dt className="text-[var(--text-muted)]">Sea level</dt>
              <dd className="text-[var(--text)] font-mono">{fmt(brief.current.seaLevel)} m</dd>
            </div>
            <div>
              <dt className="text-[var(--text-muted)]">Tide rate</dt>
              <dd className="text-[var(--text)] font-mono">{fmt(brief.current.tideRate, 2)} m/h</dd>
            </div>
            <div>
              <dt className="text-[var(--text-muted)]">Timezone</dt>
              <dd className="text-[var(--text)] font-mono truncate">{brief.timezone}</dd>
            </div>
          </dl>
        )}
      </section>
    </div>
  );
}
