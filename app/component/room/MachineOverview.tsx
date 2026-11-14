"use client";

import { useMemo } from "react";
import type { Robot } from "@/app/lib/robots";
import { Badge, BarChart, DataTable, DonutChart, cn, type Column } from "../ui";
import { ROOM_LAYOUT, ROOM_SECTIONS } from "./floorPlan";

type MachinePower = "ON" | "OFF";
type Row = { id: string; /** Robot name, or the machine id when it has none. */ name: string; section: string; power: MachinePower };

const SECTION_OF = new Map(ROOM_SECTIONS.flatMap((s) => s.machineIds.map((id) => [id, s.label] as const)));

const COLUMNS: Column<Row>[] = [
  { key: "id", header: "Machine", cell: (r) => <span className="font-medium">{r.name}</span>, sortValue: (r) => r.name, className: "!px-3 !py-1.5 !text-xs" },
  {
    key: "section",
    header: "Section",
    cell: (r) => (
      <span className="block max-w-52 truncate text-muted" title={r.section}>
        {r.section}
      </span>
    ),
    sortValue: (r) => r.section,
    className: "!px-3 !py-1.5 !text-xs",
  },
  {
    key: "power",
    header: "Status",
    cell: (r) => <Badge tone={r.power === "ON" ? "brand" : "neutral"}>{r.power}</Badge>,
    sortValue: (r) => r.power,
    align: "right",
    className: "!px-3 !py-1.5 !text-xs",
  },
];

/**
 * Left-hand overview: ring chart of how many machines are ON, a bar per section, and a table of
 * every machine's ON / OFF state, taken from each robot's robotPower (no robot or no value counts as OFF).
 */
export function MachineOverview({ onSelect, power, robots, className }: { onSelect: (machineId: string) => void; power: Record<string, boolean | undefined>; /** Robot records keyed by machine id. */ robots: Map<string, Robot>; className?: string }) {
  const { rows, on, sections } = useMemo(() => {
    // Default order: machines that have a robot record first (ON before OFF), machines with no value last.
    // Array.sort is stable, so each group keeps the room layout order; header clicks still re-sort.
    const rank = (id: string) => (!robots.has(id) ? 2 : power[id] === true ? 0 : 1);
    const rows = ROOM_LAYOUT.map((m): Row => ({ id: m.id, name: robots.get(m.id)?.robotName?.trim() || m.id, section: SECTION_OF.get(m.id) ?? "—", power: power[m.id] === true ? "ON" : "OFF" })).sort((a, b) => rank(a.id) - rank(b.id));
    const sections = ROOM_SECTIONS.map((s) => ({
      id: s.id,
      label: s.label,
      color: s.color,
      total: s.machineIds.length,
      on: s.machineIds.filter((id) => power[id] === true).length,
    }));
    return { rows, on: rows.filter((r) => r.power === "ON").length, sections };
  }, [power, robots]);
  const off = rows.length - on;

  return (
    <aside className={cn("hud flex min-h-0 flex-col gap-2.5 overflow-y-auto rounded-card border border-line bg-surface p-4 text-foreground", className)}>
      <div>
        <h2 className="hud-title text-lg font-semibold">Machine status</h2>
      </div>

      <div className="flex items-center gap-4">
        <DonutChart
          size={104} thickness={0.32}
          segments={[
            { label: "ON", value: on, color: "var(--brand)" },
            { label: "OFF", value: off, color: "var(--muted)" },
          ]}
        >
          <span>
            <span className="block text-base leading-none font-semibold">{Math.round((on / rows.length) * 100)}%</span>
            <span className="text-[10px] text-muted">running</span>
          </span>
        </DonutChart>
        <ul className="flex-1 space-y-1.5 text-sm">
          <li className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-brand" /> ON <b className="ml-auto pl-4">{on}</b>
          </li>
          <li className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-muted" /> OFF <b className="ml-auto pl-4">{off}</b>
          </li>
          <li className="flex items-center gap-2 text-muted">
            Total <b className="ml-auto pl-4 text-foreground">{rows.length}</b>
          </li>
        </ul>
      </div>

      <BarChart
        labels={sections.map((s) => `${s.label}  ${s.on}/${s.total}`)}
        series={[
          { label: "ON", data: sections.map((s) => s.on), color: "var(--brand)" },
          { label: "OFF", data: sections.map((s) => s.total - s.on), color: "var(--surface-3)" },
        ]}
        fill
        rowHeight={20}
        maxLabelLength={40}
      />

      <DataTable columns={COLUMNS} data={rows} rowKey={(r) => r.id} pageSize={7} compact caption="Machine ON / OFF status" onRowClick={(r) => onSelect(r.id)} className="shrink-0 text-xs" />
    </aside>
  );
}
