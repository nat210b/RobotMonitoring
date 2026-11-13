import { Badge, type BadgeTone } from "../ui";
import type { RobotStatus } from "@/app/lib/robots";

const TONES: Record<RobotStatus, BadgeTone> = {
  PASS: "brand",
  FAIL: "danger",
  MAINTAIN: "warning",
};

/** Robot status as a coloured pill; "Not set" when the machine has no robot record yet. */
export function RobotStatusBadge({ status, solid = false }: { status?: RobotStatus; solid?: boolean }) {
  return status ? <Badge tone={TONES[status]} solid={solid}>{status}</Badge> : <Badge tone="neutral" solid={solid}>Not set</Badge>;
}
