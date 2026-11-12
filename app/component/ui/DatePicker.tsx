import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "./cn";
import { Field, controlClass } from "./Field";

export interface DatePickerProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "min" | "max"> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  /** ISO date `YYYY-MM-DD` */
  min?: string;
  max?: string;
  /** include time (datetime-local) */
  withTime?: boolean;
}

/** Wraps the native date input: accessible, localized, and themed via tokens. */
export function DatePicker({
  label,
  hint,
  error,
  withTime,
  className,
  id,
  ...rest
}: DatePickerProps) {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <Field id={inputId} label={label} hint={hint} error={error}>
      <input
        id={inputId}
        type={withTime ? "datetime-local" : "date"}
        aria-invalid={!!error || undefined}
        aria-describedby={error || hint ? `${inputId}-msg` : undefined}
        className={cn(
          controlClass,
          "[color-scheme:light] dark:[color-scheme:dark]",
          error ? "border-danger" : "border-line",
          className,
        )}
        {...rest}
      />
    </Field>
  );
}
