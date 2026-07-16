import { useState, useCallback } from "react";
import {
  fetchFishingData,
  getTimezone,
  LOCATIONS,
  type AppData,
  type Location,
} from "@/lib/fishingEngine";

export type ViewType = "graph" | "summary" | "table" | "sickie";

export interface FishingState {
  location: Location;
  days: number;
  hourlyDay: string | null;
  view: ViewType;
  data: AppData | null;
  loading: boolean;
  error: string | null;
  timezone: string;
  vis: {
    wind: boolean;
    swell: boolean;
    fish: boolean;
    tide: boolean;
    temp: boolean;
    rain: boolean;
  };
}

const DEFAULT_LOCATION = LOCATIONS["🎯 Spots"][0];

export function useFishingData() {
  const [state, setState] = useState<FishingState>({
    location: DEFAULT_LOCATION,
    days: 5,
    hourlyDay: null,
    view: "graph",
    data: null,
    loading: false,
    error: null,
    timezone: "Australia/Perth",
    vis: { wind: true, swell: true, fish: true, tide: true, temp: false, rain: false },
  });

  const loadData = useCallback(async (loc: Location, days: number) => {
    setState(s => ({ ...s, loading: true, error: null, data: null }));
    try {
      const tz = await getTimezone(loc.lat, loc.lon);
      const data = await fetchFishingData(loc, days, tz);
      setState(s => ({
        ...s,
        loading: false,
        data,
        timezone: tz,
        hourlyDay: s.hourlyDay || (data.daily[0]?.date ?? null),
      }));
    } catch (e: unknown) {
      setState(s => ({
        ...s,
        loading: false,
        error: e instanceof Error ? e.message : "Unknown error",
      }));
    }
  }, []);

  const setLocation = useCallback((loc: Location) => {
    setState(s => ({ ...s, location: loc, hourlyDay: null }));
    loadData(loc, state.days);
  }, [loadData, state.days]);

  const setDays = useCallback((days: number) => {
    setState(s => ({ ...s, days }));
    loadData(state.location, days);
  }, [loadData, state.location]);

  const setView = useCallback((view: ViewType) => {
    setState(s => ({ ...s, view }));
  }, []);

  const setHourlyDay = useCallback((day: string) => {
    setState(s => ({ ...s, hourlyDay: day }));
  }, []);

  const toggleVis = useCallback((key: keyof FishingState["vis"]) => {
    setState(s => ({ ...s, vis: { ...s.vis, [key]: !s.vis[key] } }));
  }, []);

  const setCustomLocation = useCallback((lat: number, lon: number) => {
    const loc: Location = { name: `Custom (${lat.toFixed(3)}, ${lon.toFixed(3)})`, lat, lon };
    setState(s => ({ ...s, location: loc, hourlyDay: null }));
    loadData(loc, state.days);
  }, [loadData, state.days]);

  return { state, loadData, setLocation, setDays, setView, setHourlyDay, toggleVis, setCustomLocation };
}
