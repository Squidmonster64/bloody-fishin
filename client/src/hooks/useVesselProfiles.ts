/**
 * useVesselProfiles — user-defined vessel configurations persisted locally.
 * Design: each profile owns its own boating and fishing thresholds, with no
 * server or account required; it stays private to the device via localStorage.
 */
import { useCallback, useState } from "react";
import type { SickieCriteria } from "@/lib/sickieCriteria";

export interface VesselProfile {
  id: string;
  name: string;
  emoji: string;
  notes?: string;
  criteria: SickieCriteria;
  savedAt: string;
}

const STORAGE_KEY = "bdave_vessel_profiles_v1";

function load(): VesselProfile[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

function save(profiles: VesselProfile[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

export function useVesselProfiles() {
  const [profiles, setProfiles] = useState<VesselProfile[]>(load);

  const addProfile = useCallback((profile: Omit<VesselProfile, "id" | "savedAt">) => {
    const newProfile: VesselProfile = {
      ...profile,
      id: `vessel_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      savedAt: new Date().toISOString(),
    };
    setProfiles(current => {
      const next = [...current, newProfile];
      save(next);
      return next;
    });
    return newProfile;
  }, []);

  const updateProfile = useCallback((id: string, updates: Partial<Omit<VesselProfile, "id" | "savedAt">>) => {
    setProfiles(current => {
      const next = current.map(profile => profile.id === id ? { ...profile, ...updates } : profile);
      save(next);
      return next;
    });
  }, []);

  const deleteProfile = useCallback((id: string) => {
    setProfiles(current => {
      const next = current.filter(profile => profile.id !== id);
      save(next);
      return next;
    });
  }, []);

  return { profiles, addProfile, updateProfile, deleteProfile };
}

