/*
 * Collision tests for the machine models and the room layout (no rendering).
 * Used by scripts/check-motion.ts (report) and scripts/plan-motion.ts (tuning).
 *
 * Every mesh is tested as its oriented bounding box, so round parts count as their box:
 * results err on the safe side.
 */
import * as THREE from "three";
import { ROBOT_CYCLE, type MachineParts, type RobotMotion } from "../../app/component/machine/parts";
import { COLUMN_PARTITION, PILLARS, PILLAR_SIZE, ROOM, ROOM_LAYOUT } from "../../app/component/room/model";

/** Clear space every moving robot part must keep from everything else (m). */
export const CLEARANCE = 0.005;
/** Clear floor space required between machine footprints (m). */
export const FOOTPRINT_GAP = 0.05;
/** Time step used when playing the motion (s). */
export const STEP = 1 / 60;

type OBB = { c: THREE.Vector3; ax: [THREE.Vector3, THREE.Vector3, THREE.Vector3]; h: [number, number, number] };

function obbOf(mesh: THREE.Mesh, grow: number): OBB {
  const g = mesh.geometry;
  if (!g.boundingBox) g.computeBoundingBox();
  const bb = g.boundingBox!;
  const e = mesh.matrixWorld.elements;
  const cols = [0, 4, 8].map((i) => new THREE.Vector3(e[i], e[i + 1], e[i + 2]));
  const size = bb.getSize(new THREE.Vector3());
  const half = [size.x / 2, size.y / 2, size.z / 2];
  const h = cols.map((col, i) => Math.max(0, half[i] * col.length() + grow)) as OBB["h"];
  const ax = cols.map((col) => col.normalize()) as OBB["ax"];
  return { c: bb.getCenter(new THREE.Vector3()).applyMatrix4(mesh.matrixWorld), ax, h };
}

const project = (o: OBB, axis: THREE.Vector3) =>
  o.h[0] * Math.abs(o.ax[0].dot(axis)) + o.h[1] * Math.abs(o.ax[1].dot(axis)) + o.h[2] * Math.abs(o.ax[2].dot(axis));

/** Separating-axis test: smallest penetration depth, or ≤ 0 when the boxes are apart. */
function penetration(a: OBB, b: OBB): number {
  const d = b.c.clone().sub(a.c);
  const axes: THREE.Vector3[] = [...a.ax, ...b.ax];
  for (const u of a.ax) for (const v of b.ax) {
    const x = u.clone().cross(v);
    if (x.lengthSq() > 1e-10) axes.push(x.normalize());
  }
  let depth = Infinity;
  for (const axis of axes) {
    const p = project(a, axis) + project(b, axis) - Math.abs(d.dot(axis));
    if (p <= 0) return p;
    depth = Math.min(depth, p);
  }
  return depth;
}

function aabbOf(o: OBB) {
  const r = new THREE.Vector3(project(o, new THREE.Vector3(1, 0, 0)), project(o, new THREE.Vector3(0, 1, 0)), project(o, new THREE.Vector3(0, 0, 1)));
  return new THREE.Box3(o.c.clone().sub(r), o.c.clone().add(r));
}

type Item = { mesh: THREE.Mesh; robot: THREE.Object3D | null; index: number };

export type Hit = { a: string; b: string; t: number; depthMm: number; robots: number[] };

export type MachineReport = {
  robots: THREE.Object3D[];
  movingRobots: number;
  movingParts: number;
  otherMeshes: number;
  /** Pairs already within CLEARANCE in the drawn pose (only fail if the motion pushes them deeper). */
  restContacts: number;
  hits: Hit[];
};

function robotOf(o: THREE.Object3D): THREE.Object3D | null {
  for (let p: THREE.Object3D | null = o; p; p = p.parent) if (p.userData.kind === "robot") return p;
  return null;
}

/** Robots of a built machine, in scene order, with their tunable motion settings. */
export function robotsOf(parts: MachineParts) {
  const robots: { object: THREE.Object3D; motion: RobotMotion }[] = [];
  parts.object.traverse((o) => {
    if (o.userData.kind === "robot") robots.push({ object: o, motion: o.userData.motion as RobotMotion });
  });
  return robots;
}

