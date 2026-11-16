"use client";

import Link from "next/link";
import { useId, useState, type FormEvent } from "react";
import { Button, DatePicker, Input, Modal, Toggle } from "../ui";
import type { RobotStatusLogEntry } from "@/app/lib/robotStatus";
import { readPresentationLogs, readPresentationMix, readPresentationRuns, writePresentationLogs, writePresentationMix, writePresentationRuns } from "@/app/lib/presentationLogs";

const MAX_COUNT = 2000;
const MIN_DELAY_S = 10;

/** Date as the value of a datetime-local input (local time, to the second). */
const toLocalInput = (d: Date) => {
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};
const formatDuration = (ms: number) => {
  const s = Math.round(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return [h && `${h} h`, m && `${m} min`, sec && `${sec} s`].filter(Boolean).join(" ") || "0 s";
};
const FAIL_DETAILS = ["Sensor alignment out of range", "Pick arm timeout", "Vacuum pressure low", "Gear cluster jam", "Photo tray position error"];

const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

export interface StatusLogFormProps {
  onClose: () => void;
  /**
   * Every machine in the room, in floor-plan order. `id` is its robot's robotID, or the machine id when
   * it has no robot record (`showOnly`: a stand-in that exists on /show only). Powered-on robots start
   * on; only robots that are on get logs.
   */
  robots: { machineId: string; id: string; name: string; on: boolean; showOnly: boolean }[];
}

/**
 * Generates mock inspection results for the /show presentation page: one log every `delay` seconds from
 * the start time to the end time, the chosen share of them PASS (the rest FAIL), each given to a randomly
 * picked ticked robot. /show only shows a log once its time has come, so logs timed in the future appear
 * one by one during the presentation. They are kept in this browser only (see presentationLogs) and never
 * sent to the database.
 */
export function StatusLogForm({ robots, onClose }: StatusLogFormProps) {
  const formId = useId();
  const [start, setStart] = useState(() => toLocalInput(new Date()));
  const [delay, setDelay] = useState("30");
  const [end, setEnd] = useState(() => toLocalInput(new Date(Date.now() + 25 * 60_000)));
  // Logs that arrive together at each step: a random number between these two (the max starts at the robot count)
  const [minPer, setMinPer] = useState("1");
  const [maxPer, setMaxPer] = useState(() => String(robots.length));
  const [passPercent, setPassPercent] = useState("98");
  const [replace, setReplace] = useState(true);
  // Saved the moment it changes: it applies to the whole /show log, not to one run
  const [mix, setMix] = useState(readPresentationMix);
  const changeMix = (on: boolean) => {
    setMix(on);
    writePresentationMix(on);
  };
  // Ticks the user changed; untouched robots follow their power state.
  const [ticked, setTicked] = useState<Record<string, boolean>>({});
  const chosenIds = robots.filter((r) => ticked[r.machineId] ?? r.on).map((r) => r.id);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  const delayMs = Number(delay) * 1000;
  const startOk = Number.isFinite(startMs);
  const endOk = Number.isFinite(endMs) && (!startOk || endMs >= startMs);
  const delayOk = Number.isFinite(delayMs) && delayMs >= MIN_DELAY_S * 1000;
  // One step every `delay` seconds from start to end; each step brings in minPer..maxPer logs at random
  const steps = startOk && endOk && delayOk ? Math.floor((endMs - startMs) / delayMs) + 1 : 0;
  const lo = Number(minPer);
  const hi = Number(maxPer);
  const perOk = Number.isInteger(lo) && Number.isInteger(hi) && lo >= 1 && lo <= hi;
  // A step can't hold more logs than there are robots switched on (each robot at most once per step)
  const effLo = Math.min(lo, chosenIds.length);
  const effHi = Math.min(hi, chosenIds.length);
  const minTotal = steps * effLo;
  const maxTotal = steps * effHi;
  const countOk = steps >= 1 && perOk && minTotal <= MAX_COUNT;
  const pct = Number(passPercent);
  const pctOk = Number.isFinite(pct) && pct >= 0 && pct <= 100;
  // Round the fails up, so any pass rate under 100% gives at least one FAIL for the show
  const passesFor = (total: number) => total - Math.ceil((total * (100 - pct)) / 100 - 1e-9);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!chosenIds.length) return setMessage({ tone: "error", text: "Switch on at least one robot." });
    if (!countOk || !pctOk) return setMessage({ tone: "error", text: `Check the times (delay at least ${MIN_DELAY_S} s), the logs per step (min ≤ max) and a pass rate of 0–100%.` });

    // Each step: a random number of logs, each for a different robot, spread evenly across the step
    const picks: { robot_id: string; at: number }[] = [];
    for (let step = 0; step < steps; step++) {
      const k = effLo + Math.floor(Math.random() * (effHi - effLo + 1));
      const robotsNow = [...chosenIds].sort(() => Math.random() - 0.5).slice(0, k);
      robotsNow.forEach((robot_id, j) => picks.push({ robot_id, at: Math.min(startMs + step * delayMs + (j * delayMs) / k, endMs) }));
    }
    if (picks.length > MAX_COUNT) return setMessage({ tone: "error", text: `That would make ${picks.length} logs (max ${MAX_COUNT}). Lower the maximum per step or shorten the time range.` });

    // Exactly `passes` PASS results, shuffled so the fails land at random places.
    const passes = passesFor(picks.length);
    const statuses = Array.from({ length: picks.length }, (_, i): RobotStatusLogEntry["status"] => (i < passes ? "PASS" : "FAIL")).sort(() => Math.random() - 0.5);
    const generated: RobotStatusLogEntry[] = picks.map((pick_, i) => ({
      id: crypto.randomUUID(),
      robot_id: pick_.robot_id,
      status: statuses[i],
      failDetail: statuses[i] === "FAIL" ? pick(FAIL_DETAILS) : "",
      datetime: new Date(pick_.at).toISOString(),
    }));
    const next = [...generated, ...(replace ? [] : (readPresentationLogs() ?? []))].sort((a, b) => b.datetime.localeCompare(a.datetime));
    writePresentationLogs(next);
    // Every robot switched on turns ON at the start time (not only the ones that happened to get a log)
    writePresentationRuns([...(replace ? [] : readPresentationRuns()), { start: startMs, robotIds: chosenIds }]);
    const startsLater = startMs > Date.now();
    setMessage({
      tone: "ok",
      text: `${generated.length} logs added (${next.length} in total). ${startsLater ? `They start appearing on the show page at ${new Date(startMs).toLocaleTimeString()}.` : "The first ones are already on the show page."}`,
    });
  };

  // Clear asks first, in an app modal (not the browser's confirm box)
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearTotal, setClearTotal] = useState(0);
  const clear = () => {
    const total = readPresentationLogs()?.length ?? 0;
    if (!total) return setMessage({ tone: "ok", text: "The presentation log is already empty." });
    setClearTotal(total);
    setConfirmClear(true);
  };
  const doClear = () => {
    writePresentationLogs([]);
    writePresentationRuns([]);
    setConfirmClear(false);
    setMessage({ tone: "ok", text: `Cleared ${clearTotal} presentation logs.` });
  };

  return (
    <>
    <Modal
      open
      onClose={onClose}
      width="w-[68rem]"
      height="h-[80dvh]"
      title="Generate presentation logs"
      description="Mock results for the /show page only. Nothing is saved to the database."
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm text-muted">
            {countOk && pctOk
              ? `${steps} steps over ${formatDuration((steps - 1) * delayMs)}, ${effLo === effHi ? effLo : `${effLo}–${effHi}`} logs each: ${minTotal === maxTotal ? minTotal : `${minTotal}–${maxTotal}`} in total, about ${pct}% PASS, on ${chosenIds.length} robot${chosenIds.length === 1 ? "" : "s"}`
              : minTotal > MAX_COUNT
                ? `At least ${minTotal} logs is too many (max ${MAX_COUNT}): use a longer delay, a shorter time range or a lower minimum.`
                : "Set a start time, delay, end time, logs per step and pass rate."}
          </p>
          {message && (
            <p role={message.tone === "error" ? "alert" : "status"} className={message.tone === "error" ? "text-sm text-danger" : "text-sm text-brand"}>
              {message.text}{" "}
              {message.tone === "ok" && <Link href="/show" className="underline">Open presentation</Link>}
            </p>
          )}
          </div>
        <div className="flex shrink-0 gap-2">
          <Button type="submit" form={formId} disabled={!chosenIds.length}>Generate logs</Button>
          <Button type="button" variant="secondary" onClick={clear}>Clear logs</Button>
        </div>
        </div>
      }
    >
    <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-4">
      {/* The four settings sit side by side on a wide modal, so it stays short */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DatePicker autoFocus withTime step={1} label="Start time" value={start} onChange={(e) => setStart(e.target.value)} error={!startOk ? "Pick a start time" : undefined} />
        <Input label="Delay (seconds)" type="number" min={MIN_DELAY_S} step={1} value={delay} onChange={(e) => setDelay(e.target.value)} error={!delayOk ? `At least ${MIN_DELAY_S} seconds` : undefined} />
        <DatePicker withTime step={1} label="End time" value={end} onChange={(e) => setEnd(e.target.value)} error={!endOk ? "Must be after the start time" : undefined} />
        <Input label="Pass rate (%)" type="number" min={0} max={100} value={passPercent} onChange={(e) => setPassPercent(e.target.value)} error={passPercent && !pctOk ? "0–100" : undefined} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Input label="Min logs per step" type="number" min={1} step={1} value={minPer} onChange={(e) => setMinPer(e.target.value)} error={!perOk ? "1 or more, at most the max" : undefined} />
        <Input label="Max logs per step" type="number" min={1} step={1} value={maxPer} onChange={(e) => setMaxPer(e.target.value)} hint={`${robots.length} robots in the room`} />
      </div>
      <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
        <legend className="sr-only">Robots</legend>
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="text-sm font-medium">Robots <span className="font-normal text-muted">({chosenIds.length}/{robots.length} on)</span></span>
          <span className="flex gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={() => setTicked(Object.fromEntries(robots.map((r) => [r.machineId, true])))}>All ON</Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => setTicked(Object.fromEntries(robots.map((r) => [r.machineId, false])))}>All OFF</Button>
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
          {robots.map((r) => (
            <Toggle
              key={r.machineId}
              label={r.name || r.machineId}
              size="sm"
              title={r.showOnly ? `${r.machineId}: no robot record, for show only` : `Robot ${r.id} on ${r.machineId}${r.on ? "" : " (power off)"}`}
              checked={ticked[r.machineId] ?? r.on}
              onChange={(on) => setTicked((t) => ({ ...t, [r.machineId]: on }))}
            />
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Toggle label="Mix with real logs" hint="On: /show lists the live database logs together with the mock ones" checked={mix} onChange={changeMix} />
        <Toggle label="Replace current logs" hint="Off: add to the mock logs already on /show" checked={replace} onChange={setReplace} />
      </div>
    </form>
    </Modal>
    <Modal
      open={confirmClear}
      onClose={() => setConfirmClear(false)}
      title="Clear presentation logs?"
      description="The live log is not affected."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmClear(false)}>Keep logs</Button>
          <Button variant="danger" onClick={doClear}>Delete {clearTotal} logs</Button>
        </div>
      }
    >
      <p className="text-sm">All {clearTotal} mock logs, and the robots they switched on, are removed from the show page.</p>
    </Modal>
    </>
  );
}
