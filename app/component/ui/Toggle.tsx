"use client";

import { useId, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "./cn";

export interface ToggleProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "type" | "role"> {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  /** Small second line under the label. */
  hint?: ReactNode;
  /** "sm" is a compact row with a smaller track, for dense lists. */
  size?: "md" | "sm";
}

/**
 * HUD-style on/off switch: a full-width row with the label on the left and an angular track on the
 * right. When on, the track lights up in the brand colour and the square thumb slides across with a glow.
 * Built on a native button with role="switch", so Space/Enter toggle it and screen readers announce on/off.
 */
export function Toggle({ checked, onChange, label, hint, size = "md", disabled, className, id, ...rest }: ToggleProps) {
  const auto = useId();
  const labelId = `${id ?? auto}-label`;
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelId}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "group flex w-full items-center justify-between border text-left",
        size === "sm" ? "gap-2 px-2 py-1" : "gap-3 px-3 py-2",
        "transition-[background-color,border-color] duration-(--duration-base) ease-ui",
        checked ? "border-brand/60 bg-brand/10" : "border-line bg-surface-3/40 hover:border-brand/40",
        disabled && "cursor-not-allowed opacity-45 hover:border-line",
        className,
      )}
      {...rest}
    >
      <span className="min-w-0">
        <span id={labelId} className={cn("block truncate font-semibold", size === "sm" ? "text-xs" : "text-sm", checked ? "text-foreground" : "text-muted")}>
          {label}
        </span>
        {hint && <span className="block truncate text-[11px] text-muted">{hint}</span>}
      </span>

      <span className="flex shrink-0 items-center gap-2">
        <span aria-hidden className={cn("text-right font-mono font-bold tracking-widest", size === "sm" ? "w-6 text-[9px]" : "w-7 text-[10px]", checked ? "text-brand" : "text-muted")}>
          {checked ? "ON" : "OFF"}
        </span>
        {/* Track: angular, with a faint scan line; the thumb slides and glows when on */}
        <span
          aria-hidden
          className={cn(
            "relative border transition-[background-color,border-color,box-shadow] duration-(--duration-base) ease-ui",
            "[clip-path:polygon(4px_0,100%_0,100%_calc(100%-4px),calc(100%-4px)_100%,0_100%,0_4px)]",
            size === "sm" ? "h-4 w-8" : "h-5 w-10",
            checked ? "border-brand bg-brand/25 shadow-[inset_0_0_8px_var(--brand)]" : "border-line bg-surface",
          )}
        >
          <span className="absolute inset-x-1 top-1/2 h-px -translate-y-1/2 bg-current opacity-15" />
          <span
            className={cn(
              "absolute transition-[translate,background-color,box-shadow] duration-(--duration-base) ease-ui motion-reduce:transition-none",
              size === "sm" ? "top-[2px] left-[2px] size-2.5" : "top-[3px] left-[3px] size-3",
              checked ? (size === "sm" ? "translate-x-4" : "translate-x-5") + " bg-brand shadow-[0_0_8px_var(--brand)]" : "translate-x-0 bg-muted",
            )}
          />
        </span>
      </span>
    </button>
  );
}
