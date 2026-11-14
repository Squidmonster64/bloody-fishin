import { describe, expect, it } from "vitest";
import { meetsCriteria, VESSEL_PRESETS } from "./sickieCriteria";

const sl20 = VESSEL_PRESETS.sl20.criteria;

describe("meetsCriteria missing data", () => {
  const completeRow = {
    windKt: 8,
    gustKt: 11,
    slRank: 2,
    fishStars: 2,
    swellH: 0.5,
    windWaveH: 0.2,
    rainProb: 0,
  };

  it("fails closed when wind, swell or configured limits are missing", () => {
    expect(meetsCriteria({ ...completeRow, windKt: null }, sl20)).toBe(false);
    expect(meetsCriteria({ ...completeRow, swellH: null }, { ...sl20, maxSwellH: 0.99 })).toBe(false);
    expect(meetsCriteria({ ...completeRow, swellH: null }, { ...sl20, maxSwellH: null })).toBe(true);
    expect(meetsCriteria({ ...completeRow, gustKt: null }, sl20)).toBe(false);
    expect(meetsCriteria({ ...completeRow, windWaveH: null }, { ...sl20, maxWindWaveH: 0.3 })).toBe(false);
    expect(meetsCriteria({ ...completeRow, rainProb: null }, { ...sl20, maxRainProb: 50 })).toBe(false);
    expect(meetsCriteria({ ...completeRow, rainProb: null }, { ...sl20, maxRainProb: null })).toBe(true);
  });
});
