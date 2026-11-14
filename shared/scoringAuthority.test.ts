import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  assessHour,
  fishingScore as sharedFishingScore,
  moonTransitTimes as sharedMoonTransitTimes,
  isDaylightHour,
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

  describe("assessHour", () => {
    it("preserves rateSL20 labels across the complete threshold combination sweep", () => {
      const winds = [0, 8, 10, 14.9, 15, 20, 20.1];
      const gusts = [10, 14, 20, 21, 28];
      const chops = [0.2, 0.35, 1.15, 1.6];
      const swells = [0.4, 1.3, 2.1];
      const periods = [7, 9, 12, 14];

      for (const windKt of winds) for (const gustKt of gusts) for (const windWaveH of chops) {
        for (const swellH of swells) for (const swellP of periods) for (const thunderstorm of [false, true]) {
          const input = {
            windKt, gustKt, windDirDeg: 90, swellH, swellP,
            waveH: swellH + windWaveH, windWaveH, thunderstorm, daylight: true,
          };
          expect(assessHour(input).legacy.label).toBe(
            sharedRateSL20(windKt, swellH, swellP, input.waveH, windWaveH, gustKt, thunderstorm).label,
          );
        }
      }
    });

    it("maps A1, B3, B5, B7 and E1 to their states and reasons", () => {
      const assess = (input: Partial<Parameters<typeof assessHour>[0]>) => assessHour({
        windKt: 8, gustKt: 11, windDirDeg: 90, swellH: 0.8, swellP: 12,
        waveH: 1, windWaveH: 0.2, thunderstorm: false, daylight: true, ...input,
      });

      expect(assess({}).state).toBe("inside");
      const b3 = assess({ windKt: 15, gustKt: 19, swellH: 1, swellP: 11, windWaveH: 0.5 });
      expect(b3.state).toBe("marginal");
      expect(b3.reasons).toContain("wind");
      const b5 = assess({ windKt: 20.1, gustKt: 26, swellH: 1.5, swellP: 10, windWaveH: 1 });
      expect(b5.state).toBe("outside");
      expect(b5.reasons).toContain("wind");
      const b7 = assess({ gustKt: 28 });
      expect(b7.state).toBe("outside");
      expect(b7.reasons).toContain("gust");
      const e1 = assess({ thunderstorm: true });
      expect(e1.state).toBe("outside");
      expect(e1.reasons).toContain("thunderstorm");
    });

    it("returns no-call when marine fields are all missing", () => {
      expect(assessHour({
        windKt: 8, gustKt: 11, windDirDeg: 90, swellH: null, swellP: null,
        waveH: null, windWaveH: null, thunderstorm: false, daylight: true,
      }).state).toBe("no-call");
    });

    it("gates dark buckets and unknown daylight without changing the legacy rating", () => {
      const input = {
        windKt: 8, gustKt: 11, windDirDeg: 90, swellH: 0.8, swellP: 12,
        waveH: 1, windWaveH: 0.2, thunderstorm: false,
      };
      const darkRating = assessHour({ ...input, daylight: isDaylightHour(2, "05:10", "18:55") });
      expect(darkRating).toMatchObject({ state: "outside", reasons: ["dark"], legacy: { label: "Excellent" } });
      expect(isDaylightHour(18, "05:10", "18:08")).toBe(false);
      expect(assessHour({ ...input, daylight: isDaylightHour(18, "05:10", "18:08") }).reasons).toEqual(["dark"]);
      expect(isDaylightHour(5, "05:10", "18:55")).toBe(false);
      expect(assessHour({ ...input, daylight: isDaylightHour(5, "05:10", "18:55") }).reasons).toEqual(["dark"]);
      expect(isDaylightHour(6, "05:10", "18:55")).toBe(true);
      expect(assessHour({ ...input, daylight: null })).toMatchObject({
        state: "no-call",
        reasons: ["missing-data"],
      });
    });

    it("applies swell-height limits at every period and preserves the harsher short-period rules", () => {
      const assess = (swellH: number, swellP: number | null, windKt = 10, gustKt = 13, windWaveH = 0.3) =>
        assessHour({
          windKt, gustKt, windDirDeg: 225, swellH, swellP,
          waveH: swellH + windWaveH, windWaveH, thunderstorm: false, daylight: true,
        });

      const a4 = assess(4, 14);
      expect(a4.state).toBe("outside");
      expect(a4.reasons).toContain("swell");
      const a5 = assess(1.8, 13);
      expect(a5.state).toBe("marginal");
      expect(a5.reasons).toContain("swell");
      const a6 = assess(1.6, 9);
      expect(a6.state).toBe("marginal");
      expect(a6.reasons).toContain("swell");
      expect(assess(1.4, 12, 8, 11, 0.2).state).toBe("inside");
      expect(assess(1.5, 12, 8, 11, 0.2).state).toBe("inside");
      expect(assess(1.51, 12, 8, 11, 0.2).state).toBe("marginal");
      expect(assess(2.2, 12, 8, 11, 0.2).state).toBe("marginal");
      expect(assess(2.21, 12, 8, 11, 0.2).state).toBe("outside");
      const a8 = assess(1.3, 7);
      expect(a8.state).toBe("marginal");
      expect(a8.reasons).toContain("short-swell");
      const a9 = assess(2.1, 7, 8, 11, 0.2);
      expect(a9.state).toBe("outside");
      expect(a9.reasons).toContain("short-swell");
      expect(assess(1.8, null, 8, 11, 0.2).state).toBe("marginal");

      for (const period of [null, 7, 8, 9, 10, 12, 14]) {
        expect(assess(2.21, period, 8, 11, 0.2).state).toBe("outside");
      }
    });
  });

  describe("rating entry point guard", () => {
    it("does not call rateSL20 outside the shared scoring authority or test files", () => {
      const root = fileURLToPath(new URL("..", import.meta.url));
      const violations: string[] = [];
      const visit = (directory: string) => {
        for (const entry of readdirSync(directory, { withFileTypes: true })) {
          const path = join(directory, entry.name);
          if (entry.isDirectory()) visit(path);
          else if (/\.(ts|tsx)$/.test(entry.name) && !/\.(test|spec)\.(ts|tsx)$/.test(entry.name)) {
            const matches = readFileSync(path, "utf8").matchAll(/\brateSL20\s*\(/g);
            for (const match of matches) violations.push(`${path}:${match.index}`);
          }
        }
      };
      visit(join(root, "client/src"));
      visit(join(root, "server"));
      expect(violations).toEqual([]);
    });
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
