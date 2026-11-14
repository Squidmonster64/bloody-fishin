import { hourBucketEnd, localHourKey } from "@shared/forecastTime";
/**
 * decisionBrief — derive a mobile-first decision summary from AppData.
 * Pure helpers only; does not change SL20 / fishing scoring.
 */
import {
  degToCompass,
  fmt,
  hasMarineForVessel,
  callForRow,
  type AppData,
  type HourRow,
  type SL20Rating,
  type TideExtreme,
} from "@/lib/fishingEngine";

export type GoNoGo = "go" | "caution" | "no-go" | "outlook";

const FORECAST_AGE_LIMITS_HOURS = {
  staleBanner: 3,
  noCall: 6,
} as const;

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
  /** False when the window lacks marine fields for an authoritative vessel call. */
  vesselAssessment: boolean;
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
  return !row.thunderstorm && hasMarineForVessel(row) && callForRow(row).state === "inside";
}

function windowFromBucket(bucket: HourRow[]): DecisionWindow | null {
  if (bucket.length < 2) return null;
  const first = bucket[0];
  const last = bucket[bucket.length - 1];
  const winds = bucket.map(h => h.windKt).filter((v): v is number => v != null);
  const swells = bucket.map(h => h.swellH).filter((v): v is number => v != null);
  const marineOk = bucket.some(h => hasMarineForVessel(h));
  const sl = bucket.map(row => callForRow(row).legacy).reduce((worst, rating) => rating.rank < worst.rank ? rating : worst);
  const peakFish = Math.max(...bucket.map(h => h.fishScore));
  const peakStars = Math.max(...bucket.map(h => h.fishStars));
  const dt = new Date(first.dateStr + "T12:00:00");
  const dateLabel = dt.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
  const drivers: string[] = [];
  if (marineOk && sl.rank >= 2) drivers.push(`${sl.label} boat rating`);
  if (winds.length && Math.max(...winds) <= 12) drivers.push("lighter wind");
  return {
    date: first.dateStr,
    dateLabel,
    startHour: first.hourLabel,
    endHour: hourBucketEnd(last.time).slice(11, 16),
    hours: bucket.length,
    peakFish,
    peakStars,
    sl,
    vesselAssessment: marineOk,
    minWind: winds.length ? Math.min(...winds) : null,
    maxSwell: swells.length ? Math.max(...swells) : null,
    reason: drivers.join(" · ") || "Better than surrounding hours",
  };
}

/** Chronological useful windows (unsorted by strength). */
export function buildChronologicalWindows(data: AppData): DecisionWindow[] {
  const windows: DecisionWindow[] = [];
  let bucket: HourRow[] = [];
  const flush = () => {
    const w = windowFromBucket(bucket);
    bucket = [];
    if (w) windows.push(w);
  };
  for (const row of data.merged) {
    const previous = bucket.at(-1);
    if (previous && (previous.dateStr !== row.dateStr || Date.parse(`${row.time}:00Z`) - Date.parse(`${previous.time}:00Z`) !== 3600000)) flush();
    if (isUsefulHour(row)) bucket.push(row);
    else flush();
  }
  flush();
  return windows;
}

/** Ranked strongest upcoming windows — not necessarily next chronological. */
export function buildBestWindows(data: AppData, limit = 4): DecisionWindow[] {
  return buildChronologicalWindows(data)
    .sort((a, b) => {
      const vesselRank = (w: DecisionWindow) => w.vesselAssessment ? w.sl.rank : 0;
      return vesselRank(b) - vesselRank(a) || b.hours - a.hours || a.date.localeCompare(b.date) || a.startHour.localeCompare(b.startHour);
    })
    .slice(0, limit);
}

/** First chronological future useful window at/after `current`. */
export function findNextUsefulWindow(data: AppData, current: HourRow | null): DecisionWindow | null {
  const chronological = buildChronologicalWindows(data);
  if (!current) return chronological[0] ?? null;
  return (
    chronological.find(w => {
      const start = `${w.date}T${w.startHour}:00`;
      return start >= current.time.slice(0, 16);
    }) ?? null
  );
}

