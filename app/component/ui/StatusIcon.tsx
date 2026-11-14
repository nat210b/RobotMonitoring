import { cn } from "./cn";

export type StatusIconKind = "power-off" | "warning";

const TONE = {
  "power-off": { main: "#ff2a2a", label: "Power off" },
  warning: { main: "#ffc21a", label: "Warning" },
} as const;

/**
 * Futuristic status icons drawn as neon-outlined glass: a red power symbol for a machine that is off,
 * and a yellow warning triangle for a section with a problem. Glows and pulses (not when the user
 * prefers reduced motion). Size it with className, e.g. "size-8".
 */
export function StatusIcon({ kind, title, className }: { kind: StatusIconKind; title?: string; className?: string }) {
  const { main, label } = TONE[kind];
  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label={title ?? label}
      className={cn("status-icon-pulse size-8 shrink-0", className)}
      style={{ color: main }}
    >
      <title>{title ?? label}</title>
      {kind === "power-off" ? (
        <g fill="none" stroke="currentColor" strokeLinecap="round">
          <circle cx="32" cy="32" r="29" fill="rgba(10,14,20,0.82)" strokeWidth="3" />
          <circle cx="32" cy="32" r="24" strokeWidth="1" strokeDasharray="2 5" opacity="0.7" />
          <path d="M21.5 22.5a15.5 15.5 0 1 0 21 0" strokeWidth="4.5" />
          <path d="M32 13.5v17" strokeWidth="4.5" />
        </g>
      ) : (
        <g>
          <path
            d="M32 5.5c1.6 0 3.1.9 3.9 2.3l24 42c1.5 2.7-.4 6-3.5 6H7.6c-3.1 0-5-3.3-3.5-6l24-42c.8-1.4 2.3-2.3 3.9-2.3z"
            fill="rgba(10,14,20,0.82)"
            stroke="currentColor"
            strokeWidth="3.2"
            strokeLinejoin="round"
          />
          <path
            d="M32 13.5 11.5 49.5h41z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="2 4"
            opacity="0.7"
          />
          <path d="M32 22v15" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
          <circle cx="32" cy="45" r="3" fill="currentColor" />
        </g>
      )}
    </svg>
  );
}
