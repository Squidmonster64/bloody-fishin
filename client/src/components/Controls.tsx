/** Controls — location selector, date range, custom lat/lon, My Spots, Print */
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
  onCustomLocation: (lat: number, lon: number, name?: string) => void;
  onAddSpot: (name: string, lat: number, lon: number, notes?: string) => void;
  onUpdateSpot: (id: string, updates: Partial<Pick<MySpot, "name" | "lat" | "lon" | "notes">>) => void;
  onDeleteSpot: (id: string) => void;
  onPrint: () => void;
  onBrief: () => void;
  onCompare: () => void;
  onRefresh: () => void;
}

const field =
  "bg-[var(--app-bg)] border border-[var(--border)] text-[var(--text)] rounded px-3 py-2 focus:border-[var(--action)] focus:outline-none font-semibold";
const ghostBtn =
  "flex min-h-[40px] min-w-[40px] items-center justify-center gap-1.5 rounded border border-[var(--border)] bg-[var(--app-bg)] px-2.5 py-1.5 text-sm font-semibold text-[var(--text-muted)] transition-colors hover:border-[var(--action)] hover:text-[var(--text)]";

export function Controls({
  state,
  spots,
  onLocationChange,
  onDaysChange,
  onCustomLocation,
  onAddSpot,
  onUpdateSpot,
  onDeleteSpot,
  onPrint,
  onBrief,
  onCompare,
  onRefresh,
}: Props) {
  const [showCustom, setShowCustom] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [latStr, setLatStr] = useState("");
  const [lonStr, setLonStr] = useState("");
  const [customName, setCustomName] = useState("");
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
    onCustomLocation(lat, lon, customName);
  }

  const allGroups = Object.entries(LOCATIONS);
  const mySpotOptions = spots.map(s => ({ name: s.name, lat: s.lat, lon: s.lon }));

  function chooseLocation(lat: number, lon: number) {
    const mySpot = spots.find(s => s.lat === lat && s.lon === lon);
    if (mySpot) {
      onLocationChange(mySpot);
      return;
    }
    const found = Object.values(LOCATIONS)
      .flat()
      .find(l => l.lat === lat && l.lon === lon);
    if (found) onLocationChange(found);
  }

  return (
    <div className="bg-[var(--surface)] border-b border-[var(--border)] px-3 py-1.5 flex flex-wrap items-center gap-2">
      <div className="controls-location flex w-full items-center gap-2 sm:w-auto sm:flex-1 sm:max-w-md">
        <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap font-semibold">
          Location
        </label>
        <button
          type="button"
          onClick={() => setShowLocationPicker(true)}
          className="phone-location-trigger flex min-h-[44px] flex-1 items-center justify-between gap-3 rounded border border-[var(--border)] bg-[var(--app-bg)] px-3 text-left text-base font-semibold text-[var(--text)] min-[700px]:hidden"
          aria-label="Choose fishing location"
        >
          <span className="truncate">{state.location.name}</span>
          <span className="text-[var(--action)]" aria-hidden="true">
            ⌄
          </span>
        </button>
        <select
          className={`hidden min-h-[40px] min-w-0 flex-1 text-sm min-[700px]:block min-[700px]:w-auto ${field}`}
          value={`${state.location.lat},${state.location.lon}`}
          onChange={e => {
            if (e.target.value === "__custom__") {
              setShowCustom(true);
              return;
            }
            const [lat, lon] = e.target.value.split(",").map(Number);
            chooseLocation(lat, lon);
          }}
        >
          {mySpotOptions.length > 0 && (
            <optgroup label="My Spots">
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
          <optgroup label="Custom">
            <option value="__custom__">Enter Lat / Lon…</option>
          </optgroup>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap font-semibold">
          Range
        </label>
        <select
          className={`min-h-[40px] text-sm font-medium ${field}`}
          value={state.days}
          onChange={e => onDaysChange(Number(e.target.value))}
        >
          {[3, 5, 7, 10, 14].map(d => (
            <option key={d} value={d}>
              {d} days
            </option>
          ))}
        </select>
      </div>

      {state.timezone && (
        <span className="text-xs text-[var(--text-muted)] bg-[var(--app-bg)] border border-[var(--border)] rounded px-2.5 py-1.5 hidden md:inline font-medium">
          {state.timezone.replace(/_/g, " ")}
        </span>
      )}

      <div className="controls-actions ml-auto flex items-center gap-2">
        <button
          onClick={onRefresh}
          disabled={state.loading}
          className="flex min-h-[40px] min-w-[40px] items-center justify-center gap-1.5 rounded border border-[var(--action)] bg-[color-mix(in_srgb,var(--action)_15%,transparent)] px-2.5 py-1.5 text-sm font-bold text-[var(--action)] transition-colors hover:bg-[var(--action)] hover:text-[var(--app-bg)] disabled:cursor-wait disabled:opacity-60"
          title="Refresh live forecast"
          aria-label="Refresh live forecast"
        >
          <span className={state.loading ? "animate-spin" : ""}>↻</span>
          <span className="hidden lg:inline">Refresh</span>
        </button>
        <button onClick={onCompare} className={ghostBtn} title="Compare fishing spots">
          <span className="hidden lg:inline">Compare</span>
          <span className="lg:hidden" aria-hidden>
            ⇄
          </span>
        </button>
        <button onClick={onBrief} className={ghostBtn} title="Share fishing briefing">
          <span className="hidden lg:inline">Brief</span>
          <span className="lg:hidden" aria-hidden>
            ↗
          </span>
        </button>
        <button onClick={onPrint} className={ghostBtn} title="Print forecast">
          <span className="hidden sm:inline">Print</span>
          <span className="sm:hidden" aria-hidden>
            ⎙
          </span>
        </button>
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

      {showLocationPicker && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/65 min-[700px]:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Choose fishing location"
        >
          <div className="max-h-[82svh] w-full overflow-y-auto rounded-t-2xl border-t border-[var(--border)] bg-[var(--surface)] shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3">
              <div>
                <h2 className="font-bold text-[var(--text)]">Choose fishing location</h2>
                <p className="text-xs text-[var(--text-muted)]">Tap a spot to load its forecast.</p>
              </div>
              <button
                onClick={() => setShowLocationPicker(false)}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-xl text-[var(--text-muted)] hover:text-[var(--text)]"
                aria-label="Close location picker"
              >
                ×
              </button>
            </div>
            <div className="space-y-4 p-4 pb-8">
              {mySpotOptions.length > 0 && (
                <section>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--action)]">
                    My Spots
                  </h3>
                  <div className="space-y-2">
                    {mySpotOptions.map(loc => (
                      <button
                        key={`my-${loc.lat},${loc.lon}`}
                        onClick={() => {
                          chooseLocation(loc.lat, loc.lon);
                          setShowLocationPicker(false);
                        }}
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--app-bg)] px-4 py-3 text-left text-base font-semibold text-[var(--text)] hover:border-[var(--action)]"
                      >
                        {loc.name}
                      </button>
                    ))}
                  </div>
                </section>
              )}
              {allGroups.map(([group, locs]) => (
                <section key={group}>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    {group}
                  </h3>
                  <div className="space-y-2">
                    {locs.map(loc => (
                      <button
                        key={`${loc.lat},${loc.lon}`}
                        onClick={() => {
                          chooseLocation(loc.lat, loc.lon);
                          setShowLocationPicker(false);
                        }}
                        className={`w-full rounded-lg border px-4 py-3 text-left text-base font-semibold transition-colors ${
                          loc.lat === state.location.lat && loc.lon === state.location.lon
                            ? "border-[var(--action)] bg-[color-mix(in_srgb,var(--action)_15%,transparent)] text-[var(--text)]"
                            : "border-[var(--border)] bg-[var(--app-bg)] text-[var(--text)] hover:border-[var(--action)]"
                        }`}
                      >
                        {loc.name}
                      </button>
                    ))}
                  </div>
                </section>
              ))}
              <button
                onClick={() => {
                  setShowLocationPicker(false);
                  setShowCustom(true);
                }}
                className="w-full rounded-lg border border-dashed border-[var(--action)] bg-[color-mix(in_srgb,var(--action)_10%,transparent)] px-4 py-3 text-left text-base font-bold text-[var(--action)]"
              >
                Enter custom latitude / longitude
              </button>
            </div>
          </div>
        </div>
      )}

      {showCustom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 w-full max-w-sm shadow-2xl">
            <h3 className="text-[var(--text)] font-bold text-lg mb-4">Custom Location</h3>
            <form onSubmit={handleCustomSubmit} className="flex flex-col gap-3">
              <div>
                <label className="text-sm text-[var(--text-muted)] block mb-1">
                  Location name (optional)
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  placeholder="e.g. North Reef"
                  className={`w-full text-sm min-h-[44px] ${field}`}
                />
              </div>
              <div>
                <label className="text-sm text-[var(--text-muted)] block mb-1">
                  Latitude (decimal, e.g. -32.06)
                </label>
                <input
                  type="number"
                  step="any"
                  value={latStr}
                  onChange={e => setLatStr(e.target.value)}
                  placeholder="-32.06"
                  className={`w-full text-sm min-h-[44px] ${field}`}
                />
              </div>
              <div>
                <label className="text-sm text-[var(--text-muted)] block mb-1">
                  Longitude (decimal, e.g. 115.65)
                </label>
                <input
                  type="number"
                  step="any"
                  value={lonStr}
                  onChange={e => setLonStr(e.target.value)}
                  placeholder="115.65"
                  className={`w-full text-sm min-h-[44px] ${field}`}
                />
              </div>
              {customErr && <p className="text-[var(--danger)] text-sm">{customErr}</p>}
              <div className="flex gap-2 mt-1">
                <button
                  type="submit"
                  className="flex-1 bg-[var(--action)] text-white text-sm font-bold py-2.5 rounded hover:opacity-90 transition-opacity active:scale-95 min-h-[44px]"
                >
                  Load
                </button>
                <button
                  type="button"
                  onClick={() => setShowCustom(false)}
                  className="flex-1 bg-[var(--surface-raised)] text-[var(--text)] text-sm py-2.5 rounded hover:opacity-90 transition-opacity active:scale-95 min-h-[44px]"
                >
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
