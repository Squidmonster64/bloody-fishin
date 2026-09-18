import { it, expect, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { fetchFishingData } from "./fishingEngine";
import { TableView } from "../components/TableView";

it("fetches amounts separately from probability and renders hourly and daily amounts", async () => {
  vi.stubGlobal("fetch", vi.fn(async (input: string) => {
    if (String(input).includes("marine-api")) return new Response(JSON.stringify({ hourly: {} }));
    expect(new URL(input).searchParams.get("hourly")?.split(",")).toContain("precipitation");
    return new Response(JSON.stringify({
      hourly: { time: ["2026-09-19T12:00", "2026-09-19T13:00"], precipitation: [3, 100], precipitation_probability: [75, 25] },
      daily: { time: ["2026-09-19"], sunrise: ["2026-09-19T06:00"], sunset: ["2026-09-19T18:00"] },
    }));
  }));
  try {
    const data = await fetchFishingData({ name: "Fremantle", lat: -32.06, lon: 115.65 }, 7, "Australia/Perth");
    expect(data.merged.map(row => row.precipitationMm)).toEqual([3, 100]);
    const html = renderToStaticMarkup(createElement(TableView, { data }));
    expect(html).toContain("75%");
    expect(html).toContain("25%");
    expect(html).toContain("3 mm");
    expect(html).toContain("100 mm");
    expect(html).toContain("103 mm/day");
  } finally { vi.unstubAllGlobals(); }
});
