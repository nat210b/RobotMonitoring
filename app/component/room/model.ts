import * as THREE from "three";
import { createFeedRollerGearClusterAssembly } from "../machine/FeedRollerGearClusterAssembly/model";
import { createLeftTransmissionAssembly } from "../machine/LeftTransmissionAssembly/model";
import { createPadElastomerAssembly } from "../machine/PadElastomerAssembly/model";
import { createPhotoTrayAssembly } from "../machine/PhotoTrayAssembly/model";
import { createPickArmAssembly1 } from "../machine/PickArmAssembly1/model";
import { createPickArmAssembly2 } from "../machine/PickArmAssembly2/model";
import { createPickDriveAssembly } from "../machine/PickDriveAssembly/model";
import { createPulleyTurnaroundAssembly } from "../machine/PulleyTurnaroundAssembly/model";
import { createUpgAssembly } from "../machine/UpgAssembly/model";
import { ROBOT_CYCLE, type MachineParts } from "../machine/parts";

import { createAgvRoute } from "./agv";
import { createFloorSign, createPillarSign } from "./floorSign";
import { ROOM, ROOM_FLOOR_SIGNS, ROOM_LAYOUT, type MachinePlacement, type MachineType } from "./floorPlan";

export { ROOM, ROOM_LAYOUT, ROOM_NAME, MACHINE_IDS } from "./floorPlan";
export type { MachinePlacement, MachineType } from "./floorPlan";

export const MACHINE_FACTORIES: Record<MachineType, () => MachineParts> = {
  "FEED ROLLER GEAR CLUSTER ASSEMBLY": createFeedRollerGearClusterAssembly,
  "LEFT TRANSMISSION ASSEMBLY": createLeftTransmissionAssembly,
  "PAD ELASTOMER ASSEMBLY": createPadElastomerAssembly,
  "PHOTO TRAY ASSEMBLY": createPhotoTrayAssembly,
  "PICK ARM ASSEMBLY1": createPickArmAssembly1,
  "PICK ARM ASSEMBLY2": createPickArmAssembly2,
  "PICK DRIVE ASSEMBLY": createPickDriveAssembly,
  "PULLEY TURNAROUND ASSEMBLY": createPulleyTurnaroundAssembly,
  "UPG ASSEMBLY": createUpgAssembly,
};

/** Building columns are 0.5 m square in the drawing. */
export const PILLAR_SIZE = 0.5;
const WALL_THICKNESS = 0.1;
/** Clear space kept between a column and the end of any glass wall panel. */
const COLUMN_GAP = 0.15;

/** Building columns (red in the drawing): one near the left wall, one free-standing. */
export const PILLARS = [
  { x: -9.22, z: -1.54 },
  { x: 2.02, z: -1.54 }, // same z as the left column, so the two line up along x
];

/**
 * Straight glass wall running front-to-back just right of the left column, COLUMN_GAP clear
 * of it. It ends exactly at the two screens that run from the left wall (see createRoomShell),
 * so the three glass walls form one closed bay round the column. Same height as the room walls.
 */
export const COLUMN_PARTITION = {
  x: PILLARS[0].x + PILLAR_SIZE / 2 + COLUMN_GAP,
  zBack: -3.14,
  zFront: -1.14,
};

/**
 * Front wall along the open front side (z = ROOM.maxZ): the entrance and the windows.
 * `x` is the opening's centre (m, room origin = floor centre), `width` its width.
 * Doors reach the floor up to `height`; windows run from `sill` up to `head`.
 * Edit this list to move, add or remove openings.
 */
type FrontOpening = { kind: "door"; x: number; width: number; height: number } | { kind: "window"; x: number; width: number; sill: number; head: number };
export const FRONT_WALL_OPENINGS: FrontOpening[] = [
  // Entrance: an open gap, full wall height (no lintel), 8 floor tiles wide. One tile of wall is
  // left between it and the left wall (tiles start at ROOM.minX).
  { kind: "door", x: ROOM.minX + ROOM.tile + (8 * ROOM.tile) / 2, width: 8 * ROOM.tile, height: ROOM.wallHeight },
  // Five windows, each a single pane
  ...[-3, 0, 3, 6, 9].map((x): FrontOpening => ({ kind: "window", x, width: 2 * ROOM.tile, sill: 0.9, head: 2.1 })),
];

