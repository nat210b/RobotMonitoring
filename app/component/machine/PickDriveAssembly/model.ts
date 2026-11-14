import * as THREE from "three";
import {
  box,
  createBowlFeeder,
  createDischargeChute,
  createGlassCell,
  createMaterials,
  createPowerSupply,
  createScara,
  createStackLight,
  cylinder,
  POWER_SUPPLY,
  type MachineParts,
  type RobotMotion,
} from "../parts";

/**
 * PICK DRIVE ASSEMBLY station, modelled from the drawings in
 * app/machine_data/PICK DRIVE ASSEMBLY/ (front, back, left, right, top, iso).
 *
 * Same cell as PICK ARM ASSEMBLY1 (black-panelled cabinet, glass enclosure, roof split in
 * four) with three Delta SCARAs — two with their green connector boards facing left, one
 * facing the front — three bowl feeders (back-right, front-left, front-right) feeding a
 * central escapement, a drop guide + discharge chute out of the left wall, and three
 * power supplies.
 *
 * Units are metres. Top view ≈ 1 mm per drawing pixel (frame px 258–1395 × 5–1140);
 * heights from the front/left views. Axes: +x = right, +y = up, +z = front.
 */
export const FRAME = {
  width: 1.137,
  depth: 1.135,
  height: 1.52,
  casterHeight: 0.08,
  deckHeight: 0.57,
};

/** Top-view drawing pixel → metres (frame centre at px 826, 572). */
const fromTop = (px: number, py: number) => ({ x: (px - 826) * 0.001, z: (py - 572) * 0.001 });

type XZ = { x: number; z: number };

