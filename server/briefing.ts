/**
 * Public, keyless briefing service for people and browsing-enabled LLMs.
 * It queries Open-Meteo directly at request time; no user spot or profile data
 * is stored on the server.
 */
import type { Request } from "express";

type Location = { name: string; lat: number; lon: number };
type Rating = { label: "Excellent" | "Go" | "Marginal" | "Avoid"; rank: number };
type Hour = {
  time: string; date: string; hour: number; windKt: number | null; gustKt: number | null;
  rainProb: number | null; temp: number | null; waveH: number | null; swellH: number | null;
  swellP: number | null; windWaveH: number | null; tideRate: number | null; daylight: boolean;
  fishScore: number; fishStars: number; sl20: Rating;
};

type Criteria = {
  minRank: number; minStars: number; maxWind: number; maxGust: number | null;
  maxSwell: number | null; maxChop: number | null; maxRain: number | null;
  daylightOnly: boolean; minHours: number;
};

const KNOWN_SPOTS: Record<string, Location> = {
  freo: { name: "Fremantle Offshore", lat: -32.06, lon: 115.65 },
  "fremantle offshore": { name: "Fremantle Offshore", lat: -32.06, lon: 115.65 },
  johnny: { name: "Johnny Big Boy", lat: -25.50945, lon: 113.4971 },
  "johnny big boy": { name: "Johnny Big Boy", lat: -25.50945, lon: 113.4971 },
};

const VESSELS: Record<string, Criteria> = {
  tinnie: { minRank: 2, minStars: 3, maxWind: 12, maxGust: 17, maxSwell: 0.5, maxChop: 0.3, maxRain: 50, daylightOnly: true, minHours: 3 },
  sl20: { minRank: 2, minStars: 4, maxWind: 10, maxGust: null, maxSwell: 0.99, maxChop: null, maxRain: 0, daylightOnly: true, minHours: 3 },
  offshore: { minRank: 1, minStars: 3, maxWind: 22, maxGust: 30, maxSwell: 2, maxChop: 1, maxRain: 85, daylightOnly: false, minHours: 3 },
  kayak: { minRank: 3, minStars: 3, maxWind: 8, maxGust: 12, maxSwell: 0.3, maxChop: 0.2, maxRain: 40, daylightOnly: true, minHours: 3 },
};

const numberParam = (value: unknown, fallback: number, min: number, max: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
};

const optionalNumberParam = (value: unknown, min: number, max: number) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
};

const formatHour = (time: string) => `${time.slice(0, 10)} ${time.slice(11, 16)}`;
const parseHM = (value: string) => {
  const [hour, minute] = value.slice(-5).split(":").map(Number);
  return Number.isFinite(hour) && Number.isFinite(minute) ? hour + minute / 60 : null;
};

function moonPhase(date: Date) {
  const reference = new Date("2000-01-06T18:14:00Z").getTime();
  const cycleDays = 29.53058867;
  const diffDays = (date.getTime() - reference) / 86_400_000;
  const phase = (diffDays / cycleDays) % 1;
  return phase < 0 ? phase + 1 : phase;
}

function rateSL20(windKt: number | null, swellH: number | null, swellP: number | null, waveH: number | null, windWaveH: number | null): Rating {
  const wind = Math.max(0, windKt ?? 0);
  const swell = Math.max(0, swellH ?? 0);
  const period = Math.max(1, swellP ?? 9);
  const totalWave = Math.max(0, waveH ?? 0);
  const periodFactor = period >= 14 ? 0.35 : period >= 12 ? 0.45 : period >= 10 ? 0.6 : period >= 8 ? 0.8 : 1;
  const chop = Math.max(0, windWaveH ?? Math.max(0, totalWave - swell * 0.72));
  const shortPeriodSwell = swell * periodFactor;
  if (wind > 20 || chop > 1.5 || (period < 8 && swell > 2.0)) return { label: "Avoid", rank: 0 };
  if (wind >= 15 || chop > 1.1 || (period < 8 && swell > 1.2) || (period < 10 && shortPeriodSwell > 1.35)) return { label: "Marginal", rank: 1 };
  if (wind <= 10 && chop <= 0.35 && swell < 1.0) return { label: "Excellent", rank: 3 };
  return { label: "Go", rank: 2 };
}

