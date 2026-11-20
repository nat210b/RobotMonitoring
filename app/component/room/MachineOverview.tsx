"use client";

import { useMemo } from "react";
import type { Robot } from "@/app/lib/robots";
import { Badge, BarChart, DataTable, DonutChart, StatCard, cn, type Column } from "../ui";
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
export function MachineOverview({ onSelect, power, robots, passCount, failCount, sectionCounts, hourly, className }: { /** PASS / FAIL logs per clock hour (oldest first); drawn as the "Output / hr" bars when given. */ hourly?: { labels: string[]; pass: number[]; fail: number[] }; /** PASS / FAIL per section id; listed under the section bars when given. */ sectionCounts?: Record<string, { pass: number; fail: number }>; onSelect: (machineId: string) => void; /** PASS / FAIL totals of the status log; the two cards are shown under the ring chart when both are given. */ passCount?: number; failCount?: number; power: Record<string, boolean | undefined>; /** Robot records keyed by machine id. */ robots: Map<string, Robot>; className?: string }) {
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

      {passCount !== undefined && failCount !== undefined && (
        <div className="flex items-center gap-3">
          {/* Performance = PASS share of all inspections: pass / (pass + fail). Gray ring while there are none. */}
          <DonutChart
            size={104}
            thickness={0.22}
            segments={passCount + failCount > 0 ? [{ label: "Pass", value: passCount, color: "var(--success)" }, { label: "Fail", value: failCount, color: "var(--danger)" }] : [{ label: "No inspections", value: 1, color: "var(--muted)" }]}
          >
            <b className="text-lg">{passCount + failCount > 0 ? `${Math.round((passCount / (passCount + failCount)) * 100)}%` : "—"}</b>
          </DonutChart>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <StatCard label="Pass" value={passCount} tone="success" />
            <StatCard label="Fail" value={failCount} tone="danger" />
          </div>
        </div>
      )}

      {hourly && (
        <div>
          <h3 className="hud-title mb-1 text-[11px] font-semibold text-muted">Output / hr</h3>
          <BarChart
            vertical
            height={96}
            labels={hourly.labels}
            series={[
              { label: "Pass", data: hourly.pass, color: "var(--success)" },
              { label: "Fail", data: hourly.fail, color: "var(--danger)" },
            ]}
          />
        </div>
      )}

      {sectionCounts && (
        <ul aria-label="PASS / FAIL per section" className="space-y-1 text-xs">
          {sections.map((s) => (
            <li key={s.id} className="flex items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
              <span className="min-w-0 flex-1 truncate" title={s.label}>{s.label}</span>
              <span className="w-16 text-right font-semibold text-success-light">PASS {sectionCounts[s.id]?.pass ?? 0}</span>
              <span className="w-14 text-right font-semibold text-danger">FAIL {sectionCounts[s.id]?.fail ?? 0}</span>
            </li>
          ))}
        </ul>
      )}

      <DataTable columns={COLUMNS} data={rows} rowKey={(r) => r.id} pageSize={7} compact caption="Machine ON / OFF status" onRowClick={(r) => onSelect(r.id)} className="shrink-0 text-xs" />
    </aside>
  );
}
