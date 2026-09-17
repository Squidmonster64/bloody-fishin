import type { Location } from "./fishingEngine";
import { validateCoordinates, validateForecastDays } from "@shared/http";
const KEY = "bdave_last_selection_v1";
export function lastSelection(fallback: Location): {location: Location; days: number} {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (value && typeof value.location?.name === "string" && !validateCoordinates(value.location.lat, value.location.lon) && !validateForecastDays(value.days)) return value;
  } catch { /* First launch or unavailable storage. */ }
  return {location: fallback, days: 5};
}
export function saveSelection(location: Location, days: number) {
  try { localStorage.setItem(KEY, JSON.stringify({location, days})); } catch { /* Forecast remains usable. */ }
}
