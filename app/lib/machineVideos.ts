/** Shared shape of an uploaded machine video (client-safe). One video per machine type. */
export type MachineVideo = {
  /** Machine type the video belongs to (MachineType); every machine of that type shows it. */
  type: string;
  filename: string;
  contentType: string;
  size: number;
  /** ISO timestamp of the upload. */
  updatedAt: string;
};

export const MAX_VIDEO_BYTES = 300 * 1024 * 1024;
export const VIDEO_ACCEPT = "video/mp4,video/webm,video/ogg,video/quicktime";

/** URL that plays a machine type's video (the version busts the browser cache after a replace). */
export const machineVideoSrc = (v: MachineVideo) => `/api/v1/machine-videos/${encodeURIComponent(v.type)}?v=${encodeURIComponent(v.updatedAt)}`;