function scoreFishing(hour: number, tideRate: number | null, sunrise: string, sunset: string, phase: number) {
  let score = 35;
  const illumination = (1 - Math.cos(2 * Math.PI * phase)) / 2;
  if (illumination > 0.97 || illumination < 0.03) score += 20;
  else if (illumination > 0.85 || illumination < 0.15) score += 13;
  else if (illumination > 0.65 || illumination < 0.35) score += 5;
  const sunriseHour = parseHM(sunrise);
  const sunsetHour = parseHM(sunset);
  const solarNoon = sunriseHour !== null && sunsetHour !== null ? (sunriseHour + sunsetHour) / 2 : 12;
  const transit = (solarNoon + phase * 24) % 24;
  const underfoot = (transit + 12) % 24;
  const hourDiff = (a: number, b: number) => Math.min(Math.abs(a - b), 24 - Math.abs(a - b));
  const major = Math.min(hourDiff(hour, transit), hourDiff(hour, underfoot));
  if (major < 0.5) score += 22; else if (major < 1) score += 17; else if (major < 1.5) score += 10; else if (major < 2) score += 5;
  const minor = Math.min(sunriseHour === null ? 99 : hourDiff(hour, sunriseHour), sunsetHour === null ? 99 : hourDiff(hour, sunsetHour));
  if (minor < 0.5) score += 15; else if (minor < 1) score += 10; else if (minor < 1.5) score += 4;
  const tide = Math.abs(tideRate ?? 0);
  if (tide > 0.2) score += 12; else if (tide > 0.12) score += 10; else if (tide > 0.06) score += 5; else if (tide < 0.01) score -= 4;
  score = Math.round(Math.max(5, Math.min(100, score)));
  const stars = score >= 82 ? 5 : score >= 70 ? 4 : score >= 55 ? 3 : score >= 40 ? 2 : 1;
  return { score, stars };
}

async function resolvePlace(place: string): Promise<Location> {
  const search = async (term: string) => {
    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
    url.searchParams.set("name", term);
    url.searchParams.set("count", "1");
    url.searchParams.set("language", "en");
    url.searchParams.set("format", "json");
    const response = await fetch(url);
    if (!response.ok) throw new Error("Place lookup is temporarily unavailable.");
    return response.json() as Promise<{ results?: Array<{ name: string; latitude: number; longitude: number; admin1?: string; country?: string }> }>;
  };
  let data = await search(place);
  if (!data.results?.length) {
    const simplerPlace = place.replace(/[\s,]+(?:WA|NSW|VIC|QLD|SA|TAS|NT|ACT|Australia|United States|USA|UK)$/i, "").trim();
    if (simplerPlace && simplerPlace !== place) data = await search(simplerPlace);
  }
  const match = data.results?.[0];
  if (!match) throw new Error(`No location was found for “${place}”. Use latitude and longitude instead.`);
  return { name: [match.name, match.admin1, match.country].filter(Boolean).join(", "), lat: match.latitude, lon: match.longitude };
}