function assessGoNoGo(sl: SL20Rating | null, row: HourRow | null, marineMissing: boolean): GoNoGo {
  if (!row) return "outlook";
  const call = callForRow(row);
  if (marineMissing || call.state === "no-call" || !sl) return "outlook";
  if (call.state === "outside") return "no-go";
  if (call.state === "marginal" || (row.gustKt != null && row.gustKt >= 22)) return "caution";
  if (call.state === "inside") return "go";
  return "caution";
}

function buildHeadline(goNoGo: GoNoGo, sl: SL20Rating | null, row: HourRow | null, nextUseful: DecisionWindow | null): { headline: string; supporting: string } {
  if (row && callForRow(row).reasons.includes("dark")) {
    return { headline: "Night — no boating call.", supporting: "This hour is outside daylight." };
  }
  if (!row) {
    return {
      headline: "Waiting on conditions",
      supporting: "Load a spot to see the next fishing and boating window.",
    };
  }
  if (goNoGo === "outlook" || !sl) {
    const next = nextUseful
      ? ` Next usable window: ${nextUseful.dateLabel} ${nextUseful.startHour}–${nextUseful.endHour}.`
      : "";
    return {
      headline: "Outlook only — vessel call unavailable",
      supporting: `Marine detail is incomplete for a full SL20 vessel assessment.${next} Weather and fishing outlook may still help planning.`,
    };
  }
  if (goNoGo === "go") {
    return {
      headline: sl.label === "Excellent" ? "Excellent window now" : "Good to go now",
      supporting: `Boating ${sl.label.toLowerCase()} · fishing outlook ${row.fishStars}★. Check wind, swell and model sea level below before you leave.`,
    };
  }
  if (goNoGo === "no-go") {
    const next = nextUseful
      ? `Next usable window: ${nextUseful.dateLabel} ${nextUseful.startHour}–${nextUseful.endHour}.`
      : "No clear useful window in this forecast range.";
    return {
      headline: "Stay ashore for now",
      supporting: `Current rating is Avoid. ${next}`,
    };
  }
  if (goNoGo === "caution") {
    const next = nextUseful
      ? `Next usable window: ${nextUseful.dateLabel} ${nextUseful.startHour}–${nextUseful.endHour}.`
      : "Watch the hourly trend before committing.";
    return {
      headline: "Marginal — pick your hour",
      supporting: `Conditions are workable only with care. ${next}`,
    };
  }
  const next = nextUseful
    ? ` Next usable window: ${nextUseful.dateLabel} ${nextUseful.startHour}–${nextUseful.endHour}.`
    : "";
  return {
    headline: "Outlook only — vessel call unavailable",
    supporting: `Marine detail is incomplete for a full SL20 vessel assessment.${next} Weather and fishing outlook may still help planning.`,
  };
}

function buildWhy(row: HourRow | null, sl: SL20Rating | null, conditions: ConditionSnap, marineOk: boolean): string[] {
  const why: string[] = [];
  if (!row) return why;
  const call = callForRow(row);
  if (call.reasons.includes("dark")) why.push("Night — outside daylight.");
  else if (call.state === "no-call" || !sl || !marineOk) why.push("Vessel SL20 not authoritative this hour — marine or daylight data is incomplete.");
  else why.push(`SL20 ${sl.label} from wind ${fmt(conditions.windKt, 0)} kt and period-aware swell.`);
  why.push(`Fishing outlook ${row.fishStars}★ is a planning heuristic from approximate moon, sun and model sea-level timing.`);
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
  const dark = row ? callForRow(row).reasons.includes("dark") : false;
  if (marineMissing) risks.push("Marine swell/tide feed is incomplete — vessel assessment unavailable (not a complete SL20 call).");
  if (!dark && sl?.label === "Avoid") risks.push("Avoid rating: wind, chop or steep short-period swell is outside small-boat comfort.");
  if (!dark && sl?.label === "Marginal") risks.push("Marginal: only for experienced skippers and suitable vessels.");
  if (conditions.gustKt != null && conditions.gustKt >= 25) risks.push(`Gusts near ${Math.round(conditions.gustKt)} kt — ramp and open-water risk.`);
  if (conditions.swellH != null && conditions.swellH >= 1.5) risks.push(`Swell ${fmt(conditions.swellH)} m — bar and beam-sea risk.`);
  if (conditions.rainProb != null && conditions.rainProb >= 70) risks.push("High rain probability — reduced visibility and comfort.");
  return risks;
}

