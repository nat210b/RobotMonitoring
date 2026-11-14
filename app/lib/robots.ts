/**
 * Shared shape of a document in the MongoDB `robots` collection, plus the input rules.
 * Used by both the API (server) and the side bar form (client), so keep it free of server-only code.
 */

export const ROBOT_STATUSES = ["PASS", "FAIL", "MAINTAIN"] as const;
export type RobotStatus = (typeof ROBOT_STATUSES)[number];
export const DEFAULT_ROBOT_STATUS: RobotStatus = "PASS";

export type Robot = {
  runningNo: number;
  robotID: string;
  robotName: string;
  robotStatus: RobotStatus;
  desc: string;
  viedoURL: string;
  /** Machine in the 3D room this robot record belongs to (ROOM_LAYOUT id, e.g. "PAD-01"). */
  machineID: string;
  /** Power state; switched to false automatically when updatedAt is over a minute old. */
  robotPower?: boolean;
  /** ISO timestamp of the last save. */
  updatedAt?: string;
};

/** The fields a user edits from the side bar. */
export type RobotInput = Pick<Robot, "robotID" | "robotName" | "robotStatus" | "desc">;

export const ROBOT_LIMITS = { robotID: 64, robotName: 128, desc: 1000 } as const;

export type RobotInputErrors = Partial<Record<keyof RobotInput, string>>;

/** Trims and checks user input. Returns the cleaned value, or the errors per field. */
export function validateRobotInput(raw: unknown): { ok: true; value: RobotInput } | { ok: false; errors: RobotInputErrors } {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const value: RobotInput = {
    robotID: str(src.robotID),
    robotName: str(src.robotName),
    robotStatus: (str(src.robotStatus) || DEFAULT_ROBOT_STATUS) as RobotStatus,
    desc: str(src.desc),
  };
  const errors: RobotInputErrors = {};
  if (!value.robotID) errors.robotID = "Robot ID is required.";
  else if (value.robotID.length > ROBOT_LIMITS.robotID) errors.robotID = `Use at most ${ROBOT_LIMITS.robotID} characters.`;
  if (value.robotName.length > ROBOT_LIMITS.robotName) errors.robotName = `Use at most ${ROBOT_LIMITS.robotName} characters.`;
  if (!ROBOT_STATUSES.includes(value.robotStatus)) errors.robotStatus = `Status must be ${ROBOT_STATUSES.join(", ")}.`;
  if (value.desc.length > ROBOT_LIMITS.desc) errors.desc = `Use at most ${ROBOT_LIMITS.desc} characters.`;
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value };
}
