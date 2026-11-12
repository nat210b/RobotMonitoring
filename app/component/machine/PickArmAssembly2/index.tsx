"use client";

import MachineViewer from "../MachineViewer";
import { createPickArmAssembly2, FRAME } from "./model";

export const pickArmAssembly2 = {
  name: "PICK ARM ASSEMBLY2",
  frame: FRAME,
  create: createPickArmAssembly2,
};

type Props = {
  height?: number;
  /** Run robot / feeder motion. */
  animate?: boolean;
  autoRotate?: boolean;
  className?: string;
};

export default function PickArmAssembly2({ height, animate = true, autoRotate = false, className }: Props) {
  return (
    <MachineViewer create={createPickArmAssembly2} animate={animate} autoRotate={autoRotate} height={height} className={className} />
  );
}
