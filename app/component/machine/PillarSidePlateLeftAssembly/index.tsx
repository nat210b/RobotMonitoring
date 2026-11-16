"use client";

import MachineViewer from "../MachineViewer";
import { createPillarSidePlateLeftAssembly, LAYOUT } from "./model";

export const pillarSidePlateLeftAssembly = {
  name: "PILLAR SIDE PLATE LEFT ASSEMBLY",
  layout: LAYOUT,
  create: createPillarSidePlateLeftAssembly,
};

type Props = {
  height?: number;
  /** Run robot motion. */
  animate?: boolean;
  autoRotate?: boolean;
  className?: string;
};

export default function PillarSidePlateLeftAssembly({ height, animate = true, autoRotate = false, className }: Props) {
  return <MachineViewer create={createPillarSidePlateLeftAssembly} animate={animate} autoRotate={autoRotate} height={height} className={className} />;
}
