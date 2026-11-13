"use client";

import { useMemo } from "react";
import { Badge, BarChart, DataTable, DonutChart, cn, type Column } from "../ui";
import { ROOM_LAYOUT, ROOM_SECTIONS } from "./floorPlan";
import { MOCK_MACHINE_POWER, type MachinePower } from "./machineStatus.mock";

type Row = { id: string; section: string; power: MachinePower };

const SECTION_OF = new Map(ROOM_SECTIONS.flatMap((s) => s.machineIds.map((id) => [id, s.label] as const)));

const COLUMNS: Column<Row>[] = [
  { key: "id", header: "Machine", cell: (r) => <span className="font-medium">{r.id}</span>, sortValue: (r) => r.id, className: "!px-3 !py-1.5 !text-xs" },
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
 * every machine's ON / OFF state. The states are mock data (see machineStatus.mock.ts).
 */
export function MachineOverview({ onSelect, className }: { onSelect: (machineId: string) => void; className?: string }) {
  const { rows, on, sections } = useMemo(() => {
    const rows: Row[] = ROOM_LAYOUT.map((m) => ({ id: m.id, section: SECTION_OF.get(m.id) ?? "—", power: MOCK_MACHINE_POWER.get(m.id) ?? "OFF" }));
    const sections = ROOM_SECTIONS.map((s) => ({
      id: s.id,
      label: s.label,
      color: s.color,
      total: s.machineIds.length,
      on: s.machineIds.filter((id) => MOCK_MACHINE_POWER.get(id) === "ON").length,
    }));
    return { rows, on: rows.filter((r) => r.power === "ON").length, sections };
  }, []);
  const off = rows.length - on;

  return (
    <aside className={cn("flex min-h-0 flex-col gap-2.5 overflow-y-auto rounded-card border border-line bg-surface p-4 text-foreground shadow-lg", className)}>
      <div>
        <p className="text-xs text-muted">Overview</p>
        <h2 className="text-xl font-medium">Machine status</h2>
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
          { label: "ON", data: sections.map((s) => s.on), color: sections.map((s) => s.color) },
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
