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
  autoRotate?: boolean;
  className?: string;
};

export default function PhotoTrayAssembly({ height, autoRotate = false, className }: Props) {
  return <MachineViewer create={createPhotoTrayAssembly} autoRotate={autoRotate} height={height} className={className} />;
}
