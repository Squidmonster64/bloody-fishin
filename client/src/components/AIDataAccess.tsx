/**
 * AIDataAccess — machine-readable public data links for an external LLM.
 * The live app calculates fishing scores locally; raw weather and marine
 * forecast JSON is supplied by public Open-Meteo endpoints, with no app key.
 */
import { useMemo, useState } from "react";
import type { Location } from "@/lib/fishingEngine";

interface Props {
  location: Location;
  days: number;
  timezone: string;
  onClose: () => void;
}

function makeUrls(location: Location, days: number, timezone: string) {
  const params = new URLSearchParams({
    latitude: String(location.lat),
    longitude: String(location.lon),
    hourly: "temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation_probability",
    daily: "sunrise,sunset,uv_index_max",
    wind_speed_unit: "kn",
    timezone: timezone || "auto",
    forecast_days: String(days),
  });
  const marine = new URLSearchParams({
    latitude: String(location.lat),
    longitude: String(location.lon),
    hourly: "wave_height,wave_period,swell_wave_height,swell_wave_period,swell_wave_direction,wind_wave_height,sea_level_height_msl",
    timezone: timezone || "auto",
    forecast_days: String(Math.min(days, 8)),
    cell_selection: "sea",
  });
  return {
    weather: `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
    marine: `https://marine-api.open-meteo.com/v1/marine?${marine.toString()}`,
  };
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }
  return <button onClick={copy} className="min-h-[40px] rounded border border-[#1e3a5f] bg-[#0a1628] px-3 text-xs font-semibold text-[#7a9bb5] hover:border-[#ff6b35] hover:text-white">{copied ? "Copied" : label}</button>;
}

export function AIDataAccess({ location, days, timezone, onClose }: Props) {
  const urls = useMemo(() => makeUrls(location, days, timezone), [location, days, timezone]);
  const prompt = `Read the two public JSON forecasts below for ${location.name} (${location.lat}, ${location.lon}) over the next ${days} days. Interpret safe boating windows using wind speed and wind-wave chop first, then swell height and period. Identify consecutive 3+ hour daylight fishing windows. Do not treat total wave height alone as dangerous chop.\n\nWeather JSON: ${urls.weather}\n\nMarine JSON: ${urls.marine}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/65 p-0 sm:items-center sm:justify-center sm:p-4" role="dialog" aria-modal="true" aria-label="AI data access">
      <div className="max-h-[88svh] w-full overflow-y-auto rounded-t-2xl border border-[#1e3a5f] bg-[#0d1f3c] p-4 shadow-2xl sm:max-w-2xl sm:rounded-xl">
        <div className="flex items-start justify-between gap-3 border-b border-[#1e3a5f] pb-3">
          <div>
            <h2 className="text-lg font-bold text-[#ff6b35]">🤖 AI data access</h2>
            <p className="mt-1 text-sm text-[#c8d8e8]">Machine-readable forecast links for <strong>{location.name}</strong>.</p>
          </div>
          <button onClick={onClose} className="flex min-h-[44px] min-w-[44px] items-center justify-center text-xl text-[#7a9bb5] hover:text-white" aria-label="Close AI data access">×</button>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-[#7a9bb5]">No Bloody Dave’s key is required or generated: the live weather and marine forecasts use public JSON sources. Copy the prompt below into ChatGPT, Claude, or another LLM with web access. The app’s fishing score is computed in your browser, so the prompt spells out the required interpretation approach.</p>

        <div className="mt-4 space-y-3">
          <section className="rounded-lg border border-[#1e3a5f] bg-[#0a1628] p-3">
            <div className="mb-2 flex items-center justify-between gap-2"><h3 className="text-sm font-bold text-white">Weather JSON</h3><CopyButton text={urls.weather} label="Copy link" /></div>
            <a className="block break-all text-xs leading-relaxed text-[#7eb8f7] underline" href={urls.weather} target="_blank" rel="noreferrer">{urls.weather}</a>
          </section>
          <section className="rounded-lg border border-[#1e3a5f] bg-[#0a1628] p-3">
            <div className="mb-2 flex items-center justify-between gap-2"><h3 className="text-sm font-bold text-white">Marine JSON</h3><CopyButton text={urls.marine} label="Copy link" /></div>
            <a className="block break-all text-xs leading-relaxed text-[#7eb8f7] underline" href={urls.marine} target="_blank" rel="noreferrer">{urls.marine}</a>
          </section>
          <section className="rounded-lg border border-[#ff6b35]/50 bg-[#ff6b35]/10 p-3">
            <div className="mb-2 flex items-center justify-between gap-2"><h3 className="text-sm font-bold text-white">Ready-to-paste LLM prompt</h3><CopyButton text={prompt} label="Copy prompt" /></div>
            <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-[#c8d8e8]">{prompt}</p>
          </section>
        </div>

        <p className="mt-4 text-[11px] leading-relaxed text-[#7a9bb5]">For a future private Bloody Dave’s API with a key, the app would need a small server to calculate and serve the derived SL20/fishing result. Do not put a secret key inside this frontend: anyone using the site could extract it.</p>
      </div>
    </div>
  );
}
