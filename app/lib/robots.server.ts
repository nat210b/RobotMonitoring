import "server-only";
import { MongoServerError, type Collection } from "mongodb";
import { getDb } from "./mongodb";
import type { Robot, RobotInput } from "./robots";

type RobotDoc = Omit<Robot, "updatedAt"> & { updatedAt?: Date };

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

function toRobot({ updatedAt, ...doc }: RobotDoc): Robot {
  return { ...doc, updatedAt: updatedAt?.toISOString() };
}

export async function listRobots(): Promise<Robot[]> {
  const docs = await (await robots()).find({}, { projection: NO_ID }).sort({ runningNo: 1 }).toArray();
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
    return toRobot(doc!);
  } catch (err) {
    if (err instanceof MongoServerError && err.code === 11000 && "robotID" in (err.keyPattern ?? {})) {
      throw new DuplicateRobotIdError(input.robotID);
    }
    throw err;
  }
}
