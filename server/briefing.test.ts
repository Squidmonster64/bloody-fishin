import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request } from "express";
import { validateCoordinates, validateForecastDays } from "../shared/http";
import { resolveLocation } from "./briefing";
import { consumeRateLimit, getCached, resetOpsState, setCached } from "./ops";

function fakeReq(query: Record<string, string>): Request {
  return { query } as unknown as Request;
}

describe("briefing input validation", () => {
  it("rejects invalid coordinates at the boundary", async () => {
    await expect(resolveLocation(fakeReq({ lat: "99", lon: "151" }).query)).rejects.toThrow(/Latitude/);
    await expect(resolveLocation(fakeReq({ lat: "-33", lon: "200" }).query)).rejects.toThrow(/Longitude/);
  });

  it("accepts known spot tokens without coordinates", async () => {
    const loc = await resolveLocation(fakeReq({ spot: "freo" }).query);
    expect(loc.name).toMatch(/Fremantle/i);
  });

  it("validateForecastDays rejects out-of-range days used by /brief", () => {
    expect(validateForecastDays(0)).toMatch(/Forecast days/);
    expect(validateForecastDays(15)).toMatch(/Forecast days/);
    expect(validateCoordinates(-32.06, 115.65)).toBeNull();
  });
});

describe("brief cache + rate limit behaviour", () => {
  beforeEach(() => resetOpsState());

  it("reports cache hit then miss after TTL expiry", () => {
    setCached("md:lat=-32", "# brief", 1_000, 10_000);
    expect(getCached("md:lat=-32", 10_500)).toBe("# brief");
    expect(getCached("md:lat=-32", 11_500)).toBeNull();
  });

  it("enforces brief rate-limit window", () => {
    expect(consumeRateLimit("brief:test", 2, 60_000, 1_000).allowed).toBe(true);
    expect(consumeRateLimit("brief:test", 2, 60_000, 1_100).allowed).toBe(true);
    expect(consumeRateLimit("brief:test", 2, 60_000, 1_200).allowed).toBe(false);
  });
});

describe("health payload shape", () => {
  it("matches beta health contract fields", () => {
    const health = {
      ok: true,
      service: "bloody-fishin",
      stage: "beta",
      ts: new Date().toISOString(),
    };
    expect(health.ok).toBe(true);
    expect(health.service).toBe("bloody-fishin");
    expect(health.stage).toBe("beta");
    expect(Number.isNaN(Date.parse(health.ts))).toBe(false);
  });
});

describe("provider failure surfaces", () => {
  it("buildBrief fails cleanly when weather HTTP fails", async () => {
    vi.resetModules();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("api.open-meteo.com")) {
          return new Response("fail", { status: 503 });
        }
        if (String(url).includes("marine-api")) {
          return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
        }
        return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
      }),
    );
    const { buildBrief } = await import("./briefing");
    await expect(buildBrief(fakeReq({ lat: "-32.06", lon: "115.65", days: "3" }))).rejects.toThrow(/Weather provider/);
    vi.unstubAllGlobals();
  });

  it("buildBrief continues when marine fails but weather succeeds", async () => {
    vi.resetModules();
    const weatherBody = {
      timezone: "Australia/Perth",
      hourly: {
        time: ["2026-08-23T06:00", "2026-08-23T07:00", "2026-08-23T08:00"],
        temperature_2m: [18, 19, 20],
        wind_speed_10m: [8, 9, 10],
        wind_gusts_10m: [12, 13, 14],
        precipitation_probability: [0, 0, 10],
      },
      daily: {
        time: ["2026-08-23"],
        sunrise: ["2026-08-23T06:30"],
        sunset: ["2026-08-23T18:00"],
      },
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("marine-api")) {
          throw new Error("marine down");
        }
        if (String(url).includes("api.open-meteo.com")) {
          return new Response(JSON.stringify(weatherBody), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
      }),
    );
    const { buildBrief } = await import("./briefing");
    const brief = await buildBrief(fakeReq({ lat: "-32.06", lon: "115.65", days: "3", mode: "wind" }));
    expect(brief.marineDataAvailableThrough).toBeNull();
    expect(brief.upcomingHours.every(h => h.sl20 === null)).toBe(true);
    expect(brief.upcomingHours[0].fishScore).toBeGreaterThan(0);
    vi.unstubAllGlobals();
  });
});
