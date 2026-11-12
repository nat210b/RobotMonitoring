"use client";

import { useCallback, useEffect, useState } from "react";
import type { Robot } from "@/app/lib/robots";
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

  return (
    <div className="relative min-h-[320px] flex-1">
      {/* The 3D room always fills the whole area, so opening the side bar never resizes or moves it. */}
      <Room fill className="absolute inset-0" onSelect={setSelectedId} selectedId={selectedId} />
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
        />
      )}
    </div>
  );
}
