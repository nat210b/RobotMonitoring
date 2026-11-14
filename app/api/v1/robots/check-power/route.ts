import { powerOffStaleRobots } from "@/app/lib/robots.server";

/**
 * POST /api/v1/robots/check-power — switch off (robotPower = false) every robot whose updatedAt is
 * more than one minute old. Meant to be called every ~10 seconds by a scheduler.
 */
export async function POST() {
  try {
    return Response.json({ ok: true, ...(await powerOffStaleRobots()) });
  } catch (err) {
    console.error("POST /api/v1/robots/check-power failed", err);
    return Response.json({ ok: false, error: "Could not check robot power." }, { status: 500 });
  }
}
