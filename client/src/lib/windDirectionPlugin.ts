import type { Plugin } from "chart.js";
import { windArrowRotation } from "@shared/forecastTime";

/** Shared by the interactive chart and its static print image. */
export function windDirectionPlugin(
  rows: readonly { windDir: number | null; windKt: number | null }[],
  visible: boolean,
): Plugin {
  return {
    id: "windDirectionArrows",
    afterDatasetsDraw(chart) {
      if (!visible) return;
      const { ctx, chartArea, scales } = chart;
      let lastX = -Infinity;
      ctx.save();
      ctx.beginPath();
      ctx.rect(chartArea.left, chartArea.top, chartArea.width, chartArea.height);
      ctx.clip();
      rows.forEach((row, i) => {
        const x = scales.x.getPixelForValue(i);
        if (row.windDir == null || row.windKt == null || x < chartArea.left + 7.5 || x > chartArea.right - 7.5 || x - lastX < 28) return;
        lastX = x;
        const y = Math.max(chartArea.top + 7.5, Math.min(chartArea.bottom - 7.5, scales.y.getPixelForValue(row.windKt)));
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(windArrowRotation(row.windDir) * Math.PI / 180);
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(11,20,16,0.88)";
        ctx.fill();
        ctx.strokeStyle = "#bae6fd";
        ctx.lineWidth = 1.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(0, 5); ctx.lineTo(0, -5); ctx.lineTo(-3, -1.5);
        ctx.moveTo(0, -5); ctx.lineTo(3, -1.5);
        ctx.stroke();
        ctx.restore();
      });
      ctx.restore();
    },
  };
}
