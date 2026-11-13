import { ROOM_LAYOUT } from "./floorPlan";

/**
 * MOCK data: whether each machine is running (ON) or stopped (OFF). It is a fixed pseudo-random
 * pick per machine id (about 1 in 4 is OFF), so the numbers stay the same between reloads.
 * Replace with real machine states when they are available.
 */
export type MachinePower = "ON" | "OFF";

const hash = (id: string) => [...id].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);

export const MOCK_MACHINE_POWER = new Map<string, MachinePower>(ROOM_LAYOUT.map((m) => [m.id, hash(m.id) % 4 === 0 ? "OFF" : "ON"]));
