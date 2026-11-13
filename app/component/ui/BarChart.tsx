"use client";

import { useEffect, useRef } from "react";
import { BarController, BarElement, CategoryScale, Chart, LinearScale, Tooltip } from "chart.js";
import { cn } from "./cn";
import { resolveColor, useThemeVersion } from "./chartTheme";

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

export interface BarSeries {
  label: string;
  data: number[];
  /** One colour for the whole series, or one per bar. Any CSS colour, e.g. "var(--surface-3)". */
  color: string | string[];
}

export interface BarChartProps {
  /** One label per bar. */
  labels: string[];
  /** Series stacked end to end in each bar. */
  series: BarSeries[];
  /** Make every bar the same length, split by each series' share of that bar (the tooltip still shows the real numbers). */
  fill?: boolean;
  /** Height of each bar row in px. */
  rowHeight?: number;
  /** Longest label shown in full; longer ones end in "…" (the tooltip keeps the whole name). */
  maxLabelLength?: number;
  className?: string;
}

/** Horizontal stacked bar chart (Chart.js), one bar per label. Redraws when the data or the theme change. */
export function BarChart({ labels, series, fill = false, rowHeight = 20, maxLabelLength = 18, className }: BarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const theme = useThemeVersion();
  const key = JSON.stringify({ labels, series });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const input = JSON.parse(key) as { labels: string[]; series: BarSeries[] };
    const totals = input.labels.map((_, i) => input.series.reduce((sum, s) => sum + (s.data[i] ?? 0), 0));
    const shown = (s: BarSeries) => (fill ? s.data.map((v, i) => (totals[i] ? (v / totals[i]) * 100 : 0)) : s.data);
    const pick = (c: string | string[]) => (Array.isArray(c) ? c.map(resolveColor) : resolveColor(c));
    const chart = new Chart(canvas, {
      type: "bar",
      data: {
        labels: input.labels,
        datasets: input.series.map((s) => ({ label: s.label, data: shown(s), backgroundColor: pick(s.color), borderWidth: 0, barPercentage: 0.55, categoryPercentage: 1 })),
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400 },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${input.series[ctx.datasetIndex].data[ctx.dataIndex]}`,
            },
          },
        },
        scales: {
          x: { stacked: true, display: false, ...(fill ? { min: 0, max: 100 } : {}) },
          y: {
            stacked: true,
            grid: { display: false },
            border: { display: false },
            ticks: {
              crossAlign: "far", // labels flush left, bars start at the same x
              color: resolveColor("var(--foreground)"),
              font: { size: 11 },
              callback(value) {
                const label = String(this.getLabelForValue(Number(value)));
                return label.length > maxLabelLength ? `${label.slice(0, maxLabelLength - 1)}…` : label;
              },
            },
          },
        },
      },
    });
    return () => chart.destroy();
  }, [key, fill, maxLabelLength, theme]);

  return (
    <div className={cn("relative w-full", className)} style={{ height: labels.length * rowHeight }}>
      <canvas ref={canvasRef} role="img" aria-label={labels.map((l, i) => `${l}: ${series.map((s) => `${s.label} ${s.data[i]}`).join(", ")}`).join("; ")} />
    </div>
  );
}
