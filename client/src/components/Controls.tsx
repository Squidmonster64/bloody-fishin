/** Controls — location selector, date range, custom lat/lon input, My Spots, Print */
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
  onPrint: () => void;
  onAIData: () => void;
  onBrief: () => void;
  onCompare: () => void;
}

export function Controls({ state, spots, onLocationChange, onDaysChange, onCustomLocation, onAddSpot, onUpdateSpot, onDeleteSpot, onPrint, onAIData, onBrief, onCompare }: Props) {
  const [showCustom, setShowCustom] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
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
  const mySpotOptions = spots.map(s => ({ name: s.name, lat: s.lat, lon: s.lon }));

  function chooseLocation(lat: number, lon: number) {
    const mySpot = spots.find(s => s.lat === lat && s.lon === lon);
    if (mySpot) { onLocationChange(mySpot); return; }
    const found = Object.values(LOCATIONS).flat().find(l => l.lat === lat && l.lon === lon);
    if (found) onLocationChange(found);
  }

  return (
    <div className="bg-[#0d1f3c] border-b border-[#1e3a5f] px-3 py-2.5 flex flex-wrap items-center gap-2.5">
      {/* Location selector */}
      <div className="controls-location flex w-full items-center gap-2 sm:w-auto sm:flex-1 sm:max-w-md">
        <label className="text-xs text-[#7a9bb5] uppercase tracking-wider whitespace-nowrap font-semibold">📍 Location</label>
        <button
          type="button"
          onClick={() => setShowLocationPicker(true)}
          className="phone-location-trigger flex min-h-[52px] flex-1 items-center justify-between gap-3 rounded-lg border border-[#1e3a5f] bg-[#0a1628] px-4 text-left text-base font-semibold text-white sm:hidden"
          aria-label="Choose fishing location"
        >
          <span className="truncate">{state.location.name}</span>
          <span className="text-[#ff6b35]" aria-hidden="true">⌄</span>
        </button>
        <select
          className="hidden bg-[#0a1628] border border-[#1e3a5f] text-white text-base rounded px-3 py-2 min-w-0 flex-1 sm:block sm:w-auto focus:border-[#ff6b35] focus:outline-none min-h-[48px] font-semibold"
          value={`${state.location.lat},${state.location.lon}`}
          onChange={e => {
            if (e.target.value === "__custom__") { setShowCustom(true); return; }
            const [lat, lon] = e.target.value.split(",").map(Number);
            chooseLocation(lat, lon);
          }}
        >
          {mySpotOptions.length > 0 && (
            <optgroup label="📌 My Spots">
              {mySpotOptions.map(loc => (
                <option key={`${loc.lat},${loc.lon}`} value={`${loc.lat},${loc.lon}`}>{loc.name}</option>
              ))}
            </optgroup>
          )}
          {allGroups.map(([group, locs]) => (
            <optgroup key={group} label={group}>
              {locs.map(loc => (
                <option key={`${loc.lat},${loc.lon}`} value={`${loc.lat},${loc.lon}`}>{loc.name}</option>
              ))}
            </optgroup>
          ))}
          <optgroup label="✏️ Custom">
            <option value="__custom__">Enter Lat / Lon…</option>
          </optgroup>
        </select>
      </div>

      {/* Days selector */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-[#7a9bb5] uppercase tracking-wider whitespace-nowrap font-semibold">📅</label>
        <select
          className="bg-[#0a1628] border border-[#1e3a5f] text-white text-sm rounded px-3 py-2 focus:border-[#ff6b35] focus:outline-none min-h-[44px] font-medium"
          value={state.days}
          onChange={e => onDaysChange(Number(e.target.value))}
        >
          {[3, 5, 7, 10, 14].map(d => (
            <option key={d} value={d}>{d} days</option>
          ))}
        </select>
      </div>

      {/* Timezone badge — desktop only */}
      {state.timezone && (
        <span className="text-xs text-[#7a9bb5] bg-[#0a1628] border border-[#1e3a5f] rounded px-2.5 py-1.5 hidden md:inline font-medium">
          🌐 {state.timezone.replace(/_/g, " ")}
        </span>
      )}

      {/* Right-side actions */}
      <div className="controls-actions ml-auto flex items-center gap-2">
        <button onClick={onCompare} className="flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded border border-[#1e3a5f] bg-[#0a1628] px-3 py-2 text-sm font-semibold text-[#7a9bb5] transition-all duration-150 hover:border-[#ff6b35] hover:text-white" title="Compare fishing spots">
          <span>⚖️</span><span className="hidden lg:inline">Compare</span>
        </button>
        <button onClick={onBrief} className="flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded border border-[#1e3a5f] bg-[#0a1628] px-3 py-2 text-sm font-semibold text-[#7a9bb5] transition-all duration-150 hover:border-[#ff6b35] hover:text-white" title="Share fishing briefing">
          <span>📤</span><span className="hidden lg:inline">Brief</span>
        </button>
        <button
          onClick={onAIData}
          className="flex min-h-[44px] items-center gap-1.5 rounded border border-[#1e3a5f] bg-[#0a1628] px-3 py-2 text-sm font-semibold text-[#7a9bb5] transition-all duration-150 hover:border-[#ff6b35] hover:text-white"
          title="AI data links"
        >
          <span>🤖</span>
          <span className="hidden md:inline">AI Data</span>
        </button>
        {/* Print button */}
        <button
          onClick={onPrint}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] text-[#7a9bb5] hover:text-white hover:border-[#ff6b35] rounded text-sm font-semibold transition-all duration-150 min-h-[44px]"
          title="Print forecast"
        >
          <span>🖨️</span>
          <span className="hidden sm:inline">Print</span>
        </button>
        {/* My Spots manager */}
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

      {/* iPhone location picker: native selects are too compressed in landscape. */}
      {showLocationPicker && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/65 sm:hidden" role="dialog" aria-modal="true" aria-label="Choose fishing location">
          <div className="max-h-[82svh] w-full overflow-y-auto rounded-t-2xl border-t border-[#1e3a5f] bg-[#0d1f3c] shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-[#1e3a5f] bg-[#0d1f3c] px-4 py-3">
              <div>
                <h2 className="font-bold text-white">Choose fishing location</h2>
                <p className="text-xs text-[#7a9bb5]">Tap a spot to load its forecast.</p>
              </div>
              <button onClick={() => setShowLocationPicker(false)} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-xl text-[#7a9bb5] hover:text-white" aria-label="Close location picker">×</button>
            </div>
            <div className="space-y-4 p-4 pb-8">
              {mySpotOptions.length > 0 && (
                <section>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#ff6b35]">📌 My Spots</h3>
                  <div className="space-y-2">
                    {mySpotOptions.map(loc => (
                      <button key={`my-${loc.lat},${loc.lon}`} onClick={() => { chooseLocation(loc.lat, loc.lon); setShowLocationPicker(false); }}
                        className="w-full rounded-lg border border-[#1e3a5f] bg-[#0a1628] px-4 py-3 text-left text-base font-semibold text-white hover:border-[#ff6b35]">
                        {loc.name}
                      </button>
                    ))}
                  </div>
                </section>
              )}
              {allGroups.map(([group, locs]) => (
                <section key={group}>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#7a9bb5]">{group}</h3>
                  <div className="space-y-2">
                    {locs.map(loc => (
                      <button key={`${loc.lat},${loc.lon}`} onClick={() => { chooseLocation(loc.lat, loc.lon); setShowLocationPicker(false); }}
                        className={`w-full rounded-lg border px-4 py-3 text-left text-base font-semibold transition-colors ${loc.lat === state.location.lat && loc.lon === state.location.lon ? "border-[#ff6b35] bg-[#ff6b35]/15 text-white" : "border-[#1e3a5f] bg-[#0a1628] text-white hover:border-[#ff6b35]"}`}>
                        {loc.name}
                      </button>
                    ))}
                  </div>
                </section>
              ))}
              <button onClick={() => { setShowLocationPicker(false); setShowCustom(true); }} className="w-full rounded-lg border border-dashed border-[#ff6b35] bg-[#ff6b35]/10 px-4 py-3 text-left text-base font-bold text-[#ff6b35]">
                ✏️ Enter custom latitude / longitude
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom lat/lon modal */}
      {showCustom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-[#0d1f3c] border border-[#1e3a5f] rounded-xl p-5 w-full max-w-sm shadow-2xl">
            <h3 className="text-[#ff6b35] font-bold text-lg mb-4">Custom Location</h3>
            <form onSubmit={handleCustomSubmit} className="flex flex-col gap-3">
              <div>
                <label className="text-sm text-[#7a9bb5] block mb-1">Latitude (decimal, e.g. -32.06)</label>
                <input type="number" step="any" value={latStr} onChange={e => setLatStr(e.target.value)}
                  placeholder="-32.06"
                  className="w-full bg-[#0a1628] border border-[#1e3a5f] text-white text-sm rounded px-3 py-2.5 focus:border-[#ff6b35] focus:outline-none min-h-[44px]" />
              </div>
              <div>
                <label className="text-sm text-[#7a9bb5] block mb-1">Longitude (decimal, e.g. 115.65)</label>
                <input type="number" step="any" value={lonStr} onChange={e => setLonStr(e.target.value)}
                  placeholder="115.65"
                  className="w-full bg-[#0a1628] border border-[#1e3a5f] text-white text-sm rounded px-3 py-2.5 focus:border-[#ff6b35] focus:outline-none min-h-[44px]" />
              </div>
              {customErr && <p className="text-[#e05c5c] text-sm">{customErr}</p>}
              <div className="flex gap-2 mt-1">
                <button type="submit"
                  className="flex-1 bg-[#ff6b35] text-white text-sm font-bold py-2.5 rounded hover:bg-[#e55a2b] transition-colors active:scale-95 min-h-[44px]">
                  Load
                </button>
                <button type="button" onClick={() => setShowCustom(false)}
                  className="flex-1 bg-[#1e3a5f] text-white text-sm py-2.5 rounded hover:bg-[#2a4f7a] transition-colors active:scale-95 min-h-[44px]">
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
