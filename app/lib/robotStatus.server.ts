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
  return { id: insertedId.toHexString() };
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
