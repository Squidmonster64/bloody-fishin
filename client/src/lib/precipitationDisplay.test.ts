import { expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { fetchFishingData } from "./fishingEngine";
import { TableView } from "../components/TableView";

it("keeps precipitation amount separate from probability in backend data", async () => {
  const makeHour = (time: string, rainChance: number, precipitationMm: number) => ({
    time, daylight: true, marineDataAvailable: true, tempC: 20, windKt: 10, windDirDeg: 180,
    gustKt: 15, thunderstorm: false, rainChance, precipitationMm, waveM: 1, swellM: 0.5,
    swellPeriodS: 12, swellDirDeg: 240, windChopM: 0.3, seaLevelM: 0.7, tideRate: 0.1,
    fishScore: 70, fishStars: 4, sl20: "Go", sunrise: "2026-09-19T06:00", sunset: "2026-09-19T18:00",
  });
  const forecastHours = [makeHour("2026-09-19 12:00", 75, 3), makeHour("2026-09-19 13:00", 25, 100)];
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
    generatedAt: "2026-09-19T00:00:00Z",
    location: { name: "Fremantle", lat: -32.06, lon: 115.65 },
    timezone: "Australia/Perth", days: 7, marineDataAvailableThrough: "2026-09-19",
    forecastHours, upcomingHours: forecastHours,
    dailyOutlook: [{
      date: "2026-09-19", minWindKt: 10, maxWindKt: 10, minTempC: 20, maxTempC: 20,
      minSwellM: 0.5, maxSwellM: 0.5, maxRainChance: 75, precipitationTotalMm: 103,
      bestFishScore: 70, bestFishStars: 4,
      sunrise: "2026-09-19T06:00", sunset: "2026-09-19T18:00",
    }],
  }))));
  try {
    const data = await fetchFishingData({ name: "Fremantle", lat: -32.06, lon: 115.65 }, 7, "Australia/Perth");
    expect(data.merged.map((row) => row.precipitationMm)).toEqual([3, 100]);
    const html = renderToStaticMarkup(createElement(TableView, { data }));
    expect(html).toContain("75%");
    expect(html).toContain("25%");
    expect(html).toContain("3 mm");
    expect(html).toContain("100 mm");
    expect(html).toContain("103 mm/day");
  } finally {
    vi.unstubAllGlobals();
  }
});
