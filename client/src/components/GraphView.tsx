/**
 * GraphView — Full multi-day Chart.js chart with zoom/pan.
 * Default view shows the entire loaded range.
 * Hourly strip below is scoped to the selected day.
 * Pinch/scroll to zoom, drag to pan, double-click to reset.
 */
import { useEffect, useRef, useState } from "react";
import {
  Chart,
  LineController, LineElement, PointElement, LinearScale, CategoryScale,
  Filler, Tooltip, Legend,
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import type { AppData } from "@/lib/fishingEngine";
import { rateSL20, windColor, swellColor, degToCompass, fmt } from "@/lib/fishingEngine";
import type { FishingState } from "@/hooks/useFishingData";

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip, Legend, zoomPlugin);

interface Props {
  data: AppData;
  hourlyDay: string;
  onDayChange: (d: string) => void;
  vis: FishingState["vis"];
  onToggleVis: (key: keyof FishingState["vis"]) => void;
}

const VIS_KEYS: { key: keyof FishingState["vis"]; label: string; color: string }[] = [
  { key: "wind",  label: "Wind (kt)",  color: "#7eb8f7" },
  { key: "swell", label: "Swell (m)",  color: "#3ecf8e" },
  { key: "fish",  label: "Fish %",     color: "#ff6b35" },
  { key: "tide",  label: "Tide (m)",   color: "#a78bfa" },
  { key: "temp",  label: "Temp (°C)",  color: "#fbbf24" },
  { key: "rain",  label: "Rain %",     color: "#60a5fa" },
];

