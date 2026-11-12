import * as THREE from "three";
import {
  beam,
  box,
  createBowlFeeder,
  createCaster,
  createMaterials,
  createScara,
  cylinder,
  panelXY,
  panelZY,
  type MachineParts,
  type RobotMotion,
  type Materials,
} from "../parts";

/**
 * UPG ASSEMBLY station, modelled from the drawings in
 * app/machine_data/UPG ASSEMBLY/ (front, back, left, right, top, iso).
 *
 * Open table (no enclosure) on casters: aluminium frame with light panels, a keyboard
 * drawer, an open OK-bin bay and a red NG-bin bay at the front. The worktop is grey with
 * mint-green plates at the front; the back-left is a recess holding two grey bowl feeders
 * on a lower shelf. Three Delta SCARAs (front-left, back-middle, front-right) work around
 * a grey rotary table with eight nests; a large green bowl feeder on a white base feeds a
 * long linear track. Slides and cylinders along the back and front edges.
 *
 * Units are metres; top view ≈ 1.5 mm per drawing pixel (front view shares the scale),
 * sized from the SCARAs' reach. Axes: +x = right, +y = up, +z = front.
 */
export const FRAME = {
  width: 1.94,
  depth: 1.23,
  tableHeight: 0.885,
  casterHeight: 0.105,
};

const K = 0.0015;
/** Top-view drawing pixel → metres (table centre at px 754, 428). */
const fromTop = (px: number, py: number) => ({ x: (px - 754) * K, z: (py - 428) * K });
/** Front-view drawing pixel row → height above the floor (floor at px 930). */
const fromFrontY = (py: number) => (930 - py) * K;

type XZ = { x: number; z: number };

/** Axis-aligned plate between two top-view pixel corners, `t` thick, top at `y`. */
function plate(m: Materials, mat: THREE.Material, a: [number, number], b: [number, number], y: number, t = 0.015) {
  const p = fromTop(...a);
  const q = fromTop(...b);
  return box(q.x - p.x, t, q.z - p.z, mat, (p.x + q.x) / 2, y - t / 2, (p.z + q.z) / 2);
}

/** Grey rotary table with eight green nests. */
function createNestTable(m: Materials, radius: number) {
  const g = new THREE.Group();
  g.add(cylinder(radius * 0.3, radius * 0.32, 0.05, m.robotGrey, 0, 0.025, 0));
  g.add(cylinder(radius, radius, 0.015, m.sheet, 0, 0.0575, 0, 64));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const nest = new THREE.Group();
    nest.position.set(Math.cos(a) * radius * 0.78, 0.065, Math.sin(a) * radius * 0.78);
    nest.rotation.y = -a;
    nest.add(box(0.06, 0.02, 0.07, m.steel, 0, 0.01, 0));
    nest.add(box(0.045, 0.02, 0.05, m.feederGreen, 0, 0.03, 0));
    nest.add(box(0.012, 0.012, 0.03, m.accentBlue, 0.012, 0.045, 0));
    g.add(nest);
  }
  return g;
}

/** Open-top tub (bin) narrowing toward the bottom, with a label plate on the front. */
function createBin(m: Materials, w: number, h: number, d: number, mat: THREE.Material) {
  const g = new THREE.Group();
  const t = 0.006;
  g.add(box(w * 0.85, t, d * 0.85, mat, 0, t / 2, 0));
  for (const s of [-1, 1]) {
    const side = box(t, h, d, mat, s * (w * 0.46), h / 2, 0);
    side.rotation.z = s * 0.08;
    g.add(side);
    const fb = box(w, h, t, mat, 0, h / 2, s * (d / 2));
    g.add(fb);
  }
  return g;
}

