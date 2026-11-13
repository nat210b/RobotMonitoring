"use client";

import { useState, type FormEvent } from "react";
import { Input, Select, Textarea } from "../ui";
import {
  DEFAULT_ROBOT_STATUS,
  ROBOT_LIMITS,
  ROBOT_STATUSES,
  validateRobotInput,
  type Robot,
  type RobotInput,
  type RobotInputErrors,
} from "@/app/lib/robots";

const STATUS_OPTIONS = ROBOT_STATUSES.map((s) => ({ value: s, label: s }));

export interface RobotFormProps {
  /** Lets buttons outside the form (e.g. in the side bar footer) submit it via `form={id}`. */
  id: string;
  machineId: string;
  /** Existing record for this machine, if any. */
  robot?: Robot;
  onSaved: (robot: Robot) => void;
  onSavingChange?: (saving: boolean) => void;
}

/** Edits the robot record of one machine and saves it with PUT /api/v1/robots/:machineId. */
export function RobotForm({ id, machineId, robot, onSaved, onSavingChange }: RobotFormProps) {
  const [values, setValues] = useState<RobotInput>({
    robotID: robot?.robotID ?? "",
    robotName: robot?.robotName ?? "",
    robotStatus: robot?.robotStatus ?? DEFAULT_ROBOT_STATUS,
    desc: robot?.desc ?? "",
  });
  const [errors, setErrors] = useState<RobotInputErrors>({});
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const set = <K extends keyof RobotInput>(key: K, value: RobotInput[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
    setMessage(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const checked = validateRobotInput(values);
    if (!checked.ok) {
      setErrors(checked.errors);
      return;
    }
    onSavingChange?.(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/v1/robots/${encodeURIComponent(machineId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checked.value),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrors(data.fields ?? {});
        setMessage({ tone: "error", text: data.error ?? `Save failed (${res.status}).` });
        return;
      }
      setValues(checked.value);
      setMessage({ tone: "ok", text: "Saved to database." });
      onSaved(data.robot);
    } catch {
      setMessage({ tone: "error", text: "Could not reach the server. Check your connection and try again." });
    } finally {
      onSavingChange?.(false);
    }
  };

  return (
    <form id={id} onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Input
        label="Robot ID"
        required
        value={values.robotID}
        maxLength={ROBOT_LIMITS.robotID}
        onChange={(e) => set("robotID", e.target.value)}
        error={errors.robotID}
        placeholder="e.g. RB-001"
        autoComplete="off"
      />
      <Input
        label="Robot name"
        value={values.robotName}
        maxLength={ROBOT_LIMITS.robotName}
        onChange={(e) => set("robotName", e.target.value)}
        error={errors.robotName}
        placeholder="e.g. SCARA left"
        autoComplete="off"
      />
      <Select
        label="Robot status"
        options={STATUS_OPTIONS}
        value={values.robotStatus}
        onChange={(e) => set("robotStatus", e.target.value as RobotInput["robotStatus"])}
        error={errors.robotStatus}
      />
      <Textarea
        label="Description"
        value={values.desc}
        maxLength={ROBOT_LIMITS.desc}
        onChange={(e) => set("desc", e.target.value)}
        error={errors.desc}
        hint={`${values.desc.length}/${ROBOT_LIMITS.desc}`}
        placeholder="Notes, faults, maintenance details…"
      />
      {message && (
        <p role={message.tone === "error" ? "alert" : "status"} className={message.tone === "error" ? "text-sm text-danger" : "text-sm text-brand"}>
          {message.text}
        </p>
      )}
      {robot?.updatedAt && (
        <p className="text-xs text-muted">
          Updated:{new Date(robot.updatedAt).toLocaleString()}
        </p>
      )}
    </form>
  );
}
