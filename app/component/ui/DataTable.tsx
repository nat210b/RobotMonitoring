"use client";

import { useMemo, useState, type ReactNode } from "react";
import { cn } from "./cn";
import { Pagination } from "./Pagination";

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** return a comparable value to enable sorting */
  sortValue?: (row: T) => string | number;
  align?: "left" | "right" | "center";
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string | number;
  /** rows per page; omit to disable pagination */
  pageSize?: number;
  emptyText?: ReactNode;
  caption?: string;
  /** Tighter footer (smaller text and page buttons) for narrow spaces. */
  compact?: boolean;
  /** Makes rows clickable. */
  onRowClick?: (row: T) => void;
  className?: string;
}

const alignClass = { left: "text-left", right: "text-right", center: "text-center" };

export function DataTable<T>({
  columns,
  data,
  rowKey,
  pageSize,
  emptyText = "No data",
  caption,
  compact,
  onRowClick,
  className,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sort?.key);
    if (!col?.sortValue || !sort) return data;
    const get = col.sortValue;
    const mul = sort.dir === "asc" ? 1 : -1;
    return [...data].sort((a, b) => {
      const x = get(a);
      const y = get(b);
      return (x < y ? -1 : x > y ? 1 : 0) * mul;
    });
  }, [data, columns, sort]);

  const pageCount = pageSize ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1;
  const current = Math.min(page, pageCount);
  const rows = pageSize
    ? sorted.slice((current - 1) * pageSize, current * pageSize)
    : sorted;

  const toggle = (key: string) =>
    setSort((s) =>
      s?.key !== key ? { key, dir: "asc" } : s.dir === "asc" ? { key, dir: "desc" } : null,
    );

  return (
    <div className={cn("overflow-hidden rounded-card border border-line bg-surface", className)}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="bg-surface-2 text-muted">
            <tr>
              {columns.map((c) => {
                const active = sort?.key === c.key;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={
                      active ? (sort.dir === "asc" ? "ascending" : "descending") : undefined
                    }
                    className={cn(
                      "whitespace-nowrap px-4 py-3 font-medium",
                      alignClass[c.align ?? "left"],
                      c.className,
                    )}
                  >
                    {c.sortValue ? (
                      <button
                        type="button"
                        onClick={() => toggle(c.key)}
                        className="inline-flex items-center gap-1 hover:text-foreground focus-visible:outline-2 focus-visible:outline-brand"
                      >
                        {c.header}
                        <span aria-hidden className={cn(!active && "opacity-30")}>
                          {active && sort.dir === "desc" ? "↓" : "↑"}
                        </span>
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-muted">
                  {emptyText}
                </td>
              </tr>
            ) : (
              <>
                {rows.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick && (() => onRowClick(row))}
                  className={cn("border-t border-line transition-colors duration-(--duration-fast) ease-ui hover:bg-surface-2", onRowClick && "cursor-pointer")}
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={cn("px-4 py-3", alignClass[c.align ?? "left"], c.className)}
                    >
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
                ))}
                {/* Short last page: invisible copies of a row fill it up to a full page, so the table
                    (and the pagination under it) keep the same height on every page. */}
                {pageSize !== undefined &&
                  Array.from({ length: Math.max(0, pageSize - rows.length) }, (_, i) => (
                    <tr key={`filler-${i}`} aria-hidden className="invisible border-t border-line">
                      {columns.map((c) => (
                        <td key={c.key} className={cn("px-4 py-3", alignClass[c.align ?? "left"], c.className)}>
                          {c.cell(rows[0])}
                        </td>
                      ))}
                    </tr>
                  ))}
              </>
            )}
          </tbody>
        </table>
      </div>
      {pageSize && sorted.length > pageSize && (
        <div className={cn("flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-line", compact ? "px-3 py-2" : "px-4 py-3")}>
          <span className={cn("whitespace-nowrap text-muted", compact ? "text-xs" : "text-sm")}>
            {(current - 1) * pageSize + 1}–{Math.min(current * pageSize, sorted.length)} of{" "}
            {sorted.length}
          </span>
          <Pagination page={current} pageCount={pageCount} onPageChange={setPage} size={compact ? "sm" : "md"} />
        </div>
      )}
    </div>
  );
}
