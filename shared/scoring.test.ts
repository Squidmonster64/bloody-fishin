import { describe, expect, it } from "vitest";
import {
  fishingScore,
  hasMarineForVessel,
  moonIllumination,
  moonPhase,
  moonTransitTimes,
  rateSL20,
} from "@shared/scoring";
import { assertArray, validateCoordinates, validateForecastDays } from "@shared/http";

describe("rateSL20 boundaries", () => {
  it("rates Excellent at 10 kt with calm marine", () => {
    expect(rateSL20(10, 0.4, 12, 0.5, 0.2).label).toBe("Excellent");
  });

  it("rates Go just below 15 kt when marine is moderate", () => {
    expect(rateSL20(14.9, 0.8, 11, 0.9, 0.4).label).toBe("Go");
  });

  it("rates Marginal from 15 kt", () => {
    expect(rateSL20(15, 0.5, 12, 0.6, 0.2).label).toBe("Marginal");
  });

  it("rates Avoid above 20 kt", () => {
    expect(rateSL20(20.1, 0.3, 14, 0.4, 0.1).label).toBe("Avoid");
  });

  it("keeps 20.0 kt out of Avoid on wind alone", () => {
    expect(rateSL20(20, 0.3, 14, 0.4, 0.1).label).not.toBe("Avoid");
  });

  it("downgrades on high wind-wave/chop even if wind is light", () => {
    expect(rateSL20(8, 0.4, 12, 1.8, 1.6).label).toBe("Avoid");
  });

  it("downgrades at windChop > 1.1 to Marginal", () => {
    expect(rateSL20(8, 0.4, 12, 1.2, 1.15).label).toBe("Marginal");
  });

  it("downgrades short-period steep swell", () => {
    expect(rateSL20(10, 1.3, 7, 1.4, 0.3).label).toBe("Marginal");
  });

  it("Avoids very steep short-period swell > 2.0 m", () => {
    expect(rateSL20(8, 2.1, 7, 2.2, 0.2).label).toBe("Avoid");
  });

  it("treats long-period swell more gently than short-period", () => {
    const shortish = rateSL20(10, 1.2, 9, 1.3, 0.2);
    const long = rateSL20(10, 1.2, 14, 1.3, 0.2);
    expect(long.rank).toBeGreaterThanOrEqual(shortish.rank);
  });

  it("still returns a label when marine values are missing (callers must gate authority)", () => {
    const rating = rateSL20(8, null, null, null, null);
    expect(rating.label).toBe("Excellent");
    expect(hasMarineForVessel({ swellH: null, waveH: null, windWaveH: null })).toBe(false);
  });
});

describe("fishingScore fixtures", () => {
  const date = new Date("2026-08-23T12:00:00Z");
  const phase = moonPhase(date);
  const moonTimes = moonTransitTimes(date, "06:30", "18:00");

  it("keeps score within 5..100", () => {
    const result = fishingScore({
      hour: 12,
      seaLevelRate: 0,
      sunrise: "06:30",
      sunset: "18:00",
      moonTimes,
    });
    expect(result.score).toBeGreaterThanOrEqual(5);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("adds moon illumination contribution near new/full", () => {
    const mid = fishingScore({
      hour: 12,
      seaLevelRate: 0.1,
      sunrise: "06:30",
      sunset: "18:00",
      moonTimes: { transit: 3, underfoot: 15, phase: 0.25 },
    });
    const newMoon = fishingScore({
      hour: 12,
      seaLevelRate: 0.1,
      sunrise: "06:30",
      sunset: "18:00",
      moonTimes: { transit: 3, underfoot: 15, phase: 0.0 },
    });
    expect(newMoon.score).toBeGreaterThan(mid.score);
    expect(moonIllumination(0)).toBeCloseTo(0, 5);
    expect(moonIllumination(0.5)).toBeCloseTo(1, 5);
  });

  it("boosts near lunar major transit", () => {
    const away = fishingScore({
      hour: (moonTimes.transit + 6) % 24,
      seaLevelRate: 0.1,
      sunrise: "06:30",
      sunset: "18:00",
      moonTimes,
    });
    const major = fishingScore({
      hour: moonTimes.transit,
      seaLevelRate: 0.1,
      sunrise: "06:30",
      sunset: "18:00",
      moonTimes,
    });
    expect(major.score).toBeGreaterThan(away.score);
  });

  it("adds tide-rate contribution for fast tide", () => {
    const slow = fishingScore({ hour: 12, seaLevelRate: 0.005, sunrise: "06:30", sunset: "18:00", moonTimes });
    const fast = fishingScore({ hour: 12, seaLevelRate: 0.25, sunrise: "06:30", sunset: "18:00", moonTimes });
    expect(fast.score).toBeGreaterThan(slow.score);
  });

  it("boosts near sunrise", () => {
    const noon = fishingScore({ hour: 12, seaLevelRate: 0.1, sunrise: "06:30", sunset: "18:00", moonTimes });
    const dawn = fishingScore({ hour: 6.5, seaLevelRate: 0.1, sunrise: "06:30", sunset: "18:00", moonTimes });
    expect(dawn.score).toBeGreaterThanOrEqual(noon.score);
  });

  it("maps star thresholds", () => {
    const majorHour = moonTimes.transit;
    const hot = fishingScore({
      hour: majorHour,
      seaLevelRate: 0.25,
      sunrise: "06:30",
      sunset: "18:00",
      moonTimes: { ...moonTimes, phase: 0.0 },
    });
    expect(hot.stars).toBeGreaterThanOrEqual(3);
    expect(phase).toBeGreaterThanOrEqual(0);
    expect(phase).toBeLessThan(1);
  });
});

describe("shared http validation", () => {
  it("rejects invalid coordinates and days", () => {
    expect(validateCoordinates(91, 0)).toMatch(/Latitude/);
    expect(validateCoordinates(0, 181)).toMatch(/Longitude/);
    expect(validateCoordinates(-32, 115.7)).toBeNull();
    expect(validateForecastDays(0)).toMatch(/Forecast days/);
    expect(validateForecastDays(15)).toMatch(/Forecast days/);
    expect(validateForecastDays(5)).toBeNull();
  });

  it("assertArray rejects non-arrays", () => {
    expect(() => assertArray(null, "times")).toThrow(/times/);
    expect(assertArray([1, 2], "times")).toEqual([1, 2]);
  });
});
