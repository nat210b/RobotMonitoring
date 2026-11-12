"use client";

import MachineViewer from "../MachineViewer";
import { createPhotoTrayAssembly, LAYOUT } from "./model";

export const photoTrayAssembly = {
  name: "PHOTO TRAY ASSEMBLY",
  layout: LAYOUT,
  create: createPhotoTrayAssembly,
};

type Props = {
  height?: number;
  /** Run robot motion. */
  animate?: boolean;
  autoRotate?: boolean;
  className?: string;
};

export default function PhotoTrayAssembly({ height, animate = true, autoRotate = false, className }: Props) {
  return <MachineViewer create={createPhotoTrayAssembly} animate={animate} autoRotate={autoRotate} height={height} className={className} />;
}
