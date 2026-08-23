/**
 * decisionBrief — derive a mobile-first decision summary from AppData.
 * Pure helpers only; does not change SL20 / fishing scoring.
 */
import {
  degToCompass,
  fmt,
  rateSL20,
  type AppData,
  type HourRow,
  type SL20Rating,
  type TideExtreme,
} from "@/lib/fishingEngine";

export type GoNoGo = "go" | "caution" | "no-go" | "outlook";

export interface ConditionSnap {
  windKt: number | null;
  gustKt: number | null;
  windDir: number | null;
  swellH: number | null;
  swellP: number | null;
  swellDir: number | null;
  rainProb: number | null;
  temp: number | null;
  waveH: number | null;
  seaLevel: number | null;
  tideRate: number | null;
}

export interface DecisionWindow {
  date: string;
  dateLabel: string;
  startHour: string;
  endHour: string;
  hours: number;
  peakFish: number;
  peakStars: number;
  sl: SL20Rating;
  minWind: number | null;
  maxSwell: number | null;
  reason: string;
}

export interface DecisionBrief {
  locationName: string;
  timezone: string;
  nowLabel: string;
  current: HourRow | null;
  currentSl: SL20Rating | null;
  goNoGo: GoNoGo;
  headline: string;
  supporting: string;
  why: string[];
  risks: string[];
  conditions: ConditionSnap;
  nextTide: TideExtreme | null;
  bestWindows: DecisionWindow[];
  nextUseful: DecisionWindow | null;
  marineMissing: boolean;
  fetchedAt: string | null;
  freshnessLabel: string;
  freshnessTone: "live" | "recent" | "stale" | "unknown";
}

function localParts(timezone: string, when = new Date()) {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  }).formatToParts(when);
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? "";
  const day = get("day").padStart(2, "0");
  const month = get("month").padStart(2, "0");
  const year = get("year");
  const hour = Number(get("hour")) % 24;
  const minute = Number(get("minute"));
  return {
    dateStr: `${year}-${month}-${day}`,
    hour,
    minute,
    weekday: get("weekday"),
  };
}

export function findCurrentHour(data: AppData, when = new Date()): HourRow | null {
  if (!data.merged.length) return null;
  const { dateStr, hour } = localParts(data.timezone, when);
  const exact = data.merged.find(r => r.dateStr === dateStr && r.hour === hour);
  if (exact) return exact;
  // Prefer the nearest upcoming hour, then the last known hour.
  const upcoming = data.merged.find(r => r.dateStr > dateStr || (r.dateStr === dateStr && r.hour >= hour));
  return upcoming ?? data.merged[data.merged.length - 1] ?? null;
}

function snapFromRow(row: HourRow | null): ConditionSnap {
  return {
    windKt: row?.windKt ?? null,
    gustKt: row?.gustKt ?? null,
    windDir: row?.windDir ?? null,
    swellH: row?.swellH ?? null,
    swellP: row?.swellP ?? null,
    swellDir: row?.swellDir ?? null,
    rainProb: row?.rainProb ?? null,
    temp: row?.temp ?? null,
    waveH: row?.waveH ?? null,
    seaLevel: row?.seaLevel ?? null,
    tideRate: row?.tideRate ?? null,
  };
}

function nextTideAfter(data: AppData, current: HourRow | null): TideExtreme | null {
  const all = data.daily.flatMap(d => d.tideExtremes);
  if (!all.length) return null;
  if (!current) return all[0] ?? null;
  const after = all.find(t => t.time >= current.time);
  return after ?? all[0] ?? null;
}

function isUsefulHour(row: HourRow): boolean {
  // Useful planning hour: daylight-friendly boat rating or strong fishing signal.
  return row.slRank >= 2 || (row.fishStars >= 4 && row.slRank >= 1);
}

