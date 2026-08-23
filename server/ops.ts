/**
 * Lightweight in-memory ops helpers for public brief endpoints.
 * No external deps — suitable for a single Railway instance beta.
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const cache = new Map<string, { value: unknown; expiresAt: number }>();

/** Simple fixed-window IP rate limit. */
export function consumeRateLimit(
  key: string,
  limit = 30,
  windowMs = 60_000,
  now = Date.now(),
): RateLimitResult {
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSec: Math.ceil(windowMs / 1000) };
  }
  if (current.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }
  current.count += 1;
  return {
    allowed: true,
    remaining: Math.max(0, limit - current.count),
    retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  };
}

export function getCached<T>(key: string, now = Date.now()): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= now) {
    cache.delete(key);
    return null;
  }
  return entry.value as T;
}

export function setCached<T>(key: string, value: T, ttlMs = 5 * 60_000, now = Date.now()) {
  cache.set(key, { value, expiresAt: now + ttlMs });
}

export function clientKey(req: { ip?: string; headers: { [key: string]: string | string[] | undefined } }): string {
  const forwarded = req.headers["x-forwarded-for"];
  const forwardedIp = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0]?.trim();
  return forwardedIp || req.ip || "unknown";
}

/** Test helper — clear memory between unit tests. */
export function resetOpsState() {
  buckets.clear();
  cache.clear();
}
