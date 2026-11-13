import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn, focusRing, transition } from "./cn";

export interface OptionCardProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** Picked / switched on: brand outline. */
  selected?: boolean;
  /** Small icon at the left of the label. */
  icon?: ReactNode;
  label: ReactNode;
  /** Mini illustration shown above the label. */
  preview?: ReactNode;
}

/** Selectable tile for settings grids (a toggle or one choice of a group): preview on top, icon + label below. */
export function OptionCard({ selected = false, icon, label, preview, className, type = "button", ...rest }: OptionCardProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        "flex min-w-0 flex-col gap-2 rounded-card border bg-surface-2 p-2 text-left text-sm font-medium",
        transition,
        focusRing,
        selected ? "border-brand shadow-[0_0_0_1px_var(--brand)]" : "border-line hover:border-brand/60",
        className,
      )}
      {...rest}
    >
      {preview && <span className="grid h-14 place-items-center overflow-hidden rounded-control bg-surface-3">{preview}</span>}
      <span className="flex min-w-0 items-center gap-1.5 px-0.5">
        {icon && <span className="shrink-0 text-muted">{icon}</span>}
        <span className="truncate">{label}</span>
      </span>
    </button>
  );
}
