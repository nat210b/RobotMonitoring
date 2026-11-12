"use client";

import MachineViewer from "../MachineViewer";
import { createPadElastomerAssembly, FRAME } from "./model";

export const padElastomerAssembly = {
  name: "PAD ELASTOMER ASSEMBLY",
  frame: FRAME,
  create: createPadElastomerAssembly,
};

type Props = {
  height?: number;
  /** Run robot / rotary disc motion. */
  animate?: boolean;
  autoRotate?: boolean;
  className?: string;
};

export default function PadElastomerAssembly({ height, animate = true, autoRotate = false, className }: Props) {
  return (
    <MachineViewer
      create={createPadElastomerAssembly}
      animate={animate}
      autoRotate={autoRotate}
      height={height}
      className={className}
    />
  );
}
