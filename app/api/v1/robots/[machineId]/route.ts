import type { NextRequest } from "next/server";
import { MACHINE_IDS } from "@/app/component/room/floorPlan";
import { validateRobotInput } from "@/app/lib/robots";
import { DuplicateRobotIdError, saveRobotForMachine } from "@/app/lib/robots.server";

/**
 * PUT /api/v1/robots/:machineId — create or update the robot record of one machine in the room.
 * Body: { robotID, robotName, robotStatus: "PASS" | "FAIL" | "MAINTAIN", desc }
 */
export async function PUT(req: NextRequest, ctx: RouteContext<"/api/v1/robots/[machineId]">) {
  const { machineId } = await ctx.params;
  if (!MACHINE_IDS.has(machineId)) {
    return Response.json({ error: `Unknown machine "${machineId}".` }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Request body must be JSON." }, { status: 400 });
  }
  const input = validateRobotInput(body);
  if (!input.ok) return Response.json({ error: "Please fix the highlighted fields.", fields: input.errors }, { status: 400 });

  try {
    return Response.json({ robot: await saveRobotForMachine(machineId, input.value) });
  } catch (err) {
    if (err instanceof DuplicateRobotIdError) {
      return Response.json({ error: err.message, fields: { robotID: err.message } }, { status: 409 });
    }
    console.error(`PUT /api/v1/robots/${machineId} failed`, err);
    return Response.json({ error: "Could not save to the database." }, { status: 500 });
  }
}
