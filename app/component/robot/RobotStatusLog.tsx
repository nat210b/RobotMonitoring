"use client";

import { useEffect, useMemo, useState } from "react";
import type { Robot } from "@/app/lib/robots";
import type { RobotStatusLogEntry } from "@/app/lib/robotStatus";
import { ROOM_LAYOUT, ROOM_SECTIONS, type MachineType } from "../room/floorPlan";
import { renderMachineThumbnails } from "../room/thumbnail";
import { cn } from "../ui";

/** Picture of each machine type's 3D model, rendered once in the browser. */
function useThumbnails(types: MachineType[]) {
  const [pics, setPics] = useState<Map<MachineType, string>>(new Map());
  const key = [...new Set(types)].sort().join("|");
  useEffect(() => {
    if (!key) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPics(renderMachineThumbnails(key.split("|") as MachineType[]));
  }, [key]);
  return pics;
}

const formatDay = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
const formatClock = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });

/** Status text colour and its leading dot. */
const STATUS_TONE: Record<string, { text: string; dot: string; ring: string; line: string; glow: string }> = {
  PASS: { text: "text-brand", dot: "bg-brand", ring: "border-brand", line: "bg-brand/70", glow: "shadow-[0_0_8px_var(--brand)]" },
  FAIL: { text: "text-danger", dot: "bg-danger", ring: "border-danger", line: "bg-danger/70", glow: "shadow-[0_0_8px_var(--danger)]" },
  MAINTAIN: { text: "text-warning", dot: "bg-warning", ring: "border-warning", line: "bg-warning/70", glow: "shadow-[0_0_8px_var(--warning)]" },
};
const FALLBACK_TONE = { text: "text-muted", dot: "bg-muted", ring: "border-muted", line: "bg-muted/70", glow: "" };

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
  className,
}: {
  logs: RobotStatusLogEntry[];
  /** Robot records keyed by machine id. */
  robots: Map<string, Robot>;
  selectedId: string | null;
  onSelect: (machineId: string) => void;
  className?: string;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const byRobotId = new Map<string, Robot>();
    robots.forEach((r) => byRobotId.set(r.robotID, r));
    const machines = new Map(ROOM_LAYOUT.map((m) => [m.id, m]));
    return logs.flatMap((log) => {
      const robot = byRobotId.get(log.robot_id);
      const machine = robot && machines.get(robot.machineID);
      return robot && machine ? [{ log, robot, machine }] : [];
    });
  }, [logs, robots]);
  const days = useMemo(() => {
    const groups: { day: string; items: typeof rows }[] = [];
    for (const row of rows) {
      const day = formatDay(row.log.datetime);
      const last = groups[groups.length - 1];
      if (last?.day === day) last.items.push(row);
      else groups.push({ day, items: [row] });
    }
    return groups;
  }, [rows]);
  const pics = useThumbnails(rows.map((r) => r.machine.type));

  return (
    <aside className={cn("pointer-events-none flex min-h-0 flex-col items-end text-foreground", className)}>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">No status logged yet.</p>
      ) : (
        <div className="min-h-0 w-full flex-1 overflow-x-hidden overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {days.map(({ day, items }) => (
            <section key={day} className="mb-3 last:mb-0">
              <h3 className="mb-1 pr-9 text-right text-[11px] font-semibold tracking-wide text-muted uppercase">{day}</h3>
              <ol>
                {items.map(({ log, robot, machine }) => {
                  const open = openId === log.id;
                  const selected = selectedId === machine.id;
                  const tone = STATUS_TONE[log.status] ?? FALLBACK_TONE;
                  return (
                    <li key={log.id} className="group relative flex justify-end pr-9 pb-3 last:pb-0">
                      {/* Rail on the right, a ring dot level with the card, and a short line joining them */}
                      <span aria-hidden className="absolute top-0 -bottom-0 right-[7px] w-px bg-line group-first:top-12 group-last:bottom-auto group-last:h-12" />
                      <span aria-hidden className={cn("absolute top-12 right-4 h-px w-5", tone.line)} />
                      <span
                        aria-hidden
                        className={cn("absolute top-[42px] right-0 size-[15px] rounded-full border-2 bg-surface", tone.ring, selected && tone.glow)}
                      />

                      <button
                        type="button"
                        aria-expanded={open}
                        aria-label={`Robot ${robot.robotID}: ${log.status}, ${new Date(log.datetime).toLocaleString()}`}
                        onClick={() => {
                          setOpenId(open ? null : log.id);
                          onSelect(machine.id);
                        }}
                        className={cn(
                          "pointer-events-auto block overflow-hidden border bg-surface text-left text-xs text-foreground shadow-lg",
                          // Literal class names (Tailwind can't see built-up strings); keep in step with EXPANDED_W.
                          "transition-[width,border-color] duration-(--duration-slow) ease-ui group-focus-within:w-[34rem] group-hover:w-[34rem]",
                          open ? EXPANDED_W : COMPACT_W,
                          selected ? tone.ring : "border-line",
                        )}
                      >
                        <span className={cn("flex", EXPANDED_W)}>
                          {/* Left column: robot ID tab over the machine picture */}
                          <span className="flex w-28 shrink-0 flex-col gap-1.5 border-r border-line p-2">
                            <span className="block truncate border border-brand/60 bg-brand-soft px-1.5 py-0.5 text-center text-sm font-semibold text-brand">{robot.robotID}</span>
                            <span className="grid h-[4.5rem] place-items-center overflow-hidden border border-line bg-surface-3">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              {pics.get(machine.type) && <img src={pics.get(machine.type)} alt="" className="size-full object-contain" />}
                            </span>
                          </span>

                          {/* Compact column: status, then the basics */}
                          <span className="flex w-[9.5rem] shrink-0 flex-col justify-center gap-1.5 px-3 py-2">
                            <span className={cn("flex items-center gap-1.5 font-semibold", tone.text)}>
                              <span aria-hidden className={cn("size-1.5 rounded-full", tone.dot)} />
                              {log.status}
                            </span>
                            <Field label="Robot ID" value={robot.robotID} />
                            <Field label="Time" value={formatClock(log.datetime)} />
                          </span>

                          {/* Extra columns, revealed as the card widens */}
                          <span className="grid min-w-0 flex-1 grid-cols-2 content-start gap-x-4 gap-y-1.5 py-2 pr-3">
                            {/* Section name: centred tab across the top, wrapping so long names stay whole */}
                            <span className="col-span-2 mb-0.5 block border border-brand/60 bg-brand-soft px-2 py-0.5 text-center text-sm leading-snug font-semibold break-words text-brand">
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
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </aside>
  );
}
