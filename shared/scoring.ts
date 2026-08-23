/**
 * Shared deterministic scoring authority for browser + /brief*.
 * Thresholds and formulas are intentional — do not change without evidence.
 */

export interface SL20Rating {
  label: "Excellent" | "Go" | "Marginal" | "Avoid";
  bg: string;
  fg: string;
  rank: number;
}

/**
 * SL20 boating rating.
 *
 * Wind sets the primary band: Go below 15 kt, Marginal from 15–20 kt and
 * Avoid above 20 kt. Swell is a separate period-aware modifier: short-period
 * swell and wind chop can downgrade a rating, while clean long-period swell
 * is treated more gently than total wave height. It is a small-boat planning
 * guide, not a substitute for skipper judgement or official marine warnings.
 */
export function rateSL20(
  windKt: number | null,
  swellH: number | null,
  swellP: number | null,
  waveH: number | null,
  windWaveH: number | null = null,
): SL20Rating {
  const wind = Math.max(0, windKt ?? 0);
  const swell = Math.max(0, swellH ?? 0);
  const period = Math.max(1, swellP ?? 9);
  const totalWave = Math.max(0, waveH ?? 0);

  // Long-period groundswell is generally more orderly than short-period chop.
  // The factor represents the portion of swell height that affects a 20 ft
  // runabout's ride. Short-period swell gets the full penalty; 13+ sec swell
  // is discounted to 45%.
  const periodFactor = period >= 14 ? 0.35 : period >= 12 ? 0.45 : period >= 10 ? 0.60 : period >= 8 ? 0.80 : 1.0;
  // Prefer marine API's wind-wave value. If unavailable, infer chop conservatively
  // from the portion of total wave not accounted for by the primary swell.
  const inferredWindChop = Math.max(0, totalWave - swell * 0.72);
  const windChop = Math.max(0, windWaveH ?? inferredWindChop);
  const shortPeriodSwell = swell * periodFactor;

  // Wind is the clear primary classification. Severe chop or steep, short swell
  // can still override a calm wind rating, but clean groundswell alone cannot.
  if (wind > 20 || windChop > 1.5 || (period < 8 && swell > 2.0)) {
    return { label: "Avoid", bg: "rgba(224,92,92,0.2)", fg: "#e05c5c", rank: 0 };
  }
  if (wind >= 15 || windChop > 1.1 || (period < 8 && swell > 1.2) || (period < 10 && shortPeriodSwell > 1.35)) {
    return { label: "Marginal", bg: "rgba(245,166,35,0.2)", fg: "#f5a623", rank: 1 };
  }
  if (wind <= 10 && windChop <= 0.35 && swell < 1.0) {
    return { label: "Excellent", bg: "rgba(62,207,142,0.2)", fg: "#3ecf8e", rank: 3 };
  }
  return { label: "Go", bg: "rgba(126,184,247,0.2)", fg: "#7eb8f7", rank: 2 };
}

export function isGolden(input: {
  windKt: number | null;
  swellH: number | null;
  rainProb: number | null;
  fishStars: number;
  daylight: boolean;
}): boolean {
  return (
    input.daylight &&
    (input.windKt ?? Infinity) <= 10 &&
    (input.swellH ?? Infinity) < 1.0 &&
    input.rainProb === 0 &&
    input.fishStars >= 4
  );
}

export function moonPhase(date: Date): number {
  const ref = new Date("2000-01-06T18:14:00Z").getTime();
  const synodic = 29.53058867;
  const diff = (date.getTime() - ref) / (1000 * 60 * 60 * 24);
  let p = (diff / synodic) % 1;
  if (p < 0) p += 1;
  return p;
}

export function moonIllumination(phase: number): number {
  return (1 - Math.cos(2 * Math.PI * phase)) / 2;
}

