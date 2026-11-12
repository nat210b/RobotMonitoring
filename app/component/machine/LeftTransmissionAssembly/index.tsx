"use client";

import MachineViewer from "../MachineViewer";
import { createLeftTransmissionAssembly, LAYOUT } from "./model";

export const leftTransmissionAssembly = {
  name: "LEFT TRANSMISSION ASSEMBLY",
  layout: LAYOUT,
  create: createLeftTransmissionAssembly,
};

type Props = {
  height?: number;
  /** Run robot / dial plate / conveyor / feeder motion. */
  animate?: boolean;
  autoRotate?: boolean;
  className?: string;
};

export default function LeftTransmissionAssembly({ height, animate = false, autoRotate = false, className }: Props) {
  return (
    <MachineViewer
      create={createLeftTransmissionAssembly}
      animate={animate}
      autoRotate={autoRotate}
      height={height}
      className={className}
    />
  );
}
