import { Capacitor } from "@capacitor/core";

const STAGING_API_ORIGIN = "https://boating.bloodydaves.com";

/** Web builds use their own origin. Packaged builds use the separate staging API. */
export function apiOrigin(): string {
  const configured = import.meta.env.VITE_API_ORIGIN?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return Capacitor.isNativePlatform() ? STAGING_API_ORIGIN : "";
}

export function apiUrl(path: string): string {
  const origin = apiOrigin();
  return origin ? new URL(path, `${origin}/`).toString() : path;
}

export { STAGING_API_ORIGIN };
