import { validateRobotStatusInput } from "@/app/lib/robotStatus";
import { insertRobotStatus, UnknownRobotError } from "@/app/lib/robotStatus.server";

/**
 * POST /api/v1/robot-status — record one inspection result.
 * Body: { robot_id, status: "PASS" | "FAIL", failDetail?, datetime? (ISO, defaults to now) }
 * Rejected with 422 unless robot_id matches the robotID of a record in the `robots` collection.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Request body must be JSON." }, { status: 400 });
  }
  const input = validateRobotStatusInput(body);
  if (!input.ok) return Response.json({ error: "Invalid inspection result.", fields: input.errors }, { status: 400 });

  try {
    const { id } = await insertRobotStatus(input.value);
    return Response.json({ id, ...input.value }, { status: 201 });
  } catch (err) {
    if (err instanceof UnknownRobotError) {
      return Response.json({ error: err.message, fields: { robot_id: err.message } }, { status: 422 });
    }
    console.error("POST /api/v1/robot-status failed", err);
    return Response.json({ error: "Could not save to the database." }, { status: 500 });
  }
}
