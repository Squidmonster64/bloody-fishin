import { afterEach, describe, expect, it, vi } from "vitest";
import type { Request } from "express";
import { buildBrief } from "../../../server/briefing";
import { fetchFishingData } from "./fishingEngine";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const hour = (time: string, windKt: number, sl20: "Go" | "Marginal" | "Avoid") => ({
  time, daylight: true, marineDataAvailable: true, tempC: 16, windKt,
  windDirDeg: 180, gustKt: windKt + 4, thunderstorm: false, rainChance: 0,
  precipitationMm: 0, waveM: 0.8, swellM: 0.5, swellPeriodS: 12,
  swellDirDeg: 240, windChopM: 0.2, seaLevelM: 0.7, tideRate: 0.1,
  fishScore: 78, fishStars: 4, sl20,
  sunrise: "2026-09-26T06:01", sunset: "2026-09-26T18:15",
});

describe("provider boundary and time alignment", () => {
  it("has the browser call only the repository backend", async () => {
    const calls: URL[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | globalThis.Request) => {
      const url = new URL(String(input), "http://localhost");
      calls.push(url);
      return new Response(JSON.stringify({
        generatedAt: "2026-09-26T14:07:00Z",
        location: { name: "Fremantle Offshore", lat: -32.06, lon: 115.65 },
        timezone: "Australia/Perth", days: 8, marineDataAvailableThrough: "2026-09-27",
        providerGrid: {
          weather: { lat: -32.09139, lon: 115.760864 },
          wind: { lat: -32.09139, lon: 115.65217 },
          marine: { lat: -32.0833, lon: 115.6667 },
        },
        forecastHours: [hour("2026-09-26 22:00", 12, "Go"), hour("2026-09-26 23:00", 18, "Marginal")],
        upcomingHours: [hour("2026-09-26 22:00", 12, "Go")],
        dailyOutlook: [{
          date: "2026-09-26", minWindKt: 12, maxWindKt: 18, minTempC: 16, maxTempC: 16,
          minSwellM: 0.5, maxSwellM: 0.5, maxRainChance: 0, precipitationTotalMm: 0,
          bestFishScore: 78, bestFishStars: 4,
          sunrise: "2026-09-26T06:01", sunset: "2026-09-26T18:15",
        }],
      }));
    }));

    const app = await fetchFishingData({ name: "Fremantle Offshore", lat: -32.06, lon: 115.65 }, 8, "Australia/Perth");

    expect(calls).toHaveLength(1);
    expect(calls[0].pathname).toBe("/brief.json");
    expect(calls[0].searchParams.get("hours")).toBe("all");
    expect(calls[0].hostname).not.toContain("open-meteo");
    expect(app.merged.map((row) => row.hour)).toEqual([22, 23]);
    expect(app.merged.map((row) => row.slRank)).toEqual([2, 1]);
    expect(app.providerGrid?.weather).toEqual({ lat: -32.09139, lon: 115.760864 });
  });

  it("keeps land weather and offshore wind/marine selection on the server", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-26T14:07Z"));
    const time = ["2026-09-26T14:00", "2026-09-26T22:00", "2026-09-26T23:00", "2026-09-27T00:00"];
    const weather = { latitude: -32.09139, longitude: 115.760864, timezone: "Australia/Perth", hourly: { time, temperature_2m: [21, 16, 15, 14], precipitation_probability: [0, 0, 0, 0], precipitation: [0, 0, 0, 0], weather_code: [0, 0, 0, 0] }, daily: { time: ["2026-09-26", "2026-09-27"], sunrise: ["2026-09-26T06:01", "2026-09-27T06:00"], sunset: ["2026-09-26T18:15", "2026-09-27T18:16"] } };
    const wind = { latitude: -32.09139, longitude: 115.65217, timezone: "Australia/Perth", hourly: { time, wind_speed_10m: [12, 18, 19, 13], wind_direction_10m: [90, 180, 270, 0], wind_gusts_10m: [15, 26, 29, 18] } };
    const marine = { latitude: -32.0833, longitude: 115.6667, hourly: { time, wave_height: [1, 1, 1, 1], swell_wave_height: [.5, .5, .5, .5], swell_wave_period: [12, 12, 12, 12], swell_wave_direction: [240, 240, 240, 240], wind_wave_height: [.3, .3, .3, .3], sea_level_height_msl: [.7, .8, .7, .6] } };
    const calls: URL[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | globalThis.Request) => {
      const url = new URL(String(input));
      if (url.hostname.includes("open-meteo")) {
        calls.push(url);
        if (url.hostname.startsWith("marine-")) return new Response(JSON.stringify(marine));
        return new Response(JSON.stringify(url.searchParams.get("hourly")?.includes("wind_speed_10m") ? wind : weather));
      }
      return new Response(JSON.stringify({ status: "unavailable", days: [] }));
    }));

    const brief = await buildBrief({ query: { spot: "freo", days: "8" } } as unknown as Request);
    expect(calls).toHaveLength(3);
    for (const url of calls) {
      expect(url.searchParams.get("latitude")).toBe("-32.06");
      expect(url.searchParams.get("longitude")).toBe("115.65");
      const coastalWeather = !url.hostname.startsWith("marine-") && url.searchParams.get("hourly")?.includes("temperature_2m");
      expect(url.searchParams.get("cell_selection")).toBe(coastalWeather ? "land" : "sea");
    }
    expect(brief.upcomingHours.map((row) => row.time)).toEqual(["2026-09-26 22:00", "2026-09-26 23:00", "2026-09-27 00:00"]);
  });
});
