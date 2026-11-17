"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { MachineVideo } from "@/app/lib/machineVideos";
import type { Robot } from "@/app/lib/robots";
import type { LampColor } from "../machine/parts";
import type { RobotStatusLogEntry } from "@/app/lib/robotStatus";
import { Badge, Button, Selector, StatusIcon, cn, usePresence } from "../ui";
import { ROOM_LAYOUT, ROOM_SECTIONS } from "./floorPlan";
import { RobotStatusBadge } from "../robot/RobotStatusBadge";
import { GearIcon, SettingsPanel } from "../settings/SettingsPanel";
import { useSettings } from "../settings/useSettings";
import { markAppReady } from "../signature/CpaiSplash";
import { MachineOverview } from "./MachineOverview";
import { RobotStatusLog } from "../robot/RobotStatusLog";
import { RobotSidebar } from "../robot/RobotSidebar";
import { StatusLogForm } from "../robot/StatusLogForm";
import { PRESENTATION_LOGS_KEY, PRESENTATION_MIX_KEY, PRESENTATION_RUNS_KEY, readPresentationLogs, readPresentationMix, readPresentationRuns, writePresentationLogs, type PresentationRun } from "@/app/lib/presentationLogs";
import Room from "./room";

/** Every robot record, keyed by the machine it belongs to. */
async function fetchRobots(): Promise<Map<string, Robot>> {
  const res = await fetch("/api/v1/robots", { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status}).`);
  return new Map((data.robots as Robot[]).map((r) => [r.machineID, r]));
}

const errorText = (err: unknown) => (err instanceof Error ? err.message : "Could not load robots.");

/** Room page body: clickable 3D room filling the area, with the robot side bar floating over its left edge. */
export default function RoomWorkspace({ presentation = false }: { presentation?: boolean }) {
  const [liveRobots, setRobots] = useState<Map<string, Robot>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [settings, updateSettings] = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Settings slides in from the right like a drawer and slides back out before it unmounts (320 ms = --duration-slow)
  const settingsDrawer = usePresence(settingsOpen, 320);
  const [view, setView] = useState<"iso" | "top" | "free">("iso");
  // Section the camera is zoomed in on (click a section's floor or name); Escape or "Show all" zooms back out.
  const [focusZoneId, setFocusZoneId] = useState<string | null>(null);
  const focusZone = ROOM_SECTIONS.find((s) => s.id === focusZoneId);
  useEffect(() => {
    if (!focusZoneId) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFocusZoneId(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusZoneId]);
  /** Bumped by Retry to load again. */
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true; // ignore a response that arrives after unmount or a newer attempt
    fetchRobots()
      .then((map) => {
        if (!active) return;
        setRobots(map);
        setError(null);
      })
      .catch((err) => active && setError(errorText(err)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [attempt]);

  // Keep the lamps current: the server switches idle robots off, so reload quietly every 10 seconds.
  useEffect(() => {
    const timer = setInterval(() => {
      fetchRobots().then(setRobots).catch(() => {});
    }, 10_000);
    return () => clearInterval(timer);
  }, []);

  // The opening splash waits for the first robots response (it also lets go if the request failed).
  useEffect(() => {
    if (!loading) markAppReady();
  }, [loading]);

  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    setAttempt((n) => n + 1);
  }, []);

  const onSaved = useCallback((robot: Robot) => {
    setRobots((prev) => new Map(prev).set(robot.machineID, robot));
  }, []);

  // Inspection results for the status log, refreshed every 30 s. A failed load keeps the last list.
  const [logs, setLogs] = useState<RobotStatusLogEntry[]>([]);
  const [presentationLogs, setPresentationLogs] = useState<RobotStatusLogEntry[]>([]);
  const [presentationReady, setPresentationReady] = useState(false);
  const [logFormOpen, setLogFormOpen] = useState(false);
  // A generated log is shown only once its time has come, so logs timed in the future appear one by one
  // during the presentation (the status log animates each new one in). Checked every second.
  // Starts at 0 (nothing due) and is set from the clock after mount, since reading the time while rendering
  // would freeze it into the prerendered page.
  const [now, setNow] = useState(0);
  const [presentationRuns, setPresentationRuns] = useState<PresentationRun[]>([]);
  // Wake up only when something becomes due (a log's time or a run's start), instead of ticking every second,
  // so the room and the lists are not re-rendered for nothing. The first wake-up (now = 0) sets the clock.
  useEffect(() => {
    if (!presentation) return;
    let delay = 0;
    if (now > 0) {
      const upcoming = [...presentationLogs.map((log) => Date.parse(log.datetime)), ...presentationRuns.map((run) => run.start)].filter((t) => t > now);
      if (!upcoming.length) return;
      delay = Math.min(Math.max(Math.min(...upcoming) - Date.now(), 0) + 20, 2 ** 31 - 1);
    }
    const timer = setTimeout(() => setNow(Date.now()), delay);
    return () => clearTimeout(timer);
  }, [presentation, now, presentationLogs, presentationRuns]);
  const [mixReal, setMixReal] = useState(true);
  // On /show, every robot switched on in a "Generate logs" run turns ON at that run's start time, and a machine
  // with no robot record gets a stand-in robot (robotID = the machine id, e.g. "PHT-01") so it can be switched
  // on and appear in the logs too. Display only: nothing is saved to the database.
  // Robot ids of the runs that have started; a string so the robots below are rebuilt only when it changes,
  // not on every tick of the clock.
  const startedKey = useMemo(
    () => [...new Set(presentationRuns.filter((run) => run.start <= now).flatMap((run) => run.robotIds))].sort().join("|"),
    [presentationRuns, now],
  );
  // Status each robot would have if the presentation logs that are already due were real (same rules as the
  // live log): the latest result PASS -> PASS, FAIL -> FAIL, five FAILs in a row -> MAINTAIN. Display only.
  // A string ("RB-001=FAIL|RB-002=PASS") so nothing downstream is rebuilt unless a status actually changes.
  const mockStatusKey = useMemo(() => {
    const byRobot = new Map<string, string[]>();
    [...presentationLogs]
      .filter((log) => Date.parse(log.datetime) <= now)
      .sort((a, b) => b.datetime.localeCompare(a.datetime))
      .forEach((log) => {
        const list = byRobot.get(log.robot_id) ?? [];
        if (list.length < 5) byRobot.set(log.robot_id, [...list, log.status]);
      });
    return [...byRobot]
      .map(([id, list]) => `${id}=${list.length === 5 && list.every((x) => x === "FAIL") ? "MAINTAIN" : list[0]}`)
      .sort()
      .join("|");
  }, [presentationLogs, now]);
  const robots = useMemo(() => {
    if (!presentation) return liveRobots;
    const started = new Set(startedKey ? startedKey.split("|") : []);
    const mockStatus = new Map(mockStatusKey ? mockStatusKey.split("|").map((pair) => pair.split("=") as [string, Robot["robotStatus"]]) : []);
    const show = (r: Robot): Robot => ({ ...r, robotPower: started.has(r.robotID) ? true : r.robotPower, robotStatus: mockStatus.get(r.robotID) ?? r.robotStatus });
    const next = new Map([...liveRobots].map(([id, r]): [string, Robot] => [id, show(r)]));
    for (const m of ROOM_LAYOUT) {
      if (next.has(m.id)) continue;
      next.set(m.id, { runningNo: 0, robotID: m.id, robotName: "", robotStatus: mockStatus.get(m.id) ?? "PASS", desc: "", viedoURL: "", machineID: m.id, robotPower: started.has(m.id) });
    }
    return next;
  }, [presentation, liveRobots, startedKey, mockStatusKey]);
  useEffect(() => {
    let active = true;
    const load = () =>
      fetch("/api/v1/robot-status", { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { logs?: RobotStatusLogEntry[] } | null) => active && data?.logs && setLogs(data.logs))
        .catch(() => { });
    load();
    const timer = setInterval(load, 30_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!presentation || loading || liveRobots.size === 0 || presentationReady) return;
    /* eslint-disable react-hooks/set-state-in-effect -- one-time load of the saved mock log */
    setPresentationRuns(readPresentationRuns());
    setMixReal(readPresentationMix());
    const saved = readPresentationLogs();
    if (saved) {
      setPresentationLogs(saved);
    } else {
      const robotIds = [...liveRobots.values()].map((robot) => robot.robotID);
      setPresentationLogs(Array.from({ length: 50 }, (_, i) => ({
        id: `mock-${i}`,
        robot_id: robotIds[i % robotIds.length],
        status: i === 0 ? "FAIL" as const : "PASS" as const,
        failDetail: i === 0 ? "Mock sensor alignment warning" : "",
        datetime: new Date(Date.now() - i * 60 * 60_000).toISOString(),
      })));
    }
    setPresentationReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [presentation, loading, liveRobots, presentationReady]);
  useEffect(() => {
    if (presentation && presentationReady) writePresentationLogs(presentationLogs);
  }, [presentation, presentationReady, presentationLogs]);
  // Newest first, so the logs already due are always the tail of the list.
  const sortedPresentationLogs = useMemo(() => [...presentationLogs].sort((a, b) => b.datetime.localeCompare(a.datetime)), [presentationLogs]);
  const dueCount = useMemo(() => sortedPresentationLogs.filter((log) => Date.parse(log.datetime) <= now).length, [sortedPresentationLogs, now]);
  // Rebuilt only when another log falls due, not on every tick, so the status log doesn't re-render each second.
  const visiblePresentationLogs = useMemo(
    () => (dueCount === sortedPresentationLogs.length ? sortedPresentationLogs : sortedPresentationLogs.slice(sortedPresentationLogs.length - dueCount)),
    [sortedPresentationLogs, dueCount],
  );
  // The mock logs that are due, mixed with the real ones (newest first) unless the modal switched mixing off.
  const shownLogs = useMemo(
    () => (mixReal ? [...visiblePresentationLogs, ...logs].sort((a, b) => b.datetime.localeCompare(a.datetime)) : visiblePresentationLogs),
    [mixReal, visiblePresentationLogs, logs],
  );
  // Logs generated on the main route in another tab show up here straight away.
  useEffect(() => {
    if (!presentation) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === PRESENTATION_LOGS_KEY) setPresentationLogs(readPresentationLogs() ?? []);
      if (e.key === PRESENTATION_RUNS_KEY) setPresentationRuns(readPresentationRuns());
      if (e.key === PRESENTATION_MIX_KEY) setMixReal(readPresentationMix());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [presentation]);

  // Uploaded videos, one per machine type. A failed load just means no videos are shown.
  const [videos, setVideos] = useState<Map<string, MachineVideo>>(new Map());
  useEffect(() => {
    let active = true;
    fetch("/api/v1/machine-videos", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { videos: [] }))
      .then((data: { videos?: MachineVideo[] }) => active && setVideos(new Map((data.videos ?? []).map((v) => [v.type, v]))))
      .catch(() => { });
    return () => {
      active = false;
    };
  }, []);
  // Stack-light colour of each machine: green when its robot is powered on, red when off.
  const power = useMemo(() => Object.fromEntries([...robots].map(([id, r]) => [id, r.robotPower])), [robots]);
  // Stack-light lamp per machine: red when off, yellow when it needs maintenance, otherwise green.
  const lamps = useMemo(
    () => Object.fromEntries([...robots].map(([id, r]): [string, LampColor] => [id, r.robotPower !== true ? "red" : r.robotStatus === "MAINTAIN" ? "amber" : "green"])),
    [robots],
  );
  // Sections with a machine that is off or failing (none until the robots have loaded).
  const problemSections = useMemo(() => {
    if (loading || error) return [];
    return ROOM_SECTIONS.filter((s) => s.machineIds.some((id) => robots.get(id)?.robotPower !== true || robots.get(id)?.robotStatus === "FAIL")).map((s) => s.id);
  }, [robots, loading, error]);

  // Floating labels. A machine that is off gets a red power icon; a section with a machine that is off
  // or failing gets a yellow warning icon. Each machine also shows its status, and each section its name,
  // when those settings are on. Nothing is flagged until the robots have loaded.
  const badges = useMemo(() => {
    const loaded = !loading && !error;
    const out: Record<string, React.ReactNode> = {};
    const stack = (key: string, items: React.ReactNode[], row = false) => {
      if (items.length) out[key] = <div key={key} className={row ? "flex items-center gap-1.5" : "flex flex-col items-center gap-1"}>{items}</div>;
    };
    for (const m of ROOM_LAYOUT) {
      const robot = robots.get(m.id);
      const items: React.ReactNode[] = [];
      if (settings.showMachineStatus && robot?.robotStatus) items.push(<RobotStatusBadge key="status" status={robot.robotStatus} solid />);
      if (loaded && settings.showPowerIcons && robot?.robotPower !== true) items.unshift(<StatusIcon key="off" kind="power-off" title={`${m.id}: power off`} />);
      stack(m.id, items, true); // the power icon sits before the status badge
    }
    for (const s of ROOM_SECTIONS) {
      const items: React.ReactNode[] = [];
      const problem = problemSections.includes(s.id);
      if (settings.showSectionNames) {
        // A section with a problem wears the warning yellow instead of its own colour.
        items.push(
          <Badge key="name" solid square color={problem ? "#ffc21a" : s.color} ink={problem ? "#000" : s.ink} className="whitespace-nowrap">
            {s.label}
          </Badge>,
        );
      }
      if (problem && settings.showSectionNames) items.unshift(<StatusIcon key="warn" kind="warning" className="size-6" title={`${s.label}: needs attention`} />);
      stack(s.id, items, true); // the warning sits before the section name and follows its toggle
    }
    return out;
  }, [robots, loading, error, problemSections, settings.showPowerIcons, settings.showMachineStatus, settings.showSectionNames]);

  const selectedType = selectedId ? ROOM_LAYOUT.find((m) => m.id === selectedId)?.type : undefined;
  const onVideoChange = useCallback(
    (video: MachineVideo | null) => {
      if (!selectedType) return;
      setVideos((prev) => {
        const next = new Map(prev);
        if (video) next.set(selectedType, video);
        else next.delete(selectedType);
        return next;
      });
    },
    [selectedType],
  );



  // PASS / FAIL totals of the logs on screen (the mock + real mix on /show, the live log on the main route)
  const listedLogs = presentation ? shownLogs : logs;
  const passCount = useMemo(() => listedLogs.filter((log) => log.status === "PASS").length, [listedLogs]);
  const failCount = useMemo(() => listedLogs.filter((log) => log.status === "FAIL").length, [listedLogs]);

  return (
    <div className="relative min-h-[320px] flex-1 overflow-hidden">
      {/* overflow-hidden: the Settings drawer slides out past the right edge; clip it instead of scrolling the page */}
      {/* The 3D room always fills the whole area, so opening the side bar never resizes or moves it. */}
      <Room fill className="absolute inset-0" onSelect={setSelectedId} selectedId={selectedId} badges={badges} showZones={settings.showHighlight} view={view} lamps={lamps} zoneAlerts={problemSections} focusZoneId={focusZoneId} onZoneSelect={setFocusZoneId} />
      {/* Overview (chart + ON / OFF table) down the left edge; the robot side bar takes its place while a machine is selected. */}
      {!selectedId && <MachineOverview className="absolute top-3 bottom-3 left-3 z-10 hidden w-[27rem] max-w-[calc(100%-1.5rem)] md:flex" onSelect={setSelectedId} power={power} robots={robots} passCount={passCount} failCount={failCount} />}
      {/* Status log down the right edge (md up), under the top-right row; the settings drawer covers it. */}
      <div className="pointer-events-none absolute top-14 right-3 bottom-3 z-10 hidden w-[37rem] max-w-[calc(100%-1.5rem)] flex-col items-end md:flex">
        <RobotStatusLog logs={listedLogs} className="min-h-0 w-full flex-1" robots={robots} selectedId={selectedId} onSelect={setSelectedId} />
      </div>
      {/* Top-right row: camera view (iso / top-down with rotation locked, or free orbit) beside the Settings button. */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
        {focusZone && (
          <Button variant="secondary" size="sm" className="shadow-md" onClick={() => setFocusZoneId(null)} aria-label={`Zoom out from ${focusZone.label}`}>
            Show all
          </Button>
        )}
        <Selector
          ariaLabel="Camera view"
          value={view}
          onChange={setView}
          options={[
            { value: "iso", label: "ISO" },
            { value: "top", label: "TOP" },
            { value: "free", label: "Free" },
          ]}
        />
        {!presentation && (
          <Button variant="secondary" size="sm" className="shadow-md" aria-haspopup="dialog" onClick={() => setLogFormOpen(true)}>
            Generate logs
          </Button>
        )}
        {/* Toggles the drawer; marked so a press on it isn't taken as a click outside the open drawer */}
        <Button variant="secondary" size="sm" className="shadow-md" data-dismiss-ignore onClick={() => setSettingsOpen((open) => !open)} aria-label={settingsOpen ? "Close settings" : "Open settings"} aria-expanded={settingsOpen}>
          <GearIcon />
        </Button>
      </div>
      {/* Mounted only while open, so the form starts fresh each time */}
      {!presentation && logFormOpen && (
        <StatusLogForm
          onClose={() => setLogFormOpen(false)}
          robots={ROOM_LAYOUT.map((m) => {
            const r = robots.get(m.id);
            return { machineId: m.id, id: r?.robotID ?? m.id, name: r?.robotName ?? "", on: r?.robotPower === true, showOnly: !r };
          })}
        />
      )}
      {settingsDrawer.mounted && (
        <SettingsPanel
          className={cn(
            "absolute inset-y-0 right-0 z-20 max-w-full shadow-lg transition-[translate,opacity] duration-(--duration-slow) ease-ui motion-reduce:transition-none",
            settingsDrawer.visible ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-full opacity-0",
          )}
          settings={settings}
          onChange={updateSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}
      {/* Side bar floats over the room while a machine is selected: across the top on small
          screens, down the left edge from md up. A tall form scrolls inside it. */}
      {selectedId && (
        <RobotSidebar
          readOnly={presentation}
          className="absolute inset-x-0 top-0 z-10 max-h-[60%] shadow-lg md:inset-x-auto md:bottom-0 md:left-0 md:max-h-none"
          machineId={selectedId}
          robot={robots.get(selectedId)}
          loading={loading}
          error={error}
          onRetry={retry}
          onClose={() => setSelectedId(null)}
          onSaved={onSaved}
          video={selectedType ? videos.get(selectedType) : undefined}
          onVideoChange={onVideoChange}
        />
      )}
    </div>
  );
}
