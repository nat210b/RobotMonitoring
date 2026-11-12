import { useId, type ReactNode, type SelectHTMLAttributes } from "react";
import { cn } from "./cn";
import { Field, controlClass } from "./Field";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  options: SelectOption[];
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  placeholder?: string;
}

export function Select({
  options,
  label,
  hint,
  error,
  placeholder,
  className,
  id,
  ...rest
}: SelectProps) {
  const auto = useId();
  const selectId = id ?? auto;
  return (
    <Field id={selectId} label={label} hint={hint} error={error}>
      <div className="relative">
        <select
          id={selectId}
          aria-invalid={!!error || undefined}
          aria-describedby={error || hint ? `${selectId}-msg` : undefined}
          className={cn(
            controlClass,
            "appearance-none pr-9",
            error ? "border-danger" : "border-line",
            className,
          )}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </select>
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="m5 8 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </Field>
  );
}
