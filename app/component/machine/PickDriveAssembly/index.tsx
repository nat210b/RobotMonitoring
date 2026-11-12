"use client";

import MachineViewer from "../MachineViewer";
import { createPickDriveAssembly, FRAME } from "./model";

export const pickDriveAssembly = {
  name: "PICK DRIVE ASSEMBLY",
  frame: FRAME,
  create: createPickDriveAssembly,
};

type Props = {
  height?: number;
  /** Run robot / feeder motion. */
  animate?: boolean;
  autoRotate?: boolean;
  className?: string;
};

export default function PickDriveAssembly({ height, animate = true, autoRotate = false, className }: Props) {
  return (
    <MachineViewer create={createPickDriveAssembly} animate={animate} autoRotate={autoRotate} height={height} className={className} />
  );
}
