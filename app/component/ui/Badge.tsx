import type { HTMLAttributes } from "react";
import { cn } from "./cn";

export type BadgeTone = "brand" | "neutral" | "danger" | "warning" | "info";

const tones: Record<BadgeTone, string> = {
  brand: "bg-brand-soft text-brand",
  neutral: "bg-surface-3 text-muted",
  danger: "bg-danger/15 text-danger",
  warning: "bg-warning/15 text-warning",
  info: "bg-info/15 text-info",
};

/** Opaque, high-contrast variant for sitting on busy backgrounds (e.g. over the 3D view). */
const solidTones: Record<BadgeTone, string> = {
  brand: "bg-brand text-white",
  neutral: "bg-slate-700 text-white",
  danger: "bg-danger text-white",
  warning: "bg-warning text-black",
  info: "bg-info text-white",
};

export function Badge({
  tone = "neutral",
  solid = false,
  color,
  ink,
  square = false,
  className,
  style,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone; solid?: boolean; /** Custom background (overrides tone). */ color?: string; /** Custom text colour. */ ink?: string; /** Rectangular (slightly rounded corners) instead of a pill. */ square?: boolean }) {
  return (
    <span
      style={color ? { backgroundColor: color, color: ink ?? "#fff", ...style } : style}
      className={cn(
        "inline-flex items-center", "px-2.5 py-0.5 text-xs font-medium",
        solid ? cn(solidTones[tone], "border border-white/80 px-3 py-1 text-sm font-bold tracking-wide shadow-md") : tones[tone],
        className,
      )}
      {...rest}
    />
  );
}
