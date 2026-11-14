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
export default function RoomWorkspace() {
  const [robots, setRobots] = useState<Map<string, Robot>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [settings, updateSettings] = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Settings slides in from the right like a drawer and slides back out before it unmounts (320 ms = --duration-slow)
  const settingsDrawer = usePresence(settingsOpen, 320);
  const [view, setView] = useState<"iso" | "top" | "free">("iso");
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


  return (
    <div className="relative min-h-[320px] flex-1 overflow-hidden">
      {/* overflow-hidden: the Settings drawer slides out past the right edge; clip it instead of scrolling the page */}
      {/* The 3D room always fills the whole area, so opening the side bar never resizes or moves it. */}
      <Room fill className="absolute inset-0" onSelect={setSelectedId} selectedId={selectedId} badges={badges} showZones={settings.showHighlight} view={view} lamps={lamps} zoneAlerts={problemSections} />
      {/* Overview (chart + ON / OFF table) down the left edge; the robot side bar takes its place while a machine is selected. */}
      {!selectedId && <MachineOverview className="absolute top-3 bottom-3 left-3 z-10 hidden w-[27rem] max-w-[calc(100%-1.5rem)] md:flex" onSelect={setSelectedId} power={power} robots={robots} />}
      {/* Status log down the right edge (md up), under the top-right row; the settings drawer covers it. */}
      <div className="pointer-events-none absolute top-14 right-3 bottom-3 z-10 hidden w-[37rem] max-w-[calc(100%-1.5rem)] flex-col items-end md:flex">
        <RobotStatusLog logs={logs} className="min-h-0 w-full flex-1" robots={robots} selectedId={selectedId} onSelect={setSelectedId} />
      </div>
      {/* Top-right row: camera view (iso / top-down with rotation locked, or free orbit) beside the Settings button. */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
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
        {/* Toggles the drawer; marked so a press on it isn't taken as a click outside the open drawer */}
        <Button variant="secondary" size="sm" className="shadow-md" data-dismiss-ignore onClick={() => setSettingsOpen((open) => !open)} aria-label={settingsOpen ? "Close settings" : "Open settings"} aria-expanded={settingsOpen}>
          <GearIcon />
        </Button>
      </div>
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