/**
 * Plays the machine's motion over `cycles` robot cycles and tests every moving robot part
 * against the other robots' moving parts and every other mesh. `stopAtFirst` returns as soon
 * as anything collides (for searches that only need a yes / no).
 */
export function checkMachine(parts: MachineParts, { cycles = 2, step = STEP, stopAtFirst = false } = {}): MachineReport {
  const root = parts.object;
  const items: Item[] = [];
  root.traverse((o) => {
    if (o instanceof THREE.Mesh && o.visible) items.push({ mesh: o, robot: robotOf(o), index: items.length });
  });
  const robots = robotsOf(parts).map((r) => r.object);

  const at = (t: number) => {
    parts.update?.(t);
    root.updateMatrixWorld(true);
  };
  at(0);
  const rest = items.map((i) => i.mesh.matrixWorld.clone());
  const moved = new Set<Item>();
  for (let t = 0; t <= cycles * ROBOT_CYCLE; t += step * 7) {
    at(t);
    for (const it of items) if (!it.mesh.matrixWorld.equals(rest[it.index])) moved.add(it);
  }
  const movers = items.filter((i) => i.robot && moved.has(i));
  const others = items.filter((i) => !(i.robot && moved.has(i)));
  // Things that never move get their boxes once.
  const fixedObb = new Map<Item, { o: OBB; box: THREE.Box3 }>();
  at(0);
  for (const it of others) {
    if (moved.has(it)) continue;
    const o = obbOf(it.mesh, 0);
    fixedObb.set(it, { o, box: aabbOf(o) });
  }

  const label = (it: Item) => {
    const p = new THREE.Vector3().setFromMatrixPosition(it.mesh.matrixWorld);
    const who = it.robot ? `robot ${robots.indexOf(it.robot) + 1}` : moved.has(it) ? "moving part" : "fixed";
    return `${who} ${it.mesh.geometry.type.replace("Geometry", "")} @ (${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)})`;
  };

  const restDepth = new Map<string, number>();
  const hits = new Map<string, Hit>();
  const sample = (t: number, record: (key: string, a: Item, b: Item, depth: number) => void) => {
    at(t);
    const live = new Map<Item, { o: OBB; box: THREE.Box3 }>();
    const get = (it: Item) => {
      const f = fixedObb.get(it);
      if (f) return f;
      let v = live.get(it);
      if (!v) {
        // Moving robot parts carry the clearance; other moving parts (tables, pallets) don't.
        const o = obbOf(it.mesh, it.robot ? CLEARANCE : 0);
        v = { o, box: aabbOf(o) };
        live.set(it, v);
      }
      return v;
    };
    for (let x = 0; x < movers.length; x++) {
      const a = movers[x];
      const va = get(a);
      for (const b of [...movers.slice(x + 1), ...others]) {
        if (b.robot === a.robot) continue; // a robot's own links nest into each other at the joints
        const vb = get(b);
        if (!va.box.intersectsBox(vb.box)) continue;
        const depth = penetration(va.o, vb.o);
        if (depth > 0) record(`${a.index}:${b.index}`, a, b, depth);
      }
    }
  };

  sample(0, (key, _a, _b, depth) => restDepth.set(key, depth));
  for (let t = step; t <= cycles * ROBOT_CYCLE + 1e-9 && !(stopAtFirst && hits.size); t += step) {
    sample(t, (key, a, b, depth) => {
      const base = restDepth.get(key);
      if (base !== undefined && depth <= base + 0.001) return; // parked contact, not made worse
      const prev = hits.get(key);
      if (!prev || depth * 1000 > prev.depthMm) {
        const rs = [a.robot, b.robot].filter((r): r is THREE.Object3D => !!r).map((r) => robots.indexOf(r));
        hits.set(key, { a: label(a), b: label(b), t, depthMm: depth * 1000, robots: rs });
      }
    });
  }
  at(0);

  return {
    robots,
    movingRobots: new Set(movers.map((i) => i.robot)).size,
    movingParts: movers.length,
    otherMeshes: others.length,
    restContacts: restDepth.size,
    hits: [...hits.values()].sort((p, q) => q.depthMm - p.depthMm),
  };
}