export function GraphView({ data, hourlyDay, onDayChange, vis, onToggleVis }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const [activeHour, setActiveHour] = useState<number | null>(null);

  // All rows for the full range chart
  const allRows = data.merged;
  // Rows for the selected day's hourly strip
  const dayRows = data.merged.filter(r => r.dateStr === hourlyDay);
  const dayData = data.daily.find(d => d.date === hourlyDay);

  useEffect(() => {
    if (!canvasRef.current || !allRows.length) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

    // Build tick labels — show day name at midnight, hour otherwise
    const labels = allRows.map(r => {
      if (r.isDayStart) {
        const dt = new Date(r.dateStr + "T12:00:00");
        return dt.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
      }
      return r.hour % 6 === 0 ? r.hourLabel : "";
    });

    const datasets = [];

    if (vis.wind) datasets.push({
      label: "Wind (kt)", yAxisID: "y",
      data: allRows.map(r => r.windKt),
      borderColor: "#7eb8f7", backgroundColor: "rgba(126,184,247,0.06)",
      borderWidth: 1.5, pointRadius: 0, tension: 0.3, fill: false,
    });
    if (vis.swell) datasets.push({
      label: "Swell (m)", yAxisID: "y2",
      data: allRows.map(r => r.swellH),
      borderColor: "#3ecf8e", backgroundColor: "rgba(62,207,142,0.06)",
      borderWidth: 1.5, pointRadius: 0, tension: 0.3, fill: false,
    });
    if (vis.fish) datasets.push({
      label: "Fish %", yAxisID: "y3",
      data: allRows.map(r => r.fishScore),
      borderColor: "#ff6b35", backgroundColor: "rgba(255,107,53,0.10)",
      borderWidth: 2, pointRadius: 0, tension: 0.3, fill: true,
    });
    if (vis.tide) datasets.push({
      label: "Tide (m)", yAxisID: "y2",
      data: allRows.map(r => r.seaLevel),
      borderColor: "#a78bfa", backgroundColor: "rgba(167,139,250,0.06)",
      borderWidth: 1.5, pointRadius: 0, tension: 0.4, fill: false,
      borderDash: [4, 3],
    });
    if (vis.temp) datasets.push({
      label: "Temp (°C)", yAxisID: "y",
      data: allRows.map(r => r.temp),
      borderColor: "#fbbf24", backgroundColor: "rgba(251,191,36,0.06)",
      borderWidth: 1.5, pointRadius: 0, tension: 0.3, fill: false,
    });
    if (vis.rain) datasets.push({
      label: "Rain %", yAxisID: "y3",
      data: allRows.map(r => r.rainProb),
      borderColor: "#60a5fa", backgroundColor: "rgba(96,165,250,0.06)",
      borderWidth: 1.5, pointRadius: 0, tension: 0.3, fill: false,
    });

    // Golden hour background annotations via plugin
    const goldenPlugin = {
      id: "goldenBg",
      beforeDraw(chart: Chart) {
        const { ctx, chartArea, scales } = chart;
        if (!chartArea) return;
        const xScale = scales["x"];
        if (!xScale) return;
        ctx.save();
        allRows.forEach((row, i) => {
          if (!row.golden) return;
          const x = xScale.getPixelForValue(i);
          const w = xScale.getPixelForValue(i + 1) - x;
          ctx.fillStyle = "rgba(251,191,36,0.07)";
          ctx.fillRect(x, chartArea.top, Math.max(w, 2), chartArea.height);
        });
        ctx.restore();
      },
    };

    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      data: { labels, datasets },
      plugins: [goldenPlugin],
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        onHover: (_e, elements) => {
          if (elements.length) {
            const idx = elements[0].index;
            const row = allRows[idx];
            if (row) onDayChange(row.dateStr);
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(13,31,60,0.95)",
            borderColor: "#1e3a5f", borderWidth: 1,
            titleColor: "#ff6b35", bodyColor: "#c8d8e8",
            padding: 10, cornerRadius: 8,
            callbacks: {
              title: (items) => {
                const row = allRows[items[0].dataIndex];
                return row ? row.label : "";
              },
            },
          },
          zoom: {
            zoom: {
              wheel: { enabled: true, speed: 0.08 },
              // One-finger navigation must scroll the page on mobile. Touch
              // zoom is therefore intentionally disabled; use +/- controls.
              pinch: { enabled: false },
              mode: "x",
            },
            pan: { enabled: false, mode: "x" },
            limits: { x: { minRange: 8 } },
          },
        },
        scales: {
          x: {
            ticks: {
              color: "#7a9bb5", font: { size: 9 }, maxRotation: 0,
              autoSkip: false,
              callback: (_val, idx) => labels[idx] || null,
            },
            grid: { color: "rgba(30,58,95,0.5)" },
          },
          y: {
            position: "left",
            ticks: { color: "#7eb8f7", font: { size: 10 } },
            grid: { color: "rgba(30,58,95,0.3)" },
          },
          y2: {
            position: "right",
            ticks: { color: "#3ecf8e", font: { size: 10 } },
            grid: { display: false },
          },
          y3: {
            position: "right",
            ticks: { color: "#ff6b35", font: { size: 10 } },
            grid: { display: false },
            min: 0, max: 100,
            display: vis.fish || vis.rain,
          },
        },
      },
    });

    return () => { chartRef.current?.destroy(); chartRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vis, data]);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Visibility toggles */}
      <div className="flex flex-wrap gap-1.5 px-3 py-1.5 bg-[#0a1628] border-b border-[#1e3a5f]">
        {VIS_KEYS.map(({ key, label, color }) => (
          <button key={key} onClick={() => onToggleVis(key)}
            className={`px-3 py-1.5 rounded text-xs sm:text-sm font-semibold border transition-all duration-150 min-h-[38px]
              ${vis[key] ? "border-transparent text-white" : "border-[#1e3a5f] text-[#7a9bb5] bg-transparent"}`}
            style={vis[key] ? { backgroundColor: color + "33", borderColor: color, color } : {}}>
            {label}
          </button>
        ))}
        <button onClick={() => chartRef.current?.resetZoom()}
          className="px-3 py-1.5 rounded text-xs sm:text-sm font-semibold border border-[#1e3a5f] text-[#7a9bb5] hover:text-white hover:border-[#ff6b35] transition-all duration-150 ml-auto min-h-[38px]">
          🔍 Reset Zoom
        </button>
        <button onClick={() => chartRef.current?.zoom(0.8)}
          className="px-3 py-1.5 rounded text-sm font-bold border border-[#1e3a5f] text-[#7a9bb5] hover:text-white hover:border-[#ff6b35] transition-all duration-150 min-h-[38px]"
          aria-label="Zoom out graph">
          −
        </button>
        <button onClick={() => chartRef.current?.zoom(1.25)}
          className="px-3 py-1.5 rounded text-sm font-bold border border-[#1e3a5f] text-[#7a9bb5] hover:text-white hover:border-[#ff6b35] transition-all duration-150 min-h-[38px]"
          aria-label="Zoom in graph">
          +
        </button>
      </div>

      {/* Full-range chart */}
      <div className="relative px-2 py-2 chart-container" style={{ height: "260px", minHeight: "200px" }}>
        <canvas ref={canvasRef} className="forecast-canvas" />
        <p className="absolute bottom-3 right-4 text-[9px] text-[#3a5a7a]">
          Desktop: mouse-wheel zoom · Phone: use +/- then scroll normally · ⭐ = golden hour
        </p>
      </div>

      {/* Day selector strip */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#0d1f3c] border-t border-b border-[#1e3a5f] overflow-x-auto scrollbar-hide">
        <span className="text-[10px] text-[#7a9bb5] uppercase tracking-wider whitespace-nowrap flex-shrink-0">📅 Hourly day:</span>
        {data.daily.map(d => {
          const dt = new Date(d.date + "T12:00:00");
          const label = dt.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
          const isSelected = d.date === hourlyDay;
          return (
            <button key={d.date} onClick={() => onDayChange(d.date)}
              className={`flex-shrink-0 px-2.5 py-1 rounded text-xs font-semibold transition-all duration-150 min-h-[36px] whitespace-nowrap
                ${isSelected ? "bg-[#ff6b35] text-white" : d.isGolden ? "bg-[#3ecf8e]/20 text-[#3ecf8e] border border-[#3ecf8e]/40 hover:bg-[#3ecf8e]/30" : "bg-[#1e3a5f] text-[#7a9bb5] hover:text-white hover:bg-[#2a4f7a]"}`}>
              {d.isGolden && !isSelected ? "⭐ " : ""}{label}
            </button>
          );
        })}
      </div>

      {/* Day summary strip */}
      {dayData && (
        <div className="flex flex-wrap gap-2 px-3 py-2 bg-[#0a1628] border-b border-[#1e3a5f] text-xs">
          <span className="text-[#7a9bb5]">{dayData.moonEmoji} {dayData.moonName} ({Math.round(dayData.moonIllum * 100)}%)</span>
          <span className="text-[#7a9bb5]">🌅 {dayData.sunrise} / 🌇 {dayData.sunset}</span>
          {dayData.maxWind != null && <span style={{ color: windColor(dayData.maxWind) }}>💨 Max {Math.round(dayData.maxWind)}kt</span>}
          {dayData.maxSwell != null && <span style={{ color: swellColor(dayData.maxSwell) }}>🌊 Max {fmt(dayData.maxSwell)}m</span>}
          <span className="text-[#ff6b35]">🎣 Peak {dayData.peakFish}% ({dayData.bestFishStars}★)</span>
          {dayData.isGolden && <span className="text-[#fbbf24] font-bold">⭐ GOLDEN DAY</span>}
        </div>
      )}

      {/* Hourly strip for selected day */}
      <div className="overflow-x-auto px-2 pb-2 scrollbar-hide">
        <div className="flex gap-1 min-w-max pt-2">
          {dayRows.map((row, i) => {
            const sl = rateSL20(row.windKt, row.swellH, row.swellP, row.waveH, row.windWaveH);
            const isActive = i === activeHour;
            return (
              <div key={row.time}
                onMouseEnter={() => setActiveHour(i)}
                className={`flex flex-col items-center gap-0.5 rounded px-1.5 py-1 cursor-pointer transition-all duration-100 min-w-[46px]
                  ${row.golden ? "ring-1 ring-[#fbbf24] bg-[#fbbf24]/10" : ""}
                  ${isActive ? "bg-[#1e3a5f]" : "bg-[#0d1f3c] hover:bg-[#1e3a5f]/60"}`}>
                <span className="text-[9px] text-[#7a9bb5] font-mono">{row.hourLabel}</span>
                <span className="text-[11px] font-bold" style={{ color: "#ff6b35" }}>{row.fishScore}%</span>
                <span className="text-[9px]">{"★".repeat(row.fishStars)}{"☆".repeat(5 - row.fishStars)}</span>
                <span className="text-[9px] font-bold px-1 rounded" style={{ backgroundColor: sl.bg, color: sl.fg }}>
                  {sl.label === "Excellent" ? "EXC" : sl.label === "Marginal" ? "MAR" : sl.label}
                </span>
                {row.windKt != null && <span className="text-[9px]" style={{ color: windColor(row.windKt) }}>{Math.round(row.windKt)}kt</span>}
                {row.swellH != null && <span className="text-[9px]" style={{ color: swellColor(row.swellH) }}>{fmt(row.swellH)}m</span>}
                {row.windDir != null && <span className="text-[9px] text-[#7a9bb5]">{degToCompass(row.windDir)}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tide extremes */}
      {dayData && dayData.tideExtremes.length > 0 && (
        <div className="flex flex-wrap gap-2 px-3 py-2 border-t border-[#1e3a5f] text-xs">
          <span className="text-[#7a9bb5] text-[10px] uppercase tracking-wider">Tides:</span>
          {dayData.tideExtremes.map((t, i) => (
            <span key={i} className={`font-semibold ${t.type === "High" ? "text-[#3ecf8e]" : "text-[#7eb8f7]"}`}>
              {t.type === "High" ? "▲" : "▼"} {t.type} {fmt(t.height)}m @ {t.time.slice(11, 16)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
