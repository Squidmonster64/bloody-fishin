/**
 * DecisionView — mobile-first go/no-go home.
 * Progressive disclosure: decision → conditions → windows → detail → why/raw.
 * Visual port to Figma marine-instrument aesthetic; data from buildDecisionBrief only.
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

const GO_STYLES: Record<
  GoNoGo,
  { badge: string; border: string; label: string }
> = {
  go: {
    badge: "bg-[color-mix(in_srgb,var(--success)_15%,transparent)] text-[var(--success)]",
    border: "border-[var(--success)]",
    label: "GO",
  },
  caution: {
    badge: "bg-[color-mix(in_srgb,var(--warning)_15%,transparent)] text-[var(--warning)]",
    border: "border-[var(--warning)]",
    label: "CAUTION",
  },
  "no-go": {
    badge: "bg-[color-mix(in_srgb,var(--danger)_15%,transparent)] text-[var(--danger)]",
    border: "border-[var(--danger)]",
    label: "NO-GO",
  },
  outlook: {
    badge: "bg-[color-mix(in_srgb,var(--action)_15%,transparent)] text-[var(--action)]",
    border: "border-[var(--action)]",
    label: "OUTLOOK",
  },
};

const FRESH_STYLES = {
  live: "text-[var(--success)]",
  recent: "text-[var(--action)]",
  stale: "text-[var(--warning)]",
  unknown: "text-[var(--text-muted)]",
} as const;

function MetricTile({
  label,
  value,
  color,
  accent,
}: {
  label: string;
  value: string;
  color?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`min-w-0 rounded-lg bg-[var(--surface)] border p-3 sm:p-4 ${
        accent ? "border-[var(--success)]" : "border-[var(--border)]"
      }`}
    >
      <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)] font-normal">
        {label}
      </p>
      <p
        className="mt-2 text-lg sm:text-xl font-bold tabular-nums leading-tight truncate text-[var(--text)]"
        style={color ? { color } : undefined}
      >
        {value}
      </p>
    </div>
  );
}

function SlPill({
  label,
  bg,
  fg,
}: {
  label: string;
  bg: string;
  fg: string;
}) {
  return (
    <span
      className="text-[10px] font-bold px-1.5 py-0.5 rounded"
      style={{ backgroundColor: bg, color: fg }}
    >
      {label}
    </span>
  );
}

function SlUnavailable() {
  return (
    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[color-mix(in_srgb,var(--text-muted)_15%,transparent)] text-[var(--text-muted)] border border-[color-mix(in_srgb,var(--text-muted)_30%,transparent)]">
      Boating n/a
    </span>
  );
}

export function DecisionView({
  data,
  fetchedAt,
  cacheSavedAt,
  onOpenView,
  onRefresh,
}: Props) {
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
  const c = brief.conditions;

  return (
    <div className="overflow-y-auto pb-10">
      {/* 1. DECISION STATE + HEADLINE */}
      <section className="px-4 pt-4 pb-4" aria-label="Decision summary">
        <div
          className={`relative rounded-lg bg-[var(--surface)] border ${style.border} p-4 sm:p-5 space-y-3`}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--text-muted)] font-semibold">
                Now · {brief.nowLabel}
              </p>
              <h2 className="mt-1 text-base sm:text-lg font-bold text-[var(--text)] leading-tight truncate">
                {brief.locationName}
              </h2>
            </div>
            <span
              className={`shrink-0 rounded-xl px-2.5 py-1 text-xs font-bold tracking-wider ${style.badge}`}
            >
              {style.label}
            </span>
          </div>

          <div>
            <p className="text-xl sm:text-2xl font-bold text-[var(--text)] leading-snug tracking-tight">
              {brief.headline}
            </p>
            <p className="mt-2 text-sm text-[var(--warm-text)] leading-relaxed max-w-xl">
              {brief.supporting}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
            <span className={FRESH_STYLES[brief.freshnessTone]}>
              {brief.freshnessLabel}
            </span>
            {brief.currentSl ? (
              <SlPill
                label={`Boating ${brief.currentSl.label}`}
                bg={brief.currentSl.bg}
                fg={brief.currentSl.fg}
              />
            ) : (
              <span className="font-bold px-2 py-0.5 rounded bg-[color-mix(in_srgb,var(--text-muted)_15%,transparent)] text-[var(--text-muted)] border border-[color-mix(in_srgb,var(--text-muted)_30%,transparent)]">
                Boating unavailable
              </span>
            )}
            {brief.current && (
              <span className="text-[var(--warning)] font-bold">
                {brief.current.fishStars}★ fish · {brief.current.fishScore}%
              </span>
            )}
            <button
              type="button"
              onClick={onRefresh}
              className="ml-auto min-h-[36px] rounded border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[var(--text)] hover:border-[var(--action)] hover:text-[var(--action)] transition-colors"
            >
              Refresh
            </button>
          </div>

          {(brief.risks[0] || brief.marineMissing) && (
            <p className="text-xs leading-relaxed text-[var(--warning)] border-l-2 border-[var(--warning)] pl-3">
              {brief.risks[0] ??
                "Marine swell/tide feed is incomplete for this hour."}
            </p>
          )}
        </div>
      </section>

      {/* 2. KEY CONDITIONS */}
      <section className="px-4 pb-5" aria-label="Key conditions">
        <h3 className="text-[11px] uppercase tracking-[0.12em] text-[var(--warm-text)] font-bold mb-1">
          Key conditions
        </h3>
        <p className="text-sm text-[var(--text-muted)] mb-3">
          What matters for the ramp and the first hour offshore
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <MetricTile
            label="Wind"
            value={formatWindLine(c)}
            color={windColor(c.windKt)}
            accent={brief.goNoGo === "go"}
          />
          <MetricTile
            label="Gusts"
            value={c.gustKt != null ? `${Math.round(c.gustKt)} kt` : "—"}
            color={windColor(c.gustKt)}
            accent={brief.goNoGo === "go"}
          />
          <MetricTile
            label="Swell"
            value={formatSwellLine(c)}
            color={swellColor(c.swellH)}
            accent={brief.goNoGo === "go"}
          />
          <MetricTile
            label="Rain"
            value={c.rainProb != null ? `${Math.round(c.rainProb)}%` : "—"}
          />
          <MetricTile
            label="Air temp"
            value={c.temp != null ? `${fmt(c.temp, 0)}°C` : "—"}
          />
          <MetricTile label="Next tide" value={formatTideLine(brief.nextTide)} />
        </div>
        {brief.risks.length > 1 && (
          <ul className="mt-3 space-y-1.5">
            {brief.risks.slice(1).map(risk => (
              <li
                key={risk}
                className="text-xs text-[var(--warning)] leading-relaxed"
              >
                · {risk}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 3. NEXT USABLE */}
      <section className="px-4 pb-4" aria-label="Next usable window">
        <div className="flex items-end justify-between gap-2 mb-2">
          <h3 className="text-[11px] uppercase tracking-[0.12em] text-[var(--warm-text)] font-bold">
            Next usable
          </h3>
          <button
            type="button"
            onClick={() => onOpenView("sickie")}
            className="text-xs font-semibold text-[var(--action)] min-h-[36px] px-1"
          >
            Sickie →
          </button>
        </div>
        <p className="text-xs text-[var(--text-muted)] mb-2">
          Chronological next useful window — not strength-ranked
        </p>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3.5">
          {brief.nextUseful ? (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-[var(--text)] text-sm">
                  {brief.nextUseful.dateLabel} · {brief.nextUseful.startHour}–
                  {brief.nextUseful.endHour}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
                  {brief.nextUseful.reason}
                </p>
              </div>
              <div className="text-right shrink-0 space-y-1">
                {brief.nextUseful.vesselAssessment ? (
                  <SlPill
                    label={brief.nextUseful.sl.label}
                    bg={brief.nextUseful.sl.bg}
                    fg={brief.nextUseful.sl.fg}
                  />
                ) : (
                  <SlUnavailable />
                )}
                <p className="text-xs text-[var(--warning)] font-bold">
                  {brief.nextUseful.peakStars}★ · {brief.nextUseful.hours}h
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">
              No clear useful window left in this forecast range.
            </p>
          )}
        </div>
      </section>

      {/* 4. BEST UPCOMING */}
      <section
        className="px-4 pb-5 border-b border-[var(--border)]"
        aria-label="Best upcoming windows"
      >
        <h3 className="text-[11px] uppercase tracking-[0.12em] text-[var(--warm-text)] font-bold mb-1">
          Best upcoming
        </h3>
        <p className="text-xs text-[var(--text-muted)] mb-2">
          Strength-ranked — distinct from next usable
        </p>
        {brief.bestWindows.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] pb-1">
            No ranked windows in this range.
          </p>
        ) : (
          <ul className="space-y-2">
            {brief.bestWindows.map(w => (
              <li
                key={`${w.date}-${w.startHour}`}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3 flex items-start gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[var(--text)] text-sm">
                    {w.dateLabel} · {w.startHour}–{w.endHour}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-1 truncate">
                    {w.reason}
                  </p>
                </div>
                <div className="text-right shrink-0 space-y-1">
                  {w.vesselAssessment ? (
                    <SlPill
                      label={w.sl.label}
                      bg={w.sl.bg}
                      fg={w.sl.fg}
                    />
                  ) : (
                    <SlUnavailable />
                  )}
                  <p className="text-xs text-[var(--warning)] font-bold">
                    {w.peakStars}★ · {w.hours}h
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 5. DETAIL / CHARTS */}
      <section
        className="px-4 pt-5 pb-4 border-b border-[var(--border)]"
        aria-label="Detail and charts"
      >
        <h3 className="text-[11px] uppercase tracking-[0.12em] text-[var(--warm-text)] font-bold mb-1">
          Detail
        </h3>
        <p className="text-sm text-[var(--text-muted)] mb-3">
          Charts, daily strips and hourly table when you need more
        </p>
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
              className="min-h-[48px] rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-left text-sm font-semibold text-[var(--text)] hover:border-[var(--action)] transition-colors"
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* 6. WHY + RAW (collapsed by default) */}
      <section className="px-4 pt-4 pb-2" aria-label="Why and raw data">
        <button
          type="button"
          onClick={() => setShowWhy(v => !v)}
          className="w-full flex items-center justify-between min-h-[44px] text-left"
          aria-expanded={showWhy}
        >
          <span className="text-[11px] uppercase tracking-[0.12em] text-[var(--warm-text)] font-bold">
            Why this call
          </span>
          <span className="text-[var(--text-muted)] text-xs">
            {showWhy ? "Hide" : "Show"}
          </span>
        </button>
        {showWhy && (
          <ul className="mt-1 mb-4 space-y-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3.5 animate-in fade-in duration-200">
            {brief.why.map(line => (
              <li
                key={line}
                className="text-sm text-[var(--text)] leading-relaxed"
              >
                · {line}
              </li>
            ))}
            <li className="text-xs text-[var(--text-muted)] leading-relaxed pt-1">
              Planning aid only — not a substitute for official marine warnings,
              local knowledge or skipper judgement.
            </li>
          </ul>
        )}

        <button
          type="button"
          onClick={() => setShowRaw(v => !v)}
          className="w-full flex items-center justify-between min-h-[44px] text-left border-t border-[var(--border)] mt-1 pt-1"
          aria-expanded={showRaw}
        >
          <span className="text-[11px] uppercase tracking-[0.12em] text-[var(--warm-text)] font-bold">
            Raw hour
          </span>
          <span className="text-[var(--text-muted)] text-xs">
            {showRaw ? "Hide" : "Show"}
          </span>
        </button>
        {showRaw && brief.current && (
          <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3.5 animate-in fade-in duration-200">
            <div>
              <dt className="text-[var(--text-muted)]">Time</dt>
              <dd className="text-[var(--text)] font-mono">
                {brief.current.label}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--text-muted)]">Wave</dt>
              <dd className="text-[var(--text)] font-mono">
                {fmt(brief.current.waveH)} m
              </dd>
            </div>
            <div>
              <dt className="text-[var(--text-muted)]">Wind wave</dt>
              <dd className="text-[var(--text)] font-mono">
                {fmt(brief.current.windWaveH)} m
              </dd>
            </div>
            <div>
              <dt className="text-[var(--text-muted)]">Sea level</dt>
              <dd className="text-[var(--text)] font-mono">
                {fmt(brief.current.seaLevel)} m
              </dd>
            </div>
            <div>
              <dt className="text-[var(--text-muted)]">Tide rate</dt>
              <dd className="text-[var(--text)] font-mono">
                {fmt(brief.current.tideRate, 2)} m/h
              </dd>
            </div>
            <div>
              <dt className="text-[var(--text-muted)]">Timezone</dt>
              <dd className="text-[var(--text)] font-mono truncate">
                {brief.timezone}
              </dd>
            </div>
          </dl>
        )}
      </section>
    </div>
  );
}
