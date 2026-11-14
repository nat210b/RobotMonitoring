import Link from "next/link";
import { ROOM_LAYOUT, ROOM_NAME } from "./component/room/floorPlan";
import RoomWorkspace from "./component/room/RoomWorkspace";
import { TeamBadge } from "./component/signature/BrandMarks";

export default function Home() {
  return (
    <main id="main-content" tabIndex={-1} className="flex min-h-0 flex-1 flex-col text-foreground outline-none">
      <header className="hud-bar flex shrink-0 items-center justify-between gap-4 border-b border-brand/50 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          {/* The splash's CP monogram flies to this mark (see CpaiSplash). */}
          <span id="cpai-header-mark" className="block shrink-0" suppressHydrationWarning>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/cp-ai-signature/assets/cp-monogram-light.svg" alt="" className="theme-light-only size-9 object-contain" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/cp-ai-signature/assets/cp-monogram.svg" alt="" className="theme-dark-only size-9 object-contain" />
          </span>
          <span className="block leading-tight">
            <span className="flex items-start gap-3">
              <span className="hud-title block text-sm font-bold leading-none">CP-Innovation</span>
              <span className="hud-title block text-xl font-bold leading-none">{ROOM_NAME}</span>
            </span>
            <span className="hud-title block text-[10px] font-bold text-brand">AI Team</span>
          </span>
        </div>
        <TeamBadge />
      </header>
      <RoomWorkspace />
    </main>
  );
}
