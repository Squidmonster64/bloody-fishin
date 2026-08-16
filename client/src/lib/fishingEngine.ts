// ─── Types ───────────────────────────────────────────────────────────────────

export interface Location {
  name: string;
  lat: number;
  lon: number;
}

export interface HourRow {
  time: string;
  hour: number;
  dateStr: string;
  dt: Date;
  label: string;
  shortLabel: string;
  hourLabel: string;
  isDayStart: boolean;
  temp: number | null;
  windKt: number | null;
  windDir: number | null;
  gustKt: number | null;
  rainProb: number | null;
  waveH: number | null;
  waveP: number | null;
  windWaveH: number | null;
  swellH: number | null;
  swellP: number | null;
  swellDir: number | null;
  seaLevel: number | null;
  tideRate: number | null;
  fishScore: number;
  fishStars: number;
  slRank: number;
  golden: boolean;
}

export interface TideExtreme {
  type: "High" | "Low";
  time: string;
  height: number;
  hour: number;
  dateStr: string;
}

export interface DayData {
  date: string;
  sunrise: string;
  sunset: string;
  uv: number | null;
  rows: HourRow[];
  morning: HourRow;
  tideExtremes: TideExtreme[];
  moonPhase: number;
  moonName: string;
  moonEmoji: string;
  moonIllum: number;
  moonTransit: number;
  moonUnderfoot: number;
  maxWind: number | null;
  maxTemp: number | null;
  minTemp: number | null;
  maxSwell: number | null;
  peakFish: number;
  bestFishStars: number;
  goldenHours: HourRow[];
  isGolden: boolean;
}

export interface AppData {
  merged: HourRow[];
  daily: DayData[];
  location: Location;
  timezone: string;
}

export interface SL20Rating {
  label: "Excellent" | "Go" | "Marginal" | "Avoid";
  bg: string;
  fg: string;
  rank: number;
}

// ─── Locations ───────────────────────────────────────────────────────────────

