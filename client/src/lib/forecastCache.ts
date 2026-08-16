/**
 * forecastCache — local fallback storage for recently successful forecasts.
 * Design: small, per-location snapshots prevent a weak signal at the ramp from
 * blanking the planner. Cached forecasts are labelled clearly and never silently
 * substituted for a live refresh.
 */
import type { AppData, Location } from "@/lib/fishingEngine";

interface CachedForecast { data: AppData; savedAt: string; }
const PREFIX = "bdave_forecast_cache_v1";

function key(location: Location, days: number) {
  return `${PREFIX}:${location.lat.toFixed(4)}:${location.lon.toFixed(4)}:${days}`;
}

export function saveForecastCache(location: Location, days: number, data: AppData) {
  try {
    const entry: CachedForecast = { data, savedAt: new Date().toISOString() };
    localStorage.setItem(key(location, days), JSON.stringify(entry));
  } catch {
    // Storage may be unavailable or full; live forecasts still operate normally.
  }
}

export function loadForecastCache(location: Location, days: number): CachedForecast | null {
  try {
    const raw = localStorage.getItem(key(location, days));
    return raw ? JSON.parse(raw) as CachedForecast : null;
  } catch { return null; }
}

export function clearForecastCache(location: Location, days: number) {
  try { localStorage.removeItem(key(location, days)); } catch { /* ignore unavailable storage */ }
}
