import type { OfficialMarine } from "@shared/officialMarine";
import { forecastInstant } from "@shared/forecastTime";
import { fetchWithTimeout, HttpError, validateCoordinates, validateForecastDays } from "@shared/http";
import { moonIllumination, moonPhaseEmoji, moonPhaseName, moonTransitTimes, type SL20Rating } from "@shared/scoring";
import { apiUrl } from "@/lib/apiOrigin";
import type { AppData, DayData, HourRow, Location, TideExtreme } from "@/lib/fishingEngine";

type BriefHour = {
  time: string;
  daylight: boolean;
  marineDataAvailable: boolean;
  tempC: number | null;
  windKt: number | null;
  windDirDeg: number | null;
  gustKt: number | null;
  thunderstorm: boolean;
  rainChance: number | null;
  precipitationMm: number | null;
  waveM?: number | null;
  swellM: number | null;
  swellPeriodS: number | null;
  swellDirDeg?: number | null;
  windChopM: number | null;
  seaLevelM: number | null;
  tideRate: number | null;
  fishScore: number;
  fishStars: number;
  sl20: SL20Rating["label"] | null;
  sunrise: string | null;
  sunset: string | null;
};

type BriefDay = {
  date: string;
  minWindKt?: number | null;
  maxWindKt: number | null;
  minTempC: number | null;
  maxTempC: number | null;
  minSwellM?: number | null;
  maxSwellM: number | null;
  maxRainChance?: number | null;
  precipitationTotalMm?: number | null;
  bestFishScore: number;
  bestFishStars: number;
  sunrise?: string | null;
  sunset?: string | null;
  moonName?: string | null;
  moonEmoji?: string | null;
  moonIllumination?: number | null;
};

type BriefPayload = {
  generatedAt: string;
  location: Location;
  timezone: string;
  days: number;
  marineDataAvailableThrough: string | null;
  upcomingHours: BriefHour[];
  forecastHours?: BriefHour[];
  dailyOutlook: BriefDay[];
  officialMarine?: OfficialMarine;
  providerGrid?: AppData["providerGrid"];
};

const SL_RANK: Record<NonNullable<BriefHour["sl20"]>, number> = {
  Excellent: 3,
  Go: 2,
  Marginal: 1,
  Avoid: 0,
};

function findTideExtremes(rows: HourRow[]): TideExtreme[] {
  const extremes: TideExtreme[] = [];
  for (let index = 1; index < rows.length - 1; index += 1) {
    const previous = rows[index - 1].seaLevel;
    const current = rows[index].seaLevel;
    const next = rows[index + 1].seaLevel;
    if (previous == null || current == null || next == null) continue;
    if (current > previous && current > next) {
      extremes.push({ type: "High", time: rows[index].time, height: current, hour: rows[index].hour, dateStr: rows[index].dateStr });
    } else if (current < previous && current < next) {
      extremes.push({ type: "Low", time: rows[index].time, height: current, hour: rows[index].hour, dateStr: rows[index].dateStr });
    }
  }
  return extremes;
}

function rowFromBrief(hour: BriefHour, timezone: string): HourRow {
  const iso = hour.time.replace(" ", "T");
  const dateStr = iso.slice(0, 10);
  const hourOfDay = Number(iso.slice(11, 13));
  const slRank = hour.sl20 ? SL_RANK[hour.sl20] : 0;
  const localDate = forecastInstant(iso, timezone);
  return {
    time: iso,
    hour: hourOfDay,
    dateStr,
    dt: localDate,
    label: localDate.toLocaleString("en-AU", {
      weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
      hour12: false, timeZone: timezone,
    }).replace(",", ""),
    shortLabel: [0, 6, 12, 18].includes(hourOfDay) ? `${dateStr} ${String(hourOfDay).padStart(2, "0")}` : "",
    hourLabel: `${String(hourOfDay).padStart(2, "0")}:00`,
    isDayStart: hourOfDay === 0,
    temp: hour.tempC,
    windKt: hour.windKt,
    windDir: hour.windDirDeg,
    gustKt: hour.gustKt,
    thunderstorm: hour.thunderstorm,
    rainProb: hour.rainChance,
    precipitationMm: hour.precipitationMm,
    waveH: hour.waveM ?? null,
    waveP: null,
    windWaveH: hour.windChopM,
    swellH: hour.swellM,
    swellP: hour.swellPeriodS,
    swellDir: hour.swellDirDeg ?? null,
    seaLevel: hour.seaLevelM,
    tideRate: hour.tideRate,
    fishScore: hour.fishScore,
    fishStars: hour.fishStars,
    slRank,
    golden: hour.daylight && !hour.thunderstorm && slRank >= 2 && hour.fishStars >= 4 && hour.rainChance === 0,
  };
}

