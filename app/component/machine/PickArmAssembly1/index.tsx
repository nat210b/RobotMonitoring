"use client";

import MachineViewer from "../MachineViewer";
import { createPickArmAssembly1, FRAME } from "./model";

export const pickArmAssembly1 = {
  name: "PICK ARM ASSEMBLY1",
  frame: FRAME,
  create: createPickArmAssembly1,
};

type Props = {
  height?: number;
  /** Run robot / feeder motion. */
  animate?: boolean;
  autoRotate?: boolean;
  className?: string;
};

export default function PickArmAssembly1({ height, animate = false, autoRotate = false, className }: Props) {
  return (
    <MachineViewer create={createPickArmAssembly1} animate={animate} autoRotate={autoRotate} height={height} className={className} />
  );
}
