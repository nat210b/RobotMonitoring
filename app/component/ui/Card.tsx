import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  padded?: boolean;
}

export function Card({
  title,
  description,
  actions,
  footer,
  padded = true,
  className,
  children,
  ...rest
}: CardProps) {
  const hasHeader = title || description || actions;
  return (
    <div
      className={cn(
        "rounded-card border border-line bg-surface text-foreground",
        className,
      )}
      {...rest}
    >
      {hasHeader && (
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            {title && <h3 className="text-base font-semibold">{title}</h3>}
            {description && (
              <p className="mt-0.5 text-sm text-muted">{description}</p>
            )}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      )}
      <div className={cn(padded && "p-5")}>{children}</div>
      {footer && (
        <div className="border-t border-line px-5 py-3 text-sm text-muted">
          {footer}
        </div>
      )}
    </div>
  );
}
