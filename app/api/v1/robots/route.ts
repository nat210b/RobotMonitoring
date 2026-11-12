import { listRobots } from "@/app/lib/robots.server";

/** GET /api/v1/robots — every robot record, ordered by runningNo. */
export async function GET() {
  try {
    return Response.json({ robots: await listRobots() });
  } catch (err) {
    console.error("GET /api/v1/robots failed", err);
    return Response.json({ error: "Could not load robots from the database." }, { status: 500 });
  }
}
