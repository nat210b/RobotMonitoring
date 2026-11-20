"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { ArcElement, Chart, DoughnutController, Tooltip } from "chart.js";
import { cn } from "./cn";
import { resolveColor, useThemeVersion } from "./chartTheme";

Chart.register(ArcElement, DoughnutController, Tooltip);

export interface DonutSegment {
  label: string;
  value: number;
  /** Any CSS colour, e.g. "var(--brand)". */
  color: string;
}

export interface DonutChartProps {
  segments: DonutSegment[];
  /** Diameter in px. */
  size?: number;
  /** Ring width as a share of the radius (0–1). */
  thickness?: number;
  /** Content in the hole, e.g. a percentage. */
  children?: ReactNode;
  className?: string;
}

/**
 * Ring chart (Chart.js) of segments that add up to the whole. The chart is built once (and again only when
 * the theme or thickness changes); new segment values are applied in place, so the ring eases from the old
 * values to the new ones instead of replaying its opening sweep from zero.
 */
export function DonutChart({ segments, size = 120, thickness = 0.3, children, className }: DonutChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart<"doughnut"> | null>(null);
  const theme = useThemeVersion();
  const key = JSON.stringify(segments);

  const apply = (chart: Chart<"doughnut">, items: DonutSegment[]) => {
    chart.data.labels = items.map((s) => s.label);
    const dataset = chart.data.datasets[0];
    dataset.data = items.map((s) => s.value);
    dataset.backgroundColor = items.map((s) => resolveColor(s.color));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const chart = new Chart(canvas, {
      type: "doughnut",
      data: { labels: [], datasets: [{ data: [], backgroundColor: [], borderWidth: 0 }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: `${Math.round((1 - thickness) * 100)}%`,
        animation: { duration: 600, easing: "easeOutCubic" },
        plugins: { legend: { display: false } },
      },
    });
    chartRef.current = chart; // filled by the effect below, which runs right after this one
    return () => {
      chart.destroy();
      chartRef.current = null;
    };
  }, [thickness, theme]);

  // New values (or a freshly built chart): update in place so the ring animates from where it is.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    apply(chart, JSON.parse(key) as DonutSegment[]);
    chart.update();
  }, [key, thickness, theme]);

  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <canvas ref={canvasRef} role="img" aria-label={segments.map((s) => `${s.label}: ${s.value}`).join(", ")} />
      {children && <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">{children}</div>}
    </div>
  );
}
