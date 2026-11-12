import type { ReactNode } from "react";
import { cn } from "./cn";

/** Shared look of every form control, without a height (multi-line controls size themselves). */
export const controlBaseClass =
  "w-full rounded-control border bg-surface px-3 text-sm text-foreground " +
  "placeholder:text-muted outline-none transition-[border-color] duration-(--duration-base) ease-ui " +
  "hover:border-brand focus:border-brand " +
  "disabled:cursor-not-allowed disabled:opacity-50";

/** Single-line controls (Input, Select, DatePicker). */
export const controlClass = "h-10 " + controlBaseClass;

export function Field({
  id,
  label,
  hint,
  error,
  children,
  className,
}: {
  id: string;
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${id}-msg`} role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-msg`} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