export function createUpgAssembly(): MachineParts {
  const m = createMaterials();
  const { width: W, depth: D, tableHeight: T, casterHeight: C } = FRAME;
  const P = 0.035;
  const root = new THREE.Group();
  const add = (...objects: THREE.Object3D[]) => root.add(...objects);
  const movers: { update: (t: number) => void }[] = [];

  // ── Table frame (aluminium) ─────────────────────────────────────────────
  const x0 = -W / 2 + P / 2;
  const x1 = W / 2 - P / 2;
  const z0 = -D / 2 + P / 2;
  const z1 = D / 2 - P / 2;
  const rail = (a: [number, number, number], b: [number, number, number]) => add(beam(a, b, P, m.aluminum));
  const postXs = [x0, fromTop(495, 0).x, fromTop(915, 0).x, x1];
  for (const x of postXs) for (const z of [z0, z1]) rail([x, C, z], [x, T - 0.015, z]);
  for (const y of [C + P / 2, fromFrontY(520), T - 0.015 - P / 2]) {
    rail([x0, y, z0], [x1, y, z0]);
    rail([x0, y, z1], [x1, y, z1]);
    rail([x0, y, z0], [x0, y, z1]);
    rail([x1, y, z0], [x1, y, z1]);
  }
  for (const [px, sx] of [[200, -1], [570, 1], [830, 1], [1305, 1]] as const) {
    for (const z of [-D / 2 + 0.08, D / 2 - 0.08]) {
      const caster = createCaster(m, C);
      caster.position.set(fromTop(px, 0).x, 0, z);
      caster.rotation.y = sx < 0 ? Math.PI : 0;
      add(caster);
    }
  }

  // ── Lower body: back / side panels, front panels with OK and NG bays ─────
  const fz = D / 2 - 0.004;
  const yMid = fromFrontY(520);
  const yTop = T - 0.05;
  const yLow = C + 0.04;
  add(panelXY(x0, x1, yLow, yTop, -D / 2 + 0.004, m.sheet, 0.006));
  add(panelZY(z0, z1, yLow, yTop, -W / 2 + 0.004, m.sheet, 0.006), panelZY(z0, z1, yLow, yTop, W / 2 - 0.004, m.sheet, 0.006));
  // Left section: keyboard drawer above a full panel
  const lx0 = fromTop(125, 0).x;
  const lx1 = fromTop(485, 0).x;
  add(panelXY(lx0, lx1, yLow, fromFrontY(455), fz, m.sheet, 0.006));
  add(box(lx1 - lx0, 0.06, 0.4, m.panelGrey, (lx0 + lx1) / 2, fromFrontY(418), fz - 0.2)); // drawer
  add(box(0.42, 0.015, 0.16, m.dark, (lx0 + lx1) / 2, fromFrontY(410), fz - 0.1)); // keyboard
  // Middle section: upper panel, open bay with the OK bin on a shelf
  const mx0 = fromTop(505, 0).x;
  const mx1 = fromTop(905, 0).x;
  add(panelXY(mx0, mx1, yMid + 0.01, yTop, fz, m.sheet, 0.006));
  add(box(mx1 - mx0, 0.015, D * 0.6, m.panelGrey, (mx0 + mx1) / 2, yLow, D / 2 - D * 0.3));
  const ok = createBin(m, 0.42, 0.3, 0.4, m.robotGrey);
  ok.position.set((mx0 + mx1) / 2, yLow + 0.01, D / 2 - 0.24);
  add(ok);
  add(box(0.12, 0.06, 0.004, m.steel, (mx0 + mx1) / 2, yLow + 0.16, D / 2 - 0.035)); // "OK" label plate
  // Right section: upper strip with the NG bay, lower panel
  const rx0 = fromTop(925, 0).x;
  const rx1 = fromTop(1395, 0).x;
  const ngX0 = fromTop(1005, 0).x;
  const ngX1 = fromTop(1155, 0).x;
  add(panelXY(rx0, rx1, yLow, yMid - 0.01, fz, m.sheet, 0.006));
  add(panelXY(rx0, ngX0, yMid + 0.01, yTop, fz, m.sheet, 0.006), panelXY(ngX1, rx1, yMid + 0.01, yTop, fz, m.sheet, 0.006));
  const ng = createBin(m, 0.15, 0.12, 0.2, m.red);
  ng.position.set((ngX0 + ngX1) / 2, yMid + 0.015, D / 2 - 0.12);
  add(ng, box((ngX1 - ngX0) * 0.9, 0.012, 0.25, m.panelGrey, (ngX0 + ngX1) / 2, yMid + 0.006, D / 2 - 0.13));

  // ── Worktop: grey + mint plates, back-left recess for two bowl feeders ────
  add(
    plate(m, m.sheet, [675, 18], [1400, 585], T), // back-right grey
    plate(m, m.sheet, [485, 398], [675, 585], T), // grey between recess and table
    plate(m, m.mint, [108, 585], [495, 838], T), // front-left mint
    plate(m, m.mint, [495, 555], [925, 838], T + 0.001), // front-middle mint (rotary)
    plate(m, m.sheet, [925, 585], [1400, 838], T), // front-right grey
  );
  const shelfY = T - 0.235;
  add(plate(m, m.panelGrey, [108, 18], [485, 585], shelfY), plate(m, m.panelGrey, [485, 18], [675, 398], shelfY));
  // Recess walls
  const recessWalls: [[number, number], [number, number]][] = [
    [[485, 398], [675, 398]],
    [[675, 18], [675, 398]],
    [[485, 398], [485, 585]],
    [[108, 585], [485, 585]],
  ];
  for (const [a, b] of recessWalls) {
    const p = fromTop(...a);
    const q = fromTop(...b);
    add(box(Math.abs(q.x - p.x) || 0.008, 0.235, Math.abs(q.z - p.z) || 0.008, m.sheet, (p.x + q.x) / 2, T - 0.1175, (p.z + q.z) / 2));
  }

  // ── Rotary table (centre px 707, 617, r 172 px) ──────────────────────────
  const dial = fromTop(707, 617);
  const table = createNestTable(m, 172 * K);
  table.position.set(dial.x, T, dial.z);
  add(table);

  // ── Three SCARAs, posed as drawn (base J1, elbow J2, quill) ──────────────
  const scaras: { base: [number, number]; elbow: [number, number]; quill: [number, number]; board: "-x" | "-z" | "+x"; motion: Partial<RobotMotion> }[] = [
    { base: [322, 720], elbow: [258, 540], quill: [440, 532], board: "-x", motion: { swing: [-0.8, -0.48] } }, // front-left
    { base: [805, 235], elbow: [630, 165], quill: [622, 348], board: "-z", motion: { swing: [0.8, 0.48] } }, // back-middle
    { base: [1180, 712], elbow: [1117, 525], quill: [945, 468], board: "+x", motion: { swing: [0, 0.8], lift: 0.12 } }, // front-right
  ];
  const yaw = (a: XZ, b: XZ) => Math.atan2(-(b.z - a.z), b.x - a.x);
  const dist = (a: XZ, b: XZ) => Math.hypot(b.x - a.x, b.z - a.z);
  scaras.forEach(({ base, elbow, quill, board, motion }, i) => {
    const b = fromTop(...base);
    const e = fromTop(...elbow);
    const q = fromTop(...quill);
    const baseAngle = yaw(b, e);
    const robot = createScara(m, {
      pedestalHeight: 0.005,
      baseAngle,
      elbowAngle: yaw(e, q) - baseAngle,
      link1: dist(b, e),
      link2: dist(e, q),
      headHeight: 0.17,
      headWidth: 0.14,
      connectorBoard: board,
      offset: i / scaras.length,
      ...motion,
    });
    robot.object.position.set(b.x, T, b.z);
    add(robot.object);
    movers.push(robot);
  });

  // ── Bowl feeders ─────────────────────────────────────────────────────────
  // Two grey bowls in the back-left recess, rims ~0.1 m above the worktop.
  for (const [px, py, turn, phase] of [[408, 195, -1.13, 0], [262, 362, -0.3, 1.4]] as const) {
    const { x, z } = fromTop(px, py);
    const feeder = createBowlFeeder(m, 0.1, phase);
    feeder.object.scale.setScalar(1.6);
    feeder.object.position.set(x, shelfY, z);
    feeder.object.rotation.y = turn;
    add(feeder.object);
    movers.push(feeder);
  }
  // Large green bowl on a white base (back-right), feeding the long track on its left
  const green = fromTop(1150, 330);
  const gb = createBowlFeeder(m, 0.1, 0.8, m.white, false, 0x2fbf3a);
  gb.object.scale.set(2.6, 1.1, 2.6);
  gb.object.position.set(green.x, T, green.z);
  add(gb.object);
  movers.push(gb);
  // Long linear track (px x 905, y 60–530) on a vibrator rail
  const t0 = fromTop(905, 60);
  const t1 = fromTop(905, 530);
  add(box(0.05, 0.02, t1.z - t0.z, m.steel, t0.x, T + 0.11, (t0.z + t1.z) / 2));
  add(box(0.04, 0.09, t1.z - t0.z - 0.06, m.robotGrey, t0.x, T + 0.055, (t0.z + t1.z) / 2));
  for (let i = 0; i < 14; i++) add(box(0.03, 0.012, 0.02, m.feederGreen, t0.x, T + 0.126, t0.z + 0.03 + i * ((t1.z - t0.z - 0.06) / 13)));

  // ── Slides, cylinders and blocks ─────────────────────────────────────────
  for (const [ax, ay, bx, by, h, mat] of [
    [730, 0, 980, 40, 0.06, m.aluminum], // back slide rail (overhangs the back edge)
    [955, 40, 1015, 190, 0.1, m.steel], // back slide block
    [750, 45, 850, 95, 0.08, m.white], // back sensor box
    [815, 765, 975, 815, 0.05, m.steel], // front cylinder
    [668, 368, 725, 410, 0.05, m.feederGreen], // fixture
    [525, 240, 585, 380, 0.08, m.robotGrey], // grey bowl 1 outlet guide
  ] as const) {
    const a = fromTop(ax, ay);
    const b = fromTop(bx, by);
    add(box(b.x - a.x, h, b.z - a.z, mat, (a.x + b.x) / 2, T + h / 2, (a.z + b.z) / 2));
  }
  const hole = fromTop(898, 720);
  add(cylinder(0.045, 0.045, 0.004, m.dark, hole.x, T + 0.002, hole.z, 24)); // part drop hole

  const update = (t: number) => movers.forEach((part) => part.update(t));
  update(0);
  return { object: root, update };
}
