import { describe, it, expect } from "vitest";
import { precipitationMm, precipitationTotal } from "./precipitation";

describe("precipitation amounts", () => {
  it("preserves zero and heavy amounts without weighting by probability", () => {
    expect(precipitationMm(0)).toBe(0);
    expect(precipitationMm(100)).toBe(100);
    expect(precipitationTotal([0.1, 0.2, 100])).toBe(100.3);
  });
  it("never treats missing or invalid amounts as dry weather", () => {
    for (const value of [undefined, null, NaN, Infinity, -1, "3"]) expect(precipitationMm(value)).toBeNull();
    expect(precipitationTotal([])).toBeNull();
    expect(precipitationTotal([2, null])).toBeNull();
    expect(precipitationTotal([undefined])).toBeNull();
  });
});