export const LOCATIONS: Record<string, Location[]> = {
  "🎯 Spots": [
    { name: "Fremantle Offshore", lat: -32.06, lon: 115.65 },
    { name: "Johnny Big Boy", lat: -25.50945, lon: 113.4971 },
  ],
  "Perth Metro": [
    { name: "Port Coogee Marina", lat: -32.117, lon: 115.757 },
    { name: "Hillarys Boat Harbour", lat: -31.817, lon: 115.733 },
    { name: "Cockburn Sound", lat: -32.15, lon: 115.72 },
    { name: "Cottesloe Beach", lat: -31.995, lon: 115.738 },
    { name: "Rockingham", lat: -32.278, lon: 115.732 },
  ],
  "Rottnest Island": [
    { name: "Thomson Bay", lat: -31.999, lon: 115.543 },
    { name: "Parker Point", lat: -32.019, lon: 115.512 },
    { name: "Parakeet Bay", lat: -31.982, lon: 115.507 },
    { name: "Salmon Bay", lat: -32.024, lon: 115.526 },
    { name: "Rottnest West", lat: -31.998, lon: 115.467 },
  ],
  "North of Perth": [
    { name: "Two Rocks", lat: -31.497, lon: 115.583 },
    { name: "Lancelin", lat: -31.022, lon: 115.328 },
    { name: "Jurien Bay", lat: -30.303, lon: 115.041 },
    { name: "Geraldton Offshore", lat: -28.774, lon: 114.515 },
  ],
  "South of Perth": [
    { name: "Mandurah", lat: -32.53, lon: 115.682 },
    { name: "Bunbury Offshore", lat: -33.327, lon: 115.544 },
    { name: "Busselton", lat: -33.654, lon: 115.347 },
    { name: "Augusta", lat: -34.318, lon: 115.059 },
  ],
  "Shark Bay": [
    { name: "Denham Bay", lat: -25.929, lon: 113.432 },
    { name: "Monkey Mia", lat: -25.792, lon: 113.717 },
    { name: "Dirk Hartog Island", lat: -25.6, lon: 113.1 },
    { name: "Cape Peron", lat: -25.561, lon: 113.547 },
    { name: "Bernier Island", lat: -24.867, lon: 113.133 },
  ],
  "Mid-West Coast": [
    { name: "Kalbarri Offshore", lat: -27.707, lon: 114.063 },
    { name: "Carnarvon Offshore", lat: -24.868, lon: 113.461 },
    { name: "Exmouth Gulf", lat: -22.133, lon: 114.35 },
  ],
  "International – Pacific": [
    { name: "Gold Coast Offshore", lat: -27.97, lon: 153.6 },
    { name: "Cairns Offshore", lat: -16.9, lon: 146.2 },
    { name: "Bali (Benoa)", lat: -8.75, lon: 115.22 },
    { name: "Phuket Offshore", lat: 7.8, lon: 98.3 },
    { name: "Maldives (Male)", lat: 4.17, lon: 73.51 },
    { name: "Hawaii (Honolulu)", lat: 21.31, lon: -157.86 },
    { name: "Fiji (Suva)", lat: -18.14, lon: 178.44 },
  ],
  "International – Atlantic & Med": [
    { name: "Azores (Faial)", lat: 38.53, lon: -28.63 },
    { name: "Canary Islands (Las Palmas)", lat: 28.1, lon: -15.41 },
    { name: "Cape Verde", lat: 14.93, lon: -23.51 },
    { name: "Madeira", lat: 32.65, lon: -16.9 },
    { name: "Costa Rica (Quepos)", lat: 9.4, lon: -84.16 },
    { name: "Bahamas (Nassau)", lat: 25.08, lon: -77.35 },
  ],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function degToCompass(deg: number | null): string {
  if (deg == null) return "—";
  const d = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
  return d[Math.round(deg / 22.5) % 16];
}

export function fmt(v: number | null | undefined, dec = 1): string {
  if (v == null || isNaN(v)) return "—";
  return Number(v).toFixed(dec);
}

export function windColor(kt: number | null): string {
  if (!kt) return "#6b8aad";
  if (kt < 10) return "#3ecf8e";
  if (kt < 16) return "#7eb8f7";
  if (kt < 22) return "#f5a623";
  return "#e05c5c";
}

export function swellColor(h: number | null): string {
  if (!h || h < 0.8) return "#3ecf8e";
  if (h < 1.2) return "#f5a623";
  return "#e05c5c";
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

export function isGolden(input: { windKt: number | null; swellH: number | null; rainProb: number | null; fishStars: number; daylight: boolean }): boolean {
  return input.daylight && (input.windKt ?? Infinity) <= 10 && (input.swellH ?? Infinity) < 1.0 && input.rainProb === 0 && input.fishStars >= 4;
}

// ─── Moon & Solunar ──────────────────────────────────────────────────────────

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

function parseHM(s: string): number | null {
  if (!s) return null;
  const [h, m] = s.split(":").map(Number);
  return h + m / 60;
}

function isDaylightHour(hour: number, sunrise: string, sunset: string): boolean {
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

// ─── Fishing Score ────────────────────────────────────────────────────────────

interface FishingOpts {
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
  if (dMajor < 0.5)      score += 22;
  else if (dMajor < 1)   score += 17;
  else if (dMajor < 1.5) score += 10;
  else if (dMajor < 2)   score += 5;

  const sr = parseHM(sunrise);
  const ss = parseHM(sunset);
  const dMinor = Math.min(
    sr != null ? hrDiff(hour, sr) : 99,
    ss != null ? hrDiff(hour, ss) : 99
  );
  if (dMinor < 0.5)      score += 15;
  else if (dMinor < 1)   score += 10;
  else if (dMinor < 1.5) score += 4;

  const tr = Math.abs(seaLevelRate || 0);
  if (tr > 0.20)      score += 12;
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

// ─── Tide Extremes ────────────────────────────────────────────────────────────

export function findTideExtremes(rows: HourRow[]): TideExtreme[] {
  const extremes: TideExtreme[] = [];
  for (let i = 1; i < rows.length - 1; i++) {
    const prev = rows[i - 1].seaLevel;
    const curr = rows[i].seaLevel;
    const next = rows[i + 1].seaLevel;
    if (curr != null && prev != null && next != null) {
      if (curr > prev && curr > next)
        extremes.push({ type: "High", time: rows[i].time, height: curr, hour: rows[i].hour, dateStr: rows[i].dateStr });
      else if (curr < prev && curr < next)
        extremes.push({ type: "Low", time: rows[i].time, height: curr, hour: rows[i].hour, dateStr: rows[i].dateStr });
    }
  }
  return extremes;
}

// ─── Timezone lookup ─────────────────────────────────────────────────────────

export async function getTimezone(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(
      `https://timeapi.io/api/timezone/coordinate?latitude=${lat}&longitude=${lon}`
    );
    if (res.ok) {
      const data = await res.json();
      if (data.timeZone) return data.timeZone;
    }
  } catch {
    // fallback below
  }
  // Rough fallback: estimate from longitude offset
  const offset = Math.round(lon / 15);
  return `Etc/GMT${offset >= 0 ? "-" : "+"}${Math.abs(offset)}`;
}

// ─── Data Fetch ───────────────────────────────────────────────────────────────

export async function fetchFishingData(loc: Location, days: number, timezone: string): Promise<AppData> {
  const { lat, lon } = loc;
  const marineDays = Math.min(days, 8);

  const weatherUrl =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&hourly=temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation_probability` +
    `&daily=sunrise,sunset,uv_index_max` +
    `&wind_speed_unit=kn&timezone=${encodeURIComponent(timezone)}` +
    `&forecast_days=${days}`;

  const marineUrl =
    `https://marine-api.open-meteo.com/v1/marine` +
    `?latitude=${lat}&longitude=${lon}` +
    `&hourly=wave_height,wave_period,swell_wave_height,swell_wave_period,swell_wave_direction,wind_wave_height,sea_level_height_msl` +
    `&timezone=${encodeURIComponent(timezone)}&forecast_days=${marineDays}&cell_selection=sea`;

  const [wRes, mRes] = await Promise.all([
    fetch(weatherUrl),
    fetch(marineUrl).catch(() => null),
  ]);

  if (!wRes.ok) throw new Error(`Weather API: HTTP ${wRes.status}`);
  const w = await wRes.json();
  const m = mRes && mRes.ok ? await mRes.json() : { hourly: {} };

  const wh = w.hourly || {};
  const mh = m.hourly || {};
  const times: string[] = wh.time || [];
  const marineTimeIdx: Record<string, number> = {};
  (mh.time || []).forEach((t: string, i: number) => { marineTimeIdx[t] = i; });

  const merged: HourRow[] = times.map((t, i) => {
    const dt = new Date(t);
    // Get local hour using the timezone
    const hour = parseInt(
      dt.toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: timezone }),
      10
    ) % 24;
    const dayName = dt.toLocaleString("en-AU", { weekday: "short", timeZone: timezone });
    const mi = marineTimeIdx[t];
    const hasM = mi !== undefined;
    return {
      time: t, hour, dateStr: t.slice(0, 10), dt,
      label: dt.toLocaleString("en-AU", {
        weekday: "short", day: "numeric", month: "short",
        hour: "2-digit", minute: "2-digit", hour12: false, timeZone: timezone,
      }).replace(",", ""),
      shortLabel: [0, 6, 12, 18].includes(hour) ? `${dayName} ${String(hour).padStart(2, "0")}` : "",
      hourLabel: `${String(hour).padStart(2, "0")}:00`,
      isDayStart: hour === 0,
      temp:      (wh.temperature_2m || [])[i] ?? null,
      windKt:    (wh.wind_speed_10m || [])[i] ?? null,
      windDir:   (wh.wind_direction_10m || [])[i] ?? null,
      gustKt:    (wh.wind_gusts_10m || [])[i] ?? null,
      rainProb:  (wh.precipitation_probability || [])[i] ?? null,
      waveH:     hasM ? (mh.wave_height || [])[mi] ?? null : null,
      waveP:     hasM ? (mh.wave_period || [])[mi] ?? null : null,
      windWaveH: hasM ? (mh.wind_wave_height || [])[mi] ?? null : null,
      swellH:    hasM ? (mh.swell_wave_height || [])[mi] ?? null : null,
      swellP:    hasM ? (mh.swell_wave_period || [])[mi] ?? null : null,
      swellDir:  hasM ? (mh.swell_wave_direction || [])[mi] ?? null : null,
      seaLevel:  hasM ? (mh.sea_level_height_msl || [])[mi] ?? null : null,
      tideRate: null,
      fishScore: 0, fishStars: 1, slRank: 0, golden: false,
    };
  });

  // Tide rate of change
  for (let i = 0; i < merged.length; i++) {
    const prev = merged[i - 1]?.seaLevel;
    const next = merged[i + 1]?.seaLevel;
    const curr = merged[i].seaLevel;
    if (curr != null && prev != null && next != null) merged[i].tideRate = (next - prev) / 2;
    else if (curr != null && next != null) merged[i].tideRate = next - curr;
    else if (curr != null && prev != null) merged[i].tideRate = curr - prev;
  }

  const dailyArr: string[] = (w.daily && w.daily.time) ? w.daily.time : [];
  const daily: DayData[] = dailyArr.map((d, i) => {
    const rows = merged.filter(r => r.dateStr === d);
    const winds  = rows.map(r => r.windKt).filter((v): v is number => v != null);
    const temps  = rows.map(r => r.temp).filter((v): v is number => v != null);
    const swells = rows.map(r => r.swellH).filter((v): v is number => v != null);
    const r9 = rows.find(r => r.hour === 9) || rows[0];
    const sunrise = (w.daily.sunrise[i] || "").slice(11, 16);
    const sunset  = (w.daily.sunset[i]  || "").slice(11, 16);
    const dayMidday = new Date(`${d}T12:00:00`);
    const moonTimes = moonTransitTimes(dayMidday, sunrise, sunset);

    rows.forEach(row => {
      const f = fishingScore({
        hour: row.hour, seaLevelRate: row.tideRate, sunrise, sunset, moonTimes,
      });
      row.fishScore = f.score;
      row.fishStars = f.stars;
      const sl = rateSL20(row.windKt, row.swellH, row.swellP, row.waveH, row.windWaveH);
      row.slRank = sl.rank;
      row.golden = isGolden({
        windKt: row.windKt,
        swellH: row.swellH,
        rainProb: row.rainProb,
        fishStars: f.stars,
        daylight: isDaylightHour(row.hour, sunrise, sunset),
      });
    });

    const fishScores = rows.map(r => r.fishScore);
    const goldenHours = rows.filter(r => r.golden);

    return {
      date: d, sunrise, sunset, uv: w.daily.uv_index_max?.[i] ?? null,
      rows, morning: r9,
      tideExtremes: findTideExtremes(rows),
      moonPhase: moonTimes.phase,
      moonName: moonPhaseName(moonTimes.phase),
      moonEmoji: moonPhaseEmoji(moonTimes.phase),
      moonIllum: moonIllumination(moonTimes.phase),
      moonTransit: moonTimes.transit,
      moonUnderfoot: moonTimes.underfoot,
      maxWind: winds.length ? Math.max(...winds) : null,
      maxTemp: temps.length ? Math.max(...temps) : null,
      minTemp: temps.length ? Math.min(...temps) : null,
      maxSwell: swells.length ? Math.max(...swells) : null,
      peakFish: fishScores.length ? Math.max(...fishScores) : 0,
      bestFishStars: rows.length ? Math.max(...rows.map(r => r.fishStars)) : 0,
      goldenHours,
      isGolden: goldenHours.length > 0,
    };
  });

  return { merged, daily, location: loc, timezone };
}
