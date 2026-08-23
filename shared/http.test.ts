import { describe, expect, it } from "vitest";
import {
  assertArray,
  validateCoordinates,
  validateForecastDays,
} from "./http";

describe("validateCoordinates", () => {
  it("accepts valid Australian coastal coords", () => {
    expect(validateCoordinates(-33.8688, 151.2093)).toBeNull();
  });

  it("rejects latitude outside -90..90", () => {
    expect(validateCoordinates(91, 151)).toMatch(/Latitude/);
    expect(validateCoordinates(-91, 151)).toMatch(/Latitude/);
  });

  it("rejects longitude outside -180..180", () => {
    expect(validateCoordinates(-33, 181)).toMatch(/Longitude/);
    expect(validateCoordinates(-33, -181)).toMatch(/Longitude/);
  });

  it("rejects non-finite values", () => {
    expect(validateCoordinates(Number.NaN, 151)).toMatch(/Latitude/);
    expect(validateCoordinates(-33, Number.POSITIVE_INFINITY)).toMatch(/Longitude/);
  });
});

describe("validateForecastDays", () => {
  it("accepts 1..14", () => {
    expect(validateForecastDays(1)).toBeNull();
    expect(validateForecastDays(14)).toBeNull();
  });

  it("rejects invalid forecast-day values", () => {
    expect(validateForecastDays(0)).toMatch(/Forecast days/);
    expect(validateForecastDays(15)).toMatch(/Forecast days/);
    expect(validateForecastDays(7.5)).toMatch(/Forecast days/);
    expect(validateForecastDays(Number.NaN)).toMatch(/Forecast days/);
  });
});

describe("assertArray", () => {
  it("returns arrays unchanged", () => {
    expect(assertArray([1, 2], "x")).toEqual([1, 2]);
  });

  it("rejects missing expected arrays", () => {
    expect(() => assertArray(undefined, "hourly")).toThrow(/hourly/);
    expect(() => assertArray({ length: 2 }, "hourly")).toThrow(/hourly/);
  });
});
