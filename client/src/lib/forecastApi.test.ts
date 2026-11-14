import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchFishingDataFromBackend } from "./forecastApi";

describe("forecast brief row mapping", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("preserves daylight, sunrise and sunset from each forecast hour", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      generatedAt: "2026-09-27T00:00:00Z",
      location: { name: "Fremantle Offshore", lat: -32.06, lon: 115.65 },
      timezone: "Australia/Perth",
      days: 1,
      marineDataAvailableThrough: "2026-09-27",
      upcomingHours: [{
        time: "2026-09-27 02:00",
        daylight: false,
        marineDataAvailable: true,
        tempC: 18,
        windKt: 8,
        windDirDeg: 90,
        gustKt: 11,
        thunderstorm: false,
        rainChance: 0,
        precipitationMm: 0,
        waveM: 1,
        swellM: 0.8,
        swellPeriodS: 12,
        swellDirDeg: 180,
        windChopM: 0.2,
        seaLevelM: 0.5,
        tideRate: 0.1,
        fishScore: 50,
        fishStars: 2,
        sl20: "Excellent",
        sunrise: "05:10",
        sunset: "18:55",
      }],
      dailyOutlook: [{
        date: "2026-09-27",
        minWindKt: 8,
        maxWindKt: 8,
        minTempC: 18,
        maxTempC: 18,
        minSwellM: 0.8,
        maxSwellM: 0.8,
        maxRainChance: 0,
        precipitationTotalMm: 0,
        bestFishScore: 50,
        bestFishStars: 2,
        sunrise: "2026-09-27T05:10",
        sunset: "2026-09-27T18:55",
      }],
    }), { status: 200, headers: { "content-type": "application/json" } })));

    const data = await fetchFishingDataFromBackend(
      { name: "Fremantle Offshore", lat: -32.06, lon: 115.65 },
      1,
    );
    expect(data.merged[0]).toMatchObject({
      daylight: false,
      sunrise: "05:10",
      sunset: "18:55",
    });
  });
});
