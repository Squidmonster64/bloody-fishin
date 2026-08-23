import { describe, expect, it } from "vitest";
import type { AppData, HourRow } from "@/lib/fishingEngine";
import {
  buildBestWindows,
  buildChronologicalWindows,
  buildDecisionBrief,
  findNextUsefulWindow,
  freshnessFromFetchedAt,
} from "@/lib/decisionBrief";
import { rateSL20, fishingScore, moonTransitTimes } from "@shared/scoring";

function hour(partial: Partial<HourRow> & Pick<HourRow, "time" | "hour" | "dateStr">): HourRow {
  const windKt = partial.windKt ?? 8;
  const swellH = partial.swellH ?? 0.5;
  const swellP = partial.swellP ?? 12;
  const waveH = partial.waveH ?? 0.6;
  const windWaveH = partial.windWaveH ?? 0.2;
  const sl = rateSL20(windKt, swellH, swellP, waveH, windWaveH);
  const moonTimes = moonTransitTimes(new Date(`${partial.dateStr}T12:00:00`), "06:30", "18:00");
  const fish = fishingScore({
    hour: partial.hour,
    seaLevelRate: partial.tideRate ?? 0.1,
    sunrise: "06:30",
    sunset: "18:00",
    moonTimes,
  });
  return {
    dt: new Date(partial.time),
    label: partial.label ?? partial.time,
    shortLabel: "",
    hourLabel: partial.hourLabel ?? `${String(partial.hour).padStart(2, "0")}:00`,
    isDayStart: partial.hour === 0,
    temp: 18,
    windKt,
    windDir: 225,
    gustKt: partial.gustKt ?? windKt + 3,
    rainProb: partial.rainProb ?? 0,
    waveH,
    waveP: 8,
    windWaveH,
    swellH,
    swellP,
    swellDir: 240,
    seaLevel: partial.seaLevel ?? 0.5,
    tideRate: partial.tideRate ?? 0.1,
    fishScore: partial.fishScore ?? fish.score,
    fishStars: partial.fishStars ?? fish.stars,
    slRank: partial.slRank ?? sl.rank,
    golden: false,
    ...partial,
  };
}

function dataFromHours(hours: HourRow[], extras: Partial<AppData> = {}): AppData {
  return {
    merged: hours,
    daily: [
      {
        date: hours[0]?.dateStr ?? "2026-08-24",
        sunrise: "06:30",
        sunset: "18:00",
        uv: 5,
        rows: hours,
        morning: hours[0],
        tideExtremes: [],
        moonPhase: 0.2,
        moonName: "Waxing Crescent",
        moonEmoji: "🌒",
        moonIllum: 0.2,
        moonTransit: 14,
        moonUnderfoot: 2,
        maxWind: 20,
        maxTemp: 22,
        minTemp: 14,
        maxSwell: 1.5,
        peakFish: 80,
        bestFishStars: 4,
        goldenHours: [],
        isGolden: false,
      },
    ],
    location: { name: "Fremantle Offshore", lat: -32.06, lon: 115.65 },
    timezone: "Australia/Perth",
    fetchedAt: "2026-08-23T01:00:00Z",
    marineThrough: "2026-08-30",
    marineUnavailable: false,
    requestedDays: 5,
    ...extras,
  };
}

describe("next usable vs best upcoming", () => {
  it("reports a merely-good tomorrow window as next usable even when a stronger later window exists", () => {
    const hours: HourRow[] = [];
    // Tomorrow morning: useful but only Go / 3★
    for (const h of [6, 7, 8]) {
      hours.push(
        hour({
          time: `2026-08-24T${String(h).padStart(2, "0")}:00`,
          hour: h,
          dateStr: "2026-08-24",
          windKt: 12,
          swellH: 0.7,
          fishStars: 3,
          fishScore: 60,
          slRank: 2,
        }),
      );
    }
    // Two days later: stronger Excellent / 5★
    for (const h of [6, 7, 8, 9]) {
      hours.push(
        hour({
          time: `2026-08-26T${String(h).padStart(2, "0")}:00`,
          hour: h,
          dateStr: "2026-08-26",
          windKt: 6,
          swellH: 0.3,
          windWaveH: 0.15,
          fishStars: 5,
          fishScore: 90,
          slRank: 3,
        }),
      );
    }

    const data = dataFromHours(hours);
    const current = hour({ time: "2026-08-23T12:00", hour: 12, dateStr: "2026-08-23", windKt: 18, slRank: 1, fishStars: 2 });
    // Non-useful spacer so tomorrow and later do not merge into one run.
    const spacer = hour({
      time: "2026-08-25T12:00",
      hour: 12,
      dateStr: "2026-08-25",
      windKt: 18,
      swellH: 1.4,
      fishStars: 2,
      fishScore: 40,
      slRank: 1,
    });
    data.merged = [current, ...hours.slice(0, 3), spacer, ...hours.slice(3)];

    const next = findNextUsefulWindow(data, current);
    const best = buildBestWindows(data, 2);
    const chrono = buildChronologicalWindows(data);

    expect(chrono.map(w => w.date)).toEqual(["2026-08-24", "2026-08-26"]);
    expect(next?.date).toBe("2026-08-24");
    expect(best[0]?.date).toBe("2026-08-26");
    expect(next?.date).not.toBe(best[0]?.date);
  });
});

describe("marine honesty", () => {
  it("does not present authoritative SL20 when marine fields are missing", () => {
    const row = hour({
      time: "2026-08-23T09:00",
      hour: 9,
      dateStr: "2026-08-23",
      windKt: 8,
      swellH: null,
      waveH: null,
      windWaveH: null,
      seaLevel: null,
      fishStars: 4,
      fishScore: 75,
      slRank: 3,
    });
    const data = dataFromHours([row], { marineUnavailable: true, marineThrough: null });
    const brief = buildDecisionBrief(data, { when: new Date("2026-08-23T01:10:00Z") });
    expect(brief.currentSl).toBeNull();
    expect(brief.goNoGo).toBe("outlook");
    expect(brief.marineMissing).toBe(true);
    expect(brief.risks.some(r => /vessel assessment unavailable/i.test(r))).toBe(true);
  });
});

describe("freshness honesty", () => {
  it("never labels a saved copy as live", () => {
    const now = new Date("2026-08-23T02:00:00Z");
    expect(freshnessFromFetchedAt("2026-08-23T01:55:00Z", now).freshnessTone).toBe("live");
    const data = dataFromHours([
      hour({ time: "2026-08-23T09:00", hour: 9, dateStr: "2026-08-23" }),
    ], { fetchedAt: "2026-08-23T01:55:00Z" });
    const brief = buildDecisionBrief(data, {
      when: now,
      fetchedAt: "2026-08-23T01:55:00Z",
      cacheSavedAt: "2026-08-22T12:00:00Z",
    });
    expect(brief.freshnessTone).toBe("stale");
  });
});