/** Glass partition thickness, frame size and max panel width. */
const PARTITION = { glass: 0.012, post: 0.035, maxPanel: 0.95 };

/**
 * Framed glass partition `h` tall along an axis-aligned polyline (x, z points): clear glass
 * panels between slim aluminium posts (at every corner/end and at most `maxPanel` apart),
 * with a top rail and a floor rail.
 */
function createGlassPartition(points: [number, number][], h: number) {
  const g = new THREE.Group();
  g.userData.kind = "partition";
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xdbe6ef,
    transparent: true,
    opacity: 0.22,
    roughness: 0.05,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xc5cbd3, roughness: 0.35, metalness: 0.55 });
  const { glass, post, maxPanel } = PARTITION;
  const addPost = (x: number, z: number) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(post, h, post), frameMat);
    p.position.set(x, h / 2, z);
    g.add(p);
  };
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, az] = points[i];
    const [bx, bz] = points[i + 1];
    const alongX = Math.abs(bx - ax) > Math.abs(bz - az);
    const len = alongX ? Math.abs(bx - ax) : Math.abs(bz - az);
    const n = Math.max(1, Math.ceil(len / maxPanel));
    for (let k = 0; k < n; k++) {
      const t0 = k / n;
      const t1 = (k + 1) / n;
      const cx = ax + (bx - ax) * ((t0 + t1) / 2);
      const cz = az + (bz - az) * ((t0 + t1) / 2);
      const pw = len / n - post;
      const panel = new THREE.Mesh(new THREE.BoxGeometry(alongX ? pw : glass, h - 2 * post, alongX ? glass : pw), glassMat);
      panel.position.set(cx, h / 2, cz);
      g.add(panel);
      if (k > 0) addPost(ax + (bx - ax) * t0, az + (bz - az) * t0);
    }
    for (const y of [post / 2, h - post / 2]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(alongX ? len : post, post, alongX ? post : len), frameMat);
      rail.position.set((ax + bx) / 2, y, (az + bz) / 2);
      g.add(rail);
    }
  }
  for (const [x, z] of points) addPost(x, z);
  return g;
}

