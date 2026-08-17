/**
 * PrintView — graph-only printout for the loaded forecast date range.
 * Uses the same selected-variable visibility state as the live graph and
 * prints a clean, white-background, landscape chart — no hourly table.
 */
import { useEffect, useRef, useState } from "react";
import {
  Chart,
  LineController, LineElement, PointElement, LinearScale, CategoryScale,
  Filler, Legend,
} from "chart.js";
import type { AppData } from "@/lib/fishingEngine";
import type { FishingState } from "@/hooks/useFishingData";
import { openStandaloneForecastPrint } from "@/lib/standalonePrint";

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Legend);

interface Props {
  data: AppData;
  vis: FishingState["vis"];
  onClose: () => void;
}

function buildLabels(data: AppData) {
  return data.merged.map(row => {
    if (row.isDayStart) {
      return new Date(`${row.dateStr}T12:00:00`).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
    }
    return row.hour % 6 === 0 ? row.hourLabel : "";
  });
}

export function PrintView({ data, vis, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const [printImage, setPrintImage] = useState("");
  const [ready, setReady] = useState(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState("");
  const rangeStart = data.daily[0]?.date ?? "";
  const rangeEnd = data.daily[data.daily.length - 1]?.date ?? "";
  const rangeLabel = `${new Date(`${rangeStart}T12:00:00`).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })} – ${new Date(`${rangeEnd}T12:00:00`).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}`;

  useEffect(() => {
    if (!canvasRef.current || !data.merged.length) return;
    chartRef.current?.destroy();
    const rows = data.merged;
    const datasets = [];

    if (vis.wind) datasets.push({ label: "Wind (kt)", yAxisID: "y", data: rows.map(r => r.windKt), borderColor: "#2563eb", backgroundColor: "transparent", borderWidth: 2, pointRadius: 0, tension: 0.25 });
    if (vis.swell) datasets.push({ label: "Swell (m)", yAxisID: "y2", data: rows.map(r => r.swellH), borderColor: "#059669", backgroundColor: "transparent", borderWidth: 2, pointRadius: 0, tension: 0.25 });
    if (vis.fish) datasets.push({ label: "Fishing (%)", yAxisID: "y3", data: rows.map(r => r.fishScore), borderColor: "#ea580c", backgroundColor: "rgba(234,88,12,0.10)", borderWidth: 2.5, pointRadius: 0, tension: 0.25, fill: true });
    if (vis.tide) datasets.push({ label: "Tide (m)", yAxisID: "y2", data: rows.map(r => r.seaLevel), borderColor: "#7c3aed", backgroundColor: "transparent", borderWidth: 1.6, pointRadius: 0, tension: 0.35, borderDash: [5, 3] });
    if (vis.temp) datasets.push({ label: "Temperature (°C)", yAxisID: "y", data: rows.map(r => r.temp), borderColor: "#b45309", backgroundColor: "transparent", borderWidth: 1.8, pointRadius: 0, tension: 0.25 });
    if (vis.rain) datasets.push({ label: "Rain (%)", yAxisID: "y3", data: rows.map(r => r.rainProb), borderColor: "#0284c7", backgroundColor: "transparent", borderWidth: 1.8, pointRadius: 0, tension: 0.25 });

    const goldenHours = {
      id: "printGoldenHours",
      beforeDraw(chart: Chart) {
        const { ctx, chartArea, scales } = chart;
        if (!chartArea) return;
        const x = scales.x;
        ctx.save();
        rows.forEach((row, i) => {
          if (!row.golden) return;
          const left = x.getPixelForValue(i);
          const right = x.getPixelForValue(i + 1);
          ctx.fillStyle = "rgba(250,204,21,0.14)";
          ctx.fillRect(left, chartArea.top, Math.max(right - left, 2), chartArea.height);
        });
        ctx.restore();
      },
    };

    setReady(false);
    setPrintImage("");
    setOpening(false);
    setError("");
    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      data: { labels: buildLabels(data), datasets },
      plugins: [goldenHours],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { display: true, position: "top", labels: { color: "#111827", boxWidth: 18, font: { size: 11, weight: "bold" } } },
          tooltip: { enabled: false },
        },
        scales: {
          x: { ticks: { color: "#374151", font: { size: 9 }, autoSkip: false, maxRotation: 0 }, grid: { color: "#e5e7eb" } },
          y: { position: "left", ticks: { color: "#2563eb", font: { size: 10 } }, grid: { color: "#e5e7eb" } },
          y2: { position: "right", ticks: { color: "#059669", font: { size: 10 } }, grid: { display: false } },
          y3: { position: "right", display: vis.fish || vis.rain, min: 0, max: 100, ticks: { color: "#ea580c", font: { size: 10 } }, grid: { display: false } },
        },
      },
    });

    const snapshotTimer = window.setTimeout(() => {
      const chart = chartRef.current;
      if (!chart) return;
      chart.resize(1120, 700);
      chart.update("none");
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          setPrintImage(chart.toBase64Image("image/png", 1));
          setReady(true);
        });
      });
    }, 80);

    return () => {
      window.clearTimeout(snapshotTimer);
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [data, vis]);

  const openPrintDocument = () => {
    if (!ready || !printImage) return;
    setOpening(true);
    setError("");
    const opened = openStandaloneForecastPrint({
      image: printImage,
      locationName: data.location.name,
      timezone: data.timezone,
      rangeLabel,
      generatedAt: new Date().toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" }),
    });
    if (!opened) {
      setOpening(false);
      setError("Safari blocked the print document. Allow pop-ups for this site, then try again.");
      return;
    }
    window.setTimeout(onClose, 100);
  };

  return (
    <>
      <div className="print:hidden fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="w-full max-w-sm rounded-xl bg-white p-6 text-center shadow-2xl">
          <p className="mb-2 text-3xl">🖨️</p>
          <h3 className="text-lg font-bold text-gray-900">{ready ? "Your forecast graph is ready" : "Preparing your forecast graph"}</h3>
          <p className="mt-2 text-sm text-gray-600">Your selected variables will open in a separate white print document across <strong>{rangeLabel}</strong>.</p>
          <p className="mt-2 text-xs text-gray-500">This prevents iPhone Safari from losing the graph during final print preparation. The document stays available if you cancel the native print dialog.</p>
          {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-left text-xs font-medium text-red-700">{error}</p>}
          <div className="mt-5 flex gap-2">
            <button disabled={!ready || opening} onClick={openPrintDocument} className="min-h-[44px] flex-1 rounded-lg bg-orange-500 px-3 py-2 font-bold text-white hover:bg-orange-600 disabled:cursor-wait disabled:bg-orange-300">{opening ? "Opening…" : ready ? "Open print document" : "Rendering graph…"}</button>
            <button onClick={onClose} className="min-h-[44px] flex-1 rounded-lg bg-gray-100 px-3 py-2 font-semibold text-gray-700 hover:bg-gray-200">Cancel</button>
          </div>
        </div>
      </div>

      <canvas ref={canvasRef} className="print-source-canvas" aria-hidden="true" />
    </>
  );
}
