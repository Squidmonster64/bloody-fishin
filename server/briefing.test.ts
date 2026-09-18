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
    const day = new Date();
    day.setUTCDate(day.getUTCDate() + 1);
    const date = day.toISOString().slice(0, 10);
    const weatherBody = {
      timezone: "Australia/Perth",
      hourly: {
        time: [`${date}T06:00`, `${date}T07:00`, `${date}T08:00`],
        temperature_2m: [18, 19, 20],
        wind_speed_10m: [8, 9, 10],
        wind_gusts_10m: [12, 13, 14],
        precipitation_probability: [0, 0, 10],
      },
      daily: {
        time: [date],
        sunrise: [`${date}T06:30`],
        sunset: [`${date}T18:00`],
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
    expect(brief.upcomingHours.map(h => h.daylight)).toEqual([false, true, true]);
    expect(brief.upcomingHours.every(h => h.sl20 === null)).toBe(true);
    expect(brief.upcomingHours[0].fishScore).toBeGreaterThan(0);
    expect(brief.upcomingHours[0]).toHaveProperty("tempC");
    expect(brief.dailyOutlook[0]).toHaveProperty("sunrise");
    expect(brief.dailyOutlook[0]).toMatchObject({
      maxRainChance: 10, minSwellM: null, maxSwellM: null,
      minSwellPeriodS: null, maxSwellPeriodS: null, maxWindChopM: null,
    });
    expect(brief).toHaveProperty("nextUsable");
    expect(brief).toHaveProperty("bestUpcoming");
    const daylightBrief = await buildBrief(fakeReq({ lat: "-32.06", lon: "115.65", days: "3", mode: "wind", daylight: "true", minHours: "2" }));
    expect(daylightBrief.nextWindows).toHaveLength(1);
    expect(daylightBrief.nextWindows[0].start).toBe(`${date} 07:00`);
    expect(daylightBrief.nextWindows[0].end).toBe(`${date} 08:00`);
    vi.unstubAllGlobals();
  });
});

describe("named place aliases for AI clients", () => {
  it("resolves Bali to Indonesia, not inland namesakes", async () => {
    vi.resetModules();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        expect(String(url)).toMatch(/Bali/);
        return new Response(
          JSON.stringify({
            results: [
              { name: "Bāli", latitude: 22.65, longitude: 88.34, country: "India", country_code: "IN", admin1: "West Bengal" },
              { name: "Bali", latitude: -8.33, longitude: 115, country: "Indonesia", country_code: "ID", admin1: "Bali" },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }),
    );
    const { resolveLocation } = await import("./briefing");
    const loc = await resolveLocation(fakeReq({ place: "Bali" }).query);
    expect(loc.name).toMatch(/Indonesia/i);
    expect(loc.lat).toBeLessThan(0);
    vi.unstubAllGlobals();
  });

  it("does not silently fall back to Fremantle for unknown place", async () => {
    vi.resetModules();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ results: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })),
    );
    const { resolveLocation } = await import("./briefing");
    await expect(resolveLocation(fakeReq({ place: "ZzNotARealPlace999" }).query)).rejects.toThrow(/No location/);
    vi.unstubAllGlobals();
  });
});


describe("daily rain and marine summary", () => {
  it("includes seven days beyond the hourly preview and preserves missing values", async () => {
    vi.resetModules();
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() + i + 1);
      return d.toISOString().slice(0, 10);
    });
    const time = dates.flatMap(date => Array.from({ length: 24 }, (_, h) => `${date}T${String(h).padStart(2, "0")}:00`));
    const weather = { timezone: "Australia/Perth", hourly: {
      time, wind_speed_10m: time.map(() => 8),
      precipitation_probability: time.map((_, i) => i >= 144 ? null : i % 24),
      precipitation: time.map((_, i) => i >= 144 ? null : i < 24 ? 0 : i % 24 === 12 ? 100 : 0.1),
    }, daily: { time: dates, sunrise: dates.map(d => d + "T06:00"), sunset: dates.map(d => d + "T18:00") } };
    const marine = { hourly: { time,
      swell_wave_height: time.map((_, i) => i >= 144 ? null : i % 2 ? 2.5 : 1.5),
      swell_wave_period: time.map((_, i) => i >= 144 ? null : i % 2 ? 12 : 10),
      wind_wave_height: time.map((_, i) => i >= 144 ? null : 0),
    } };
    vi.stubGlobal("fetch", vi.fn(async (url: string) => new Response(JSON.stringify(String(url).includes("marine-api") ? marine : weather), { status: 200 })));
    try {
      const { buildBrief, briefMarkdown } = await import("./briefing");
      const brief = await buildBrief(fakeReq({ spot: "freo", days: "7" }));
      expect(brief.upcomingHours).toHaveLength(36);
      expect(brief.dailyOutlook).toHaveLength(7);
      expect(brief.dailyOutlook[5]).toMatchObject({ maxRainChance: 23, minSwellM: 1.5, maxSwellM: 2.5, minSwellPeriodS: 10, maxSwellPeriodS: 12, maxWindChopM: 0 });
      expect(brief.dailyOutlook[6]).toMatchObject({ maxRainChance: null, minSwellM: null, maxSwellM: null, minSwellPeriodS: null, maxSwellPeriodS: null, maxWindChopM: null });
      const markdown = briefMarkdown(brief);
      expect(markdown).toContain("## Daily outlook");
      expect(brief.dailyOutlook[0].precipitationTotalMm).toBe(0);
      expect(brief.dailyOutlook[5].precipitationTotalMm).toBe(102.3);
      expect(brief.dailyOutlook[5].maxHourlyPrecipitationMm).toBe(100);
      expect(brief.dailyOutlook[6].precipitationTotalMm).toBeNull();
      expect(brief.upcomingHours[0].precipitationMm).toBe(0);
      expect(markdown).toContain("23% | 102.3 | 100 | 1.5–2.5 | 10–12 | 0");
      expect(markdown).toContain(dates[6]);
      expect(markdown).not.toMatch(/NaN|Infinity/);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
