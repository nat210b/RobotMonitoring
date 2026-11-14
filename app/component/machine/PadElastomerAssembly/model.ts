import * as THREE from "three";
import {
  beam,
  box,
  createCabinet,
  createMaterials,
  createRotaryTable,
  createScara,
  cylinder,
  markLamp,
  panelXY,
  panelZY,
  type MachineParts,
  type RobotMotion,
  type Materials,
} from "../parts";

/**
 * PAD ELASTOMER ASSEMBLY station, modelled from the drawings in
 * app/machine_data/PAD ELASTOMER ASSEMBLY/ (front, back, left, right, top, iso).
 *
 * Square cell: lower cabinet (doors + drawer) with a glass enclosure on top, two
 * corner-mounted SCARA robots around a central rotary disc, two overhead camera
 * stations, feed cones and a front linear slide. Stack light on the front-right corner.
 *
 * Units are metres; the frame is assumed 1.0 m square (front view H/W = 1.58).
 * Plan positions come from the top view (frame = px 292–1362 × 38–1107).
 * Axes: +x = right, +y = up, +z = front (operator side).
 */
export const FRAME = {
  width: 1.0,
  depth: 1.0,
  height: 1.58,
  casterHeight: 0.137,
  deckHeight: 0.8,
};

const PROFILE = 0.03;

/** Top-view drawing pixel → metres. */
const K = FRAME.width / 1070;
const fromTop = (px: number, py: number) => ({ x: (px - 827) * K, z: (py - 572.5) * K });

/** Fixture plate on the deck with an overhead camera frame on a single column. */
function createVisionStation(m: Materials, w: number, d: number, frameHeight: number, column: "back" | "left") {
  const g = new THREE.Group();
  g.add(box(w, 0.012, d, m.robotGrey, 0, 0.006, 0));
  g.add(box(w * 0.78, 0.02, d * 0.7, m.disc, 0, 0.022, 0));

  // Overhead rectangular frame with a down-looking camera
  const t = 0.022;
  const y = frameHeight;
  g.add(
    beam([-w / 2, y, -d / 2], [w / 2, y, -d / 2], t, m.aluminum),
    beam([-w / 2, y, d / 2], [w / 2, y, d / 2], t, m.aluminum),
    beam([-w / 2, y, -d / 2], [-w / 2, y, d / 2], t, m.aluminum),
    beam([w / 2, y, -d / 2], [w / 2, y, d / 2], t, m.aluminum),
  );
  const alongX = column === "back";
  g.add(alongX ? beam([0, y, -d / 2], [0, y, d / 2], t, m.aluminum) : beam([-w / 2, y, 0], [w / 2, y, 0], t, m.aluminum));
  g.add(box(0.05, 0.05, 0.05, m.dark, 0, y - 0.04, 0));
  g.add(cylinder(0.018, 0.018, 0.04, m.steel, 0, y - 0.085, 0, 20));

  // Support column at the back (or left) edge
  const cx = alongX ? 0 : -w / 2 - 0.02;
  const cz = alongX ? -d / 2 - 0.02 : 0;
  g.add(beam([cx, 0, cz], [cx, y, cz], 0.04, m.aluminum));
  g.add(alongX ? beam([0, y, cz], [0, y, -d / 2], t, m.aluminum) : beam([cx, y, 0], [-w / 2, y, 0], t, m.aluminum));
  return g;
}

/** Horizontal feed cone, tip at `tip`, wide end at `base` (deck-relative metres). */
function createFeedCone(m: Materials, base: { x: number; z: number }, tip: { x: number; z: number }, radius: number, y: number) {
  const length = Math.hypot(tip.x - base.x, tip.z - base.z);
  const g = new THREE.Group();
  const cone = new THREE.Mesh(new THREE.ConeGeometry(radius, length, 32, 1, true), new THREE.MeshStandardMaterial({ color: 0xb8bed6, roughness: 0.35, metalness: 0.5, side: THREE.DoubleSide }));
  cone.rotation.x = Math.PI / 2; // tip toward +z
  g.add(cone);
  g.position.set((base.x + tip.x) / 2, y, (base.z + tip.z) / 2);
  g.rotation.y = Math.atan2(tip.x - base.x, tip.z - base.z);
  return g;
}

/** C-shaped lifting / door handle standing out from a face. */
function handle(m: Materials, x: number, y: number, z: number, out: "+x" | "-x" | "+z", length = 0.12) {
  const g = new THREE.Group();
  const o = 0.025;
  const [dx, dz] = out === "+x" ? [o, 0] : out === "-x" ? [-o, 0] : [0, o];
  g.add(box(0.014, length, 0.014, m.steel, dx, 0, dz));
  for (const sy of [-1, 1]) g.add(box(Math.abs(dx) || 0.014, 0.014, Math.abs(dz) || 0.014, m.steel, dx / 2, (sy * length) / 2, dz / 2));
  g.position.set(x, y, z);
  return g;
}

