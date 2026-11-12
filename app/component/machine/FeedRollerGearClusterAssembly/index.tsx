"use client";

import MachineViewer from "../MachineViewer";
import { createFeedRollerGearClusterAssembly, FRAME } from "./model";

export const feedRollerGearClusterAssembly = {
  name: "FEED ROLLER GEAR CLUSTER ASSEMBLY",
  frame: FRAME,
  create: createFeedRollerGearClusterAssembly,
};

type Props = {
  height?: number;
  /** Run robot / rotary table / feeder motion. */
  animate?: boolean;
  autoRotate?: boolean;
  className?: string;
};

export default function FeedRollerGearClusterAssembly({ height, animate = false, autoRotate = false, className }: Props) {
  return (
    <MachineViewer
      create={createFeedRollerGearClusterAssembly}
      animate={animate}
      autoRotate={autoRotate}
      height={height}
      className={className}
    />
  );
}
