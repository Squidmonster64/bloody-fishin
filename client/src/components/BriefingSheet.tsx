/**
 * BriefingSheet — a compact, shareable operational summary designed for 375px phones.
 */
import { useMemo, useState } from "react";
import type { AppData } from "@/lib/fishingEngine";

function formatBriefing(data: AppData) {
  const today = data.daily[0];
  const golden = data.merged.find(row => row.golden && row.hour >= 5 && row.hour <= 19);
  const rangeStart = data.daily[0]?.date;
  const rangeEnd = data.daily[data.daily.length - 1]?.date;
  const maxWind = today?.maxWind != null ? `${Math.round(today.maxWind)}kt` : "—";
  const maxSwell = today?.maxSwell != null ? `${today.maxSwell.toFixed(1)}m` : "—";
  const goldenLine = golden
    ? `Best highlighted hour: ${golden.label} — ${golden.fishScore}% (${golden.fishStars}★), SL20 rank ${golden.slRank}/3, wind ${golden.windKt?.toFixed(0) ?? "—"}kt, swell ${golden.swellH?.toFixed(1) ?? "—"}m.`
    : "No highlighted daylight hour in the currently loaded forecast.";
  const fetched = data.fetchedAt
    ? new Date(data.fetchedAt).toLocaleString("en-AU")
    : "unknown";
  const marineNote = data.marineUnavailable
    ? "Marine feed unavailable — boat rating may be wind-led only."
    : data.marineThrough
      ? `Marine data through ${data.marineThrough}.`
      : "Marine coverage not stated.";
  return `BLOODY DAVE'S FISHING BRIEF\n\nSpot: ${data.location.name}\nForecast: ${rangeStart} to ${rangeEnd} (${data.timezone})\nData fetched: ${fetched}\n${marineNote}\nToday: max wind ${maxWind} · max swell ${maxSwell} · peak fishing ${today?.peakFish ?? "—"}% (${today?.bestFishStars ?? "—"}★)\n${goldenLine}\n\nPlanning aid only — not a substitute for Bureau of Meteorology marine warnings, local bar knowledge, or skipper judgement.`;
}

export function BriefingSheet({ data, onClose }: { data: AppData; onClose: () => void }) {
  const [status, setStatus] = useState("");
  const briefing = useMemo(() => formatBriefing(data), [data]);

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title: "Bloody Dave's Fishing Brief", text: briefing });
        setStatus("Briefing shared.");
      } else {
        await navigator.clipboard.writeText(briefing);
        setStatus("Briefing copied — paste it into Messages, Claude, or ChatGPT.");
      }
    } catch { setStatus("Share cancelled or unavailable."); }
  }

  async function copy() {
    try { await navigator.clipboard.writeText(briefing); setStatus("Briefing copied to clipboard."); }
    catch { setStatus("Copy is unavailable in this browser."); }
  }

  return <div className="fixed inset-0 z-50 flex items-end bg-black/65 sm:items-center sm:justify-center sm:p-4" role="dialog" aria-modal="true" aria-label="Fishing briefing">
    <div className="w-full max-h-[86svh] overflow-y-auto rounded-t-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-2xl sm:max-w-xl sm:rounded-xl">
      <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] pb-3"><div><h2 className="text-lg font-bold text-[var(--action)]">📤 Fishing briefing</h2><p className="mt-1 text-xs text-[var(--text-muted)]">Compact text for your crew, a group chat, or an AI assistant.</p></div><button onClick={onClose} className="flex min-h-[44px] min-w-[44px] items-center justify-center text-xl text-[var(--text-muted)] hover:text-[var(--text)]" aria-label="Close briefing">×</button></div>
      <pre className="mt-4 whitespace-pre-wrap rounded-lg border border-[var(--border)] bg-[var(--app-bg)] p-3 text-xs leading-relaxed text-[var(--warm-text)]">{briefing}</pre>
      {status && <p className="mt-3 text-xs text-[var(--success)]">{status}</p>}
      <div className="mt-4 grid grid-cols-2 gap-2"><button onClick={share} className="min-h-[48px] rounded-lg bg-[var(--action)] px-3 text-sm font-bold text-white">📤 Share</button><button onClick={copy} className="min-h-[48px] rounded-lg border border-[var(--border)] bg-[var(--app-bg)] px-3 text-sm font-bold text-[var(--text)]">📋 Copy</button></div>
    </div>
  </div>;
}
