/**
 * Shared shape of a document in the MongoDB `robotStatus` collection (one inspection result per
 * document), plus the input rules. Mirrors the collection's $jsonSchema: robot_id, status,
 * failDetail and datetime are all required. Keep this file free of server-only code.
 */

export const INSPECTION_STATUSES = ["PASS", "FAIL"] as const;
export type InspectionStatus = (typeof INSPECTION_STATUSES)[number];

export type RobotStatusInput = {
  /** Must match the robotID of a record in the `robots` collection. */
  robot_id: string;
  status: InspectionStatus;
  /** Why it failed; empty for a PASS. */
  failDetail: string;
  datetime: Date;
};

export type RobotStatusLogEntry = {
  id: string;
  robot_id: string;
  status: RobotStatusInput["status"];
  failDetail: string;
  /** ISO timestamp the result was logged. */
  datetime: string;
};

export const ROBOT_STATUS_LIMITS = { robot_id: 64, failDetail: 1000 } as const;

export type RobotStatusInputErrors = Partial<Record<keyof RobotStatusInput, string>>;

/**
 * Trims and checks one incoming inspection result. `datetime` is optional (ISO string or epoch ms)
 * and defaults to now. Returns the cleaned value, or the errors per field.
 */
export function validateRobotStatusInput(
  raw: unknown,
): { ok: true; value: RobotStatusInput } | { ok: false; errors: RobotStatusInputErrors } {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");
  const errors: RobotStatusInputErrors = {};

  const robot_id = str(src.robot_id);
  if (!robot_id) errors.robot_id = "robot_id is required.";
  else if (robot_id.length > ROBOT_STATUS_LIMITS.robot_id) errors.robot_id = `Use at most ${ROBOT_STATUS_LIMITS.robot_id} characters.`;

  const status = str(src.status).toUpperCase() as InspectionStatus;
  if (!INSPECTION_STATUSES.includes(status)) errors.status = `status must be ${INSPECTION_STATUSES.join(" or ")}.`;

  const failDetail = str(src.failDetail);
  if (failDetail.length > ROBOT_STATUS_LIMITS.failDetail) errors.failDetail = `Use at most ${ROBOT_STATUS_LIMITS.failDetail} characters.`;

  let datetime = new Date();
  if (src.datetime !== undefined && src.datetime !== null && src.datetime !== "") {
    datetime = new Date(src.datetime as string | number);
    if (typeof src.datetime === "boolean" || Number.isNaN(datetime.getTime())) errors.datetime = "datetime must be an ISO date string.";
  }

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: { robot_id, status, failDetail, datetime } };
}
