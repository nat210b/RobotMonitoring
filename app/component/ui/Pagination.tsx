import { cn, focusRing, transition } from "./cn";

export interface PaginationProps {
  page: number; // 1-based
  pageCount: number;
  onPageChange: (page: number) => void;
  /** pages shown on each side of current */
  siblings?: number;
  /** "sm" makes the buttons smaller so a long row fits in a narrow space. */
  size?: "md" | "sm";
  className?: string;
}

function range(from: number, to: number) {
  return Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i);
}

export function getPages(page: number, count: number, siblings: number) {
  const total = siblings * 2 + 5;
  if (count <= total) return range(1, count);
  const left = Math.max(page - siblings, 2);
  const right = Math.min(page + siblings, count - 1);
  const out: Array<number | "…"> = [1];
  if (left > 2) out.push("…");
  out.push(...range(left, right));
  if (right < count - 1) out.push("…");
  out.push(count);
  return out;
}

const btn = cn(
  "inline-flex items-center justify-center rounded-control",
  "disabled:cursor-not-allowed disabled:opacity-40",
  transition,
  focusRing,
);

export function Pagination({
  page,
  pageCount,
  onPageChange,
  siblings = 1,
  size = "md",
  className,
}: PaginationProps) {
  const sizing = size === "sm" ? "h-7 min-w-7 px-1.5 text-xs" : "h-9 min-w-9 px-2 text-sm";
  if (pageCount <= 1) return null;
  const go = (p: number) => onPageChange(Math.min(Math.max(1, p), pageCount));
  return (
    <nav aria-label="Pagination" className={cn("flex flex-wrap items-center", size === "sm" ? "gap-0.5" : "gap-1", className)}>
      <button
        type="button"
        className={cn(btn, sizing, "hover:bg-surface-3")}
        disabled={page <= 1}
        onClick={() => go(page - 1)}
        aria-label="Previous page"
      >
        ‹
      </button>
      {getPages(page, pageCount, siblings).map((p, i) =>
        p === "…" ? (
          <span key={`e${i}`} aria-hidden className="px-1 text-muted">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => go(p)}
            aria-current={p === page ? "page" : undefined}
            className={cn(
              btn,
              sizing,
              p === page
                ? "bg-brand font-semibold text-on-brand"
                : "text-foreground hover:bg-surface-3",
              // keep the mobile bar compact: only current page + ends
              p !== page && p !== 1 && p !== pageCount && "hidden sm:inline-flex",
            )}
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        className={cn(btn, sizing, "hover:bg-surface-3")}
        disabled={page >= pageCount}
        onClick={() => go(page + 1)}
        aria-label="Next page"
      >
        ›
      </button>
    </nav>
  );
}
