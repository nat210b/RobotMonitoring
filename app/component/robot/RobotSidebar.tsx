"use client";

import { useState } from "react";
import { Button, Sidebar } from "../ui";
import { ROOM_LAYOUT } from "../room/floorPlan";
import type { Robot } from "@/app/lib/robots";
import { RobotForm } from "./RobotForm";
import { RobotStatusBadge } from "./RobotStatusBadge";

const FORM_ID = "robot-form";

export interface RobotSidebarProps {
  /** The clicked machine (ROOM_LAYOUT id). */
  machineId: string;
  /** Its saved robot record, if it has one. */
  robot?: Robot;
  /** Robot records are still loading — the form waits so it opens with the saved values. */
  loading: boolean;
  error?: string | null;
  onRetry: () => void;
  onClose: () => void;
  onSaved: (robot: Robot) => void;
  className?: string;
}

/** Left side bar shown only while a machine is selected: the edit form of that machine's robot. */
export function RobotSidebar({ machineId, robot, loading, error, onRetry, onClose, onSaved, className }: RobotSidebarProps) {
  const [saving, setSaving] = useState(false);
  const machine = ROOM_LAYOUT.find((m) => m.id === machineId);
  const ready = !loading && !error;

  return (
    <Sidebar
      className={className}
      title={
        <span className="flex items-center gap-2">
          {machineId} <RobotStatusBadge status={robot?.robotStatus} />
        </span>
      }
      description={machine?.type}
      actions={
        <Button variant="ghost" size="sm" onClick={onClose} disabled={saving} aria-label="Close">
          ✕
        </Button>
      }
      footer={
        ready && (
          <div className="flex gap-2">
            <Button type="submit" form={FORM_ID} loading={saving} fullWidth>
              Save
            </Button>
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Close
            </Button>
          </div>
        )
      }
    >
      {error ? (
        <div role="alert" className="flex flex-col items-start gap-2 text-sm text-danger">
          <span>{error}</span>
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Retry
          </Button>
        </div>
      ) : loading ? (
        <p className="text-sm text-muted">Loading robot data…</p>
      ) : (
        // key: start a fresh form for each machine
        <RobotForm key={machineId} id={FORM_ID} machineId={machineId} robot={robot} onSaved={onSaved} onSavingChange={setSaving} />
      )}
    </Sidebar>
  );
}
