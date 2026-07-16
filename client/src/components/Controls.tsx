/** Controls — location selector, date range, custom lat/lon input, My Spots */
import { useState } from "react";
import { LOCATIONS, type Location } from "@/lib/fishingEngine";
import type { FishingState } from "@/hooks/useFishingData";
import { MySpotsManager } from "@/components/MySpotsManager";
import type { MySpot } from "@/hooks/useMySpots";

interface Props {
  state: FishingState;
  spots: MySpot[];
  onLocationChange: (loc: Location) => void;
  onDaysChange: (days: number) => void;
  onCustomLocation: (lat: number, lon: number) => void;
  onAddSpot: (name: string, lat: number, lon: number, notes?: string) => void;
  onUpdateSpot: (id: string, updates: Partial<Pick<MySpot, "name" | "lat" | "lon" | "notes">>) => void;
  onDeleteSpot: (id: string) => void;
}

export function Controls({ state, spots, onLocationChange, onDaysChange, onCustomLocation, onAddSpot, onUpdateSpot, onDeleteSpot }: Props) {
  const [showCustom, setShowCustom] = useState(false);
  const [latStr, setLatStr] = useState("");
  const [lonStr, setLonStr] = useState("");
  const [customErr, setCustomErr] = useState("");

  function handleCustomSubmit(e: React.FormEvent) {
    e.preventDefault();
    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);
    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      setCustomErr("Invalid lat/lon. Lat: -90 to 90, Lon: -180 to 180");
      return;
    }
    setCustomErr("");
    setShowCustom(false);
    onCustomLocation(lat, lon);
  }

  const allGroups = Object.entries(LOCATIONS);

  // Build My Spots group for the dropdown
  const mySpotOptions = spots.map(s => ({ name: s.name, lat: s.lat, lon: s.lon }));

  return (
    <div className="bg-[#0d1f3c] border-b border-[#1e3a5f] px-3 py-2 flex flex-wrap items-center gap-2">
      {/* Location selector */}
      <div className="flex items-center gap-1.5 min-w-0">
        <label className="text-[10px] text-[#7a9bb5] uppercase tracking-wider whitespace-nowrap">📍 Location</label>
        <select
          className="bg-[#0a1628] border border-[#1e3a5f] text-white text-xs rounded px-2 py-1.5 min-w-0 max-w-[200px] sm:max-w-xs focus:border-[#ff6b35] focus:outline-none min-h-[36px]"
          value={`${state.location.lat},${state.location.lon}`}
          onChange={e => {
            if (e.target.value === "__custom__") {
              setShowCustom(true);
              return;
            }
            const [lat, lon] = e.target.value.split(",").map(Number);
            // Check My Spots first
            const mySpot = spots.find(s => s.lat === lat && s.lon === lon);
            if (mySpot) { onLocationChange(mySpot); return; }
            const found = Object.values(LOCATIONS).flat().find(l => l.lat === lat && l.lon === lon);
            if (found) onLocationChange(found);
          }}
        >
          {mySpotOptions.length > 0 && (
            <optgroup label="📌 My Spots">
              {mySpotOptions.map(loc => (
                <option key={`${loc.lat},${loc.lon}`} value={`${loc.lat},${loc.lon}`}>
                  {loc.name}
                </option>
              ))}
            </optgroup>
          )}
          {allGroups.map(([group, locs]) => (
            <optgroup key={group} label={group}>
              {locs.map(loc => (
                <option key={`${loc.lat},${loc.lon}`} value={`${loc.lat},${loc.lon}`}>
                  {loc.name}
                </option>
              ))}
            </optgroup>
          ))}
          <optgroup label="✏️ Custom">
            <option value="__custom__">Enter Lat / Lon…</option>
          </optgroup>
        </select>
      </div>

      {/* Days selector */}
      <div className="flex items-center gap-1.5">
        <label className="text-[10px] text-[#7a9bb5] uppercase tracking-wider whitespace-nowrap">📅 Days</label>
        <select
          className="bg-[#0a1628] border border-[#1e3a5f] text-white text-xs rounded px-2 py-1.5 focus:border-[#ff6b35] focus:outline-none min-h-[36px]"
          value={state.days}
          onChange={e => onDaysChange(Number(e.target.value))}
        >
          {[3, 5, 7, 10, 14].map(d => (
            <option key={d} value={d}>{d} days</option>
          ))}
        </select>
      </div>

      {/* Timezone badge */}
      {state.timezone && (
        <span className="text-[10px] text-[#7a9bb5] bg-[#0a1628] border border-[#1e3a5f] rounded px-2 py-1 hidden sm:inline">
          🌐 {state.timezone.replace(/_/g, " ")}
        </span>
      )}

      {/* My Spots manager */}
      <div className="ml-auto">
        <MySpotsManager
          spots={spots}
          currentLat={state.location.lat}
          currentLon={state.location.lon}
          currentName={state.location.name}
          onAdd={onAddSpot}
          onUpdate={onUpdateSpot}
          onDelete={onDeleteSpot}
          onLoad={onLocationChange}
        />
      </div>

      {/* Custom lat/lon modal */}
      {showCustom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-[#0d1f3c] border border-[#1e3a5f] rounded-xl p-5 w-full max-w-sm shadow-2xl">
            <h3 className="text-[#ff6b35] font-bold text-lg mb-4">Custom Location</h3>
            <form onSubmit={handleCustomSubmit} className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-[#7a9bb5] block mb-1">Latitude (decimal, e.g. -32.06)</label>
                <input
                  type="number" step="any" value={latStr}
                  onChange={e => setLatStr(e.target.value)}
                  placeholder="-32.06"
                  className="w-full bg-[#0a1628] border border-[#1e3a5f] text-white text-sm rounded px-3 py-2 focus:border-[#ff6b35] focus:outline-none min-h-[44px]"
                />
              </div>
              <div>
                <label className="text-xs text-[#7a9bb5] block mb-1">Longitude (decimal, e.g. 115.65)</label>
                <input
                  type="number" step="any" value={lonStr}
                  onChange={e => setLonStr(e.target.value)}
                  placeholder="115.65"
                  className="w-full bg-[#0a1628] border border-[#1e3a5f] text-white text-sm rounded px-3 py-2 focus:border-[#ff6b35] focus:outline-none min-h-[44px]"
                />
              </div>
              {customErr && <p className="text-[#e05c5c] text-xs">{customErr}</p>}
              <div className="flex gap-2 mt-1">
                <button type="submit"
                  className="flex-1 bg-[#ff6b35] text-white text-sm font-bold py-2 rounded hover:bg-[#e55a2b] transition-colors active:scale-95 min-h-[44px]">
                  Load
                </button>
                <button type="button" onClick={() => setShowCustom(false)}
                  className="flex-1 bg-[#1e3a5f] text-white text-sm py-2 rounded hover:bg-[#2a4f7a] transition-colors active:scale-95 min-h-[44px]">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
