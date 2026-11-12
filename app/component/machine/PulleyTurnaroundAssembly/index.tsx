"use client";

import MachineViewer from "../MachineViewer";
import { createPulleyTurnaroundAssembly, FRAME } from "./model";

export const pulleyTurnaroundAssembly = {
  name: "PULLEY TURNAROUND ASSEMBLY",
  frame: FRAME,
  create: createPulleyTurnaroundAssembly,
};

type Props = {
  height?: number;
  /** Run robot / table / feeder motion. */
  animate?: boolean;
  autoRotate?: boolean;
  className?: string;
};

export default function PulleyTurnaroundAssembly({ height, animate = true, autoRotate = false, className }: Props) {
  return (
    <MachineViewer create={createPulleyTurnaroundAssembly} animate={animate} autoRotate={autoRotate} height={height} className={className} />
  );
}
