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
  /** Height of each bar row in px (horizontal bars). */
  rowHeight?: number;
  /** Longest label shown in full; longer ones end in "…" (the tooltip keeps the whole name). */
  maxLabelLength?: number;
  /** Upright columns along the bottom instead of horizontal bars, with a small count scale on the left. */
  vertical?: boolean;
  /** Chart height in px for vertical bars. */
  height?: number;
  className?: string;
}

type Input = { labels: string[]; series: BarSeries[] };

/**
 * Stacked bar chart (Chart.js), one bar per label: horizontal by default, or vertical columns. The chart is
 * built once (and again only when the theme or layout options change); new data is applied in place, so the
 * bars grow or shrink from where they are instead of replaying their opening animation.
 */
export function BarChart({ labels, series, fill = false, rowHeight = 20, maxLabelLength = 18, vertical = false, height = 96, className }: BarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart<"bar"> | null>(null);
  /** The data last applied, read by the tooltip for the real (unscaled) numbers. */
  const inputRef = useRef<Input>({ labels: [], series: [] });
  const theme = useThemeVersion();
  const key = JSON.stringify({ labels, series });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const muted = resolveColor("var(--muted)");
    const truncate = (label: string) => (label.length > maxLabelLength ? `${label.slice(0, maxLabelLength - 1)}…` : label);
    const chart = new Chart(canvas, {
      type: "bar",
      data: { labels: [], datasets: [] },
      options: {
        indexAxis: vertical ? "x" : "y",
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 500, easing: "easeOutCubic" },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${inputRef.current.series[ctx.datasetIndex]?.data[ctx.dataIndex] ?? 0}`,
            },
          },
        },
        scales: vertical
          ? {
              x: {
                stacked: true,
                grid: { display: false },
                border: { display: false },
                ticks: { color: muted, font: { size: 9 }, maxRotation: 0, autoSkipPadding: 6 },
              },
              y: {
                stacked: true,
                beginAtZero: true,
                ...(fill ? { min: 0, max: 100 } : {}),
                border: { display: false },
                grid: { color: resolveColor("var(--border)"), lineWidth: 0.5 },
                ticks: { color: muted, font: { size: 9 }, precision: 0, maxTicksLimit: 3 },
              },
            }
          : {
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
                    return truncate(String(this.getLabelForValue(Number(value))));
                  },
                },
              },
            },
      },
    });
    chartRef.current = chart; // filled by the effect below, which runs right after this one
    return () => {
      chart.destroy();
      chartRef.current = null;
    };
  }, [fill, maxLabelLength, vertical, theme]);

  // New data (or a freshly built chart): update in place so the bars animate from where they are.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const input = JSON.parse(key) as Input;
    inputRef.current = input;
    const totals = input.labels.map((_, i) => input.series.reduce((sum, s) => sum + (s.data[i] ?? 0), 0));
    const shown = (s: BarSeries) => (fill ? s.data.map((v, i) => (totals[i] ? (v / totals[i]) * 100 : 0)) : s.data);
    const pick = (c: string | string[]) => (Array.isArray(c) ? c.map(resolveColor) : resolveColor(c));
    chart.data.labels = input.labels;
    input.series.forEach((s, i) => {
      const style = { label: s.label, data: shown(s), backgroundColor: pick(s.color), borderWidth: 0, barPercentage: vertical ? 0.7 : 0.55, categoryPercentage: 1 };
      // Keep each existing dataset object, so Chart.js animates its bars from the old values.
      if (chart.data.datasets[i]) Object.assign(chart.data.datasets[i], style);
      else chart.data.datasets.push(style);
    });
    chart.data.datasets.length = input.series.length;
    chart.update();
  }, [key, fill, maxLabelLength, vertical, theme]);

  return (
    <div className={cn("relative w-full", className)} style={{ height: vertical ? height : labels.length * rowHeight }}>
      <canvas ref={canvasRef} role="img" aria-label={labels.map((l, i) => `${l}: ${series.map((s) => `${s.label} ${s.data[i]}`).join(", ")}`).join("; ")} />
    </div>
  );
}
