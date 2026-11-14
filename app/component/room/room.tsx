"use client";

import type { ReactNode } from "react";
import type { LampColor } from "../machine/parts";
import MachineViewer from "../machine/MachineViewer";
import { ROOM_SECTIONS } from "./floorPlan";
import { createRoom, ROOM, ROOM_LAYOUT, ROOM_NAME } from "./model";

/** Room info for client components (server components import from ./floorPlan instead). */
export const robotRoom = {
  name: ROOM_NAME,
  room: ROOM,
  layout: ROOM_LAYOUT,
  create: createRoom,
};

/** Starting view: more from above than the default, so the floor opens up. */
const ROOM_CAMERA = [1, 1.5, 1] as const;

/** Slide the room up the screen by this fraction of the view height. */
const ROOM_SHIFT = [0, 0.08] as const;

type Props = {
  /** Fixed height in px; ignored when `fill` is set. */
  height?: number;
  /** Fill the parent element's width and height. */
  fill?: boolean;
  autoRotate?: boolean;
  /** Run the robots' work cycles (on by default). */
  animate?: boolean;
  /** Called with the clicked machine's id (ROOM_LAYOUT id), or null for empty space. */
  onSelect?: (id: string | null) => void;
  /** Machine id to outline. */
  selectedId?: string | null;
  /** Labels shown over a machine (keyed by machine id) or a section (keyed by ROOM_SECTIONS id). */
  badges?: Record<string, ReactNode>;
  /** Show each section's floor highlight (on by default). */
  showZones?: boolean;
  /** Camera mode (see MachineViewer). */
  view?: "iso" | "top" | "free";
  /** Ids of sections with a problem; their floor highlight turns yellow. */
  zoneAlerts?: readonly string[];
  /** Lamp to light per machine id (see MachineViewer). */
  lamps?: Record<string, LampColor | undefined>;
  className?: string;
};

/** 3D view of the whole robot combined room with every machine in place. */
export default function Room({ height = 640, fill = false, autoRotate = false, animate = true, onSelect, selectedId, badges, showZones = true, view, lamps, zoneAlerts, className }: Props) {
  return (
    <MachineViewer
      create={createRoom}
      autoRotate={autoRotate}
      animate={animate}
      height={fill ? "fill" : height}
      minZoom={0.15}
      viewDistance={2.9}
      cameraDirection={ROOM_CAMERA}
      viewShift={ROOM_SHIFT}
      hoverPad={ROOM.tile}
      onSelect={onSelect}
      selectedId={selectedId}
      badges={badges}
      zones={ROOM_SECTIONS}
      showZones={showZones}
      view={view}
      lamps={lamps}
      zoneAlerts={zoneAlerts}
      className={className}
    />
  );
}
