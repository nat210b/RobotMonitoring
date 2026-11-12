"use client";

import MachineViewer from "../machine/MachineViewer";
import { createRoom, ROOM, ROOM_LAYOUT, ROOM_NAME } from "./model";

/** Room info for client components (server components import from ./floorPlan instead). */
export const robotRoom = {
  name: ROOM_NAME,
  room: ROOM,
  layout: ROOM_LAYOUT,
  create: createRoom,
};

type Props = {
  /** Fixed height in px; ignored when `fill` is set. */
  height?: number;
  /** Fill the parent element's width and height. */
  fill?: boolean;
  autoRotate?: boolean;
  /** Called with the clicked machine's id (ROOM_LAYOUT id), or null for empty space. */
  onSelect?: (id: string | null) => void;
  /** Machine id to outline. */
  selectedId?: string | null;
  className?: string;
};

/** 3D view of the whole robot combined room with every machine in place. */
export default function Room({ height = 640, fill = false, autoRotate = false, onSelect, selectedId, className }: Props) {
  return (
    <MachineViewer
      create={createRoom}
      autoRotate={autoRotate}
      height={fill ? "fill" : height}
      minZoom={0.15}
      viewDistance={1.9}
      onSelect={onSelect}
      selectedId={selectedId}
      className={className}
    />
  );
}
