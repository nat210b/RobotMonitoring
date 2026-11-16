"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Robot } from "@/app/lib/robots";
import type { RobotStatusLogEntry } from "@/app/lib/robotStatus";
import { ROOM_LAYOUT, ROOM_SECTIONS, type MachineType } from "../room/floorPlan";
import { renderMachineThumbnails } from "../room/thumbnail";
import { cn } from "../ui";

/** Pictures of every machine type, rendered once per page load and kept (see useThumbnails). */
let thumbnailCache: Map<MachineType, string> | null = null;

/**
 * Picture of each machine type's 3D model. Building the models and rendering them needs a second WebGL
 * context and takes a while, so it is done ONCE for all types, when the browser is idle, and cached. It used
 * to be redone for every new set of machine types in the list, which froze the page as logs came in.
 */
function useThumbnails() {
  const [pics, setPics] = useState<Map<MachineType, string>>(thumbnailCache ?? new Map());
  useEffect(() => {
    if (thumbnailCache) return;
    const run = () => {
      thumbnailCache = renderMachineThumbnails(ROOM_LAYOUT.map((m) => m.type));
      setPics(thumbnailCache);
    };
    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(run, { timeout: 1500 });
      return () => cancelIdleCallback(id);
    }
    const id = setTimeout(run, 200);
    return () => clearTimeout(id);
  }, []);
  return pics;
}

const formatDay = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const formatClock = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });

/** Status text colour and its leading dot. */
const STATUS_TONE: Record<string, { text: string; dot: string; ring: string; line: string; glow: string; tab: string; edge: string }> = {
  PASS: { text: "text-success-light", dot: "bg-success-light", ring: "border-success", line: "bg-success/70", glow: "shadow-[0_0_8px_var(--success)]", tab: "border-success/60 bg-success/10 text-success-light", edge: "border-success/40" },
  FAIL: { text: "text-danger", dot: "bg-danger", ring: "border-danger", line: "bg-danger/70", glow: "shadow-[0_0_8px_var(--danger)]", tab: "border-danger/60 bg-danger/10 text-danger", edge: "border-danger/40" },
  MAINTAIN: { text: "text-warning", dot: "bg-warning", ring: "border-warning", line: "bg-warning/70", glow: "shadow-[0_0_8px_var(--warning)]", tab: "border-warning/60 bg-warning/10 text-warning", edge: "border-warning/40" },
};
const FALLBACK_TONE = { text: "text-muted", dot: "bg-muted", ring: "border-muted", line: "bg-muted/70", glow: "", tab: "border-brand/60 bg-brand-soft text-brand", edge: "border-line" };

/** Section name of each machine, for the expanded card. */
const SECTION_OF = new Map(ROOM_SECTIONS.flatMap((s) => s.machineIds.map((id) => [id, s.label] as const)));

/** "Label: value" line, as in the HUD reference. */
const Field = ({ label, value, className }: { label: string; value: string; className?: string }) => (
  <span className={cn("block truncate", className)}>
    <span className="text-muted">{label}: </span>
    <span className="font-semibold text-foreground">{value}</span>
  </span>
);

/** Card widths: compact (picture, ID, status) and expanded (every field). The content is laid out at the
 *  expanded width and the card clips it, so widening the card reveals the extra columns. */
/** Time between one new entry going in and the next. */
const STEP_MS = 650;
/** Cards drawn at first, and added by each "Show more": every card is a blurred, clipped glass panel, so drawing hundreds is slow. */
const PAGE_SIZE = 40;
/** More new entries than this at once count as a bulk arrival and are shown without animation. */
const BULK = 3;
const COMPACT_W = "w-[16.5rem]";
const EXPANDED_W = "w-[34rem]";

/**
 * Timeline of inspection results down the right edge (newest first, grouped by day), with no panel
 * behind it. Each entry is a HUD-style card joined to a ring dot on the rail. Normally the card shows
 * the robot ID, the machine's picture and the status; hovering, focusing or clicking it widens it to
 * the left to show every field (name, time, machine, section, date, fail detail). Results whose
 * robot_id isn't a robot in this room are left out.
 */
