import { cn } from "./cn";

export interface StatCardProps {
  label: string;
  value: number | string;
  tone?: "brand" | "success" | "danger" | "warning";
  className?: string;
}

const TONES = {
  brand: { frame: "", text: "text-brand" },
  success: { frame: "hud-success", text: "text-success-light" },
  danger: { frame: "hud-danger", text: "text-danger" },
  warning: { frame: "", text: "text-warning" },
} as const;

/** Small HUD glass card with a spaced-out label over a big glowing number, e.g. a PASS / FAIL count. */
export function StatCard({ label, value, tone = "brand", className }: StatCardProps) {
  const t = TONES[tone];
  return (
    <div className={cn("hud hud-glass flex min-w-0 flex-col items-center justify-center gap-1 border px-4 py-2 text-center", t.frame, className)}>
      <span className="hud-title text-[10px] font-bold text-muted">{label}</span>
      <span className={cn("font-mono text-3xl leading-none font-bold tabular-nums [text-shadow:0_0_12px_currentColor]", t.text)}>{value}</span>
    </div>
  );
}
