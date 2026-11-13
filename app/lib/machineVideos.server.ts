import "server-only";
import { GridFSBucket, type GridFSFile } from "mongodb";
import { getDb } from "./mongodb";
import type { MachineVideo } from "./machineVideos";

/** Videos live in MongoDB GridFS (bucket "machineVideos"), tagged with the machine type in metadata. */
async function bucket() {
  return new GridFSBucket(await getDb(), { bucketName: "machineVideos" });
}

export const toVideo = (f: GridFSFile): MachineVideo => ({
  type: f.metadata?.type,
  filename: f.filename,
  contentType: f.metadata?.contentType ?? "video/mp4",
  size: f.length,
  updatedAt: f.uploadDate.toISOString(),
});

/** Newest file of `type`, or the newest file of every type when no type is given. */
export async function listVideoFiles(type?: string): Promise<GridFSFile[]> {
  const files = await (await bucket()).find(type ? { "metadata.type": type } : {}).sort({ uploadDate: -1 }).toArray();
  if (type) return files;
  const seen = new Set<string>();
  return files.filter((f) => !seen.has(f.metadata?.type) && seen.add(f.metadata?.type));
}

export async function openUpload(filename: string, type: string, contentType: string) {
  return (await bucket()).openUploadStream(filename, { metadata: { type, contentType } });
}

/** Stream bytes [start, endExclusive) of a stored video. */
export async function openDownload(file: GridFSFile, start: number, endExclusive: number) {
  return (await bucket()).openDownloadStream(file._id, { start, end: endExclusive });
}

/** Delete every video of `type` except the file with `keepId`. */
export async function deleteVideos(type: string, keepId?: GridFSFile["_id"]) {
  const b = await bucket();
  for (const f of await b.find({ "metadata.type": type }).toArray()) {
    if (!keepId || !f._id.equals(keepId)) await b.delete(f._id);
  }
}
