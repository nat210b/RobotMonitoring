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

export function Badge({
  tone = "neutral",
  className,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...rest}
    />
  );
}
