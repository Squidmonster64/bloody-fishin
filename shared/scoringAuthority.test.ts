import { describe, expect, it } from "vitest";
import {
  fishingScore as sharedFishingScore,
  moonTransitTimes as sharedMoonTransitTimes,
  rateSL20 as sharedRateSL20,
} from "@shared/scoring";
import {
  fishingScore as clientFishingScore,
  moonTransitTimes as clientMoonTransitTimes,
  rateSL20 as clientRateSL20,
} from "../client/src/lib/fishingEngine";

/**
 * Browser engine re-exports and shared module must stay identical.
 * Server briefing imports the same shared module.
 */
describe("scoring authority — client re-export parity", () => {
  const cases: Array<[number | null, number | null, number | null, number | null, number | null]> = [
    [8, 0.4, 12, 0.5, 0.2],
    [10, 0.5, 14, 0.6, 0.2],
    [15, 0.8, 10, 1.0, 0.5],
    [21, 0.4, 12, 0.5, 0.2],
    [9, null, null, null, null],
    [12, 1.4, 7, 1.5, 0.4],
  ];

  it("rateSL20 matches between @shared/scoring and client fishingEngine", () => {
    for (const args of cases) {
      expect(clientRateSL20(...args)).toEqual(sharedRateSL20(...args));
    }
  });

  it("fishingScore matches between @shared/scoring and client fishingEngine", () => {
    const date = new Date("2026-01-15T12:00:00Z");
    const sharedMoon = sharedMoonTransitTimes(date, "06:00", "18:30");
    const clientMoon = clientMoonTransitTimes(date, "06:00", "18:30");
    expect(clientMoon).toEqual(sharedMoon);
    const opts = {
      hour: 7,
      seaLevelRate: 0.15,
      sunrise: "06:00",
      sunset: "18:30",
      moonTimes: sharedMoon,
    };
    expect(clientFishingScore(opts)).toEqual(sharedFishingScore(opts));
  });
});
