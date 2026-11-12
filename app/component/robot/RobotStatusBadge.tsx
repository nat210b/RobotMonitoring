import { Badge, type BadgeTone } from "../ui";
import type { RobotStatus } from "@/app/lib/robots";

const TONES: Record<RobotStatus, BadgeTone> = {
  PASS: "brand",
  FAIL: "danger",
  MAINTAIN: "warning",
};

/** Robot status as a coloured pill; "Not set" when the machine has no robot record yet. */
export function RobotStatusBadge({ status }: { status?: RobotStatus }) {
  return status ? <Badge tone={TONES[status]}>{status}</Badge> : <Badge tone="neutral">Not set</Badge>;
}
