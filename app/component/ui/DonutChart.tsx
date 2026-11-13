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

/** Ring chart (Chart.js) of segments that add up to the whole. Redraws when the segments or the theme change. */
export function DonutChart({ segments, size = 120, thickness = 0.3, children, className }: DonutChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const theme = useThemeVersion();
  const key = JSON.stringify(segments);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const items = JSON.parse(key) as DonutSegment[];
    const chart = new Chart(canvas, {
      type: "doughnut",
      data: {
        labels: items.map((s) => s.label),
        datasets: [{ data: items.map((s) => s.value), backgroundColor: items.map((s) => resolveColor(s.color)), borderWidth: 0 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: `${Math.round((1 - thickness) * 100)}%`,
        animation: { duration: 400 },
        plugins: { legend: { display: false } },
      },
    });
    return () => chart.destroy();
  }, [key, thickness, theme]);

  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <canvas ref={canvasRef} role="img" aria-label={segments.map((s) => `${s.label}: ${s.value}`).join(", ")} />
      {children && <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">{children}</div>}
    </div>
  );
}