function placeholderMorning(day: BriefDay, timezone: string): HourRow {
  return rowFromBrief({
    time: `${day.date} 09:00`, daylight: true, marineDataAvailable: false, tempC: null,
    windKt: null, windDirDeg: null, gustKt: null, thunderstorm: false, rainChance: null,
    precipitationMm: null, swellM: null, swellPeriodS: null, windChopM: null, seaLevelM: null,
    tideRate: null, fishScore: day.bestFishScore, fishStars: day.bestFishStars, sl20: null,
    sunrise: day.sunrise ?? null, sunset: day.sunset ?? null,
  }, timezone);
}

/** Browser and Capacitor clients use the hardened backend and never provider credentials. */
export async function fetchFishingDataFromBackend(loc: Location, days: number): Promise<AppData> {
  const coordError = validateCoordinates(loc.lat, loc.lon);
  if (coordError) throw new Error(coordError);
  const daysError = validateForecastDays(days);
  if (daysError) throw new Error(daysError);

  const browserOrigin = typeof window === "undefined" ? "http://localhost" : window.location.origin;
  const url = new URL(apiUrl("/brief.json"), browserOrigin);
  url.search = new URLSearchParams({
    name: loc.name,
    lat: String(loc.lat),
    lon: String(loc.lon),
    days: String(days),
    hours: "all",
  }).toString();

  let response: Response;
  try {
    response = await fetchWithTimeout(url.toString(), {
      timeoutMs: 15_000,
      headers: { Accept: "application/json" },
    });
  } catch (error) {
    if (error instanceof HttpError) throw new Error(`Forecast service: ${error.message}`);
    throw error;
  }
  if (!response.ok) throw new Error(`Forecast service returned HTTP ${response.status}.`);

  const payload = await response.json() as Partial<BriefPayload>;
  if (!payload.location || !payload.timezone || !Array.isArray(payload.upcomingHours) || !Array.isArray(payload.dailyOutlook)) {
    throw new Error("Forecast service returned malformed data.");
  }

  const merged = (payload.forecastHours ?? payload.upcomingHours).map(hour => rowFromBrief(hour, payload.timezone!));
  const daily = payload.dailyOutlook.map((day): DayData => {
    const rows = merged.filter(row => row.dateStr === day.date);
    const morning = rows.find(row => row.hour === 9) ?? rows[0] ?? placeholderMorning(day, payload.timezone!);
    const sunrise = day.sunrise?.slice(11, 16) ?? rows[0]?.time.slice(11, 16) ?? "";
    const sunset = day.sunset?.slice(11, 16) ?? "";
    const moon = moonTransitTimes(new Date(`${day.date}T12:00:00Z`), sunrise, sunset);
    const goldenHours = rows.filter(row => row.golden);
    return {
      date: day.date,
      sunrise,
      sunset,
      uv: null,
      rows,
      morning,
      tideExtremes: findTideExtremes(rows),
      moonPhase: moon.phase,
      moonName: day.moonName ?? moonPhaseName(moon.phase),
      moonEmoji: day.moonEmoji ?? moonPhaseEmoji(moon.phase),
      moonIllum: day.moonIllumination ?? moonIllumination(moon.phase),
      moonTransit: moon.transit,
      moonUnderfoot: moon.underfoot,
      minWind: day.minWindKt ?? null,
      maxWind: day.maxWindKt,
      maxTemp: day.maxTempC,
      minTemp: day.minTempC,
      minSwell: day.minSwellM ?? null,
      maxSwell: day.maxSwellM,
      maxRainChance: day.maxRainChance ?? null,
      precipitationTotalMm: day.precipitationTotalMm ?? null,
      peakFish: day.bestFishScore,
      bestFishStars: day.bestFishStars,
      goldenHours,
      isGolden: goldenHours.length > 0,
    };
  });

  return {
    merged,
    daily,
    location: payload.location,
    timezone: payload.timezone,
    fetchedAt: payload.generatedAt ?? new Date().toISOString(),
    marineThrough: payload.marineDataAvailableThrough ?? null,
    marineUnavailable: !merged.some(row => row.waveH != null || row.swellH != null || row.seaLevel != null),
    requestedDays: payload.days ?? days,
    officialMarine: payload.officialMarine,
    providerGrid: payload.providerGrid,
  };
}
