import { describe, expect, it } from "vitest";
import type { AppData, HourRow } from "@/lib/fishingEngine";
import {
  buildBestWindows,
  buildDecisionBrief,
  findCurrentHour,
  freshnessFromFetchedAt,
  formatSwellLine,
  formatTideLine,
  formatWindLine,
} from "@/lib/decisionBrief";

function hour(partial: Partial<HourRow> & Pick<HourRow, "time" | "hour" | "dateStr">): HourRow {
  return {
    dt: new Date(partial.time),
    label: partial.label ?? partial.time,
    shortLabel: partial.shortLabel ?? `${partial.hour}:00`,
    hourLabel: partial.hourLabel ?? `${String(partial.hour).padStart(2, "0")}:00`,
    isDayStart: partial.isDayStart ?? partial.hour === 0,
    temp: partial.temp ?? 18,
    windKt: partial.windKt ?? 8,
    windDir: partial.windDir ?? 225,
    gustKt: partial.gustKt ?? 12,
    rainProb: partial.rainProb ?? 10,
    waveH: partial.waveH ?? 0.8,
    waveP: partial.waveP ?? 8,
    windWaveH: partial.windWaveH ?? 0.3,
    swellH: partial.swellH ?? 0.6,
    swellP: partial.swellP ?? 12,
    swellDir: partial.swellDir ?? 240,
    seaLevel: partial.seaLevel ?? 0.5,
    tideRate: partial.tideRate ?? 0.1,
    fishScore: partial.fishScore ?? 70,
    fishStars: partial.fishStars ?? 4,
    slRank: partial.slRank ?? 2,
    golden: partial.golden ?? false,
    ...partial,
  };
}

function fixture(overrides?: { hours?: HourRow[]; fetchedAt?: string }): AppData {
  const dateStr = "2026-08-23";
  const hours =
    overrides?.hours ??
    [6, 7, 8, 9, 10, 11, 12].map(h =>
      hour({
        time: `${dateStr}T${String(h).padStart(2, "0")}:00`,
        hour: h,
        dateStr,
        windKt: h < 10 ? 8 : 18,
        gustKt: h < 10 ? 11 : 24,
        swellH: h < 10 ? 0.5 : 1.4,
        fishStars: h < 10 ? 4 : 2,
        fishScore: h < 10 ? 78 : 40,
        slRank: h < 10 ? 2 : 0,
      }),
    );

  return {
    merged: hours,
    daily: [
      {
        date: dateStr,
        sunrise: "06:40",
        sunset: "17:55",
        uv: 5,
        rows: hours,
        morning: hours[0],
        tideExtremes: [
          { type: "High", time: `${dateStr}T09:00`, height: 1.1, hour: 9, dateStr },
          { type: "Low", time: `${dateStr}T15:00`, height: 0.4, hour: 15, dateStr },
        ],
        moonPhase: 0.2,
        moonName: "Waxing Crescent",
        moonEmoji: "🌒",
        moonIllum: 0.2,
        moonTransit: 14,
        moonUnderfoot: 2,
        maxWind: 18,
        maxTemp: 20,
        minTemp: 14,
        maxSwell: 1.4,
        peakFish: 78,
        bestFishStars: 4,
        goldenHours: [],
        isGolden: false,
      },
    ],
    location: { name: "Fremantle Offshore", lat: -32.06, lon: 115.65 },
    timezone: "Australia/Perth",
    fetchedAt: overrides?.fetchedAt,
  };
}

describe("findCurrentHour", () => {
  it("returns the matching local hour", () => {
    const data = fixture();
    const when = new Date("2026-08-23T01:10:00Z"); // 09:10 AWST
    const row = findCurrentHour(data, when);
    expect(row?.hour).toBe(9);
  });
});

describe("buildBestWindows", () => {
  it("groups useful consecutive hours", () => {
    const windows = buildBestWindows(fixture());
    expect(windows.length).toBeGreaterThan(0);
    expect(windows[0].hours).toBeGreaterThanOrEqual(2);
    expect(windows[0].startHour).toBe("06:00");
  });
});

describe("freshnessFromFetchedAt", () => {
  it("marks recent fetches as live", () => {
    const now = new Date("2026-08-23T02:00:00Z");
    const result = freshnessFromFetchedAt("2026-08-23T01:55:00Z", now);
    expect(result.freshnessTone).toBe("live");
  });

  it("marks old fetches as stale", () => {
    const now = new Date("2026-08-23T12:00:00Z");
    const result = freshnessFromFetchedAt("2026-08-23T01:00:00Z", now);
    expect(result.freshnessTone).toBe("stale");
  });
});

describe("buildDecisionBrief", () => {
  it("returns a go call for calm useful hours", () => {
    const data = fixture();
    const when = new Date("2026-08-22T22:10:00Z"); // 06:10 AWST
    const brief = buildDecisionBrief(data, { when, fetchedAt: "2026-08-22T22:00:00Z" });
    expect(brief.locationName).toBe("Fremantle Offshore");
    expect(brief.goNoGo).toBe("go");
    expect(brief.bestWindows.length).toBeGreaterThan(0);
    expect(brief.nextTide?.type).toBe("High");
    expect(brief.freshnessTone).toBe("live");
  });

  it("returns no-go when current hour is avoid-rated", () => {
    const dateStr = "2026-08-23";
    const data = fixture({
      hours: [
        hour({
          time: `${dateStr}T12:00`,
          hour: 12,
          dateStr,
          windKt: 24,
          gustKt: 30,
          swellH: 1.8,
          swellP: 7,
          fishStars: 2,
          fishScore: 35,
          slRank: 0,
        }),
      ],
    });
    const when = new Date("2026-08-23T04:10:00Z"); // 12:10 AWST
    const brief = buildDecisionBrief(data, { when });
    expect(brief.goNoGo).toBe("no-go");
    expect(brief.risks.length).toBeGreaterThan(0);
  });
});

describe("formatters", () => {
  it("formats wind, swell and tide lines", () => {
    expect(formatWindLine({ windKt: 10, gustKt: 15, windDir: 180, swellH: null, swellP: null, swellDir: null, rainProb: null, temp: null, waveH: null, seaLevel: null, tideRate: null })).toContain("10 kt");
    expect(formatSwellLine({ windKt: null, gustKt: null, windDir: null, swellH: 1.2, swellP: 14, swellDir: 240, rainProb: null, temp: null, waveH: null, seaLevel: null, tideRate: null })).toContain("1.2");
    expect(formatTideLine({ type: "High", time: "2026-08-23T09:00", height: 1.1, hour: 9, dateStr: "2026-08-23" })).toContain("High");
  });
});
