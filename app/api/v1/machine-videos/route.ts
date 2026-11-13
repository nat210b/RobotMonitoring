import { listVideoFiles, toVideo } from "@/app/lib/machineVideos.server";

/** GET /api/v1/machine-videos — the uploaded video of each machine type (newest per type). */
export async function GET() {
  try {
    return Response.json({ videos: (await listVideoFiles()).map(toVideo) }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("GET /api/v1/machine-videos failed", err);
    return Response.json({ error: "Could not load videos." }, { status: 500 });
  }
}
