import Link from "next/link";
import { ROOM_LAYOUT, ROOM_NAME } from "./component/room/floorPlan";
import RoomWorkspace from "./component/room/RoomWorkspace";

export default function Home() {
  return (
    <main className="flex min-h-0 flex-1 flex-col bg-background text-foreground">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-line px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="grid size-8 place-items-center rounded-control bg-brand-soft text-sm font-semibold text-brand">R</span>
          <div>
            <h1 className="text-base font-semibold tracking-tight">{ROOM_NAME}</h1>
          </div>
        </div>
        <Link href="/design" className="text-sm font-medium text-brand hover:underline">
          Design system →
        </Link>
      </header>
      <RoomWorkspace />
    </main>
  );
}