export function buildBestWindows(data: AppData, limit = 4): DecisionWindow[] {
  const windows: DecisionWindow[] = [];
  let bucket: HourRow[] = [];

  const flush = () => {
    if (bucket.length < 2) {
      bucket = [];
      return;
    }
    const first = bucket[0];
    const last = bucket[bucket.length - 1];
    const winds = bucket.map(h => h.windKt).filter((v): v is number => v != null);
    const swells = bucket.map(h => h.swellH).filter((v): v is number => v != null);
    const sl = rateSL20(first.windKt, first.swellH, first.swellP, first.waveH, first.windWaveH);
    const peakFish = Math.max(...bucket.map(h => h.fishScore));
    const peakStars = Math.max(...bucket.map(h => h.fishStars));
    const dt = new Date(first.dateStr + "T12:00:00");
    const dateLabel = dt.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
    const drivers: string[] = [];
    if (sl.rank >= 2) drivers.push(`${sl.label} boat rating`);
    if (peakStars >= 4) drivers.push(`${peakStars}★ fishing`);
    if (winds.length && Math.max(...winds) <= 12) drivers.push("lighter wind");
    windows.push({
      date: first.dateStr,
      dateLabel,
      startHour: first.hourLabel,
      endHour: last.hourLabel,
      hours: bucket.length,
      peakFish,
      peakStars,
      sl,
      minWind: winds.length ? Math.min(...winds) : null,
      maxSwell: swells.length ? Math.max(...swells) : null,
      reason: drivers.join(" · ") || "Better than surrounding hours",
    });
    bucket = [];
  };

  for (const row of data.merged) {
    if (isUsefulHour(row)) bucket.push(row);
    else flush();
  }
  flush();

  return windows
    .sort((a, b) => {
      const score = (w: DecisionWindow) => w.sl.rank * 20 + w.peakStars * 8 + Math.min(w.hours, 6);
      return score(b) - score(a) || a.date.localeCompare(b.date) || a.startHour.localeCompare(b.startHour);
    })
    .slice(0, limit);
}

function assessGoNoGo(sl: SL20Rating | null, row: HourRow | null, marineMissing: boolean): GoNoGo {
  if (!sl || !row) return "outlook";
  if (sl.label === "Avoid") return "no-go";
  if (sl.label === "Marginal" || (row.gustKt != null && row.gustKt >= 22) || marineMissing) return "caution";
  if (sl.rank >= 2) return "go";
  return "caution";
}

function buildHeadline(goNoGo: GoNoGo, sl: SL20Rating | null, row: HourRow | null, nextUseful: DecisionWindow | null): { headline: string; supporting: string } {
  if (!row || !sl) {
    return {
      headline: "Waiting on conditions",
      supporting: "Load a spot to see the next fishing and boating window.",
    };
  }
  if (goNoGo === "go") {
    return {
      headline: sl.label === "Excellent" ? "Excellent window now" : "Good to go now",
      supporting: `Boating ${sl.label.toLowerCase()} · fishing ${row.fishStars}★ (${row.fishScore}%). Check wind, swell and tide below before you leave.`,
    };
  }
  if (goNoGo === "no-go") {
    const next = nextUseful
      ? `Next useful window: ${nextUseful.dateLabel} ${nextUseful.startHour}–${nextUseful.endHour}.`
      : "No clear useful window in this forecast range.";
    return {
      headline: "Stay ashore for now",
      supporting: `Current rating is Avoid. ${next}`,
    };
  }
  if (goNoGo === "caution") {
    const next = nextUseful
      ? `Better window looks like ${nextUseful.dateLabel} ${nextUseful.startHour}–${nextUseful.endHour}.`
      : "Watch the hourly trend before committing.";
    return {
      headline: "Marginal — pick your hour",
      supporting: `Conditions are workable only with care. ${next}`,
    };
  }
  return {
    headline: "Outlook only",
    supporting: "Marine detail is limited this far out — treat later days as weather and fishing guidance, not a vessel decision.",
  };
}

function buildWhy(row: HourRow | null, sl: SL20Rating | null, conditions: ConditionSnap): string[] {
  const why: string[] = [];
  if (!row || !sl) return why;
  why.push(`SL20 ${sl.label} from wind ${fmt(conditions.windKt, 0)} kt and period-aware swell.`);
  why.push(`Fishing ${row.fishStars}★ (${row.fishScore}%) from moon, sun and tide-rate timing.`);
  if (conditions.gustKt != null && conditions.windKt != null && conditions.gustKt - conditions.windKt >= 8) {
    why.push(`Gust spread is ${Math.round(conditions.gustKt - conditions.windKt)} kt — expect a bumpier ride than mean wind suggests.`);
  }
  if (conditions.rainProb != null && conditions.rainProb >= 50) {
    why.push(`Rain chance ${Math.round(conditions.rainProb)}% can shut down a otherwise usable window.`);
  }
  return why;
}

function buildRisks(row: HourRow | null, sl: SL20Rating | null, conditions: ConditionSnap, marineMissing: boolean): string[] {
  const risks: string[] = [];
  if (marineMissing) risks.push("Marine swell/tide feed is incomplete — boat rating may be wind-led only.");
  if (sl?.label === "Avoid") risks.push("Avoid rating: wind, chop or steep short-period swell is outside small-boat comfort.");
  if (sl?.label === "Marginal") risks.push("Marginal: only for experienced skippers and suitable vessels.");
  if (conditions.gustKt != null && conditions.gustKt >= 25) risks.push(`Gusts near ${Math.round(conditions.gustKt)} kt — ramp and open-water risk.`);
  if (conditions.swellH != null && conditions.swellH >= 1.5) risks.push(`Swell ${fmt(conditions.swellH)} m — bar and beam-sea risk.`);
  if (conditions.rainProb != null && conditions.rainProb >= 70) risks.push("High rain probability — reduced visibility and comfort.");
  if (row && row.fishStars <= 2 && (sl?.rank ?? 0) >= 2) risks.push("Boatable, but fishing score is soft — do not expect a hot bite.");
  return risks;
}

