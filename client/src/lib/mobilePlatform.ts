import type { Location } from "./fishingEngine";

export type LocationFailure = "denied" | "timeout" | "unavailable";
export class LocationError extends Error {
  constructor(public reason: LocationFailure) {
    super(reason === "denied" ? "Location permission denied. Choose a saved spot or enter coordinates." : reason === "timeout" ? "Location timed out. Choose a saved spot or try again." : "GPS unavailable. Choose a saved spot or enter coordinates.");
  }
}
export function currentLocation(gps: Geolocation | undefined = globalThis.navigator?.geolocation): Promise<Location> {
  return new Promise((resolve, reject) => {
    if (!gps) return reject(new LocationError("unavailable"));
    gps.getCurrentPosition(p => resolve({name: "Current location", lat: p.coords.latitude, lon: p.coords.longitude}),
      e => reject(new LocationError(e.code === 1 ? "denied" : e.code === 3 ? "timeout" : "unavailable")),
      {timeout: 10000, maximumAge: 60000, enableHighAccuracy: false});
  });
}
export function briefUrl(location: Location, days: number) {
  const url = new URL("/brief", "https://weather.bloodydaves.com");
  url.search = new URLSearchParams({lat: String(location.lat), lon: String(location.lon), days: String(days)}).toString();
  return url.href;
}
export async function shareForecast(location: Location, days: number): Promise<string | null> {
  const url = briefUrl(location, days);
  if (typeof globalThis.navigator?.share === "function") {
    try { await navigator.share({title: `Bloody Fishin — ${location.name}`, url}); return null; }
    catch (e) { if (e instanceof Error && e.name === "AbortError") return null; }
  }
  return url;
}
// Release 1.1 ports. Implementations must be supplied by the native wrapper.
export interface MobileExtensions {
  notifications?: { requestPermission(): Promise<boolean>; subscribe(spot: Location, thresholds: Record<string, number>): Promise<void> };
  camera?: { capture(): Promise<Blob> };
  backgroundRefresh?: { register(): Promise<void> };
}
