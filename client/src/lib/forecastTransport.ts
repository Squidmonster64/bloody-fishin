import { fetchFishingData, getTimezone, type AppData, type Location } from "./fishingEngine";
import { fetchWithTimeout, validateCoordinates, validateForecastDays } from "@shared/http";

export function reviveForecast(data: AppData): AppData {
  if (!data || !Array.isArray(data.merged) || !Array.isArray(data.daily) || !data.location || typeof data.timezone !== "string") throw new Error("Invalid forecast response");
  const row = (r: AppData["merged"][number]) => ({...r, dt: new Date(r.dt)});
  return {...data, merged: data.merged.map(row), daily: data.daily.map(d => ({...d, rows: d.rows.map(row), morning: d.morning ? row(d.morning) : d.morning, goldenHours: d.goldenHours.map(row)}))};
}
export async function loadForecast(location: Location, days: number, base = import.meta.env.VITE_FORECAST_API_BASE as string | undefined): Promise<AppData> {
  const error = validateCoordinates(location.lat, location.lon) || validateForecastDays(days);
  if (error) throw new Error(error);
  // Preserve existing web behaviour. Mobile builds explicitly select the server adapter.
  if (!base) return fetchFishingData(location, days, await getTimezone(location.lat, location.lon));
  const url = new URL("forecast", base.endsWith("/") ? base : `${base}/`);
  url.search = new URLSearchParams({lat: String(location.lat), lon: String(location.lon), days: String(days), name: location.name}).toString();
  const response = await fetchWithTimeout(url.href, {timeoutMs: 25000});
  if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) throw new Error("Forecast service unavailable. Retry or view your saved forecast.");
  const data = reviveForecast(await response.json());
  if (Math.abs(data.location.lat-location.lat)>0.0001 || Math.abs(data.location.lon-location.lon)>0.0001 || data.requestedDays!==days) throw new Error("Forecast location or horizon mismatch");
  return data;
}
