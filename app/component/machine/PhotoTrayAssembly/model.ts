import * as THREE from "three";
import {
  beam,
  box,
  createBowlFeeder,
  createMaterials,
  createSixAxisRobot,
  cylinder,
  sixAxisPose,
  type MachineParts,
  type Materials,
  type RobotMotion,
} from "../parts";

/**
 * PHOTO TRAY ASSEMBLY cell, modelled from the drawings in
 * app/machine_data/PHOTO TRAY ASSEMBLY/ (front, back, left, right, top, iso).
 *
 * Open cell: a long table carrying two rotary index tables with fixture nests, five
 * Epson-style 6-axis robots on black steel stands around it, a bowl feeder on its own
 * stand, two tray racks, two U-shaped guard fences (glass upper half), HMI and stack lights.
 *
 * Units are metres. Plan positions come from the top view at ~2.8 mm per drawing pixel
 * (the front view shares that scale; table height ≈ 0.87 m).
 * Axes: +x = right, +y = up, +z = front (operator side).
 */
export const LAYOUT = {
  width: 3.7,
  depth: 2.9,
  tableHeight: 0.87,
  fenceHeight: 1.43,
};

const K = 0.0028;
/** Top-view drawing pixel → metres (drawing centre at px 742, 510). */
const fromTop = (px: number, py: number) => ({ x: (px - 742) * K, z: (py - 510) * K });

type XZ = { x: number; z: number };

/** Black steel robot stand: top plate, four legs, cross bars, splayed foot plate with levellers. */
function createRobotStand(m: Materials, height: number, size = 0.42) {
  const g = new THREE.Group();
  const s = size / 2 - 0.04;
  g.add(box(size, 0.03, size, m.blackSteel, 0, height - 0.015, 0));
  for (const x of [-s, s]) for (const z of [-s, s]) g.add(box(0.06, height - 0.05, 0.06, m.blackSteel, x, (height - 0.05) / 2 + 0.02, z));
  for (const y of [height * 0.55, 0.12]) {
    g.add(box(size - 0.04, 0.05, 0.05, m.blackSteel, 0, y, -s), box(size - 0.04, 0.05, 0.05, m.blackSteel, 0, y, s));
    g.add(box(0.05, 0.05, size - 0.04, m.blackSteel, -s, y, 0), box(0.05, 0.05, size - 0.04, m.blackSteel, s, y, 0));
  }
  const foot = size + 0.16;
  g.add(box(foot, 0.02, foot, m.blackSteel, 0, 0.03, 0));
  for (const x of [-1, 1]) for (const z of [-1, 1]) {
    g.add(cylinder(0.008, 0.008, 0.04, m.steel, (x * foot) / 2 - x * 0.03, 0.02, (z * foot) / 2 - z * 0.03, 10));
    g.add(cylinder(0.025, 0.03, 0.01, m.steel, (x * foot) / 2 - x * 0.03, 0.005, (z * foot) / 2 - z * 0.03, 16));
  }
  return g;
}

/** Large rotary index plate with fixture nests (dark plates with red locators). */
function createIndexTable(m: Materials, radius: number, nests: number, offset = 0) {
  const g = new THREE.Group();
  g.add(cylinder(radius * 0.25, radius * 0.25, 0.04, m.robotGrey, 0, 0.02, 0));
  const disc = new THREE.Group();
  disc.position.y = 0.04;
  g.add(disc);
  disc.add(cylinder(radius, radius, 0.015, m.sheet, 0, 0.0075, 0, 64));
  disc.add(cylinder(radius * 0.42, radius * 0.42, 0.004, m.robotGrey, 0, 0.017, 0, 48));
  for (let i = 0; i < nests; i++) {
    const a = offset + (i / nests) * Math.PI * 2;
    const nest = new THREE.Group();
    nest.position.set(Math.cos(a) * radius * 0.72, 0.015, Math.sin(a) * radius * 0.72);
    nest.rotation.y = -a;
    nest.add(box(0.22, 0.03, 0.26, m.dark, 0, 0.015, 0));
    nest.add(box(0.16, 0.012, 0.18, m.robotGrey, 0, 0.036, 0));
    nest.add(box(0.03, 0.025, 0.03, m.red, 0.04, 0.05, 0.02));
    nest.add(box(0.02, 0.04, 0.2, m.steel, -0.1, 0.04, 0));
    disc.add(nest);
  }
  return g;
}

