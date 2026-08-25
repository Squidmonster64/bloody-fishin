/**
 * MySpotsManager — slide-out drawer for managing saved fishing spots.
 * Features: add new spot (name + lat/lon), edit name/notes, delete, load into planner.
 */
import { useState } from "react";
import type { MySpot } from "@/hooks/useMySpots";
import type { Location } from "@/lib/fishingEngine";
import { findPlaces, type PlaceMatch } from "@/lib/geocoding";

interface Props {
  spots: MySpot[];
  currentLat?: number;
  currentLon?: number;
  currentName?: string;
  onAdd: (name: string, lat: number, lon: number, notes?: string) => void;
  onUpdate: (id: string, updates: Partial<Pick<MySpot, "name" | "lat" | "lon" | "notes">>) => void;
  onDelete: (id: string) => void;
  onLoad: (loc: Location) => void;
}

export function MySpotsManager({ spots, currentLat, currentLon, currentName, onAdd, onUpdate, onDelete, onLoad }: Props) {
  const [open, setOpen] = useState(false);
  const [addMode, setAddMode] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Add form state
  const [newName, setNewName] = useState("");
  const [newLat, setNewLat] = useState(currentLat?.toFixed(4) ?? "");
  const [newLon, setNewLon] = useState(currentLon?.toFixed(4) ?? "");
  const [newNotes, setNewNotes] = useState("");
  const [addErr, setAddErr] = useState("");
  const [placeQuery, setPlaceQuery] = useState("");
  const [matches, setMatches] = useState<PlaceMatch[]>([]);
  const [searching, setSearching] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editNotes, setEditNotes] = useState("");

  function openAdd() {
    setNewName(currentName?.startsWith("Custom") ? "" : (currentName ?? ""));
    setNewLat(currentLat?.toFixed(4) ?? "");
    setNewLon(currentLon?.toFixed(4) ?? "");
    setNewNotes("");
    setAddErr("");
    setPlaceQuery("");
    setMatches([]);
    setAddMode(true);
  }

  async function searchPlaces() {
    try {
      setSearching(true);
      setAddErr("");
      const results = await findPlaces(placeQuery);
      setMatches(results);
      if (!results.length) setAddErr("No matching places. Try a town, island, harbour, or landmark.");
    } catch (error) {
      setAddErr(error instanceof Error ? error.message : "Place search failed.");
    } finally {
      setSearching(false);
    }
  }

  function chooseMatch(match: PlaceMatch) {
    setNewName(match.name);
    setNewLat(match.lat.toFixed(5));
    setNewLon(match.lon.toFixed(5));
    setMatches([]);
    setAddErr("");
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const lat = parseFloat(newLat);
    const lon = parseFloat(newLon);
    if (!newName.trim()) { setAddErr("Name is required"); return; }
    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      setAddErr("Invalid lat/lon"); return;
    }
    onAdd(newName.trim(), lat, lon, newNotes.trim() || undefined);
    setAddMode(false);
    setAddErr("");
  }

  function startEdit(spot: MySpot) {
    setEditId(spot.id);
    setEditName(spot.name);
    setEditNotes(spot.notes ?? "");
  }

  function handleEditSave(id: string) {
    if (!editName.trim()) return;
    onUpdate(id, { name: editName.trim(), notes: editNotes.trim() || undefined });
    setEditId(null);
  }

  function handleDelete(id: string) {
    if (confirm("Delete this spot?")) onDelete(id);
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--app-bg)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--action)] rounded text-xs font-semibold transition-all duration-150 min-h-[36px]"
        title="My Saved Spots"
      >
        <span>📌</span>
        <span className="hidden sm:inline">My Spots</span>
        {spots.length > 0 && (
          <span className="bg-[var(--action)] text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {spots.length}
          </span>
        )}
      </button>

      {/* Drawer overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="flex-1 bg-black/60" onClick={() => setOpen(false)} />
          {/* Panel */}
          <div className="w-full max-w-sm bg-[var(--surface)] border-l border-[var(--border)] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--app-bg)]">
              <div>
                <h2 className="text-[var(--action)] font-black text-base" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
                  📌 My Spots
                </h2>
                <p className="text-[var(--text-muted)] text-[10px]">{spots.length} saved location{spots.length !== 1 ? "s" : ""}</p>
              </div>
              <button onClick={() => setOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text)] text-xl leading-none p-1 min-w-[44px] min-h-[44px] flex items-center justify-center">
                ✕
              </button>
            </div>

            {/* Add new spot */}
            <div className="px-4 py-3 border-b border-[var(--border)]">
              {!addMode ? (
                <button onClick={openAdd}
                  className="w-full flex items-center justify-center gap-2 bg-[var(--action)]/20 border border-[var(--action)]/50 text-[var(--action)] font-bold text-sm py-2.5 rounded-lg hover:opacity-90/30 transition-colors min-h-[44px]">
                  <span>+</span> Save Current Location
                </button>
              ) : (
                <form onSubmit={handleAdd} className="flex flex-col gap-2">
                  <p className="text-[var(--action)] text-xs font-bold uppercase tracking-wider">New Spot</p>
                  <p className="text-[var(--text-muted)] text-xs">Search a place worldwide, or enter your own name and coordinates below.</p>
                  <div className="flex gap-2">
                    <input
                      type="search" value={placeQuery} onChange={e => setPlaceQuery(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); searchPlaces(); } }}
                      placeholder="Find a place, harbour, island…"
                      className="min-w-0 flex-1 bg-[var(--app-bg)] border border-[var(--border)] text-[var(--text)] text-sm rounded px-3 py-2 focus:border-[var(--action)] focus:outline-none min-h-[44px]"
                    />
                    <button type="button" onClick={searchPlaces} disabled={searching || placeQuery.trim().length < 2}
                      className="min-h-[44px] rounded bg-[var(--surface-raised)] px-3 text-sm font-bold text-[var(--text)] disabled:opacity-50">
                      {searching ? "…" : "Find"}
                    </button>
                  </div>
                  {matches.length > 0 && (
                    <div className="max-h-40 overflow-y-auto rounded border border-[var(--border)] bg-[var(--app-bg)]">
                      {matches.map((match) => (
                        <button type="button" key={`${match.lat},${match.lon}`} onClick={() => chooseMatch(match)}
                          className="w-full border-b border-[var(--border)] px-3 py-2 text-left text-sm text-[var(--text)] last:border-b-0 hover:bg-[var(--surface-raised)]">
                          <span className="block font-semibold">{match.name}</span>
                          <span className="block text-[11px] text-[var(--text-muted)]">{match.description} · {match.lat.toFixed(4)}, {match.lon.toFixed(4)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <input
                    type="text" value={newName} onChange={e => setNewName(e.target.value)}
                    placeholder="Spot name (e.g. Dave's Secret Reef)"
                    className="bg-[var(--app-bg)] border border-[var(--border)] text-[var(--text)] text-sm rounded px-3 py-2 focus:border-[var(--action)] focus:outline-none min-h-[44px]"
                  />
                  <div className="flex gap-2">
                    <input
                      type="number" step="any" value={newLat} onChange={e => setNewLat(e.target.value)}
                      placeholder="Latitude"
                      className="flex-1 bg-[var(--app-bg)] border border-[var(--border)] text-[var(--text)] text-sm rounded px-2 py-2 focus:border-[var(--action)] focus:outline-none min-h-[44px]"
                    />
                    <input
                      type="number" step="any" value={newLon} onChange={e => setNewLon(e.target.value)}
                      placeholder="Longitude"
                      className="flex-1 bg-[var(--app-bg)] border border-[var(--border)] text-[var(--text)] text-sm rounded px-2 py-2 focus:border-[var(--action)] focus:outline-none min-h-[44px]"
                    />
                  </div>
                  <input
                    type="text" value={newNotes} onChange={e => setNewNotes(e.target.value)}
                    placeholder="Notes (optional — species, depth, rig…)"
                    className="bg-[var(--app-bg)] border border-[var(--border)] text-[var(--text)] text-sm rounded px-3 py-2 focus:border-[var(--action)] focus:outline-none min-h-[44px]"
                  />
                  {addErr && <p className="text-[var(--danger)] text-xs">{addErr}</p>}
                  <div className="flex gap-2">
                    <button type="submit"
                      className="flex-1 bg-[var(--action)] text-white text-sm font-bold py-2 rounded hover:opacity-90 transition-colors min-h-[44px]">
                      Save Spot
                    </button>
                    <button type="button" onClick={() => setAddMode(false)}
                      className="flex-1 bg-[var(--surface-raised)] text-[var(--text)] text-sm py-2 rounded hover:bg-[var(--surface-raised)] transition-colors min-h-[44px]">
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Spots list */}
            <div className="flex-1 overflow-y-auto">
              {spots.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 gap-2 text-center px-4">
                  <p className="text-3xl">🎣</p>
                  <p className="text-[var(--text-muted)] text-sm">No spots saved yet.</p>
                  <p className="text-[var(--text-muted)] text-xs">Navigate to a location then hit "Save Current Location".</p>
                </div>
              ) : (
                <ul className="divide-y divide-[var(--border)]">
                  {spots.map(spot => (
                    <li key={spot.id} className="px-4 py-3">
                      {editId === spot.id ? (
                        <div className="flex flex-col gap-2">
                          <input
                            type="text" value={editName} onChange={e => setEditName(e.target.value)}
                            className="bg-[var(--app-bg)] border border-[var(--action)] text-[var(--text)] text-sm rounded px-3 py-2 focus:outline-none min-h-[44px]"
                          />
                          <input
                            type="text" value={editNotes} onChange={e => setEditNotes(e.target.value)}
                            placeholder="Notes…"
                            className="bg-[var(--app-bg)] border border-[var(--border)] text-[var(--text)] text-sm rounded px-3 py-2 focus:border-[var(--action)] focus:outline-none min-h-[44px]"
                          />
                          <div className="flex gap-2">
                            <button onClick={() => handleEditSave(spot.id)}
                              className="flex-1 bg-[var(--success)] text-[var(--app-bg)] text-sm font-bold py-2 rounded hover:opacity-90 transition-colors min-h-[44px]">
                              Save
                            </button>
                            <button onClick={() => setEditId(null)}
                              className="flex-1 bg-[var(--surface-raised)] text-[var(--text)] text-sm py-2 rounded hover:bg-[var(--surface-raised)] transition-colors min-h-[44px]">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-[var(--text)] font-semibold text-sm truncate">{spot.name}</p>
                              <p className="text-[var(--text-muted)] text-[10px] font-mono mt-0.5">
                                {spot.lat.toFixed(4)}, {spot.lon.toFixed(4)}
                              </p>
                              {spot.notes && (
                                <p className="text-[var(--text-muted)] text-[10px] mt-0.5 italic truncate">{spot.notes}</p>
                              )}
                              <p className="text-[var(--text-muted)] text-[9px] mt-0.5">
                                Saved {new Date(spot.savedAt).toLocaleDateString("en-AU")}
                              </p>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <button
                                onClick={() => { onLoad(spot); setOpen(false); }}
                                className="bg-[var(--action)] text-white text-[10px] font-bold px-2 py-1 rounded hover:opacity-90 transition-colors min-w-[44px] min-h-[36px]"
                                title="Load this spot">
                                Load
                              </button>
                              <button
                                onClick={() => startEdit(spot)}
                                className="bg-[var(--surface-raised)] text-[var(--text-muted)] text-[10px] px-2 py-1 rounded hover:text-[var(--text)] hover:bg-[var(--surface-raised)] transition-colors min-w-[36px] min-h-[36px]"
                                title="Edit">
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDelete(spot.id)}
                                className="bg-[var(--surface-raised)] text-[var(--danger)] text-[10px] font-bold px-2 py-1 rounded hover:bg-[color-mix(in_srgb,var(--danger)_20%,transparent)] transition-colors min-w-[44px] min-h-[36px]"
                                title="Delete this saved location">
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
