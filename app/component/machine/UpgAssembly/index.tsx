"use client";

import MachineViewer from "../MachineViewer";
import { createUpgAssembly, FRAME } from "./model";

export const upgAssembly = {
  name: "UPG ASSEMBLY",
  frame: FRAME,
  create: createUpgAssembly,
};

type Props = {
  height?: number;
  /** Run robot / feeder motion. */
  animate?: boolean;
  autoRotate?: boolean;
  className?: string;
};

export default function UpgAssembly({ height, animate = true, autoRotate = false, className }: Props) {
  return <MachineViewer create={createUpgAssembly} animate={animate} autoRotate={autoRotate} height={height} className={className} />;
}