function createRoomShell() {
  const g = new THREE.Group();
  const { minX: x0, maxX: x1, minZ: z0, maxZ: z1, width: W, depth: D, wallHeight: H, tile } = ROOM;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;

  // Floor with tile joints (grid starts at the back-left corner, as in the drawing)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ color: 0xeceef1, roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(cx, -0.001, cz);
  g.add(floor);
  const pts: number[] = [];
  for (let x = x0; x <= x1 + 1e-6; x += tile) pts.push(x, 0.001, z0, x, 0.001, z1);
  for (let z = z0; z <= z1 + 1e-6; z += tile) pts.push(x0, 0.001, z, x1, 0.001, z);
  const joints = new THREE.BufferGeometry();
  joints.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  g.add(new THREE.LineSegments(joints, new THREE.LineBasicMaterial({ color: 0xc3c8cf })));
  // Front and back screens of the left column: each runs from the left wall to the column
  // partition and stops there, so the three glass walls form one closed bay round the column.
  for (const z of [COLUMN_PARTITION.zFront, COLUMN_PARTITION.zBack]) g.add(createGlassPartition([[x0, z], [COLUMN_PARTITION.x, z]], H));

  // Back-left and back walls (translucent so the machines behind them stay visible), with
  // short returns at the front ends as in the drawing
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xc9ccd2, transparent: true, opacity: 0.35, roughness: 0.8, side: THREE.DoubleSide, depthWrite: false });
  const t = WALL_THICKNESS;
  /**
   * Glass wall panel of size w (x) × d (z) centred at (x, z). Wherever a column (plus a
   * clear gap) touches the panel's line, the panel is cut there and stops short of the
   * column on both sides — the glass never runs through, overlaps or wraps a column.
   * `openings` are extra [from, to] ranges along the wall (x for walls along x, z otherwise)
   * left out entirely.
   */
  const wall = (w: number, d: number, x: number, z: number, openings: [number, number][] = []) => {
    const alongX = w >= d;
    let runs: [number, number][] = [alongX ? [x - w / 2, x + w / 2] : [z - d / 2, z + d / 2]];
    const cuts: [number, number][] = [...openings];
    for (const p of PILLARS) {
      const r = PILLAR_SIZE / 2 + COLUMN_GAP;
      const [across, acrossHalf, pAcross, pAlong] = alongX ? [z, d / 2, p.z, p.x] : [x, w / 2, p.x, p.z];
      if (Math.abs(pAcross - across) >= r + acrossHalf) continue; // column clear of this panel's line
      cuts.push([pAlong - r, pAlong + r]);
    }
    for (const cut of cuts) {
      runs = runs.flatMap(([a, b]): [number, number][] => {
        if (cut[1] <= a || cut[0] >= b) return [[a, b]];
        const out: [number, number][] = [];
        if (cut[0] > a) out.push([a, cut[0]]);
        if (cut[1] < b) out.push([cut[1], b]);
        return out;
      });
    }
    for (const [a, b] of runs) {
      if (b - a < 0.02) continue;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(alongX ? b - a : w, H, alongX ? d : b - a), wallMat);
      mesh.position.set(alongX ? (a + b) / 2 : x, H / 2, alongX ? z : (a + b) / 2);
      mesh.userData.kind = "wall";
      g.add(mesh);
    }
  };
  wall(W + t, t, cx, z0 - t / 2);

  // Front wall: same translucent wall as the back wall (wallMat), with the entrance and the five
  // windows (see FRONT_WALL_OPENINGS): full-height pieces between openings, a lintel over and a
  // sill under each window, and a glazed, framed pane in every window.
  {
    const zf = z1 + t / 2;
    const wallBox = (xa: number, xb: number, ya: number, yb: number) => {
      if (xb - xa < 0.01 || yb - ya < 0.01) return;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(xb - xa, yb - ya, t), wallMat);
      mesh.position.set((xa + xb) / 2, (ya + yb) / 2, zf);
      mesh.userData.kind = "wall";
      g.add(mesh);
    };
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x4a4d52, roughness: 0.5, metalness: 0.4 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0xdbe6ef, transparent: true, opacity: 0.25, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false });
    const bar = (w: number, h: number, x: number, y: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, t * 0.6), frameMat);
      m.position.set(x, y, zf);
      g.add(m);
    };
    let cursor = x0 - t; // the front wall starts at the outer face of the left wall
    for (const o of [...FRONT_WALL_OPENINGS].sort((a, b) => a.x - b.x)) {
      const a = o.x - o.width / 2;
      const b = o.x + o.width / 2;
      wallBox(cursor, a, 0, H);
      if (o.kind === "door") {
        wallBox(a, b, o.height, H);
      } else {
        wallBox(a, b, 0, o.sill);
        wallBox(a, b, o.head, H);
        const f = 0.04; // frame bar size
        const h = o.head - o.sill;
        const pane = new THREE.Mesh(new THREE.BoxGeometry(o.width, h, 0.01), glassMat);
        pane.position.set(o.x, o.sill + h / 2, zf);
        g.add(pane);
        bar(o.width, f, o.x, o.sill + f / 2);
        bar(o.width, f, o.x, o.head - f / 2);
        for (const x of [a + f / 2, b - f / 2]) bar(f, h, x, o.sill + h / 2);
      }
      cursor = b;
    }
    wallBox(cursor, x1, 0, H);
  }
  wall(t, D + t, x0 - t / 2, cz, [[COLUMN_PARTITION.zBack, COLUMN_PARTITION.zFront]]); // open behind the column bay
  wall(t, 1.2, x1 + t / 2, z0 + 0.6);
  const edge = new THREE.LineBasicMaterial({ color: 0x9aa1ab });
  for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1]]) {
    const post = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, 0, z), new THREE.Vector3(x, H, z)]);
    g.add(new THREE.Line(post, edge));
  }

  // Columns
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x9c1c1c, roughness: 0.6 });
  for (const p of PILLARS) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(PILLAR_SIZE, H + 0.6, PILLAR_SIZE), pillarMat);
    mesh.position.set(p.x, (H + 0.6) / 2, p.z);
    g.add(mesh);
    // Team plate on the front (+z) and back (-z) face of the column.
    for (const side of [1, -1]) {
      const plate = createPillarSign("TH-CP1-Innovation Team", PILLAR_SIZE * 0.8, 2.2);
      plate.position.set(p.x, 1.55, p.z + side * (PILLAR_SIZE / 2 + 0.004));
      if (side === -1) plate.rotation.y = Math.PI;
      g.add(plate);
    }
  }
  const cp = COLUMN_PARTITION;
  g.add(
    createGlassPartition(
      [
        [cp.x, cp.zBack],
        [cp.x, cp.zFront],
      ],
      H,
    ),
  );
  return g;
}

