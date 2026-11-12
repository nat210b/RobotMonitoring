import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "./cn";
import { Field, controlClass } from "./Field";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
}

export function Input({ label, hint, error, className, id, ...rest }: InputProps) {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <Field id={inputId} label={label} hint={hint} error={error}>
      <input
        id={inputId}
        aria-invalid={!!error || undefined}
        aria-describedby={error || hint ? `${inputId}-msg` : undefined}
        className={cn(controlClass, error ? "border-danger" : "border-line", className)}
        {...rest}
      />
    </Field>
  );
}