export function createPadElastomerAssembly(): MachineParts {
  const m = createMaterials();
  const { width: W, depth: D, height: H, casterHeight: C, deckHeight: deck } = FRAME;
  const P = PROFILE;
  const root = new THREE.Group();
  const add = (...objects: THREE.Object3D[]) => root.add(...objects);
  const movers: { update: (t: number) => void }[] = [];

  // ── Lower cabinet: door + drawer at the front, three doors on the sides ──
  add(createCabinet(m, { width: W, height: deck, depth: D, casterHeight: C }));
  const fz = D / 2 + 0.003;
  add(
    panelXY(-W / 2 + P + 0.005, -0.008, C + 0.04, deck - 0.04, fz, m.sheet, 0.006), // left door
    panelXY(0.008, W / 2 - P - 0.005, 0.6, deck - 0.04, fz, m.sheet, 0.006), // drawer
    panelXY(0.008, W / 2 - P - 0.005, C + 0.04, 0.55, fz, m.sheet, 0.006), // right door
    box(0.09, 0.05, 0.006, m.steel, 0.24, 0.68, fz + 0.005), // drawer label plate
    handle(m, -0.07, 0.42, fz, "+z", 0.12),
  );
  for (const sx of [-1, 1] as const) {
    const x = sx * (W / 2 + 0.003);
    const out = sx < 0 ? "-x" : "+x";
    for (const [z0, z1] of [[-D / 2 + P, -0.17], [-0.15, 0.15], [0.17, D / 2 - P]]) add(panelZY(z0 + 0.005, z1 - 0.005, C + 0.04, deck - 0.04, x, m.sheet, 0.006));
    add(handle(m, x, 0.46, -0.2, out), handle(m, x, 0.46, 0.2, out)); // side door handles
    add(handle(m, x, 1.19, 0, out, 0.1)); // upper lifting handle
  }

  // ── Deck and upper glass enclosure ───────────────────────────────────
  const top = H - P / 2;
  const x0 = -W / 2 + P / 2;
  const x1 = W / 2 - P / 2;
  const z0 = -D / 2 + P / 2;
  const z1 = D / 2 - P / 2;
  add(box(W - 0.01, 0.02, D - 0.01, m.worktop, 0, deck + 0.01, 0));
  for (const x of [x0, x1]) for (const z of [z0, z1]) add(beam([x, deck, z], [x, H, z], P, m.aluminum));
  for (const y of [deck + P / 2, top]) {
    add(beam([x0, y, z0], [x1, y, z0], P, m.aluminum), beam([x0, y, z1], [x1, y, z1], P, m.aluminum));
    add(beam([x0, y, z0], [x0, y, z1], P, m.aluminum), beam([x1, y, z0], [x1, y, z1], P, m.aluminum));
  }
  // Centre posts: front/back split into two glass doors, sides into two panes
  add(beam([0, deck, z1], [0, H, z1], P, m.aluminum), beam([0, deck, z0], [0, H, z0], P, m.aluminum));
  add(beam([x0, deck, 0], [x0, H, 0], P, m.aluminum), beam([x1, deck, 0], [x1, H, 0], P, m.aluminum));
  const g0 = deck + P;
  const g1 = H - P;
  add(
    panelXY(x0, x1, g0, g1, D / 2 - 0.01, m.glass, 0.004),
    panelXY(x0, x1, g0, g1, -D / 2 + 0.01, m.glass, 0.004),
    panelZY(z0, z1, g0, g1, -W / 2 + 0.01, m.glass, 0.004),
    panelZY(z0, z1, g0, g1, W / 2 - 0.01, m.glass, 0.004),
    box(W - P, 0.004, D - P, m.glass, 0, H - 0.002, 0),
  );
  add(box(0.014, 0.12, 0.014, m.steel, -0.06, 1.19, D / 2 + 0.02), box(0.014, 0.12, 0.014, m.steel, 0.052, 1.19, D / 2 + 0.02)); // glass door handles

  // HMI and push buttons (front view, right half)
  add(box(0.18, 0.13, 0.03, m.dark, 0.242, 1.3, D / 2 - 0.035), box(0.15, 0.09, 0.004, m.screen, 0.242, 1.305, D / 2 - 0.018));
  [0.116, 0.2, 0.284, 0.368].forEach((x, i) => {
    const button = cylinder(0.016, 0.016, 0.014, [m.pcb, m.red, m.amber, m.steel][i], x, 1.135, D / 2 - 0.02, 20);
    button.rotation.x = Math.PI / 2;
    add(button);
  });

  // Stack light on the front-right corner
  const sl = fromTop(1326, 1049);
  add(cylinder(0.01, 0.01, 0.13, m.steel, sl.x, H + 0.065, sl.z, 12));
  ([[m.pcb, "green"], [m.amber, "amber"], [m.red, "red"]] as const).forEach(([mat, color], i) => add(markLamp(cylinder(0.028, 0.028, 0.05, mat, sl.x, H + 0.155 + i * 0.052, sl.z, 20), color)));

  // ── Deck equipment (top view) ────────────────────────────────────────
  const deckTop = deck + 0.02;
  const disc = fromTop(845, 568);
  const table = createRotaryTable(m, 0.219, 8, 3);
  table.object.position.set(disc.x, deckTop, disc.z);
  add(table.object);
  movers.push(table);

  // Two corner SCARAs with tall motor heads, posed as drawn (base J1, elbow J2, quill)
  const scaras: { base: [number, number]; elbow: [number, number]; quill: [number, number]; motion: Partial<RobotMotion> }[] = [
    { base: [1226, 313], elbow: [999, 515], quill: [1126, 784], motion: { swing: [0.8, -1.28] } }, // back-right
    { base: [501, 821], elbow: [726, 615], quill: [607, 345], motion: { swing: [0.8, -1.28] } }, // front-left
  ];
  const yaw = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.atan2(-(b.z - a.z), b.x - a.x);
  const dist = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(b.x - a.x, b.z - a.z);
  scaras.forEach(({ base, elbow, quill, motion }, i) => {
    const b = fromTop(...base);
    const e = fromTop(...elbow);
    const q = fromTop(...quill);
    const baseAngle = yaw(b, e);
    const robot = createScara(m, {
      pedestalHeight: 0.09,
      baseAngle,
      elbowAngle: yaw(e, q) - baseAngle,
      link1: dist(b, e),
      link2: dist(e, q),
      headHeight: 0.21,
      headWidth: 0.17,
      offset: i / scaras.length,
      ...motion,
    });
    robot.object.position.set(b.x, deckTop, b.z);
    add(robot.object);
    movers.push(robot);
  });

  // Overhead camera stations: back (px 641–1030 × 88–299) and left (px 345–553 × 330–715)
  const frameY = 1.47 - deckTop; // camera frames sit just above the SCARA heads (front view)
  for (const [[ax, ay], [bx, by], column] of [
    [[641, 88], [1030, 299], "back"],
    [[345, 330], [553, 715], "left"],
  ] as const) {
    const a = fromTop(ax, ay);
    const c = fromTop(bx, by);
    const station = createVisionStation(m, c.x - a.x, c.z - a.z, frameY, column);
    station.position.set((a.x + c.x) / 2, deckTop, (a.z + c.z) / 2);
    add(station);
  }

  // Feed cones (horizontal funnels converging on the front slide)
  add(createFeedCone(m, fromTop(842, 584), fromTop(834, 822), 0.05, deckTop + 0.13));
  add(createFeedCone(m, fromTop(1003, 699), fromTop(849, 799), 0.045, deckTop + 0.12));

  // Front linear slide (px 703–1122 at y ≈ 845) with a carriage, and the push cylinder
  const s0 = fromTop(703, 845);
  const s1 = fromTop(1122, 845);
  add(box(s1.x - s0.x, 0.03, 0.05, m.robotGrey, (s0.x + s1.x) / 2, deckTop + 0.09, s0.z));
  add(box(0.07, 0.04, 0.07, m.dark, (s0.x + s1.x) / 2, deckTop + 0.125, s0.z));
  for (const x of [s0.x + 0.02, s1.x - 0.02]) add(box(0.03, 0.09, 0.05, m.robotGrey, x, deckTop + 0.045, s0.z));
  const cylA = fromTop(1038, 907);
  const cylB = fromTop(1038, 1076);
  const push = cylinder(0.014, 0.014, cylB.z - cylA.z, m.steel, cylA.x, deckTop + 0.06, (cylA.z + cylB.z) / 2, 16);
  push.rotation.x = Math.PI / 2;
  add(push);

  // Small fixtures, sensors and slides around the disc
  for (const [px, py, w, h, d] of [
    [584, 195, 0.1, 0.05, 0.1],
    [449, 272, 0.1, 0.05, 0.1],
    [1026, 353, 0.1, 0.09, 0.08],
    [1141, 568, 0.1, 0.06, 0.1],
    [845, 360, 0.07, 0.04, 0.05],
    [1170, 770, 0.05, 0.08, 0.06],
    [648, 910, 0.08, 0.01, 0.08],
    [470, 145, 0.1, 0.01, 0.09],
  ] as const) {
    const { x, z } = fromTop(px, py);
    add(box(w, h, d, m.robotGrey, x, deckTop + h / 2, z));
  }

  const update = (t: number) => movers.forEach((part) => part.update(t));
  update(0);
  return { object: root, update };
}
