import "server-only";
import { MongoServerError, type Collection } from "mongodb";
import { getDb } from "./mongodb";
import type { Robot, RobotInput } from "./robots";
import { syncRobotStatus } from "./robotStatus.server";

type RobotDoc = Omit<Robot, "updatedAt" | "robotPower"> & { updatedAt?: Date; robotPower?: boolean | number };

let indexesReady: Promise<unknown> | undefined;

/** The `robots` collection, with its unique indexes created once per process. */
async function robots(): Promise<Collection<RobotDoc>> {
  const col = (await getDb()).collection<RobotDoc>("robots");
  indexesReady ??= Promise.all([
    col.createIndex({ machineID: 1 }, { unique: true, partialFilterExpression: { machineID: { $type: "string" } } }),
    col.createIndex({ robotID: 1 }, { unique: true, partialFilterExpression: { robotID: { $type: "string" } } }),
  ]).catch((err) => {
    indexesReady = undefined;
    throw err;
  });
  await indexesReady;
  return col;
}

/** Leave Mongo's _id out of everything sent to the client. */
const NO_ID = { _id: 0 } as const;

function toRobot({ updatedAt, robotPower, ...doc }: RobotDoc): Robot {
  // robotPower may be stored as a boolean or a number (1 / 0); the client always gets a boolean.
  return { ...doc, robotPower: robotPower == null ? undefined : Boolean(robotPower), updatedAt: updatedAt?.toISOString() };
}

export async function listRobots(): Promise<Robot[]> {
  const col = await robots();
  // Every read first switches off robots that have been silent for over a minute, so the data returned is current.
  await switchOffStale(col, new Date());
  const docs = await col.find({}, { projection: NO_ID }).sort({ runningNo: 1 }).toArray();
  return docs.map(toRobot);
}

export class DuplicateRobotIdError extends Error {
  constructor(robotID: string) {
    super(`Robot ID "${robotID}" is already used by another machine.`);
  }
}

/**
 * Creates or updates the robot record for one machine in the room. A new record gets the next
 * runningNo and an empty viedoURL; an existing record keeps both.
 */
export async function saveRobotForMachine(machineID: string, input: RobotInput): Promise<Robot> {
  const col = await robots();
  const existing = await col.findOne({ machineID }, { projection: { runningNo: 1 } });
  const runningNo = existing ? existing.runningNo : ((await col.find().sort({ runningNo: -1 }).limit(1).next())?.runningNo ?? 0) + 1;
  try {
    const doc = await col.findOneAndUpdate(
      { machineID },
      {
        $set: { ...input, updatedAt: new Date() },
        $setOnInsert: { machineID, runningNo, viedoURL: "" },
      },
      { upsert: true, returnDocument: "after", projection: NO_ID },
    );
    // A save writes robotStatus as sent, which can land after the log insert that already updated it.
    // Re-apply the log rules (one PASS -> PASS, repeated FAILs -> MAINTAIN) so that save can't undo them.
    const saved = toRobot(doc!);
    const synced = await syncRobotStatus(saved.robotID);
    if (synced) return { ...saved, robotStatus: synced };
    return saved;
  } catch (err) {
    if (err instanceof MongoServerError && err.code === 11000 && "robotID" in (err.keyPattern ?? {})) {
      throw new DuplicateRobotIdError(input.robotID);
    }
    throw err;
  }
}

/** A robot that has not updated for this long is considered inactive and gets switched off. */
export const ROBOT_STALE_MS = 60_000;

/**
 * Sets robotPower to false on every robot that is still on and whose updatedAt is more than one
 * minute old (or missing). Robots that updated recently are left alone. updatedAt is not touched,
 * so a switched-off robot stays "stale" until it reports again.
 */
function switchOffStale(col: Collection<RobotDoc>, now: Date) {
  const cutoff = new Date(now.getTime() - ROBOT_STALE_MS);
  return col.updateMany(
    { robotPower: { $nin: [false, 0] }, $or: [{ updatedAt: { $lt: cutoff } }, { updatedAt: { $exists: false } }] },
    { $set: { robotPower: false } },
  );
}

export async function powerOffStaleRobots(now = new Date()): Promise<{ checked: number; poweredOff: number }> {
  const col = await robots();
  const [checked, result] = await Promise.all([col.countDocuments({}), switchOffStale(col, now)]);
  return { checked, poweredOff: result.modifiedCount };
}
