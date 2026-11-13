import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { ROOM_LAYOUT } from "@/app/component/room/floorPlan";
import { MAX_VIDEO_BYTES } from "@/app/lib/machineVideos";
import { deleteVideos, listVideoFiles, openDownload, openUpload, toVideo } from "@/app/lib/machineVideos.server";

/** Every machine type in the room; each gets one shared video. */
const MACHINE_TYPES = new Set<string>(ROOM_LAYOUT.map((m) => m.type));

type Ctx = { params: Promise<{ type: string }> };

async function knownType(ctx: Ctx) {
  const { type } = await ctx.params;
  return MACHINE_TYPES.has(type) ? type : null;
}

const unknown = () => Response.json({ error: "Unknown machine type." }, { status: 404 });
const tooLarge = () => Response.json({ error: `Video is too large (max ${MAX_VIDEO_BYTES / 1024 / 1024} MB).` }, { status: 413 });

/** GET /api/v1/machine-videos/:type — streams the type's video (supports Range, so it can seek). */
export async function GET(req: Request, ctx: Ctx) {
  const type = await knownType(ctx);
  if (!type) return unknown();
  const file = (await listVideoFiles(type))[0];
  if (!file) return Response.json({ error: "No video uploaded for this machine type." }, { status: 404 });

  const size = file.length;
  let start = 0;
  let end = size - 1;
  let status = 200;
  const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") ?? "");
  if (m && (m[1] || m[2])) {
    if (m[1]) {
      start = Number(m[1]);
      if (m[2]) end = Math.min(end, Number(m[2]));
    } else {
      start = Math.max(0, size - Number(m[2])); // suffix range: the last N bytes
    }
    if (start > end || start >= size) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    status = 206;
  }
  const stream = await openDownload(file, start, end + 1);
  const headers: Record<string, string> = {
    "Content-Type": file.metadata?.contentType ?? "video/mp4",
    "Accept-Ranges": "bytes",
    "Content-Length": String(end - start + 1),
    "Cache-Control": "private, no-cache",
  };
  if (status === 206) headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
  return new Response(Readable.toWeb(stream) as ReadableStream, { status, headers });
}

/**
 * PUT /api/v1/machine-videos/:type — upload (or replace) the video shared by every machine of this
 * type. Body: the raw video file; headers: Content-Type (video/*), X-Filename (URL-encoded name).
 */
export async function PUT(req: Request, ctx: Ctx) {
  const type = await knownType(ctx);
  if (!type) return unknown();
  const contentType = (req.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!contentType.startsWith("video/")) return Response.json({ error: "Upload a video file (mp4, webm, ogg or mov)." }, { status: 415 });
  if (Number(req.headers.get("content-length") ?? 0) > MAX_VIDEO_BYTES) return tooLarge();
  if (!req.body) return Response.json({ error: "Request body is empty." }, { status: 400 });

  let filename = "video";
  try {
    filename = decodeURIComponent(req.headers.get("x-filename") ?? "") || filename;
  } catch {
    // keep the default name
  }

  const upload = await openUpload(filename.slice(0, 200), type, contentType);
  let received = 0;
  const limit = new Transform({
    transform(chunk, _enc, cb) {
      received += chunk.length;
      cb(received > MAX_VIDEO_BYTES ? new Error("too large") : null, chunk);
    },
  });
  try {
    await pipeline(Readable.fromWeb(req.body as Parameters<typeof Readable.fromWeb>[0]), limit, upload);
  } catch (err) {
    await upload.abort().catch(() => {});
    if (err instanceof Error && err.message === "too large") return tooLarge();
    console.error(`PUT /api/v1/machine-videos/${type} failed`, err);
    return Response.json({ error: "Could not save the video." }, { status: 500 });
  }
  await deleteVideos(type, upload.id); // the new upload replaces the old one
  const saved = (await listVideoFiles(type))[0];
  return Response.json({ video: toVideo(saved) });
}

/** DELETE /api/v1/machine-videos/:type — remove the type's video. */
export async function DELETE(_req: Request, ctx: Ctx) {
  const type = await knownType(ctx);
  if (!type) return unknown();
  await deleteVideos(type);
  return Response.json({ ok: true });
}