export function moonPhaseName(phase: number): string {
  if (phase < 0.03 || phase > 0.97) return "New Moon";
  if (phase < 0.22) return "Waxing Crescent";
  if (phase < 0.28) return "First Quarter";
  if (phase < 0.47) return "Waxing Gibbous";
  if (phase < 0.53) return "Full Moon";
  if (phase < 0.72) return "Waning Gibbous";
  if (phase < 0.78) return "Last Quarter";
  return "Waning Crescent";
}

export function moonPhaseEmoji(phase: number): string {
  if (phase < 0.03 || phase > 0.97) return "🌑";
  if (phase < 0.22) return "🌒";
  if (phase < 0.28) return "🌓";
  if (phase < 0.47) return "🌔";
  if (phase < 0.53) return "🌕";
  if (phase < 0.72) return "🌖";
  if (phase < 0.78) return "🌗";
  return "🌘";
}

export function parseHM(s: string): number | null {
  if (!s) return null;
  const [h, m] = s.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h + m / 60;
}

export function isDaylightHour(hour: number, sunrise: string, sunset: string): boolean {
  const sr = parseHM(sunrise);
  const ss = parseHM(sunset);
  return sr == null || ss == null || (hour >= sr && hour <= ss);
}

export function moonTransitTimes(date: Date, sunriseStr: string, sunsetStr: string) {
  const sr = parseHM(sunriseStr);
  const ss = parseHM(sunsetStr);
  if (sr == null || ss == null) return { transit: 12, underfoot: 0, phase: moonPhase(date) };
  const solarNoon = (sr + ss) / 2;
  const phase = moonPhase(date);
  const transit = (solarNoon + phase * 24) % 24;
  const underfoot = (transit + 12) % 24;
  return { transit, underfoot, phase };
}

export interface FishingOpts {
  hour: number;
  seaLevelRate: number | null;
  sunrise: string;
  sunset: string;
  moonTimes: { transit: number; underfoot: number; phase: number };
}

export function fishingScore(opts: FishingOpts): { score: number; stars: number } {
  const { hour, seaLevelRate, sunrise, sunset, moonTimes } = opts;
  let score = 35;

  const illum = moonIllumination(moonTimes.phase);
  if (illum > 0.97 || illum < 0.03) score += 20;
  else if (illum > 0.85 || illum < 0.15) score += 13;
  else if (illum > 0.65 || illum < 0.35) score += 5;

  const hrDiff = (a: number, b: number) => {
    let d = Math.abs(a - b);
    if (d > 12) d = 24 - d;
    return d;
  };
  const dMajor = Math.min(hrDiff(hour, moonTimes.transit), hrDiff(hour, moonTimes.underfoot));
  if (dMajor < 0.5) score += 22;
  else if (dMajor < 1) score += 17;
  else if (dMajor < 1.5) score += 10;
  else if (dMajor < 2) score += 5;

  const sr = parseHM(sunrise);
  const ss = parseHM(sunset);
  const dMinor = Math.min(sr != null ? hrDiff(hour, sr) : 99, ss != null ? hrDiff(hour, ss) : 99);
  if (dMinor < 0.5) score += 15;
  else if (dMinor < 1) score += 10;
  else if (dMinor < 1.5) score += 4;

  const tr = Math.abs(seaLevelRate || 0);
  if (tr > 0.2) score += 12;
  else if (tr > 0.12) score += 10;
  else if (tr > 0.06) score += 5;
  else if (tr < 0.01) score -= 4;

  score = Math.max(5, Math.min(100, score));

  let stars = 1;
  if (score >= 82) stars = 5;
  else if (score >= 70) stars = 4;
  else if (score >= 55) stars = 3;
  else if (score >= 40) stars = 2;

  return { score: Math.round(score), stars };
}

/** True when an hour has enough marine fields for an SL20 vessel call. */
export function hasMarineForVessel(input: {
  swellH: number | null;
  waveH: number | null;
  windWaveH?: number | null;
  seaLevel?: number | null;
}): boolean {
  return input.swellH != null || input.waveH != null || input.windWaveH != null;
}
