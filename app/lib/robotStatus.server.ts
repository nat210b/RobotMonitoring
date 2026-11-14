import "server-only";
import type { ObjectId } from "mongodb";
import { getDb } from "./mongodb";
import type { RobotStatusInput, RobotStatusLogEntry } from "./robotStatus";

export class UnknownRobotError extends Error {
  constructor(robotId: string) {
    super(`Robot "${robotId}" is not registered in the robots collection.`);
  }
}

/**
 * Inserts one inspection result into `robotStatus`, but only when its robot_id matches the
 * robotID of an existing record in `robots`. MongoDB's $jsonSchema validator can't look at
 * another collection, so this check has to live here: writers must go through the API.
 */
export async function insertRobotStatus(input: RobotStatusInput): Promise<{ id: string }> {
  const db = await getDb();
  const robot = await db.collection("robots").findOne({ robotID: input.robot_id }, { projection: { _id: 1 } });
  if (!robot) throw new UnknownRobotError(input.robot_id);

  const { insertedId } = await db.collection<RobotStatusInput & { _id?: ObjectId }>("robotStatus").insertOne({ ...input });
  await syncRobotStatus(input.robot_id);
  return { id: insertedId.toHexString() };
}

/** This many FAIL results in a row put a robot into MAINTAIN. */
export const MAINTAIN_AFTER_FAILS = 5;

/**
 * Brings a robot's robotStatus in line with its inspection log:
 *  - the latest result is PASS: a single PASS puts a FAIL/MAINTAIN robot back to PASS;
 *  - the latest MAINTAIN_AFTER_FAILS results are all FAIL: the robot goes to MAINTAIN.
 * Returns the status it changed the robot to, or null if nothing changed.
 * updatedAt is left alone: it tracks when the robot last reported, which the power check relies on.
 */
export async function syncRobotStatus(robotId: string): Promise<"PASS" | "MAINTAIN" | null> {
  const db = await getDb();
  const latest = await db
    .collection("robotStatus")
    .find({ $or: [{ robotID: robotId }, { robot_id: robotId }] }, { projection: { status: 1 } })
    .sort({ datetime: -1 })
    .limit(MAINTAIN_AFTER_FAILS)
    .toArray();
  const robots = db.collection("robots");
  if (latest[0]?.status === "PASS") {
    const r = await robots.updateOne({ robotID: robotId, robotStatus: { $ne: "PASS" } }, { $set: { robotStatus: "PASS" } });
    return r.modifiedCount ? "PASS" : null;
  }
  if (latest.length === MAINTAIN_AFTER_FAILS && latest.every((d) => d.status === "FAIL")) {
    const r = await robots.updateOne({ robotID: robotId, robotStatus: { $ne: "MAINTAIN" } }, { $set: { robotStatus: "MAINTAIN" } });
    return r.modifiedCount ? "MAINTAIN" : null;
  }
  return null;
}

/**
 * Applies syncRobotStatus to every robot. The rules normally run when a result is posted through the
 * API, but results written straight into MongoDB skip that, so the server also sweeps periodically.
 * Returns how many robots changed status.
 */
export async function syncAllRobotStatuses(): Promise<Record<"PASS" | "MAINTAIN", number>> {
  const db = await getDb();
  const ids = await db.collection("robots").distinct("robotID");
  const changed = { PASS: 0, MAINTAIN: 0 };
  for (const id of ids) {
    if (typeof id !== "string") continue;
    const to = await syncRobotStatus(id);
    if (to) changed[to]++;
  }
  return changed;
}

/** Latest inspection results from `robotStatus`, newest first. */
export async function listRobotStatusLog(limit = 200): Promise<RobotStatusLogEntry[]> {
  const docs = await (await getDb())
    // Existing documents name the robot `robotID` (like the robots collection); older code wrote `robot_id`.
    .collection<Omit<RobotStatusInput, "robot_id"> & { _id: ObjectId; robot_id?: string; robotID?: string }>("robotStatus")
    .find({})
    .sort({ datetime: -1 })
    .limit(limit)
    .toArray();
  return docs.map((d) => ({
    id: d._id.toHexString(),
    robot_id: String(d.robotID ?? d.robot_id ?? ""),
    status: d.status,
    failDetail: d.failDetail ?? "",
    datetime: new Date(d.datetime).toISOString(),
  }));
}