export function freshnessFromFetchedAt(fetchedAt: string | null, now = new Date()): Pick<DecisionBrief, "freshnessLabel" | "freshnessTone"> {
  if (!fetchedAt) {
    return { freshnessLabel: "Freshness unknown", freshnessTone: "unknown" };
  }
  const ageMin = Math.max(0, Math.round((now.getTime() - new Date(fetchedAt).getTime()) / 60000));
  if (ageMin <= 15) return { freshnessLabel: `Forecast refreshed ${ageMin === 0 ? "just now" : `${ageMin} min ago`}`, freshnessTone: "live" };
  if (ageMin <= 90) return { freshnessLabel: `Forecast refreshed ${ageMin} min ago`, freshnessTone: "recent" };
  if (ageMin < 60 * 24) {
    const hrs = Math.round(ageMin / 60);
    return { freshnessLabel: `Saved forecast · ${hrs}h old — refresh before you leave`, freshnessTone: "stale" };
  }
  const days = Math.round(ageMin / (60 * 24));
  return { freshnessLabel: `Saved forecast · ${days}d old — refresh before you leave`, freshnessTone: "stale" };
}

function forecastAgeHours(fetchedAt: string | null, now: Date): number | null {
  if (!fetchedAt) return null;
  const timestamp = Date.parse(fetchedAt);
  return Number.isFinite(timestamp) ? Math.max(0, (now.getTime() - timestamp) / 3_600_000) : null;
}

export function buildDecisionBrief(
  data: AppData,
  opts?: { fetchedAt?: string | null; cacheSavedAt?: string | null; when?: Date },
): DecisionBrief {
  const when = opts?.when ?? new Date();
  const current = findCurrentHour(data, when);
  const conditions = snapFromRow(current);
  const marineMissing = Boolean(data.marineUnavailable) || data.merged.slice(0, 24).every(r => !hasMarineForVessel(r));
  const currentMarineOk = current ? hasMarineForVessel(current) : false;
  // Compute SL20 for diagnostics, but do not present an authoritative vessel call without marine fields.
  const currentCall = current ? callForRow(current) : null;
  const computedSl = currentCall?.legacy ?? null;
  const marineHorizonShort = (data.requestedDays ?? data.daily.length) > 8;
  const futureData = { ...data, merged: data.merged.filter(row => row.time >= localHourKey(data.timezone, when)) };
  const bestWindows = buildBestWindows(futureData);
  const nextUseful = findNextUsefulWindow(futureData, current);
  // If we are showing a saved copy, never claim "Live" from the embedded fetch time.
  const fetchedAt = opts?.cacheSavedAt
    ? opts.cacheSavedAt
    : (opts?.fetchedAt ?? data.fetchedAt ?? null);
  const ageHours = forecastAgeHours(fetchedAt, when);
  const staleForecast = ageHours !== null && ageHours > FORECAST_AGE_LIMITS_HOURS.staleBanner;
  const staleHeadline = ageHours !== null && ageHours > FORECAST_AGE_LIMITS_HOURS.noCall
    ? {
        headline: `No call. Forecast is ${Math.round(ageHours)} h old. Refresh before you plan.`,
        supporting: "Refresh the forecast before planning a trip.",
      }
    : null;
  const currentSl = !staleHeadline && currentMarineOk && currentCall?.state !== "no-call" ? computedSl : null;
  let freshness = freshnessFromFetchedAt(fetchedAt, when);
  if (staleForecast && freshness.freshnessTone !== "stale") {
    const roundedAge = Math.round(ageHours);
    freshness = {
      freshnessLabel: `Saved forecast · ${roundedAge}h old — refresh before you leave`,
      freshnessTone: "stale",
    };
  }
  const goNoGo = staleHeadline ? "outlook" : assessGoNoGo(currentSl, current, marineMissing || !currentMarineOk);
  const { headline, supporting } = staleHeadline ?? buildHeadline(goNoGo, currentSl, current, nextUseful);
  const local = localParts(data.timezone, when);

  const risks = buildRisks(current, currentSl, conditions, marineMissing);
  if (current?.thunderstorm) risks.unshift("Thunderstorm risk — avoid boating; check the official forecast.");
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
    why: buildWhy(current, currentSl, conditions, currentMarineOk),
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
  return `${tide.type} ${fmt(tide.height)} m MSL @ ${tide.time.slice(11, 16)}`;
}
