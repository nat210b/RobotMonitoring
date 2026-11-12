import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { cn, focusRing, transition } from "./cn";

export interface SidebarProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  title?: ReactNode;
  description?: ReactNode;
  /** Content at the right of the header (e.g. a close or back button). */
  actions?: ReactNode;
  /** Pinned below the scrolling body (e.g. form buttons). */
  footer?: ReactNode;
  /** Which edge of the layout the side bar sits on; sets the divider side. */
  side?: "left" | "right";
}

/**
 * Panel docked to the side of a page: header, scrolling body, optional pinned footer.
 * Full width and stacked on small screens, a fixed-width column from `md` up.
 */
export function Sidebar({ title, description, actions, footer, side = "left", className, children, ...rest }: SidebarProps) {
  const hasHeader = title || description || actions;
  return (
    <aside
      className={cn(
        "flex min-h-0 w-full shrink-0 flex-col border-line bg-surface text-foreground md:w-80",
        side === "left" ? "border-b md:border-r md:border-b-0" : "border-t md:border-l md:border-t-0",
        className,
      )}
      {...rest}
    >
      {hasHeader && (
        <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0">
            {title && <h2 className="truncate text-base font-semibold">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      {footer && <div className="border-t border-line px-4 py-3">{footer}</div>}
    </aside>
  );
}

export interface SidebarItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: ReactNode;
  /** Secondary line under the label. */
  meta?: ReactNode;
  /** Right-aligned content, e.g. a Badge. */
  trailing?: ReactNode;
  active?: boolean;
}

/** Selectable row for lists inside a Sidebar. */
export function SidebarItem({ label, meta, trailing, active, className, type = "button", ...rest }: SidebarItemProps) {
  return (
    <button
      type={type}
      aria-current={active || undefined}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-control px-3 py-2 text-left",
        transition,
        focusRing,
        active ? "bg-brand-soft text-brand" : "hover:bg-surface-3",
        className,
      )}
      {...rest}
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{label}</span>
        {meta && <span className="block truncate text-xs text-muted">{meta}</span>}
      </span>
      {trailing && <span className="shrink-0">{trailing}</span>}
    </button>
  );
}