export async function resolveLocation(query: Request["query"]): Promise<Location> {
  const lat = optionalNumberParam(query.lat, -90, 90);
  const lon = optionalNumberParam(query.lon, -180, 180);
  if (lat !== null && lon !== null) {
    const name = typeof query.name === "string" && query.name.trim() ? query.name.trim() : `Custom (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
    return { name, lat, lon };
  }
  const token = typeof query.spot === "string" ? query.spot.trim().toLowerCase() : "";
  if (token && KNOWN_SPOTS[token]) return KNOWN_SPOTS[token];
  const place = typeof query.place === "string" ? query.place.trim() : token;
  return place ? resolvePlace(place) : KNOWN_SPOTS.freo;
}

function criteriaFromQuery(query: Request["query"]) {
  const vessel = typeof query.vessel === "string" ? query.vessel.toLowerCase() : "sl20";
  const mode = query.mode === "wind" ? "wind" as const : "vessel" as const;
  const base = VESSELS[vessel] ?? VESSELS.sl20;
  const criteria: Criteria = {
    minRank: numberParam(query.minRank, base.minRank, 0, 3),
    minStars: numberParam(query.minStars, base.minStars, 1, 5),
    maxWind: numberParam(query.maxWind, base.maxWind, 0, 80),
    maxGust: optionalNumberParam(query.maxGust, 0, 120) ?? base.maxGust,
    maxSwell: optionalNumberParam(query.maxSwell, 0, 20) ?? base.maxSwell,
    maxChop: optionalNumberParam(query.maxChop, 0, 10) ?? base.maxChop,
    maxRain: optionalNumberParam(query.maxRain, 0, 100) ?? base.maxRain,
    daylightOnly: query.daylight === "1" || query.daylight === "true" || (query.daylight === undefined && mode === "vessel" && base.daylightOnly),
    minHours: numberParam(query.minHours, base.minHours, 1, 24),
  };
  return { vessel: VESSELS[vessel] ? vessel : "sl20", criteria, mode };
}

function eligible(hour: Hour, criteria: Criteria, mode: "wind" | "vessel") {
  if ((hour.windKt ?? Infinity) > criteria.maxWind) return false;
  if (criteria.maxGust !== null && (hour.gustKt ?? Infinity) > criteria.maxGust) return false;
  if (criteria.daylightOnly && !hour.daylight) return false;
  if (mode === "wind") return true;
  if (hour.sl20.rank < criteria.minRank || hour.fishStars < criteria.minStars) return false;
  if (criteria.maxSwell !== null && (hour.swellH ?? Infinity) > criteria.maxSwell) return false;
  if (criteria.maxChop !== null && (hour.windWaveH ?? Infinity) > criteria.maxChop) return false;
  if (criteria.maxRain !== null && (hour.rainProb ?? Infinity) > criteria.maxRain) return false;
  return true;
}

function makeWindows(hours: Hour[], criteria: Criteria, mode: "wind" | "vessel") {
  const windows: Hour[][] = [];
  let run: Hour[] = [];
  for (const hour of hours) {
    if (eligible(hour, criteria, mode)) run.push(hour);
    else { if (run.length >= criteria.minHours) windows.push(run); run = []; }
  }
  if (run.length >= criteria.minHours) windows.push(run);
  return windows.map((run) => ({
    start: formatHour(run[0].time), end: formatHour(run[run.length - 1].time), durationHours: run.length,
    averageWindKt: Number((run.reduce((sum, item) => sum + (item.windKt ?? 0), 0) / run.length).toFixed(1)),
    maxWindKt: Math.max(...run.map((item) => item.windKt ?? 0)),
    bestFishScore: Math.max(...run.map((item) => item.fishScore)),
    bestFishStars: Math.max(...run.map((item) => item.fishStars)),
    sl20: Array.from(new Set(run.map((item) => item.sl20.label))).join(" / "),
  }));
}

async function forecast(location: Location, days: number): Promise<{ timezone: string; hours: Hour[] }> {
  const weather = new URL("https://api.open-meteo.com/v1/forecast");
  weather.search = new URLSearchParams({ latitude: String(location.lat), longitude: String(location.lon), hourly: "temperature_2m,wind_speed_10m,wind_gusts_10m,precipitation_probability", daily: "sunrise,sunset", wind_speed_unit: "kn", timezone: "auto", forecast_days: String(days) }).toString();
  const marine = new URL("https://marine-api.open-meteo.com/v1/marine");
  marine.search = new URLSearchParams({ latitude: String(location.lat), longitude: String(location.lon), hourly: "wave_height,swell_wave_height,swell_wave_period,wind_wave_height,sea_level_height_msl", timezone: "auto", forecast_days: String(Math.min(days, 8)), cell_selection: "sea" }).toString();
  const [weatherResponse, marineResponse] = await Promise.all([fetch(weather), fetch(marine).catch(() => null)]);
  if (!weatherResponse.ok) throw new Error(`Weather provider returned HTTP ${weatherResponse.status}.`);
  const weatherData = await weatherResponse.json() as any;
  const marineData = marineResponse?.ok ? await marineResponse.json() as any : { hourly: {} };
  const wh = weatherData.hourly ?? {};
  const mh = marineData.hourly ?? {};
  const marineIndex = new Map<string, number>((mh.time ?? []).map((time: string, index: number) => [time, index]));
  const dailyByDate = new Map<string, { sunrise: string; sunset: string }>((weatherData.daily?.time ?? []).map((date: string, index: number) => [date, { sunrise: weatherData.daily.sunrise?.[index] ?? "", sunset: weatherData.daily.sunset?.[index] ?? "" }]));
  const raw = (wh.time ?? []).map((time: string, index: number) => {
    const marineAt = marineIndex.get(time);
    return { time, date: time.slice(0, 10), hour: Number(time.slice(11, 13)), windKt: wh.wind_speed_10m?.[index] ?? null, gustKt: wh.wind_gusts_10m?.[index] ?? null, rainProb: wh.precipitation_probability?.[index] ?? null, temp: wh.temperature_2m?.[index] ?? null, waveH: marineAt === undefined ? null : mh.wave_height?.[marineAt] ?? null, swellH: marineAt === undefined ? null : mh.swell_wave_height?.[marineAt] ?? null, swellP: marineAt === undefined ? null : mh.swell_wave_period?.[marineAt] ?? null, windWaveH: marineAt === undefined ? null : mh.wind_wave_height?.[marineAt] ?? null, seaLevel: marineAt === undefined ? null : mh.sea_level_height_msl?.[marineAt] ?? null };
  });
  return {
    timezone: weatherData.timezone ?? "auto",
    hours: raw.map((item: any, index: number) => {
      const previous = raw[index - 1]?.seaLevel;
      const next = raw[index + 1]?.seaLevel;
      const tideRate = item.seaLevel === null ? null : next !== null && previous !== null && next !== undefined && previous !== undefined ? (next - previous) / 2 : next !== null && next !== undefined ? next - item.seaLevel : previous !== null && previous !== undefined ? item.seaLevel - previous : null;
      const sun = dailyByDate.get(item.date) ?? { sunrise: "", sunset: "" };
      const sunrise = parseHM(sun.sunrise);
      const sunset = parseHM(sun.sunset);
      const daylight = sunrise === null || sunset === null ? true : item.hour >= sunrise && item.hour <= sunset;
      const solunar = scoreFishing(item.hour, tideRate, sun.sunrise, sun.sunset, moonPhase(new Date(`${item.date}T12:00:00Z`)));
      return { ...item, tideRate, daylight, fishScore: solunar.score, fishStars: solunar.stars, sl20: rateSL20(item.windKt, item.swellH, item.swellP, item.waveH, item.windWaveH) } as Hour;
    }),
  };
}

export async function buildBrief(request: Request) {
  const location = await resolveLocation(request.query);
  const days = numberParam(request.query.days, 5, 1, 14);
  const { vessel, criteria, mode } = criteriaFromQuery(request.query);
  const data = await forecast(location, days);
  const now = new Date();
  const futureHours = data.hours.filter((hour) => new Date(`${hour.time}:00`).getTime() >= now.getTime() - 3_600_000);
  const windows = makeWindows(futureHours, criteria, mode).slice(0, 8);
  return { generatedAt: now.toISOString(), location, timezone: data.timezone, days, query: { mode, vessel, criteria }, nextWindows: windows, upcomingHours: futureHours.slice(0, 36).map((hour) => ({ time: formatHour(hour.time), daylight: hour.daylight, windKt: hour.windKt, gustKt: hour.gustKt, swellM: hour.swellH, windChopM: hour.windWaveH, rainChance: hour.rainProb, fishScore: hour.fishScore, fishStars: hour.fishStars, sl20: hour.sl20.label })) };
}

export function briefMarkdown(brief: Awaited<ReturnType<typeof buildBrief>>) {
  const filter = brief.query.mode === "wind" ? `wind ≤ ${brief.query.criteria.maxWind} kt` : `${brief.query.vessel.toUpperCase()} vessel criteria`;
  const lines = [
    "# Bloody Dave's Fishing Planner — Public Forecast Brief",
    "",
    `**Location:** ${brief.location.name} (${brief.location.lat.toFixed(5)}, ${brief.location.lon.toFixed(5)})  `,
    `**Forecast range:** ${brief.days} days · **Timezone:** ${brief.timezone} · **Generated:** ${brief.generatedAt}  `,
    `**Filter:** ${filter} · minimum continuous window: ${brief.query.criteria.minHours} hour(s)${brief.query.criteria.daylightOnly ? " · daylight only" : ""}`,
    "",
    "## Next qualifying windows",
  ];
  if (!brief.nextWindows.length) lines.push("No qualifying window appears in this forecast range. Loosen the limits or increase `days`.");
  else for (const window of brief.nextWindows) lines.push(`- **${window.start} → ${window.end}** (${window.durationHours} h): avg wind ${window.averageWindKt} kt, max ${window.maxWindKt} kt, SL20 ${window.sl20}, best fishing ${window.bestFishScore}% (${window.bestFishStars}★).`);
  lines.push("", "## Next 36 hours", "| Local time | Daylight | Wind kt | Gust kt | Swell m | Chop m | Rain | Fish | SL20 |", "|---|---:|---:|---:|---:|---:|---:|---:|---|");
  for (const hour of brief.upcomingHours) lines.push(`| ${hour.time} | ${hour.daylight ? "Yes" : "No"} | ${hour.windKt ?? "—"} | ${hour.gustKt ?? "—"} | ${hour.swellM ?? "—"} | ${hour.windChopM ?? "—"} | ${hour.rainChance ?? "—"}% | ${hour.fishScore}% (${hour.fishStars}★) | ${hour.sl20} |`);
  lines.push("", "_Planning aid only. Check official marine warnings, local conditions, and your vessel limits before departure._");
  return lines.join("\n");
}
