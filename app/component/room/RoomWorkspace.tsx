"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { MachineVideo } from "@/app/lib/machineVideos";
import type { Robot } from "@/app/lib/robots";
import type { RobotStatusLogEntry } from "@/app/lib/robotStatus";
import { Badge, Button, Selector } from "../ui";
import { ROOM_LAYOUT, ROOM_SECTIONS } from "./floorPlan";
import { RobotStatusBadge } from "../robot/RobotStatusBadge";
import { GearIcon, SettingsPanel } from "../settings/SettingsPanel";
import { useSettings } from "../settings/useSettings";
import { MachineOverview } from "./MachineOverview";
import { RobotStatusLog } from "../robot/RobotStatusLog";
import { RobotSidebar } from "../robot/RobotSidebar";
import Room from "./room";

/** One badge per section, named and coloured as in the section map (module-level, so it never changes). */
const SECTION_BADGES = Object.fromEntries(
  ROOM_SECTIONS.map((s) => [
    s.id,
    <Badge key={s.id} solid square color={s.color} ink={s.ink} className="whitespace-nowrap">
      {s.label}
    </Badge>,
  ]),
);

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
        .catch(() => {});
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
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  // Over each section its name, or over each machine with a robot record its status (never both).
  const badges = useMemo(() => {
    if (settings.showMachineStatus) {
      return Object.fromEntries([...robots].filter(([, r]) => r.robotStatus).map(([id, r]) => [id, <RobotStatusBadge key={id} status={r.robotStatus} solid />]));
    }
    return settings.showSectionNames ? SECTION_BADGES : {};
  }, [robots, settings.showMachineStatus, settings.showSectionNames]);

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
    <div className="relative min-h-[320px] flex-1">
      {/* The 3D room always fills the whole area, so opening the side bar never resizes or moves it. */}
      <Room fill className="absolute inset-0" onSelect={setSelectedId} selectedId={selectedId} badges={badges} showZones={settings.showHighlight} view={view} />
      {/* Overview (chart + ON / OFF table) down the left edge; the robot side bar takes its place while a machine is selected. */}
      {!selectedId && <MachineOverview className="absolute top-3 bottom-3 left-3 z-10 hidden w-[27rem] max-w-[calc(100%-1.5rem)] md:flex" onSelect={setSelectedId} />}
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
        <Button variant="secondary" size="sm" className="shadow-md" onClick={() => setSettingsOpen(true)} aria-label="Open settings">
          <GearIcon />
        </Button>
      </div>
      {settingsOpen && (
        <SettingsPanel
          className="absolute inset-y-0 right-0 z-20 max-w-full shadow-lg"
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
