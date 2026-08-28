/**
 * Public, keyless briefing service for people and browsing-enabled LLMs.
 * It queries Open-Meteo directly at request time; no user spot or profile data
 * is stored on the server.
 */
import type { Request } from "express";
import {
  fishingScore,
  hasMarineForVessel,
  moonTransitTimes,
  parseHM,
  rateSL20,
  type SL20Rating,
} from "../shared/scoring.js";
import {
  fetchWithTimeout,
  validateCoordinates,
  validateForecastDays,
} from "../shared/http.js";

type Location = { name: string; lat: number; lon: number };
type Hour = {
  time: string; date: string; hour: number; windKt: number | null; gustKt: number | null;
  windDirDeg: number | null;
  rainProb: number | null; temp: number | null; waveH: number | null; swellH: number | null;
  swellP: number | null; windWaveH: number | null; seaLevel: number | null; tideRate: number | null; daylight: boolean;
  sunrise: string; sunset: string;
  fishScore: number; fishStars: number; sl20: SL20Rating; marineDataAvailable: boolean;
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

/** Prefer unambiguous fishing destinations when Open-Meteo returns ambiguous hits. */
const PLACE_ALIASES: Record<string, string> = {
  bali: "Bali, Indonesia",
  rottnest: "Rottnest Island, Australia",
  "rottnest island": "Rottnest Island, Australia",
  denham: "Denham, Australia",
  broome: "Broome, Australia",
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
async function resolvePlace(place: string): Promise<Location> {
  const alias = PLACE_ALIASES[place.trim().toLowerCase()];
  const searchTerm = alias ?? place;
  const search = async (term: string) => {
    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
    url.searchParams.set("name", term);
    url.searchParams.set("count", "5");
    url.searchParams.set("language", "en");
    url.searchParams.set("format", "json");
    const response = await fetchWithTimeout(url.toString(), { timeoutMs: 10_000 });
    if (!response.ok) throw new Error("Place lookup is temporarily unavailable.");
    return response.json() as Promise<{
      results?: Array<{ name: string; latitude: number; longitude: number; admin1?: string; country?: string; country_code?: string }>;
    }>;
  };
  let data = await search(searchTerm);
  if (!data.results?.length) {
    const simplerPlace = place.replace(/[\s,]+(?:WA|NSW|VIC|QLD|SA|TAS|NT|ACT|Australia|United States|USA|UK|Indonesia|Canada)$/i, "").trim();
    if (simplerPlace && simplerPlace !== place) data = await search(simplerPlace);
  }
  const results = data.results ?? [];
  if (!results.length) throw new Error(`No location was found for “${place}”. Use latitude and longitude instead.`);

  // Prefer coastal / requested-country matches over inland namesakes (e.g. Bali India).
  const lower = place.toLowerCase();
  const preferCountry =
    /indonesia|bali/.test(lower) || alias?.includes("Indonesia")
      ? "ID"
      : /canada|vancouver/.test(lower)
        ? "CA"
        : /australia|rottnest|fremantle|denham|broome/.test(lower) || alias?.includes("Australia")
          ? "AU"
          : null;
  const match =
    (preferCountry ? results.find((r) => r.country_code === preferCountry) : undefined) ?? results[0];
  return {
    name: [match.name, match.admin1, match.country].filter(Boolean).join(", "),
    lat: match.latitude,
    lon: match.longitude,
  };
}

export async function resolveLocation(query: Request["query"]): Promise<Location> {
  const hasLat = query.lat !== undefined && query.lat !== null && query.lat !== "";
  const hasLon = query.lon !== undefined && query.lon !== null && query.lon !== "";
  if (hasLat || hasLon) {
    if (!(hasLat && hasLon)) throw new Error("Both latitude and longitude are required when providing coordinates.");
    const lat = Number(query.lat);
    const lon = Number(query.lon);
    const coordErr = validateCoordinates(lat, lon);
    if (coordErr) throw new Error(coordErr);
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
    if (eligible(hour, criteria, mode) && (mode === "wind" || hour.marineDataAvailable)) run.push(hour);
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

async function forecast(location: Location, days: number): Promise<{ timezone: string; hours: Hour[]; marineDataAvailableThrough: string | null }> {
  const weather = new URL("https://api.open-meteo.com/v1/forecast");
  weather.search = new URLSearchParams({ latitude: String(location.lat), longitude: String(location.lon), hourly: "temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation_probability", daily: "sunrise,sunset", wind_speed_unit: "kn", timezone: "auto", forecast_days: String(days) }).toString();
  const marine = new URL("https://marine-api.open-meteo.com/v1/marine");
  marine.search = new URLSearchParams({ latitude: String(location.lat), longitude: String(location.lon), hourly: "wave_height,swell_wave_height,swell_wave_period,wind_wave_height,sea_level_height_msl", timezone: "auto", forecast_days: String(Math.min(days, 8)), cell_selection: "sea" }).toString();
  const [weatherResponse, marineResponse] = await Promise.all([fetchWithTimeout(weather.toString(), { timeoutMs: 12_000 }), fetchWithTimeout(marine.toString(), { timeoutMs: 12_000 }).catch(() => null)]);
  if (!weatherResponse.ok) throw new Error(`Weather provider returned HTTP ${weatherResponse.status}.`);
  const weatherData = await weatherResponse.json() as any;
  const marineData = marineResponse?.ok ? await marineResponse.json() as any : { hourly: {} };
  const wh = weatherData.hourly ?? {};
  const mh = marineData.hourly ?? {};
  if (!Array.isArray(wh.time) || wh.time.length === 0) {
    throw new Error("Malformed provider data: weather.hourly.time is missing.");
  }
  const marineIndex = new Map<string, number>((Array.isArray(mh.time) ? mh.time : []).map((time: string, index: number) => [time, index]));
  const dailyByDate = new Map<string, { sunrise: string; sunset: string }>((weatherData.daily?.time ?? []).map((date: string, index: number) => [date, { sunrise: weatherData.daily.sunrise?.[index] ?? "", sunset: weatherData.daily.sunset?.[index] ?? "" }]));
  const raw = wh.time.map((time: string, index: number) => {
    const marineAt = marineIndex.get(time);
    return { time, date: time.slice(0, 10), hour: Number(time.slice(11, 13)), windKt: wh.wind_speed_10m?.[index] ?? null, gustKt: wh.wind_gusts_10m?.[index] ?? null, windDirDeg: wh.wind_direction_10m?.[index] ?? null, rainProb: wh.precipitation_probability?.[index] ?? null, temp: wh.temperature_2m?.[index] ?? null, waveH: marineAt === undefined ? null : mh.wave_height?.[marineAt] ?? null, swellH: marineAt === undefined ? null : mh.swell_wave_height?.[marineAt] ?? null, swellP: marineAt === undefined ? null : mh.swell_wave_period?.[marineAt] ?? null, windWaveH: marineAt === undefined ? null : mh.wind_wave_height?.[marineAt] ?? null, seaLevel: marineAt === undefined ? null : mh.sea_level_height_msl?.[marineAt] ?? null, marineDataAvailable: marineAt !== undefined };
  });
  return {
    timezone: weatherData.timezone ?? "auto",
    marineDataAvailableThrough: (mh.time ?? []).at(-1)?.slice(0, 10) ?? null,
    hours: raw.map((item: any, index: number) => {
      const previous = raw[index - 1]?.seaLevel;
      const next = raw[index + 1]?.seaLevel;
      const tideRate = item.seaLevel === null ? null : next !== null && previous !== null && next !== undefined && previous !== undefined ? (next - previous) / 2 : next !== null && next !== undefined ? next - item.seaLevel : previous !== null && previous !== undefined ? item.seaLevel - previous : null;
      const sun = dailyByDate.get(item.date) ?? { sunrise: "", sunset: "" };
      const sunrise = parseHM(sun.sunrise);
      const sunset = parseHM(sun.sunset);
      const daylight = sunrise === null || sunset === null ? true : item.hour >= sunrise && item.hour <= sunset;
      const moonTimes = moonTransitTimes(new Date(`${item.date}T12:00:00Z`), sun.sunrise, sun.sunset);
      const solunar = fishingScore({
        hour: item.hour,
        seaLevelRate: tideRate,
        sunrise: sun.sunrise,
        sunset: sun.sunset,
        moonTimes,
      });
      const marineDataAvailable = hasMarineForVessel(item);
      const sl20 = rateSL20(item.windKt, item.swellH, item.swellP, item.waveH, item.windWaveH);
      return { ...item, tideRate, daylight, sunrise: sun.sunrise, sunset: sun.sunset, fishScore: solunar.score, fishStars: solunar.stars, sl20, marineDataAvailable } as Hour;
    }),
  };
}

export async function buildBrief(request: Request) {
  const location = await resolveLocation(request.query);
  if (request.query.days !== undefined && request.query.days !== null && request.query.days !== "") {
    const daysErr = validateForecastDays(Number(request.query.days));
    if (daysErr) throw new Error(daysErr);
  }
  const days = numberParam(request.query.days, 5, 1, 14);
  const { vessel, criteria, mode } = criteriaFromQuery(request.query);
  const data = await forecast(location, days);
  const now = new Date();
  const futureHours = data.hours.filter((hour) => new Date(`${hour.time}:00`).getTime() >= now.getTime() - 3_600_000);
  const windows = makeWindows(futureHours, criteria, mode).slice(0, 8);
  const dailyOutlook = Array.from(new Set(futureHours.map((hour) => hour.date))).map((date) => {
    const rows = futureHours.filter((hour) => hour.date === date);
    const marineDataAvailable = rows.some((hour) => hour.marineDataAvailable);
    const temps = rows.map((hour) => hour.temp).filter((t): t is number => t !== null && Number.isFinite(t));
    return {
      date,
      marineDataAvailable,
      maxWindKt: Math.max(...rows.map((hour) => hour.windKt ?? 0)),
      maxGustKt: Math.max(...rows.map((hour) => hour.gustKt ?? 0)),
      maxTempC: temps.length ? Math.max(...temps) : null,
      minTempC: temps.length ? Math.min(...temps) : null,
      sunrise: rows[0]?.sunrise || null,
      sunset: rows[0]?.sunset || null,
      bestFishScore: Math.max(...rows.map((hour) => hour.fishScore)),
      bestFishStars: Math.max(...rows.map((hour) => hour.fishStars)),
      weatherAndFishingOnly: !marineDataAvailable,
    };
  });
  const marineDataWarning = days > 8 ? "Days 9–14 include weather, sun/moon/tide fishing scores and fishing stars, but no swell, chop, tide-height or SL20 vessel assessment. Do not use them for boating or Sickie decisions." : null;
  const nextUsable = windows[0] ?? null;
  const bestUpcoming = windows.length
    ? [...windows].sort((a, b) => b.bestFishScore - a.bestFishScore || b.durationHours - a.durationHours)[0]
    : null;
  return {
    generatedAt: now.toISOString(),
    location,
    timezone: data.timezone,
    days,
    marineDataAvailableThrough: data.marineDataAvailableThrough,
    marineDataWarning,
    query: { mode, vessel, criteria },
    nextWindows: windows,
    nextUsable,
    bestUpcoming,
    dailyOutlook,
    upcomingHours: futureHours.slice(0, 36).map((hour) => ({
      time: formatHour(hour.time),
      daylight: hour.daylight,
      marineDataAvailable: hour.marineDataAvailable,
      tempC: hour.temp,
      windKt: hour.windKt,
      windDirDeg: hour.windDirDeg,
      gustKt: hour.gustKt,
      swellM: hour.swellH,
      swellPeriodS: hour.swellP,
      windChopM: hour.windWaveH,
      seaLevelM: hour.seaLevel,
      rainChance: hour.rainProb,
      tideRate: hour.tideRate,
      fishScore: hour.fishScore,
      fishStars: hour.fishStars,
      sl20: hour.marineDataAvailable ? hour.sl20.label : null,
      sunrise: hour.sunrise || null,
      sunset: hour.sunset || null,
    })),
  };
}

export function briefMarkdown(brief: Awaited<ReturnType<typeof buildBrief>>) {
  const filter = brief.query.mode === "wind" ? `wind ≤ ${brief.query.criteria.maxWind} kt` : `${brief.query.vessel.toUpperCase()} vessel criteria`;
  const lines = [
    "# Bloody Dave's Fishing Planner — Public Forecast Brief",
    "",
    `**Location:** ${brief.location.name} (${brief.location.lat.toFixed(5)}, ${brief.location.lon.toFixed(5)})  `,
    `**Forecast range:** ${brief.days} days · **Timezone:** ${brief.timezone} · **Generated:** ${brief.generatedAt}  `,
    `**Marine data through:** ${brief.marineDataAvailableThrough ?? "unavailable"}  `,
    `**Filter:** ${filter} · minimum continuous window: ${brief.query.criteria.minHours} hour(s)${brief.query.criteria.daylightOnly ? " · daylight only" : ""}`,
    "",
    "## Next qualifying windows",
  ];
  if (brief.marineDataWarning) lines.push("", `> **Marine-data warning:** ${brief.marineDataWarning}`);
  if (!brief.nextWindows.length) lines.push("No qualifying window appears in this forecast range. Loosen the limits or increase `days`.");
  else for (const window of brief.nextWindows) lines.push(`- **${window.start} → ${window.end}** (${window.durationHours} h): avg wind ${window.averageWindKt} kt, max ${window.maxWindKt} kt, Boating ${window.sl20}, best fishing ${window.bestFishScore}% (${window.bestFishStars}★).`);
  lines.push("", "## Next 36 hours", "| Local time | Daylight | Wind kt | Gust kt | Swell m | Chop m | Rain | Fish | Boating |", "|---|---:|---:|---:|---:|---:|---:|---:|---|");
  for (const hour of brief.upcomingHours) lines.push(`| ${hour.time} | ${hour.daylight ? "Yes" : "No"} | ${hour.windKt ?? "—"} | ${hour.gustKt ?? "—"} | ${hour.swellM ?? "—"} | ${hour.windChopM ?? "—"} | ${hour.rainChance ?? "—"}% | ${hour.fishScore}% (${hour.fishStars}★) | ${hour.sl20} |`);
  const fishingOnly = brief.dailyOutlook.filter((day) => day.weatherAndFishingOnly);
  if (fishingOnly.length) {
    lines.push("", "## Extended fishing outlook — marine data unavailable", "| Date | Max wind kt | Max gust kt | Best fishing | Note |", "|---|---:|---:|---:|---|");
    for (const day of fishingOnly) lines.push(`| ${day.date} | ${day.maxWindKt} | ${day.maxGustKt} | ${day.bestFishScore}% (${day.bestFishStars}★) | Weather + fishing only; no boating assessment |`);
  }
  lines.push("", "_Planning aid only. Check official marine warnings, local conditions, and your vessel limits before departure._");
  return lines.join("\n");
}
