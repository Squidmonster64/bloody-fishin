import { describe, expect, it } from "vitest";
import { fishingScore, isDaylightHour, moonTransitTimes, parseHM } from "./scoring";

describe("provider local solar times", () => {
  it("accepts clock and ISO local times without timezone conversion", () => {
    for (const time of ["06:17", "2026-09-14T06:17", "2026-09-14T06:17:00+08:00"]) {
      expect(parseHM(time)).toBeCloseTo(6 + 17 / 60);
    }
  });
  it("rejects missing and malformed solar times", () => {
    for (const time of ["", "bad", "06", "24:00", "06:60"]) {
      expect(parseHM(time)).toBeNull();
      expect(isDaylightHour(12, time, "18:08")).toBe(false);
    }
  });
  it("excludes midnight and respects sunrise/sunset boundaries", () => {
    const sunrise = "2026-09-14T06:17", sunset = "2026-09-14T18:08";
    for (const hour of [0, 5, 6, 19, 23]) expect(isDaylightHour(hour, sunrise, sunset)).toBe(false);
    for (const hour of [7, 12, 18]) expect(isDaylightHour(hour, sunrise, sunset)).toBe(true);
    expect(isDaylightHour(6 + 17 / 60, sunrise, sunset)).toBe(true);
    expect(isDaylightHour(18 + 9 / 60, sunrise, sunset)).toBe(false);
  });
  it("keeps ISO and clock-only fishing calculations consistent", () => {
    const date = new Date("2026-09-14T12:00:00Z");
    const clockMoon = moonTransitTimes(date, "06:17", "18:08");
    const isoMoon = moonTransitTimes(date, "2026-09-14T06:17", "2026-09-14T18:08");
    expect(isoMoon).toEqual(clockMoon);
    const base = { hour: 7, seaLevelRate: 0.1, moonTimes: clockMoon };
    expect(fishingScore({ ...base, sunrise: "2026-09-14T06:17", sunset: "2026-09-14T18:08" }))
      .toEqual(fishingScore({ ...base, sunrise: "06:17", sunset: "18:08" }));
  });
});