/** Open aluminium tray rack with three shelves of black trays laid in lanes. */
function createTrayRack(m: Materials, a: XZ, b: XZ, height: number, lanesAlong: "x" | "z", lanes: number) {
  const g = new THREE.Group();
  const w = b.x - a.x;
  const d = b.z - a.z;
  const P = 0.035;
  const x0 = -w / 2 + P / 2;
  const x1 = w / 2 - P / 2;
  const z0 = -d / 2 + P / 2;
  const z1 = d / 2 - P / 2;
  for (const x of [x0, x1]) for (const z of [z0, z1]) g.add(beam([x, 0, z], [x, height, z], P, m.aluminum));
  const shelves = [0.25, 0.55, height - P / 2];
  for (const y of shelves) {
    g.add(beam([x0, y, z0], [x1, y, z0], P, m.aluminum), beam([x0, y, z1], [x1, y, z1], P, m.aluminum));
    g.add(beam([x0, y, z0], [x0, y, z1], P, m.aluminum), beam([x1, y, z0], [x1, y, z1], P, m.aluminum));
    for (let i = 0; i < lanes; i++) {
      const f = (i + 0.5) / lanes - 0.5;
      const lane = lanesAlong === "z"
        ? box(0.07, 0.035, d - 0.08, m.dark, f * (w - 0.08), y + 0.035, 0)
        : box(w - 0.08, 0.035, 0.07, m.dark, 0, y + 0.035, f * (d - 0.08));
      g.add(lane);
    }
  }
  g.position.set((a.x + b.x) / 2, 0, (a.z + b.z) / 2);
  return g;
}

/** Guard fence along a polyline: posts, top / mid rails, glass in the upper half. */
function createFence(m: Materials, points: XZ[], height: number, glassFrom: number) {
  const g = new THREE.Group();
  const P = 0.04;
  for (const p of points) g.add(beam([p.x, 0, p.z], [p.x, height, p.z], P, m.aluminum));
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    for (const y of [height - P / 2, glassFrom, 0.05]) g.add(beam([a.x, y, a.z], [b.x, y, b.z], P, m.aluminum));
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const glass = box(Math.abs(b.x - a.x) > 0.01 ? len - P : 0.004, height - glassFrom - P, Math.abs(b.z - a.z) > 0.01 ? len - P : 0.004, m.glass, (a.x + b.x) / 2, (glassFrom + height) / 2, (a.z + b.z) / 2);
    g.add(glass);
  }
  return g;
}

function createStackLight(m: Materials, x: number, z: number, from: number, to: number) {
  const g = new THREE.Group();
  g.add(cylinder(0.012, 0.012, to - from, m.steel, x, (from + to) / 2, z, 12));
  [m.pcb, m.amber, m.red].forEach((mat, i) => g.add(cylinder(0.03, 0.03, 0.055, mat, x, to + 0.03 + i * 0.057, z, 20)));
  return g;
}

