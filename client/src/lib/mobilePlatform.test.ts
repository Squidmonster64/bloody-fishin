import { describe, it, expect, vi } from "vitest";
import { currentLocation, briefUrl } from "./mobilePlatform";
import { importSpots, exportSpots } from "./spotTransfer";

describe("device adapters", () => {
  it("resolves a location with finite timeout and limited GPS precision", async () => {
    const gps = {getCurrentPosition: vi.fn((ok) => ok({coords:{latitude:-32,longitude:115}}))} as unknown as Geolocation;
    expect(await currentLocation(gps)).toMatchObject({lat:-32,lon:115});
    expect(gps.getCurrentPosition).toHaveBeenCalledWith(expect.any(Function),expect.any(Function),{timeout:10000,maximumAge:60000,enableHighAccuracy:false});
  });
  it.each([[1,"denied"],[2,"unavailable"],[3,"timeout"]])("handles GPS error %s", async (code, reason) => {
    const gps = {getCurrentPosition: (_ok: unknown, fail: (e:unknown)=>void) => fail({code})} as Geolocation;
    await expect(currentLocation(gps)).rejects.toMatchObject({reason});
  });
  it("creates a public share URL with the selected location and horizon", () => {
    const url = new URL(briefUrl({name:"Test",lat:-32,lon:115},7));
    expect(url.hostname).toBe("weather.bloodydaves.com");
    expect(url.searchParams.get("days")).toBe("7");
  });
});
describe("spot transfer", () => {
  it("round trips and imports idempotently by coordinates", () => {
    const spots = [{id:"old",name:"Ramp",lat:-32,lon:115,savedAt:"2026-09-17T00:00:00Z"}];
    const imported = importSpots(exportSpots(spots), []);
    expect(imported[0].name).toBe("Ramp");
    expect(importSpots(exportSpots(spots), imported)).toEqual(imported);
  });
  it("rejects invalid coordinates before returning any changes", () => {
    expect(() => importSpots(JSON.stringify([{name:"Bad",lat:999,lon:115}]),[])).toThrow("invalid spot");
  });
});
