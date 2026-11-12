import { useId, type ReactNode, type TextareaHTMLAttributes } from "react";
import { cn } from "./cn";
import { Field, controlBaseClass } from "./Field";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
}

export function Textarea({ label, hint, error, className, id, rows = 4, ...rest }: TextareaProps) {
  const auto = useId();
  const textareaId = id ?? auto;
  return (
    <Field id={textareaId} label={label} hint={hint} error={error}>
      <textarea
        id={textareaId}
        rows={rows}
        aria-invalid={!!error || undefined}
        aria-describedby={error || hint ? `${textareaId}-msg` : undefined}
        className={cn(controlBaseClass, "resize-y py-2 leading-relaxed", error ? "border-danger" : "border-line", className)}
        {...rest}
      />
    </Field>
  );
}