export function createPhotoTrayAssembly(): MachineParts {
  const m = createMaterials();
  const { tableHeight: tableH, fenceHeight } = LAYOUT;
  const root = new THREE.Group();
  const add = (...objects: THREE.Object3D[]) => root.add(...objects);
  const movers: { update: (t: number) => void }[] = [];

  // ── Main table (px 430–1190 × 200–578), split in two halves ────────────
  const t0 = fromTop(430, 200);
  const t1 = fromTop(1190, 578);
  const P = 0.045;
  const tw = t1.x - t0.x;
  const td = t1.z - t0.z;
  const tcx = (t0.x + t1.x) / 2;
  const tcz = (t0.z + t1.z) / 2;
  add(box(tw, 0.025, td, m.sheet, tcx, tableH - 0.0125, tcz));
  add(box(0.006, 0.026, td, m.dark, fromTop(810, 0).x, tableH - 0.012, tcz)); // seam between halves
  const lx = [t0.x + P / 2, fromTop(810, 0).x, t1.x - P / 2];
  const lz = [t0.z + P / 2, t1.z - P / 2];
  for (const x of lx) for (const z of lz) add(beam([x, 0, z], [x, tableH - 0.025, z], P, m.blackSteel));
  for (const y of [tableH - 0.05, 0.3, 0.1]) {
    for (const z of lz) add(beam([lx[0], y, z], [lx[2], y, z], P, m.blackSteel));
    for (const x of lx) add(beam([x, y, lz[0]], [x, y, lz[1]], P, m.blackSteel));
  }

  // Two rotary index tables with six nests each
  const dialL = fromTop(620, 390);
  const dialR = fromTop(1002, 390);
  for (const [dial, offset] of [[dialL, Math.PI / 6], [dialR, 0]] as const) {
    const table = createIndexTable(m, 0.49, 6, offset);
    table.position.set(dial.x, tableH, dial.z);
    add(table);
  }

  // ── Five 6-axis robots on stands ──────────────────────────────────────
  // Each robot works its own nest: the nest on the side of its dial facing the robot.
  // The back-middle robot transfers between the two dials, so it targets the gap
  // between them. Each robot picks at its nest and swings J1 to a place pose; the swing
  // directions and staggered cycle offsets keep the arms apart while they move
  // (scripts/check-motion.ts).
  const nestRadius = 0.35;
  const facing = (dial: XZ, base: XZ) => {
    const dx = base.x - dial.x;
    const dz = base.z - dial.z;
    const d = Math.hypot(dx, dz);
    return { x: dial.x + (dx / d) * nestRadius, z: dial.z + (dz / d) * nestRadius };
  };
  const robots: { base: [number, number]; target: (b: XZ) => XZ; motion: Partial<RobotMotion> }[] = [
    { base: [310, 445], target: (b) => facing(dialL, b), motion: { swing: [-1.1] } }, // left
    { base: [815, 85], target: () => fromTop(812, 330), motion: { swing: [-1.1] } }, // back-middle (between dials)
    { base: [1065, 85], target: (b) => facing(dialR, b), motion: { swing: [1.1] } }, // back-right
    { base: [1310, 400], target: (b) => facing(dialR, b), motion: { swing: [1.1], dip: 0.06 } }, // right
    { base: [1000, 700], target: (b) => facing(dialR, b), motion: { swing: [1.1] } }, // front
  ];
  const standH = tableH;
  const robotScale = 1.45;
  const nestTop = tableH + 0.1;
  const toolLength = 0.25; // wrist to gripper tip plus ~5 cm hover, world metres
  robots.forEach(({ base, target, motion }, i) => {
    const b = fromTop(...base);
    const t = target(b);
    const stand = createRobotStand(m, standH);
    stand.position.set(b.x, 0, b.z);
    add(stand);
    const pose = sixAxisPose(Math.hypot(t.x - b.x, t.z - b.z) / robotScale, (nestTop + toolLength - standH) / robotScale);
    const robot = createSixAxisRobot(m, { ...pose, body: m.epson, baseCover: "connector", offset: i / robots.length, ...motion });
    robot.object.scale.setScalar(robotScale);
    robot.object.position.set(b.x, standH, b.z);
    robot.object.rotation.y = Math.atan2(-(t.z - b.z), t.x - b.x);
    add(robot.object);
    movers.push(robot);
  });

  // ── Bowl feeder on its stand (back-left, px 430–570 × 25–165) ───────────
  const bowlAt = fromTop(500, 95);
  const bowlStandH = 0.64;
  const bowlStand = createRobotStand(m, bowlStandH, 0.4);
  bowlStand.position.set(bowlAt.x, 0, bowlAt.z);
  add(bowlStand);
  const bowl = createBowlFeeder(m, 0.1);
  bowl.object.scale.setScalar(1.8);
  bowl.object.position.set(bowlAt.x, bowlStandH, bowlAt.z);
  bowl.object.rotation.y = -Math.PI / 2; // outlet toward the table
  add(bowl.object);

  // ── Tray racks: front-left (lanes run front-back) and right (lanes run left-right) ──
  add(createTrayRack(m, fromTop(465, 580), fromTop(740, 785), 0.85, "z", 4));
  add(createTrayRack(m, fromTop(1195, 585), fromTop(1400, 860), 0.85, "x", 4));

  // ── Guard fences (glass from 0.83 m up) ──────────────────────────────
  const glassFrom = 0.83;
  add(createFence(m, [fromTop(425, 240), fromTop(90, 240), fromTop(90, 670), fromTop(425, 670)], fenceHeight, glassFrom));
  add(createFence(m, [fromTop(750, 585), fromTop(750, 1020), fromTop(1185, 1020), fromTop(1185, 590)], fenceHeight, glassFrom));

  // HMI cabinet on the front fence (left side panel, facing -x)
  const hmi = fromTop(755, 950);
  add(box(0.08, 0.45, 0.36, m.dark, hmi.x + 0.04, 1.2, hmi.z));
  add(box(0.004, 0.2, 0.24, m.screen, hmi.x - 0.002, 1.24, hmi.z - 0.02));
  const estop = cylinder(0.018, 0.018, 0.012, m.red, hmi.x - 0.004, 1.24, hmi.z + 0.14, 16);
  estop.rotation.z = Math.PI / 2;
  add(estop);

  // Stack lights: on the left fence corner and on the table's front corner
  const sl1 = fromTop(445, 242);
  const sl2 = fromTop(748, 562);
  add(createStackLight(m, sl1.x, sl1.z, fenceHeight, 1.5));
  add(createStackLight(m, sl2.x, sl2.z, tableH, 1.52));

  const update = (t: number) => movers.forEach((part) => part.update(t));
  update(0);
  return { object: root, update };
}
