import { afterEach, describe, it, expect, vi } from "vitest";
import { loadForecast, reviveForecast } from "./forecastTransport";
import type { AppData } from "./fishingEngine";
const loc = {name:"Fremantle",lat:-32,lon:115};
const data: AppData = {location:loc,requestedDays:7,timezone:"Australia/Perth",merged:[],daily:[],fetchedAt:"2026-09-17T00:00:00Z",marineUnavailable:true,marineThrough:null};
afterEach(() => vi.unstubAllGlobals());
describe("server mobile contract", () => {
  it("preserves server data and marine absence without rescoring", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify(data),{headers:{"Content-Type":"application/json"}}));
    vi.stubGlobal("fetch",fetcher);
    expect(await loadForecast(loc,7,"http://localhost:3001/")).toEqual(data);
    expect(fetcher.mock.calls[0][0]).toContain("/forecast?");
  });
  it("rejects HTML from a server without the additive endpoint", async () => {
    vi.stubGlobal("fetch",async () => new Response("<html>app</html>"));
    await expect(loadForecast(loc,7,"https://example.com")).rejects.toThrow("unavailable");
  });
  it("rejects the wrong location", async () => {
    vi.stubGlobal("fetch",async () => new Response(JSON.stringify({...data,location:{...loc,lat:10}}),{headers:{"Content-Type":"application/json"}}));
    await expect(loadForecast(loc,7,"https://example.com")).rejects.toThrow("mismatch");
  });
  it.each([[91,115,7],[-32,181,7],[-32,115,0],[-32,115,15]])("validates coordinates and horizon",async (lat,lon,days) => {
    const fetcher=vi.fn();vi.stubGlobal("fetch",fetcher);
    await expect(loadForecast({...loc,lat,lon},days,"https://example.com")).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("rejects malformed cached JSON objects", () => {
    expect(() => reviveForecast({} as AppData)).toThrow("Invalid forecast");
  });
});

describe("cached date restoration", () => {
  it("revives nested hourly dates without changing scoring values", () => {
    const row = {dt:"2026-09-17T00:00:00Z", fishScore:76, slRank:3};
    const wire = {...data,merged:[row],daily:[{rows:[row],morning:row,goldenHours:[row]}]} as unknown as AppData;
    const decoded=reviveForecast(wire);
    expect(decoded.merged[0].dt).toBeInstanceOf(Date);
    expect(decoded.daily[0].morning.dt).toBeInstanceOf(Date);
    expect(decoded.daily[0].goldenHours[0].fishScore).toBe(76);
    expect(decoded.merged[0].slRank).toBe(3);
  });
});
