import { describe, expect, it, beforeEach } from "vitest";
import { consumeRateLimit, getCached, resetOpsState, setCached } from "./ops";

describe("ops rate limit", () => {
  beforeEach(() => resetOpsState());

  it("allows requests under the limit", () => {
    const first = consumeRateLimit("ip:1", 2, 60_000, 1_000);
    const second = consumeRateLimit("ip:1", 2, 60_000, 1_100);
    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(0);
  });

  it("blocks once the window is exhausted", () => {
    consumeRateLimit("ip:2", 1, 60_000, 1_000);
    const blocked = consumeRateLimit("ip:2", 1, 60_000, 1_100);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });
});

describe("ops cache", () => {
  beforeEach(() => resetOpsState());

  it("returns values before expiry and misses after", () => {
    setCached("k", { ok: true }, 1_000, 5_000);
    expect(getCached("k", 5_500)).toEqual({ ok: true });
    expect(getCached("k", 6_500)).toBeNull();
  });
});
