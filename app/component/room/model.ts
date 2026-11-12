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
import type { MachineParts } from "../machine/parts";

import { ROOM, ROOM_LAYOUT, type MachinePlacement, type MachineType } from "./floorPlan";

export { ROOM, ROOM_LAYOUT, ROOM_NAME, MACHINE_IDS } from "./floorPlan";
export type { MachinePlacement, MachineType } from "./floorPlan";

const FACTORIES: Record<MachineType, () => MachineParts> = {
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
const PILLAR_SIZE = 0.5;
const WALL_THICKNESS = 0.1;
/** Clear space kept between a column and the end of any glass wall panel. */
const COLUMN_GAP = 0.15;

/** Building columns (red in the drawing): one near the left wall, one free-standing. */
export const PILLARS = [
  { x: -9.22, z: -1.54 },
  { x: 2.02, z: -0.73 },
];

/**
 * Straight glass wall (yellow line on the plan) running front-to-back just right of the
 * left column, COLUMN_GAP clear of it, from FEED ROLLER FRG-02 to LEFT TRANSMISSION LTA-01
 * (0.1 m clear of each). Same height as the room walls.
 */
export const COLUMN_PARTITION = {
  x: PILLARS[0].x + PILLAR_SIZE / 2 + COLUMN_GAP,
  zBack: -3.56,
  zFront: -0.21,
};

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

  // Back-left and back walls (translucent so the machines behind them stay visible), with
  // short returns at the front ends as in the drawing
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xc9ccd2, transparent: true, opacity: 0.35, roughness: 0.8, side: THREE.DoubleSide, depthWrite: false });
  const t = WALL_THICKNESS;
  /**
   * Glass wall panel of size w (x) × d (z) centred at (x, z). Wherever a column (plus a
   * clear gap) touches the panel's line, the panel is cut there and stops short of the
   * column on both sides — the glass never runs through, overlaps or wraps a column.
   */
  const wall = (w: number, d: number, x: number, z: number) => {
    const alongX = w >= d;
    let runs: [number, number][] = [alongX ? [x - w / 2, x + w / 2] : [z - d / 2, z + d / 2]];
    for (const p of PILLARS) {
      const r = PILLAR_SIZE / 2 + COLUMN_GAP;
      const [across, acrossHalf, pAcross, pAlong] = alongX ? [z, d / 2, p.z, p.x] : [x, w / 2, p.x, p.z];
      if (Math.abs(pAcross - across) >= r + acrossHalf) continue; // column clear of this panel's line
      const cut: [number, number] = [pAlong - r, pAlong + r];
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
  wall(t, D + t, x0 - t / 2, cz);
  wall(t, 1.2, x1 + t / 2, z0 + 0.6);
  wall(1.2, t, x0 + 0.6, z1 + t / 2);
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

/** Builds the whole room. Each machine type is built once and cloned (shared geometry). */
export function createRoom(layout: MachinePlacement[] = ROOM_LAYOUT): MachineParts {
  const root = new THREE.Group();
  root.add(createRoomShell());
  const prototypes = new Map<MachineType, THREE.Object3D>();
  for (const place of layout) {
    let proto = prototypes.get(place.type);
    if (!proto) {
      proto = FACTORIES[place.type]().object;
      prototypes.set(place.type, proto);
    }
    const machine = proto.clone(true);
    machine.position.set(place.x, 0, place.z);
    machine.rotation.y = place.rotation ?? 0;
    machine.scale.setScalar(place.scale ?? 1);
    machine.name = place.id;
    machine.userData = { kind: "machine", id: place.id, type: place.type };
    root.add(machine);
  }
  return { object: root };
}