export function RobotStatusLog({
  logs,
  robots,
  selectedId,
  onSelect,
  onEdit,
  className,
}: {
  logs: RobotStatusLogEntry[];
  /** Robot records keyed by machine id. */
  robots: Map<string, Robot>;
  selectedId: string | null;
  onSelect: (machineId: string) => void;
  onEdit?: (log: RobotStatusLogEntry) => void;
  className?: string;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  const allRows = useMemo(() => {
    const byRobotId = new Map<string, Robot>();
    robots.forEach((r) => byRobotId.set(r.robotID, r));
    const machines = new Map(ROOM_LAYOUT.map((m) => [m.id, m]));
    return logs.flatMap((log) => {
      const robot = byRobotId.get(log.robot_id);
      const machine = robot && machines.get(robot.machineID);
      return robot && machine ? [{ log, robot, machine }] : [];
    });
  }, [logs, robots]);

  // New results are let in one at a time: each step pushes the list down one place and puts the next
  // new entry (oldest first) at the top, until every new entry is in. `pending` holds the ones waiting.
  // Worked out while rendering (not in an effect), so a new entry is queued in the same render that
  // first sees it and is never drawn early. The page first renders with no logs/robots and fills in
  // once they load, so the first non-empty list counts as the initial load and shows all at once.
  const idsOf = (list: typeof allRows) => new Set(list.map((r) => r.log.id));
  const [seen, setSeen] = useState<ReadonlySet<string> | null>(() => (allRows.length ? idsOf(allRows) : null));
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  const [lastRows, setLastRows] = useState(allRows);
  if (lastRows !== allRows) {
    setLastRows(allRows);
    if (seen === null) {
      if (allRows.length) setSeen(idsOf(allRows));
    } else {
      const fresh = allRows.filter((r) => !seen.has(r.log.id)).map((r) => r.log.id);
      if (fresh.length) {
        setSeen(new Set([...seen, ...fresh]));
        const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        // A few new entries are let in one by one; a bulk arrival (a run starting in the past, "Show more") is not queued
        if (!reduce && fresh.length <= BULK) setPending(new Set([...pending, ...fresh]));
      }
    }
  }
  useEffect(() => {
    if (!pending.size) return;
    const timer = setTimeout(() => {
      // allRows is newest first, so the last pending entry in it is the oldest one
      const oldest = [...allRows].reverse().find((r) => pending.has(r.log.id));
      setPending((p) => {
        const next = new Set(p);
        if (oldest) next.delete(oldest.log.id);
        else next.clear();
        return next;
      });
    }, STEP_MS);
    return () => clearTimeout(timer);
  }, [pending, allRows]);
  const rows = useMemo(() => (pending.size ? allRows.filter((r) => !pending.has(r.log.id)) : allRows), [allRows, pending]);

  const [limit, setLimit] = useState(PAGE_SIZE);
  const shown = useMemo(() => rows.slice(0, limit), [rows, limit]);

  const days = useMemo(() => {
    const groups: { day: string; items: typeof rows }[] = [];
    for (const row of shown) {
      const day = formatDay(row.log.datetime);
      const last = groups[groups.length - 1];
      if (last?.day === day) last.items.push(row);
      else groups.push({ day, items: [row] });
    }
    return groups;
  }, [shown]);
  const pics = useThumbnails();

  // When the list changes, slide the existing entries down to their new place and ease new ones in
  // from above (FLIP: measure the old position, then animate from it to the new one).
  const scrollRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<string, HTMLLIElement>());
  const prevPos = useRef<Map<string, number> | null>(null);
  useLayoutEffect(() => {
    if (!scrollRef.current) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Layout position only (offsetTop ignores transforms and scrolling), so a slide still running from
    // the last change can't skew the measurement.
    const next = new Map<string, number>();
    itemRefs.current.forEach((el, id) => next.set(id, el.offsetTop));
    const prev = prevPos.current;
    if (prev && prev.size > 0 && !reduce) { // prev empty = the initial load, nothing to animate from
      const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
      const fresh = [...itemRefs.current].filter(([id]) => !prev.has(id)).map(([, el]) => el);
      if (fresh.length > BULK) { // bulk: skip the slide-in animations (dozens of staggered animations are slow)
        prevPos.current = next;
        return;
      }
      itemRefs.current.forEach((el, id) => {
        const before = prev.get(id);
        const after = next.get(id)!;
        if (before === undefined || Math.abs(before - after) <= 1) return; // unmoved: let any running slide finish
        // Start from where the entry is drawn right now: its old place plus any slide still in flight.
        const style = getComputedStyle(el).transform;
        const inFlight = style && style !== "none" ? new DOMMatrixReadOnly(style).m42 : 0;
        el.getAnimations().forEach((a) => a.cancel());
        el.animate([{ transform: `translateY(${before - after + inFlight}px)` }, { transform: "none" }], { duration: 600, easing: EASE });
      });
      // Several new entries arrive one after another: the oldest first, the newest last.
      fresh.forEach((el, i) => {
        el.animate(
          [{ opacity: 0, transform: "translateY(-32px) scale(0.97)", filter: "blur(4px)" }, { opacity: 1, transform: "none", filter: "blur(0)" }],
          { duration: 600, delay: (fresh.length - 1 - i) * 220, easing: EASE, fill: "backwards" },
        );
      });
    }
    prevPos.current = next;
  }, [shown]);

  return (
    <aside className={cn("pointer-events-none flex min-h-0 flex-col items-end text-foreground", className)}>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">No status logged yet.</p>
      ) : (
        <div ref={scrollRef} className="min-h-0 w-full flex-1 overflow-x-hidden overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {days.map(({ day, items }) => (
            <section key={day} className="mb-3 last:mb-0">
              <h3 className="mb-1 pr-9 text-right text-[11px] font-semibold tracking-wide text-muted uppercase">{day}</h3>
              <ol>
                {items.map(({ log, robot, machine }) => {
                  const open = openId === log.id;
                  const selected = selectedId === machine.id;
                  const tone = STATUS_TONE[log.status] ?? FALLBACK_TONE;
                  return (
                    <li
                      key={log.id}
                      ref={(el) => {
                        if (el) itemRefs.current.set(log.id, el);
                        else itemRefs.current.delete(log.id);
                      }}
                      className="group relative flex justify-end pr-9 pb-3 last:pb-0"
                    >
                      {/* Rail on the right, a ring dot level with the card, and a short line joining them */}
                      <span aria-hidden className="absolute top-0 -bottom-0 right-[7px] w-px bg-line group-first:top-12 group-last:bottom-auto group-last:h-12" />
                      <span aria-hidden className={cn("absolute top-12 right-4 h-px w-5", tone.line)} />
                      <span
                        aria-hidden
                        className={cn("absolute top-[42px] right-0 size-[15px] border-2 bg-surface", tone.ring, selected && tone.glow)}
                      />

                      <button
                        type="button"
                        aria-expanded={open}
                        data-selected={selected || undefined}
                        aria-label={`Robot ${robot.robotID}: ${log.status}, ${new Date(log.datetime).toLocaleString()}`}
                          onClick={() => {
                          setOpenId(open ? null : log.id);
                          onSelect(machine.id);
                        }}
                        className={cn(
                          log.status === "FAIL" && "hud-danger",
                          log.status === "PASS" && "hud-success",
                          "hud hud-glass pointer-events-auto block overflow-hidden border text-left text-xs text-foreground",
                          // Literal class names (Tailwind can't see built-up strings); keep in step with EXPANDED_W.
                          "transition-[width,border-color] duration-(--duration-slow) ease-ui group-focus-within:w-[34rem] group-hover:w-[34rem]",
                          open ? EXPANDED_W : COMPACT_W,
                          selected || log.status === "FAIL" || log.status === "PASS" ? tone.ring : "border-brand/50",
                        )}
                      >
                        <span className={cn("flex", EXPANDED_W)}>
                          {/* Left column: robot ID tab over the machine picture */}
                          <span className={cn("flex w-28 shrink-0 flex-col gap-1.5 border-r p-2", tone.edge)}>
                            <span className={cn("block truncate border px-1.5 py-0.5 text-center text-sm font-semibold", tone.tab)}>{robot.robotID}</span>
                            <span className={cn("grid h-[4.5rem] place-items-center overflow-hidden border bg-surface-3/60", tone.edge)}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              {pics.get(machine.type) && <img src={pics.get(machine.type)} alt="" className="size-full object-contain" />}
                            </span>
                          </span>

                          {/* Compact column: status, then the basics */}
                          <span className="flex w-[9.5rem] shrink-0 flex-col justify-center gap-1.5 px-3 py-2">
                            <span className={cn("flex items-center gap-1.5 font-semibold", tone.text)}>
                              <span aria-hidden className={cn("size-1.5", tone.dot)} />
                              {log.status}
                            </span>
                            <Field label="Robot ID" value={robot.robotID} />
                            <Field label="Time" value={formatClock(log.datetime)} />
                            <span className="block truncate">
                              <span className="text-muted">Power: </span>
                              <span className={cn("font-semibold", robot.robotPower === true ? "text-brand" : "text-danger")}>{robot.robotPower === true ? "ON" : "OFF"}</span>
                            </span>
                          </span>

                          {/* Extra columns, revealed as the card widens */}
                          <span className="grid min-w-0 flex-1 grid-cols-2 content-start gap-x-4 gap-y-1.5 py-2 pr-3">
                            {/* Section name: centred tab across the top, wrapping so long names stay whole */}
                            <span className={cn("col-span-2 mb-0.5 block border px-2 py-0.5 text-center text-sm leading-snug font-semibold break-words", tone.tab)}>
                              {SECTION_OF.get(machine.id) ?? "—"}
                            </span>
                            <Field label="Name" value={robot.robotName || "—"} />
                            <Field label="Machine" value={machine.id} />
                            <Field label="Date" value={formatDay(log.datetime)} className="col-span-2" />
                            <span className={cn("col-span-2 block truncate", log.failDetail ? "text-danger" : "text-muted")} title={log.failDetail || undefined}>
                              <span className="text-muted">Fail detail: </span>
                              {log.failDetail || "—"}
                            </span>
                          </span>
                        </span>
                      </button>
                      {onEdit && <button type="button" className="pointer-events-auto absolute top-2 right-11 z-10 border border-brand/60 bg-surface px-2 py-1 text-[10px] text-brand" onClick={(event) => { event.stopPropagation(); onEdit(log); }}>Edit</button>}
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
          {rows.length > shown.length && (
            <button type="button" onClick={() => setLimit((n) => n + PAGE_SIZE)} className="pointer-events-auto mr-9 mb-2 ml-auto block border border-brand/50 bg-surface px-3 py-1 text-xs text-brand hover:border-brand">
              Show {Math.min(PAGE_SIZE, rows.length - shown.length)} more ({rows.length - shown.length} older)
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
