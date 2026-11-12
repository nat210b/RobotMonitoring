/*
 * Motion / overlap check for the 3D machines and the room layout.
 *
 *   npm run check:motion
 *
 * 1. Every machine model: plays its motion over two full robot cycles and tests each moving
 *    robot part against the other robots' arms and every other mesh (deck, glass, frame,
 *    feeders, tables…), keeping CLEARANCE between them. Contacts that already exist in the
 *    drawn pose (e.g. a quill parked in its slot) only fail if the motion makes them deeper.
 * 2. The room: every machine footprint keeps clear of the other machines, the building
 *    columns, the glass partition and the walls.
 *
 * Exits with code 1 when anything collides.
 */
import type { MachineParts } from "../app/component/machine/parts";
import { MACHINE_FACTORIES } from "../app/component/room/model";
import { CLEARANCE, checkMachine, checkRoom, FOOTPRINT_GAP } from "./lib/motionCheck";

let failures = 0;
const protos = new Map<string, MachineParts>();
for (const [type, factory] of Object.entries(MACHINE_FACTORIES)) {
  const parts = factory();
  protos.set(type, parts);
  const r = checkMachine(parts);
  console.log(`${r.hits.length ? "FAIL" : "ok  "} ${type}: ${r.movingRobots}/${r.robots.length} robots moving, ${r.movingParts} moving parts vs ${r.otherMeshes} meshes`);
  for (const h of r.hits.slice(0, 10)) console.log(`       t=${h.t.toFixed(2)}s  ${h.depthMm.toFixed(0)} mm  ${h.a}  ×  ${h.b}`);
  if (r.hits.length > 10) console.log(`       … ${r.hits.length - 10} more`);
  failures += r.hits.length;
}
console.log(`     (moving robot parts keep ${CLEARANCE * 1000} mm clear of everything else)`);

const room = checkRoom(protos);
for (const p of room) console.log(`FAIL room: ${p}`);
if (!room.length) console.log(`ok   room: machine footprints keep ${FOOTPRINT_GAP * 1000} mm from each other, the columns, the partition and the walls`);
failures += room.length;

console.log(failures ? `\n${failures} problem(s) found.` : "\nAll clear.");
process.exit(failures ? 1 : 0);
