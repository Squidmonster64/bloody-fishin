/**
 * CompareSpotsSheet — two-location, phone-first daily comparison.
 * It deliberately uses stacked day cards rather than a wide table so it remains
 * useful on a 375px iPhone SE in either orientation.
 */
import { useEffect, useMemo, useState } from "react";
import { fetchFishingData, getTimezone, LOCATIONS, type AppData, type Location } from "@/lib/fishingEngine";
import type { MySpot } from "@/hooks/useMySpots";

function isSame(a: Location, b: Location) { return a.lat === b.lat && a.lon === b.lon; }
function dailyScore(day: AppData["daily"][number]) {
  return day.peakFish + day.bestFishStars * 5 - (day.maxWind ?? 0) * 1.4 - (day.maxSwell ?? 0) * 5;
}

function within<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => window.setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

function SpotLine({ name, day, winner }: { name: string; day: AppData["daily"][number]; winner: boolean }) {
  return <div className={`rounded-lg border p-3 ${winner ? "border-[#3ecf8e]/70 bg-[#3ecf8e]/10" : "border-[#1e3a5f] bg-[#0a1628]"}`}>
    <div className="flex items-start justify-between gap-2"><p className="text-sm font-bold text-white">{winner && "🏆 "}{name}</p><span className="text-sm font-black text-[#ff6b35]">{day.peakFish}%</span></div>
    <p className="mt-1 text-xs text-[#7a9bb5]">🎣 {day.bestFishStars}★ · 💨 {day.maxWind?.toFixed(0) ?? "—"}kt · 🌊 {day.maxSwell?.toFixed(1) ?? "—"}m</p>
    <p className={`mt-1 text-[11px] font-semibold ${day.isGolden ? "text-yellow-300" : "text-[#7a9bb5]"}`}>{day.isGolden ? "⭐ Golden conditions detected" : "No golden-day flag"}</p>
  </div>;
}

export function CompareSpotsSheet({ baseData, savedSpots, onClose }: { baseData: AppData; savedSpots: MySpot[]; onClose: () => void }) {
  const candidates = useMemo(() => [...savedSpots, ...Object.values(LOCATIONS).flat()].filter(loc => !isSame(loc, baseData.location)), [savedSpots, baseData.location]);
  const [selectedKey, setSelectedKey] = useState(() => candidates[0] ? `${candidates[0].lat},${candidates[0].lon}` : "");
  const [compareData, setCompareData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const selected = candidates.find(loc => `${loc.lat},${loc.lon}` === selectedKey) ?? candidates[0];

  async function loadCompare() {
    if (!selected) return;
    setLoading(true); setError("");
    try {
      const tz = await within(getTimezone(selected.lat, selected.lon), 8000);
      setCompareData(await within(fetchFishingData(selected, baseData.daily.length, tz), 15000));
    } catch { setError("Could not load the comparison forecast within 15 seconds. Check reception, then tap Compare to retry."); }
    finally { setLoading(false); }
  }

  useEffect(() => { void loadCompare(); /* deliberate initial comparison */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div className="fixed inset-0 z-50 flex items-end bg-black/65 sm:items-center sm:justify-center sm:p-4" role="dialog" aria-modal="true" aria-label="Compare fishing spots">
    <div className="max-h-[88svh] w-full overflow-y-auto rounded-t-2xl border border-[#1e3a5f] bg-[#0d1f3c] p-4 shadow-2xl sm:max-w-2xl sm:rounded-xl">
      <div className="flex items-start justify-between gap-3 border-b border-[#1e3a5f] pb-3"><div><h2 className="text-lg font-bold text-[#ff6b35]">⚖️ Compare spots</h2><p className="mt-1 text-xs text-[#7a9bb5]">Stacked day cards are sized for an iPhone SE—no side-scrolling table.</p></div><button onClick={onClose} className="flex min-h-[44px] min-w-[44px] items-center justify-center text-xl text-[#7a9bb5] hover:text-white" aria-label="Close comparison">×</button></div>
      <div className="mt-4 rounded-lg border border-[#1e3a5f] bg-[#0a1628] p-3"><label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#7a9bb5]">Compare {baseData.location.name} with</label><div className="flex gap-2"><select value={selectedKey} onChange={e => setSelectedKey(e.target.value)} className="min-h-[48px] min-w-0 flex-1 rounded border border-[#1e3a5f] bg-[#0d1f3c] px-3 text-base font-semibold text-white"><option value="">Choose a spot…</option>{candidates.map(loc => <option key={`${loc.lat},${loc.lon}`} value={`${loc.lat},${loc.lon}`}>{loc.name}</option>)}</select><button onClick={loadCompare} disabled={!selected || loading} className="min-h-[48px] rounded bg-[#ff6b35] px-4 text-sm font-bold text-white disabled:opacity-50">{loading ? "Loading" : "Compare"}</button></div></div>
      {error && <p className="mt-3 rounded border border-red-400/40 bg-red-400/10 p-3 text-xs text-red-200">{error}</p>}
      {compareData && <div className="mt-4 space-y-3">{baseData.daily.map((baseDay, index) => { const other = compareData.daily[index]; if (!other) return null; const baseWins = dailyScore(baseDay) >= dailyScore(other); const date = new Date(`${baseDay.date}T12:00:00`).toLocaleDateString("en-AU", { weekday:"short", day:"numeric", month:"short" }); return <section key={baseDay.date}><p className="mb-1 px-1 text-xs font-bold uppercase tracking-wider text-[#7a9bb5]">{date}</p><div className="grid gap-2"><SpotLine name={baseData.location.name} day={baseDay} winner={baseWins} /><SpotLine name={compareData.location.name} day={other} winner={!baseWins} /></div></section>; })}</div>}
      {!loading && !compareData && !error && <p className="py-8 text-center text-sm text-[#7a9bb5]">Choose a comparison spot to load its forecast.</p>}
    </div>
  </div>;
}
