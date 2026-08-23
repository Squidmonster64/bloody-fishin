/**
 * Small HTTP / input helpers shared by client fetch and server brief routes.
 */

export class HttpError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export async function fetchWithTimeout(
  url: string,
  opts: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const { timeoutMs = 12_000, ...init } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    return res;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new HttpError(`Request timed out after ${timeoutMs}ms`, 408);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export function validateCoordinates(lat: number, lon: number): string | null {
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return "Latitude must be between -90 and 90.";
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) return "Longitude must be between -180 and 180.";
  return null;
}

export function validateForecastDays(days: number, min = 1, max = 14): string | null {
  if (!Number.isFinite(days) || !Number.isInteger(days) || days < min || days > max) {
    return `Forecast days must be an integer between ${min} and ${max}.`;
  }
  return null;
}

export function assertArray<T = unknown>(value: unknown, label: string): T[] {
  if (!Array.isArray(value)) throw new HttpError(`Malformed provider data: ${label} is not an array.`);
  return value as T[];
}
