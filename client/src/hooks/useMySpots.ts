/**
 * useMySpots — localStorage CRUD for user-saved fishing spots.
 * Spots are stored under the key "bdave_my_spots".
 */
import { useState, useCallback } from "react";
import type { Location } from "@/lib/fishingEngine";

export interface MySpot extends Location {
  id: string;
  savedAt: string; // ISO date string
  notes?: string;
}

import { importSpots } from "@/lib/spotTransfer";

const STORAGE_KEY = "bdave_my_spots";

function load(): MySpot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as MySpot[];
  } catch {
    return [];
  }
}

function save(spots: MySpot[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(spots));
  } catch {
    // Storage full — silently ignore
  }
}

export function useMySpots() {
  const [spots, setSpots] = useState<MySpot[]>(() => load());

  const addSpot = useCallback((name: string, lat: number, lon: number, notes?: string) => {
    const spot: MySpot = {
      id: `spot_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name,
      lat,
      lon,
      notes,
      savedAt: new Date().toISOString(),
    };
    setSpots(prev => {
      const next = [spot, ...prev];
      save(next);
      return next;
    });
    return spot;
  }, []);

  const updateSpot = useCallback((id: string, updates: Partial<Pick<MySpot, "name" | "lat" | "lon" | "notes">>) => {
    setSpots(prev => {
      const next = prev.map(s => s.id === id ? { ...s, ...updates } : s);
      save(next);
      return next;
    });
  }, []);

  const deleteSpot = useCallback((id: string) => {
    setSpots(prev => {
      const next = prev.filter(s => s.id !== id);
      save(next);
      return next;
    });
  }, []);

  const importSavedSpots = useCallback((text: string) => {
    const next = importSpots(text, spots);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSpots(next);
  }, [spots]);
  return { spots, addSpot, updateSpot, deleteSpot, importSavedSpots };
}