export function createPickDriveAssembly(): MachineParts {
  const m = createMaterials();
  const { width: W, depth: D } = FRAME;
  const root = new THREE.Group();
  const add = (...objects: THREE.Object3D[]) => root.add(...objects);
  const movers: { update: (t: number) => void }[] = [];

  const cell = createGlassCell(m, FRAME);
  add(cell.object);
  // Stack light on the back-right corner of the roof
  add(createStackLight(m, FRAME.width / 2 - 0.06, FRAME.height, -FRAME.depth / 2 + 0.06));
  const { deckTop } = cell;

  // ── Three SCARAs, posed as drawn (base J1, elbow J2, quill) ───────────────
  const scaras: { base: [number, number]; elbow: [number, number]; quill: [number, number]; board: "-x" | "+z"; motion: Partial<RobotMotion> }[] = [
    { base: [850, 215], elbow: [1110, 165], quill: [1260, 410], board: "-x", motion: { swing: [-0.5, 0.5], dip: 0.01 } }, // back
    { base: [520, 520], elbow: [480, 780], quill: [750, 698], board: "-x", motion: { swing: [0.8, -0.8] } }, // left
    { base: [1255, 900], elbow: [1110, 660], quill: [987, 925], board: "+z", motion: { swing: [0.38, 0.23], dip: 0.01 } }, // front-right
  ];
  const yaw = (a: XZ, b: XZ) => Math.atan2(-(b.z - a.z), b.x - a.x);
  const dist = (a: XZ, b: XZ) => Math.hypot(b.x - a.x, b.z - a.z);
  scaras.forEach(({ base, elbow, quill, board, motion }, i) => {
    const b = fromTop(...base);
    const e = fromTop(...elbow);
    const q = fromTop(...quill);
    const baseAngle = yaw(b, e);
    const robot = createScara(m, {
      pedestalHeight: 0.22, // tools clear the bowl rims and the drop guide
      baseAngle,
      elbowAngle: yaw(e, q) - baseAngle,
      link1: dist(b, e),
      link2: dist(e, q),
      headHeight: 0.19,
      headWidth: 0.13,
      connectorBoard: board,
      offset: i / scaras.length,
      ...motion,
    });
    robot.object.position.set(b.x, deckTop, b.z);
    add(robot.object);
    movers.push(robot);
  });

  // ── Three bowl feeders ──────────────────────────────────────────────────
  // Front pair feed back (−z) into the escapement tracks; the back-right one feeds left.
  for (const [px, py, turn, phase] of [
    [1180, 432, Math.PI, 0.6],
    [660, 895, Math.PI / 2, 0],
    [1000, 905, Math.PI / 2, 1.5],
  ] as const) {
    const { x, z } = fromTop(px, py);
    const feeder = createBowlFeeder(m, 0.1, phase);
    feeder.object.scale.setScalar(1.25);
    feeder.object.position.set(x, deckTop, z);
    feeder.object.rotation.y = turn;
    add(feeder.object);
    movers.push(feeder);
  }
  // Linear tracks and vibrators from the front bowls to the escapement (px x 775 / 878)
  for (const px of [775, 878]) {
    const a = fromTop(px, 610);
    const b = fromTop(px, 850);
    add(box(0.03, 0.02, b.z - a.z, m.steel, a.x, deckTop + 0.22, (a.z + b.z) / 2));
    add(box(0.05, 0.2, 0.08, m.robotGrey, a.x, deckTop + 0.1, (a.z + b.z) / 2));
  }
  // Escapement block between the tracks, with a sensor post
  const esc = fromTop(826, 640);
  add(box(0.17, 0.12, 0.1, m.robotGrey, esc.x, deckTop + 0.06, esc.z));
  add(box(0.05, 0.04, 0.05, m.dark, esc.x - 0.04, deckTop + 0.14, esc.z), box(0.025, 0.025, 0.025, m.red, esc.x + 0.04, deckTop + 0.135, esc.z));
  const post = fromTop(905, 532);
  add(box(0.05, 0.035, 0.035, m.robotGrey, post.x, deckTop + 0.0175, post.z));
  add(cylinder(0.008, 0.008, 0.3, m.steel, post.x, deckTop + 0.15, post.z, 12), box(0.06, 0.012, 0.012, m.steel, post.x, deckTop + 0.28, post.z));
  // Slide unit at the back-right bowl outlet (px 955–1140 × 285–340)
  const s0 = fromTop(955, 285);
  const s1 = fromTop(1140, 340);
  add(box(s1.x - s0.x, 0.05, s1.z - s0.z, m.robotGrey, (s0.x + s1.x) / 2, deckTop + 0.12, (s0.z + s1.z) / 2));
  add(box(0.03, 0.1, 0.03, m.aluminum, (s0.x + s1.x) / 2, deckTop + 0.05, (s0.z + s1.z) / 2));

  // Drop guide + discharge chute out through the left wall (top view px 228–745 × 625–700).
  // The guide sits right under the left SCARA's quill, which works the slot, so it has
  // no pusher rod of its own.
  add(
    createDischargeChute(m, { guideX: fromTop(750, 0).x, z: fromTop(0, 698).z, outX: fromTop(200, 0).x, poleX: fromTop(430, 0).x, deckTop, rod: false }),
  );

  // ── Power supplies ───────────────────────────────────────────────────────
  // Two against the front glass (front-left panel on its left end, front-right on its
  // right end) and one standing lengthwise at the back-right with its panel to the back.
  const glassInner = D / 2 - 0.01 - 0.002;
  for (const [px, panel] of [[601, "-x"], [976, "+x"]] as const) {
    const psu = createPowerSupply(m, panel);
    psu.position.set(fromTop(px, 0).x, deckTop, glassInner - POWER_SUPPLY.depth / 2 - 0.001);
    add(psu);
  }
  const back = createPowerSupply(m, "-z");
  const bp = fromTop(1328, 186);
  back.position.set(Math.min(bp.x, W / 2 - 0.012 - POWER_SUPPLY.depth / 2 - 0.001), deckTop, bp.z);
  add(back);

  const update = (t: number) => movers.forEach((part) => part.update(t));
  update(0);
  return { object: root, update };
}