export function freshnessFromFetchedAt(fetchedAt: string | null, now = new Date()): Pick<DecisionBrief, "freshnessLabel" | "freshnessTone"> {
  if (!fetchedAt) {
    return { freshnessLabel: "Freshness unknown", freshnessTone: "unknown" };
  }
  const ageMin = Math.max(0, Math.round((now.getTime() - new Date(fetchedAt).getTime()) / 60000));
  if (ageMin <= 15) return { freshnessLabel: `Live · updated ${ageMin === 0 ? "just now" : `${ageMin} min ago`}`, freshnessTone: "live" };
  if (ageMin <= 90) return { freshnessLabel: `Updated ${ageMin} min ago`, freshnessTone: "recent" };
  if (ageMin < 60 * 24) {
    const hrs = Math.round(ageMin / 60);
    return { freshnessLabel: `Saved forecast · ${hrs}h old — refresh before you leave`, freshnessTone: "stale" };
  }
  const days = Math.round(ageMin / (60 * 24));
  return { freshnessLabel: `Saved forecast · ${days}d old — refresh before you leave`, freshnessTone: "stale" };
}

export function buildDecisionBrief(
  data: AppData,
  opts?: { fetchedAt?: string | null; cacheSavedAt?: string | null; when?: Date },
): DecisionBrief {
  const when = opts?.when ?? new Date();
  const current = findCurrentHour(data, when);
  const currentSl = current
    ? rateSL20(current.windKt, current.swellH, current.swellP, current.waveH, current.windWaveH)
    : null;
  const conditions = snapFromRow(current);
  const marineMissing = Boolean(data.marineUnavailable) || data.merged.slice(0, 24).every(r => r.swellH == null && r.waveH == null && r.seaLevel == null);
  const marineHorizonShort = (data.requestedDays ?? data.daily.length) > 8;
  const bestWindows = buildBestWindows(data);
  const nextUseful =
    bestWindows.find(w => {
      if (!current) return true;
      const start = `${w.date}T${w.startHour}:00`;
      return start >= current.time.slice(0, 16);
    }) ?? bestWindows[0] ?? null;
  const goNoGo = assessGoNoGo(currentSl, current, marineMissing);
  const { headline, supporting } = buildHeadline(goNoGo, currentSl, current, nextUseful);
  const local = localParts(data.timezone, when);
  // If we are showing a saved copy, never claim "Live" from the embedded fetch time.
  const fetchedAt = opts?.cacheSavedAt
    ? opts.cacheSavedAt
    : (opts?.fetchedAt ?? data.fetchedAt ?? null);
  const freshness = freshnessFromFetchedAt(fetchedAt, when);

  const risks = buildRisks(current, currentSl, conditions, marineMissing);
  if (marineHorizonShort) {
    risks.push("Days 9–14 are weather/fishing outlook only — no swell, chop or SL20 vessel call.");
  }
  if (opts?.cacheSavedAt) {
    risks.unshift("Showing a saved forecast copy — refresh before you leave the ramp.");
  }

  return {
    locationName: data.location.name,
    timezone: data.timezone,
    nowLabel: `${local.weekday} ${String(local.hour).padStart(2, "0")}:${String(local.minute).padStart(2, "0")}`,
    current,
    currentSl,
    goNoGo,
    headline,
    supporting,
    why: buildWhy(current, currentSl, conditions),
    risks,
    conditions,
    nextTide: nextTideAfter(data, current),
    bestWindows,
    nextUseful,
    marineMissing,
    fetchedAt,
    ...freshness,
  };
}

export function formatWindLine(c: ConditionSnap): string {
  if (c.windKt == null) return "—";
  const dir = degToCompass(c.windDir);
  const gust = c.gustKt != null ? ` · gust ${Math.round(c.gustKt)}` : "";
  return `${Math.round(c.windKt)} kt ${dir}${gust}`;
}

export function formatSwellLine(c: ConditionSnap): string {
  if (c.swellH == null) return "—";
  const period = c.swellP != null ? ` @ ${Math.round(c.swellP)}s` : "";
  const dir = c.swellDir != null ? ` ${degToCompass(c.swellDir)}` : "";
  return `${fmt(c.swellH)} m${period}${dir}`;
}

export function formatTideLine(tide: TideExtreme | null): string {
  if (!tide) return "—";
  return `${tide.type} ${fmt(tide.height)} m @ ${tide.time.slice(11, 16)}`;
}
