import { beforeEach, describe, expect, it } from "vitest";
import {
  clearForecastCache,
  loadForecastCache,
  saveForecastCache,
} from "./forecastCache";
import type { AppData, Location } from "@/lib/fishingEngine";

function installMemoryLocalStorage() {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
    },
    configurable: true,
  });
}

const locA: Location = { name: "A", lat: -33.8, lon: 151.2 };
const locB: Location = { name: "B", lat: -27.4, lon: 153.0 };

function stubData(location: Location, fetchedAt: string, requestedDays = 7): AppData {
  return {
    merged: [],
    daily: [],
    location,
    timezone: "Australia/Sydney",
    fetchedAt,
    marineThrough: "2026-03-27",
    marineUnavailable: false,
    requestedDays,
  };
}

describe("forecast cache identity", () => {
  beforeEach(() => {
    installMemoryLocalStorage();
    clearForecastCache(locA, 7);
    clearForecastCache(locB, 7);
    clearForecastCache(locA, 14);
  });

  it("location A cannot display location B's cached forecast", () => {
    saveForecastCache(locA, 7, stubData(locA, "2026-03-20T01:00:00.000Z"));
    expect(loadForecastCache(locB, 7)).toBeNull();
    expect(loadForecastCache(locA, 7)?.data.location.name).toBe("A");
  });

  it("different forecast-day selections do not reuse incompatible cache", () => {
    saveForecastCache(locA, 7, stubData(locA, "2026-03-20T01:00:00.000Z", 7));
    expect(loadForecastCache(locA, 14)).toBeNull();
    expect(loadForecastCache(locA, 7)?.data.requestedDays).toBe(7);
  });

  it("cached data retains original fetch metadata separate from save time", () => {
    const providerFetch = "2026-03-20T01:00:00.000Z";
    saveForecastCache(locA, 7, stubData(locA, providerFetch));
    const cached = loadForecastCache(locA, 7);
    expect(cached).not.toBeNull();
    expect(cached!.data.fetchedAt).toBe(providerFetch);
    expect(cached!.savedAt).not.toBe(providerFetch);
    expect(Date.parse(cached!.savedAt)).toBeGreaterThan(0);
  });
});
