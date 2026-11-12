import type { CSSProperties, HTMLAttributes } from "react";
import { cn } from "./cn";

export type Span = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface GridProps extends HTMLAttributes<HTMLDivElement> {
  /** gap in px */
  gap?: number;
}

/** 12-column grid. Columns respond to the container width (≥480 / ≥720 / ≥1024px). */
export function Grid({ gap = 16, className, style, children, ...rest }: GridProps) {
  return (
    <div className={cn("ui-grid", className)} {...rest}>
      <div
        className="ui-grid-inner"
        style={{ "--grid-gap": `${gap}px`, ...style } as CSSProperties}
      >
        {children}
      </div>
    </div>
  );
}

export interface ColProps extends HTMLAttributes<HTMLDivElement> {
  /** base (mobile-first) span; defaults to 12 */
  span?: Span;
  sm?: Span;
  md?: Span;
  lg?: Span;
}

export function Col({ span = 12, sm, md, lg, className, style, ...rest }: ColProps) {
  const vars: Record<string, number> = { "--span": span };
  if (sm) vars["--span-sm"] = sm;
  if (md) vars["--span-md"] = md;
  if (lg) vars["--span-lg"] = lg;
  return (
    <div
      className={cn("ui-col", className)}
      style={{ ...vars, ...style } as CSSProperties}
      {...rest}
    />
  );
}
