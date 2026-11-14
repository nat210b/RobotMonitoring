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
 * PICK ARM ASSEMBLY1 station, modelled from the drawings in
 * app/machine_data/PICK ARM ASSEMBLY1/ (front, back, left, right, top, iso).
 *
 * Square cell: black-panelled lower cabinet on casters, glass enclosure (roof split in
 * four), two Delta SCARA robots on pedestals at the back, two bowl feeders at the front
 * feeding a central escapement through linear tracks, a check station on a stand at the
 * right, a drop guide and discharge chute out of the left wall, and two power supplies
 * against the front glass.
 *
 * Units are metres. Top view ≈ 1 mm per drawing pixel (frame px 265–1395 × 5–1130),
 * which gives the SCARAs their ~0.6 m reach; heights from the front/left views.
 * Axes: +x = right, +y = up, +z = front (operator side).
 */
export const FRAME = {
  width: 1.13,
  depth: 1.125,
  height: 1.52,
  casterHeight: 0.08,
  deckHeight: 0.57,
};

/** Top-view drawing pixel → metres (frame centre at px 830, 567). */
const fromTop = (px: number, py: number) => ({ x: (px - 830) * 0.001, z: (py - 567) * 0.001 });

export function createPickArmAssembly1(): MachineParts {
  const m = createMaterials();
  const { depth: D } = FRAME;
  const root = new THREE.Group();
  const add = (...objects: THREE.Object3D[]) => root.add(...objects);
  const movers: { update: (t: number) => void }[] = [];

  const cell = createGlassCell(m, FRAME);
  add(cell.object);
  const { deckTop } = cell;
  // Stack light on the back-right corner of the roof
  add(createStackLight(m, FRAME.width / 2 - 0.06, FRAME.height, -FRAME.depth / 2 + 0.06));

  // ── Two SCARAs on pedestals, posed as drawn (base J1, elbow J2, quill) ───
  const scaras: { base: [number, number]; elbow: [number, number]; quill: [number, number]; motion: Partial<RobotMotion> }[] = [
    { base: [548, 222], elbow: [465, 585], quill: [705, 720], motion: { swing: [0.38, -0.6], dip: 0.01 } }, // left
    { base: [1112, 222], elbow: [970, 560], quill: [1188, 722], motion: { swing: [-0.8, 0.8], dip: 0 } }, // right
  ];
  const yaw = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.atan2(-(b.z - a.z), b.x - a.x);
  const dist = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(b.x - a.x, b.z - a.z);
  scaras.forEach(({ base, elbow, quill, motion }, i) => {
    const b = fromTop(...base);
    const e = fromTop(...elbow);
    const q = fromTop(...quill);
    const baseAngle = yaw(b, e);
    const robot = createScara(m, {
      pedestalHeight: 0.22, // tools clear the feed tracks (same as PICK DRIVE)
      baseAngle,
      elbowAngle: yaw(e, q) - baseAngle,
      link1: dist(b, e),
      link2: dist(e, q),
      headHeight: 0.17,
      headWidth: 0.13,
      connectorBoard: "-z", // green rear connector board faces the back of the machine
      offset: i / scaras.length,
      ...motion,
    });
    robot.object.position.set(b.x, deckTop, b.z);
    add(robot.object);
    movers.push(robot);
  });

  // ── Bowl feeders (front) with linear tracks back to the escapement ──────
  for (const [px, py, phase] of [[610, 880, 0], [937, 878, 1.5]] as const) {
    const { x, z } = fromTop(px, py);
    const feeder = createBowlFeeder(m, 0.1, phase);
    feeder.object.scale.setScalar(1.25);
    feeder.object.position.set(x, deckTop, z);
    feeder.object.rotation.y = Math.PI / 2; // outlet toward the back (−z)
    add(feeder.object);
    movers.push(feeder);
  }
  for (const px of [740, 805]) {
    const a = fromTop(px, 590);
    const b = fromTop(px, 840);
    add(box(0.03, 0.02, b.z - a.z, m.steel, a.x, deckTop + 0.22, (a.z + b.z) / 2)); // track
    add(box(0.05, 0.2, 0.08, m.robotGrey, a.x, deckTop + 0.1, (a.z + b.z) / 2)); // linear vibrator
  }

  // Escapement / fixture block in the centre, with a sensor post
  const esc = fromTop(775, 680);
  add(box(0.17, 0.14, 0.18, m.robotGrey, esc.x, deckTop + 0.07, esc.z));
  add(box(0.06, 0.04, 0.06, m.dark, esc.x - 0.03, deckTop + 0.16, esc.z - 0.03), box(0.025, 0.025, 0.025, m.red, esc.x + 0.04, deckTop + 0.155, esc.z));
  const post = fromTop(870, 740);
  add(cylinder(0.008, 0.008, 0.3, m.steel, post.x, deckTop + 0.15, post.z, 12), box(0.06, 0.012, 0.012, m.steel, post.x, deckTop + 0.28, post.z));

  // Check station on a stand (right, px 1140–1330 × 650–930)
  const st = fromTop(1235, 790);
  const standTop = deckTop + 0.15;
  for (const dx of [-0.08, 0.08]) for (const dz of [-0.12, 0.12]) add(box(0.02, 0.15, 0.02, m.aluminum, st.x + dx, deckTop + 0.075, st.z + dz));
  add(box(0.19, 0.012, 0.28, m.panelGrey, st.x, standTop, st.z));
  add(box(0.12, 0.115, 0.18, m.sheet, st.x, standTop + 0.0635, st.z + 0.01)); // right SCARA's tool works just above it
  add(box(0.122, 0.035, 0.182, m.disc, st.x, standTop + 0.05, st.z + 0.01));

  // Drop guide + discharge chute out through the left wall, on its support pole
  // (top view px 237–750 × 480–555).
  add(createDischargeChute(m, { guideX: fromTop(705, 0).x, z: fromTop(0, 517).z, outX: fromTop(200, 0).x, poleX: fromTop(430, 0).x, deckTop }));

  // Two power supplies at the front (px 515–690 and 845–1020), against the front glass,
  // panel on the left end (left view).
  const glassInner = D / 2 - 0.01 - 0.002;
  for (const px of [602, 932]) {
    const psu = createPowerSupply(m, "-x");
    psu.position.set(fromTop(px, 0).x, deckTop, glassInner - POWER_SUPPLY.depth / 2 - 0.001);
    add(psu);
  }

  const update = (t: number) => movers.forEach((part) => part.update(t));
  update(0);
  return { object: root, update };
}
