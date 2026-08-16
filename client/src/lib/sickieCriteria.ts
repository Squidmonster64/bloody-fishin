/**
 * sickieCriteria.ts — Configurable thresholds for the Sickie Forecast algorithm.
 *
 * A "Sickie window" requires ALL of:
 *   1. SL20 rank >= minSL20Rank  (0=Avoid, 1=Marginal, 2=Go, 3=Excellent)
 *   2. fishStars >= minFishStars (1–5)
 *   3. windKt <= maxWindKt
 *   4. swell/chop/weather conditions meet the active vessel limits
 *   5. Daylight is included when the profile requires it
 *   6. Window spans >= minWindowHours consecutive hours
 *
 * Vessel presets ship with sensible defaults. Users can customise via sliders.
 */

export interface SickieCriteria {
  /** Minimum SL20 rank: 1=Marginal, 2=Go, 3=Excellent */
  minSL20Rank: 1 | 2 | 3;
  /** Minimum fishing stars (1–5) */
  minFishStars: 1 | 2 | 3 | 4 | 5;
  /** Maximum wind speed in knots */
  maxWindKt: number;
  /** Maximum wind gust speed in knots (null = ignore) */
  maxGustKt: number | null;
  /** Maximum swell height in metres (null = ignore) */
  maxSwellH: number | null;
  /** Maximum locally generated wind-wave height in metres (null = ignore) */
  maxWindWaveH: number | null;
  /** Maximum hourly chance of rain in percent (null = ignore) */
  maxRainProb: number | null;
  /** Require every hour in a window to fall between sunrise and sunset */
  daylightOnly: boolean;
  /** Minimum consecutive hours to form a valid window */
  minWindowHours: number;
}

export type VesselPreset = "tinnie" | "sl20" | "offshore" | "kayak" | "custom";

export const VESSEL_PRESETS: Record<VesselPreset, { label: string; emoji: string; description: string; criteria: SickieCriteria }> = {
  tinnie: {
    label: "Tinnie / Dinghy",
    emoji: "🛶",
    description: "Small open boat — calm conditions only",
    criteria: { minSL20Rank: 2, minFishStars: 3, maxWindKt: 12, maxGustKt: 17, maxSwellH: 0.5, maxWindWaveH: 0.3, maxRainProb: 50, daylightOnly: true, minWindowHours: 3 },
  },
  sl20: {
    label: "SL20 / Half-cabin",
    emoji: "⛵",
    description: "Golden default — daylight, ≤10 kt wind, <1.0 m swell, no rain, 4★+ fishing",
    criteria: { minSL20Rank: 2, minFishStars: 4, maxWindKt: 10, maxGustKt: null, maxSwellH: 0.99, maxWindWaveH: null, maxRainProb: 0, daylightOnly: true, minWindowHours: 3 },
  },
  offshore: {
    label: "Offshore Cruiser",
    emoji: "🚢",
    description: "Large vessel — can handle rougher conditions",
    criteria: { minSL20Rank: 1, minFishStars: 3, maxWindKt: 22, maxGustKt: 30, maxSwellH: 2.0, maxWindWaveH: 1.0, maxRainProb: 85, daylightOnly: false, minWindowHours: 3 },
  },
  kayak: {
    label: "Kayak / SUP",
    emoji: "🏄",
    description: "Human-powered — needs near-flat conditions",
    criteria: { minSL20Rank: 3, minFishStars: 3, maxWindKt: 8, maxGustKt: 12, maxSwellH: 0.3, maxWindWaveH: 0.2, maxRainProb: 40, daylightOnly: true, minWindowHours: 3 },
  },
  custom: {
    label: "Custom",
    emoji: "⚙️",
    description: "Set your own thresholds",
    criteria: { minSL20Rank: 2, minFishStars: 4, maxWindKt: 15, maxGustKt: 22, maxSwellH: 1.0, maxWindWaveH: 0.65, maxRainProb: 70, daylightOnly: true, minWindowHours: 3 },
  },
};

export const DEFAULT_CRITERIA = VESSEL_PRESETS.sl20.criteria;

/** Check if a single hour row meets the Sickie criteria */
export function meetsCriteria(
  row: { slRank: number; fishStars: number; windKt: number | null; gustKt?: number | null; swellH: number | null; windWaveH?: number | null; rainProb?: number | null },
  criteria: SickieCriteria
): boolean {
  if (row.slRank < criteria.minSL20Rank) return false;
  if (row.fishStars < criteria.minFishStars) return false;
  if (row.windKt != null && row.windKt > criteria.maxWindKt) return false;
  if (criteria.maxGustKt != null && row.gustKt != null && row.gustKt > criteria.maxGustKt) return false;
  if (criteria.maxSwellH != null && row.swellH != null && row.swellH > criteria.maxSwellH) return false;
  if (criteria.maxWindWaveH != null && row.windWaveH != null && row.windWaveH > criteria.maxWindWaveH) return false;
  if (criteria.maxRainProb != null && row.rainProb != null && row.rainProb > criteria.maxRainProb) return false;
  return true;
}

/** Determine if an hour is daylight given sunrise/sunset strings ("HH:MM") */
export function isDaylight(hour: number, sunrise: string, sunset: string): boolean {
  const [srH, srM] = sunrise.split(":").map(Number);
  const [ssH, ssM] = sunset.split(":").map(Number);
  if (isNaN(srH) || isNaN(ssH)) return true; // assume daylight if unknown
  const srFrac = srH + srM / 60;
  const ssFrac = ssH + ssM / 60;
  return hour >= srFrac && hour <= ssFrac;
}