/** Every node under `root`, in traversal order (a deep clone lists its nodes in the same order). */
function nodesOf(root: THREE.Object3D) {
  const nodes: THREE.Object3D[] = [];
  root.traverse((o) => nodes.push(o));
  return nodes;
}

/**
 * Indices (in nodesOf order) of the nodes a machine's update moves — robot joints, quills,
 * table discs, feeder bowls, pallets — found by playing two robot cycles.
 */
function animatedNodeIndices(parts: MachineParts) {
  const nodes = nodesOf(parts.object);
  if (!parts.update) return [];
  parts.update(0);
  const rest = nodes.map((o) => [o.position.clone(), o.quaternion.clone(), o.scale.clone()] as const);
  const moved = new Set<number>();
  for (let t = 0.05; t <= 2 * ROBOT_CYCLE; t += 0.05) {
    parts.update(t);
    nodes.forEach((o, i) => {
      const [p, q, sc] = rest[i];
      if (!o.position.equals(p) || !o.quaternion.equals(q) || !o.scale.equals(sc)) moved.add(i);
    });
  }
  parts.update(0);
  return [...moved];
}

/**
 * Builds the whole room. Each machine type is built once and cloned (shared geometry). The
 * clones copy their prototype's moving parts every frame, each machine running its cycle at
 * its own time offset so identical cells don't move in lockstep.
 */
export function createRoom(layout: MachinePlacement[] = ROOM_LAYOUT): MachineParts {
  const root = new THREE.Group();
  root.add(createRoomShell());
  for (const sign of ROOM_FLOOR_SIGNS) root.add(createFloorSign(sign));
  const agv = createAgvRoute();
  root.add(agv.object);
  const prototypes = new Map<MachineType, { parts: MachineParts; moving: THREE.Object3D[]; indices: number[] }>();
  const instances: { proto: { parts: MachineParts; moving: THREE.Object3D[] }; moving: THREE.Object3D[]; delay: number }[] = [];
  layout.forEach((place, i) => {
    let proto = prototypes.get(place.type);
    if (!proto) {
      const parts = MACHINE_FACTORIES[place.type]();
      const indices = animatedNodeIndices(parts);
      const nodes = nodesOf(parts.object);
      proto = { parts, indices, moving: indices.map((k) => nodes[k]) };
      prototypes.set(place.type, proto);
    }
    const machine = proto.parts.object.clone(true);
    machine.position.set(place.x, 0, place.z);
    machine.rotation.y = place.rotation ?? 0;
    machine.scale.setScalar(place.scale ?? 1);
    machine.name = place.id;
    machine.userData = { kind: "machine", id: place.id, type: place.type };
    root.add(machine);
    const nodes = nodesOf(machine);
    // Golden-ratio spread of start times across the cycle.
    instances.push({ proto, moving: proto.indices.map((k) => nodes[k]), delay: ((i * 0.618034) % 1) * ROBOT_CYCLE });
  });

  const update = (t: number) => {
    agv.update?.(t);
    for (const { proto, moving, delay } of instances) {
      if (!moving.length) continue;
      proto.parts.update?.(t + delay);
      proto.moving.forEach((src, k) => {
        const dst = moving[k];
        dst.position.copy(src.position);
        dst.quaternion.copy(src.quaternion);
        dst.scale.copy(src.scale);
      });
    }
  };
  return { object: root, update };
}
