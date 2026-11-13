"use client";

import { useRef, useState } from "react";
import { Button } from "../ui";
import { MAX_VIDEO_BYTES, VIDEO_ACCEPT, machineVideoSrc, type MachineVideo } from "@/app/lib/machineVideos";
import { RobotVideo } from "./RobotVideo";

export interface MachineVideoPanelProps {
  /** Machine type the video is shared by. */
  type: string;
  /** The type's uploaded video, if any. */
  video?: MachineVideo;
  /** Called after an upload or removal: the new video, or null when removed. */
  onChange: (video: MachineVideo | null) => void;
}

const endpoint = (type: string) => `/api/v1/machine-videos/${encodeURIComponent(type)}`;

/** Plays the video shared by every machine of this type, with upload / replace / remove. */
export function MachineVideoPanel({ type, video, onChange }: MachineVideoPanelProps) {
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null); // 0–100 while uploading
  const [error, setError] = useState<string | null>(null);
  const busy = progress !== null;

  const upload = (file: File) => {
    setError(null);
    if (!file.type.startsWith("video/")) return setError("Choose a video file (mp4, webm, ogg or mov).");
    if (file.size > MAX_VIDEO_BYTES) return setError(`Video is too large (max ${MAX_VIDEO_BYTES / 1024 / 1024} MB).`);
    setProgress(0);
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", endpoint(type));
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.setRequestHeader("X-Filename", encodeURIComponent(file.name));
    xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onerror = () => {
      setProgress(null);
      setError("Could not reach the server. Check your connection and try again.");
    };
    xhr.onload = () => {
      setProgress(null);
      let data: { video?: MachineVideo; error?: string } = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        // not JSON: fall through to the generic message
      }
      if (xhr.status >= 200 && xhr.status < 300 && data.video) onChange(data.video);
      else setError(data.error ?? `Upload failed (${xhr.status}).`);
    };
    xhr.send(file);
  };

  const remove = async () => {
    setError(null);
    setProgress(0);
    try {
      const res = await fetch(endpoint(type), { method: "DELETE" });
      if (!res.ok) throw new Error();
      onChange(null);
    } catch {
      setError("Could not remove the video.");
    } finally {
      setProgress(null);
    }
  };

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-medium">Machine video</h3>
      {video ? (
        <RobotVideo key={video.updatedAt} url={machineVideoSrc(video)} title={`${type} working`} />
      ) : (
        <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted">No video uploaded for this machine type yet.</p>
      )}
      <input
        ref={input}
        type="file"
        accept={VIDEO_ACCEPT}
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = ""; // allow choosing the same file again
          if (file) upload(file);
        }}
      />
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={() => input.current?.click()} disabled={busy}>
          {busy ? (video ? `Uploading ${progress}%` : `Working… ${progress}%`) : video ? "Replace video" : "Upload video"}
        </Button>
        {video && (
          <Button variant="ghost" size="sm" onClick={remove} disabled={busy}>
            Remove
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </section>
  );
}
