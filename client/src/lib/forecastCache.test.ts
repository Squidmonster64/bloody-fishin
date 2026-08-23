import { beforeEach, describe, expect, it } from "vitest";
import { clearForecastCache, loadForecastCache, saveForecastCache } from "@/lib/forecastCache";
import type { AppData, Location } from "@/lib/fishingEngine";

const loc: Location = { name: "Test", lat: -32.06, lon: 115.74 };

function installMemoryLocalStorage() {
  const store = new Map<string, string>();
  const memory = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
  };
  Object.defineProperty(globalThis, "localStorage", {
    value: memory,
    configurable: true,
  });
}

function minimalData(): AppData {
  return {
    merged: [],
    daily: [],
    location: loc,
    timezone: "Australia/Perth",
    fetchedAt: "2026-08-23T01:00:00Z",
    marineThrough: "2026-08-30",
    marineUnavailable: false,
    requestedDays: 5,
  };
}

describe("forecastCache", () => {
  beforeEach(() => {
    installMemoryLocalStorage();
    clearForecastCache(loc, 5);
  });

  it("round-trips a forecast snapshot", () => {
    const data = minimalData();
    saveForecastCache(loc, 5, data);
    const loaded = loadForecastCache(loc, 5);
    expect(loaded?.data.location.name).toBe("Test");
    expect(loaded?.data.fetchedAt).toBe("2026-08-23T01:00:00Z");
    expect(loaded?.savedAt).toBeTruthy();
  });

  it("clears a saved snapshot", () => {
    saveForecastCache(loc, 5, minimalData());
    clearForecastCache(loc, 5);
    expect(loadForecastCache(loc, 5)).toBeNull();
  });
});