// ── Room footprints ────────────────────────────────────────────────────────

type Rect = { label: string; c: THREE.Vector2; ax: [THREE.Vector2, THREE.Vector2]; h: [number, number] };

function rectsTooClose(a: Rect, b: Rect, gap: number) {
  const d = b.c.clone().sub(a.c);
  const r = (o: Rect, axis: THREE.Vector2) => o.h[0] * Math.abs(o.ax[0].dot(axis)) + o.h[1] * Math.abs(o.ax[1].dot(axis));
  return [...a.ax, ...b.ax].every((axis) => Math.abs(d.dot(axis)) < r(a, axis) + r(b, axis) + gap - 1e-9);
}

const AXES: Rect["ax"] = [new THREE.Vector2(1, 0), new THREE.Vector2(0, 1)];

/** Box around everything the machine occupies at any point of its motion. */
function sweptBounds(parts: MachineParts) {
  const box = new THREE.Box3();
  for (let t = 0; t <= 2 * ROBOT_CYCLE; t += 0.1) {
    parts.update?.(t);
    parts.object.updateMatrixWorld(true);
    box.union(new THREE.Box3().setFromObject(parts.object));
  }
  parts.update?.(0);
  return box;
}

/**
 * Checks that every machine's footprint (its whole model seen from above, arms at full swing) keeps FOOTPRINT_GAP
 * from the other machines, the building columns and the glass partition, and stays in the room.
 * Returns one message per problem.
 */
export function checkRoom(protos: Map<string, MachineParts>): string[] {
  const bounds = new Map([...protos].map(([type, parts]) => [type, sweptBounds(parts)]));
  const rects: Rect[] = ROOM_LAYOUT.map((p) => {
    const bb = bounds.get(p.type)!;
    const s = p.scale ?? 1;
    const cos = Math.cos(p.rotation ?? 0);
    const sin = Math.sin(p.rotation ?? 0);
    const lx = ((bb.min.x + bb.max.x) / 2) * s;
    const lz = ((bb.min.z + bb.max.z) / 2) * s;
    return {
      label: p.id,
      // three.js turn about y: x' = x cos + z sin, z' = −x sin + z cos
      c: new THREE.Vector2(p.x + lx * cos + lz * sin, p.z - lx * sin + lz * cos),
      ax: [new THREE.Vector2(cos, -sin), new THREE.Vector2(sin, cos)],
      h: [((bb.max.x - bb.min.x) / 2) * s, ((bb.max.z - bb.min.z) / 2) * s],
    };
  });
  const fixed: Rect[] = [
    ...PILLARS.map((p, i) => ({ label: `column ${i + 1}`, c: new THREE.Vector2(p.x, p.z), ax: AXES, h: [PILLAR_SIZE / 2, PILLAR_SIZE / 2] as Rect["h"] })),
    {
      label: "glass partition",
      c: new THREE.Vector2(COLUMN_PARTITION.x, (COLUMN_PARTITION.zBack + COLUMN_PARTITION.zFront) / 2),
      ax: AXES,
      h: [0.02, (COLUMN_PARTITION.zFront - COLUMN_PARTITION.zBack) / 2],
    },
  ];
  const problems: string[] = [];
  rects.forEach((r, i) => {
    for (const other of [...rects.slice(i + 1), ...fixed]) {
      if (rectsTooClose(r, other, FOOTPRINT_GAP)) problems.push(`${r.label} overlaps ${other.label} (or is within ${FOOTPRINT_GAP * 1000} mm)`);
    }
    const ex = r.h[0] * Math.abs(r.ax[0].x) + r.h[1] * Math.abs(r.ax[1].x);
    const ez = r.h[0] * Math.abs(r.ax[0].y) + r.h[1] * Math.abs(r.ax[1].y);
    if (r.c.x - ex < ROOM.minX || r.c.x + ex > ROOM.maxX || r.c.y - ez < ROOM.minZ || r.c.y + ez > ROOM.maxZ) problems.push(`${r.label} sticks out of the room`);
  });
  return problems;
}
