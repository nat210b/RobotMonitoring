import * as THREE from "three";
import {
  beam,
  box,
  createBowlFeeder,
  createCabinet,
  createCaster,
  createMaterials,
  createScara,
  createSixAxisRobot,
  pickIndexAngle,
  ROBOT_CYCLE,
  cylinder,
  markLamp,
  panelXY,
  panelZY,
  sixAxisPose,
  type MachineParts,
  type RobotMotion,
  type Materials,
} from "../parts";

/**
 * PICK ARM ASSEMBLY2 cell, modelled from the drawings in
 * app/machine_data/PICK ARM ASSEMBLY2/ (front, back, left, right, top, iso).
 *
 * Main cell: blue-framed lower cabinet (panel doors, fans) and a teal-framed glass
 * enclosure (roof split in four). Inside: a large tan rotary disc with five windows,
 * two Delta SCARAs on pink pedestals at the back, a 6-axis arm on a base plate at the
 * front-right, a green and a grey bowl feeder, a green belt conveyor, linear slides,
 * controllers and a camera post. HMI panel outside the left wall, stack light on the
 * back-left corner. Outside on the right: two large bowl feeders on olive-topped stands
 * with tracks running into the cell.
 *
 * Units are metres; top view ≈ 1.9 mm per drawing pixel (front view shares the scale).
 * Axes: +x = right, +y = up, +z = front (operator side).
 */
export const FRAME = {
  width: 1.88,
  depth: 1.52,
  height: 1.59,
  casterHeight: 0.12,
  deckHeight: 0.675,
};

const K = 0.0019;
/** Top-view drawing pixel → metres (main frame centre at px 590, 418). */
const fromTop = (px: number, py: number) => ({ x: (px - 590) * K, z: (py - 418) * K });

type XZ = { x: number; z: number };

/** Tan rotary disc with five windows, on a hub column, with five nests on the spokes. */
function createWindowDisc(m: Materials, radius: number, height: number, pickStarts: readonly number[]) {
  const g = new THREE.Group();
  g.add(cylinder(radius * 0.22, radius * 0.26, height, m.robotGrey, 0, height / 2, 0));
  const shape = new THREE.Shape();
  shape.absarc(0, 0, radius, 0, Math.PI * 2, false);
  const windows = 5;
  const span = ((Math.PI * 2) / windows) * 0.72;
  for (let i = 0; i < windows; i++) {
    const a0 = (i / windows) * Math.PI * 2 - span / 2 + Math.PI / 2;
    const a1 = a0 + span;
    const hole = new THREE.Path();
    hole.absarc(0, 0, radius * 0.86, a0, a1, false);
    hole.absarc(0, 0, radius * 0.32, a1, a0, true);
    shape.holes.push(hole);
  }
  const rotor = new THREE.Group(); // everything that turns: the disc, its centre ring and the nests
  g.add(rotor);
  const disc = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.015, bevelEnabled: false, curveSegments: 48 }), m.tan);
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = height;
  rotor.add(disc);
  rotor.add(cylinder(0.05, 0.05, 0.02, m.red, 0, height + 0.025, 0, 24)); // centre index ring
  for (let i = 0; i < windows; i++) {
    const a = (i / windows) * Math.PI * 2 + Math.PI / 2 + Math.PI / windows;
    const nest = new THREE.Group();
    nest.position.set(Math.cos(a) * radius * 0.92, height + 0.015, -Math.sin(a) * radius * 0.92);
    nest.rotation.y = a;
    nest.add(box(0.07, 0.012, 0.09, m.accentBlue, 0, 0.006, 0));
    nest.add(box(0.03, 0.035, 0.03, m.dark, 0, 0.03, 0), box(0.012, 0.02, 0.012, m.red, 0.02, 0.04, 0.02));
    rotor.add(nest);
  }
  // Turns one window right after each pick from the disc (pickStarts: those robots' cycle starts)
  const step = (Math.PI * 2) / windows;
  rotor.userData.indexTable = true; // tooling finds the turning part by this
  const update = (t: number) => {
    rotor.rotation.y = pickIndexAngle(t, { starts: pickStarts, move: 1.2, step });
  };
  update(0);
  return { object: g, update };
}

/** Open stand for an outside bowl feeder: blue extrusion frame, olive top plate, casters. */
function createFeederStand(m: Materials, w: number, d: number, h: number) {
  const g = new THREE.Group();
  const P = 0.035;
  const C = 0.1;
  const x = w / 2 - P / 2;
  const z = d / 2 - P / 2;
  for (const sx of [-x, x]) for (const sz of [-z, z]) g.add(beam([sx, C, sz], [sx, h, sz], P, m.frameBlue));
  for (const y of [C + P / 2, (C + h) / 2, h - P / 2 - 0.012]) {
    g.add(beam([-x, y, -z], [x, y, -z], P, m.frameBlue), beam([-x, y, z], [x, y, z], P, m.frameBlue));
    g.add(beam([-x, y, -z], [-x, y, z], P, m.frameBlue), beam([x, y, -z], [x, y, z], P, m.frameBlue));
  }
  g.add(box(w, 0.012, d, m.olive, 0, h - 0.006, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const caster = createCaster(m, C);
    caster.position.set(sx * (w / 2 - 0.07), 0, sz * (d / 2 - 0.07));
    g.add(caster);
  }
  return g;
}

/** HMI panel (olive-grey box) with blue screen, three white buttons, e-stop; faces −x. */
function createHmiPanel(m: Materials) {
  const g = new THREE.Group();
  const face = -0.035;
  const onFace = (mesh: THREE.Mesh) => {
    mesh.rotation.z = Math.PI / 2;
    return mesh;
  };
  g.add(box(0.06, 0.3, 0.3, m.panelGrey, -0.005, 0, 0));
  g.add(box(0.004, 0.11, 0.16, m.accentBlue, face, 0.07, 0.02)); // screen
  for (const z of [-0.09, -0.045, 0]) g.add(onFace(cylinder(0.013, 0.013, 0.01, m.worktop, face - 0.003, -0.06, z, 16)));
  g.add(onFace(cylinder(0.024, 0.024, 0.008, m.amber, face - 0.002, -0.06, 0.07, 20))); // e-stop collar
  g.add(onFace(cylinder(0.017, 0.017, 0.02, m.red, face - 0.01, -0.06, 0.07, 20))); // e-stop
  for (const z of [-0.07, -0.02]) g.add(onFace(cylinder(0.008, 0.008, 0.008, m.dark, face - 0.002, -0.115, z, 12)));
  return g;
}

/** Cooling fan grille on a face looking along `out` (±x or +z). */
function fan(m: Materials, x: number, y: number, z: number, out: "-x" | "+z" | "+x") {
  const g = new THREE.Group();
  const f = cylinder(0.05, 0.05, 0.008, m.dark, 0, 0, 0, 24);
  const hub = cylinder(0.015, 0.015, 0.01, m.steel, 0, 0, 0, 12);
  for (const mesh of [f, hub]) {
    if (out === "+z") mesh.rotation.x = Math.PI / 2;
    else mesh.rotation.z = Math.PI / 2;
    g.add(mesh);
  }
  g.position.set(x, y, z);
  return g;
}

export function createPickArmAssembly2(): MachineParts {
  const m = createMaterials();
  const { width: W, depth: D, height: H, casterHeight: C, deckHeight: deck } = FRAME;
  const P = 0.035;
  const root = new THREE.Group();
  const add = (...objects: THREE.Object3D[]) => root.add(...objects);
  const movers: { update: (t: number) => void }[] = [];

  // ── Lower cabinet (blue frame), front / side panel doors with fans ────
  add(createCabinet(m, { width: W, height: deck, depth: D, casterHeight: C, frame: m.frameBlue }));
  const fz = D / 2 + 0.003;
  const fx = -W / 2 - 0.003;
  // Front: three doors + right service panel (front view posts at px 580 and 830)
  const splits = [fromTop(95, 0).x + P, fromTop(580, 0).x, fromTop(830, 0).x, fromTop(1085, 0).x - P];
  for (let i = 0; i < splits.length - 1; i++) add(panelXY(splits[i] + 0.006, splits[i + 1] - 0.006, C + 0.04, deck - 0.05, fz, m.sheet, 0.006));
  for (const x of [fromTop(335, 0).x, fromTop(360, 0).x, fromTop(612, 0).x]) add(box(0.012, 0.13, 0.012, m.steel, x, C + 0.3, fz + 0.015));
  add(fan(m, fromTop(950, 0).x, C + 0.34, fz + 0.006, "+z"));
  add(box(0.06, 0.08, 0.02, m.screen, fromTop(625, 0).x, C + 0.08, fz + 0.012)); // small controller in the cabinet
  // Left side: four panels, fans on the back and front ones (left view)
  for (const [z0, z1] of [[-D / 2 + P, -0.45], [-0.43, -0.02], [0.02, 0.4], [0.42, D / 2 - P]]) add(panelZY(z0 + 0.006, z1 - 0.006, C + 0.04, deck - 0.05, fx, m.sheet, 0.006));
  for (const [z, y] of [[-0.6, C + 0.42], [-0.6, C + 0.18], [0.24, C + 0.3], [0.6, C + 0.3]]) add(fan(m, fx - 0.004, y, z, "-x"));
  for (const z of [-0.38, 0.38, 0.47]) add(box(0.012, 0.13, 0.012, m.steel, fx - 0.015, C + 0.3, z));

  // ── Deck: white plate on the left half, blue plate on the right half ──
  const split = fromTop(545, 0).x;
  add(box(split + W / 2 - P, 0.015, D - 2 * P, m.worktop, (-W / 2 + P + split) / 2, deck + 0.0075, 0));
  add(box(W / 2 - P - split, 0.015, D - 2 * P, m.deckBlue, (split + W / 2 - P) / 2, deck + 0.0075, 0));
  const deckTop = deck + 0.015;

  // ── Teal-framed glass enclosure ──────────────────────────────────────
  const x0 = -W / 2 + P / 2;
  const x1 = W / 2 - P / 2;
  const z0 = -D / 2 + P / 2;
  const z1 = D / 2 - P / 2;
  const top = H - P / 2;
  const rail = (a: [number, number, number], b: [number, number, number]) => add(beam(a, b, P, m.frameTeal));
  for (const x of [x0, x1]) for (const z of [z0, z1]) rail([x, deck, z], [x, H, z]);
  for (const y of [deck + P / 2, top]) {
    rail([x0, y, z0], [x1, y, z0]);
    rail([x0, y, z1], [x1, y, z1]);
    rail([x0, y, z0], [x0, y, z1]);
    rail([x1, y, z0], [x1, y, z1]);
  }
  rail([0, top, z0], [0, top, z1]); // roof split in four
  rail([x0, top, 0], [x1, top, 0]);
  for (const x of [fromTop(360, 0).x, fromTop(625, 0).x]) for (const z of [z0, z1]) rail([x, deck, z], [x, H, z]); // front/back door posts
  for (const z of [-0.25, 0.25]) for (const x of [x0, x1]) rail([x, deck, z], [x, H, z]); // side door posts
  const g0 = deck + P;
  const g1 = H - P;
  add(
    panelXY(x0, x1, g0, g1, D / 2 - 0.012, m.glass, 0.004),
    panelXY(x0, x1, g0, g1, -D / 2 + 0.012, m.glass, 0.004),
    panelZY(z0, z1, g0, g1, -W / 2 + 0.012, m.glass, 0.004),
    panelZY(z0, z1, g0, g1, W / 2 - 0.012, m.glass, 0.004),
    box(W - P, 0.004, D - P, m.glass, 0, H - 0.002, 0),
  );
  for (const x of [fromTop(335, 0).x, fromTop(370, 0).x]) add(box(0.012, 0.12, 0.012, m.steel, x, deck + 0.5, D / 2 + 0.02)); // glass door handles
  for (const z of [-0.25, 0.25]) add(box(0.012, 0.12, 0.012, m.steel, -W / 2 - 0.02, deck + 0.5, z + 0.04));

  // HMI outside the left wall (top view px y 80–235; left view 1.07–1.37 m high)
  const hmi = createHmiPanel(m);
  hmi.position.set(-W / 2 - 0.04, 1.22, fromTop(0, 157).z);
  add(hmi);

  // Stack light on the back-left corner of the roof: green, amber, red from the bottom
  const sl = fromTop(128, 52);
  add(box(0.06, 0.02, 0.06, m.pink, sl.x, H + 0.01, sl.z), cylinder(0.012, 0.012, 0.12, m.pink, sl.x, H + 0.08, sl.z, 12));
  ([[m.pcb, "green"], [m.amber, "amber"], [m.red, "red"]] as const).forEach(([mat, color], i) => add(markLamp(cylinder(0.028, 0.028, 0.05, mat, sl.x, H + 0.17 + i * 0.052, sl.z, 20), color)));

  // ── Rotary disc with five windows (centre px 612, 443, r 232 px) ────────
  const discAt = fromTop(612, 443);
  // The 6-axis arm picks from the disc (the SCARAs place onto it), so the disc turns right after each
  // of the arm's picks. (Filled in when the arm is made below.)
  const discPickStarts: number[] = [];
  const disc = createWindowDisc(m, 232 * K, 0.17, discPickStarts);
  disc.object.position.set(discAt.x, deckTop, discAt.z);
  add(disc.object);
  movers.push(disc);

  // ── Two SCARAs on pink pedestals, posed as drawn ───────────────────────
  const scaras: { base: [number, number]; elbow: [number, number]; quill: [number, number]; motion: Partial<RobotMotion> }[] = [
    { base: [240, 240], elbow: [345, 135], quill: [478, 207], motion: { swing: [-0.8, 1.28], dip: 0.02 } }, // back-left
    { base: [920, 140], elbow: [880, 300], quill: [738, 232], motion: { swing: [-0.8, 1.28], dip: 0.02 } }, // back-right
  ];
  const yaw = (a: XZ, b: XZ) => Math.atan2(-(b.z - a.z), b.x - a.x);
  const dist = (a: XZ, b: XZ) => Math.hypot(b.x - a.x, b.z - a.z);
  scaras.forEach(({ base, elbow, quill, motion }, i) => {
    const b = fromTop(...base);
    const e = fromTop(...elbow);
    const q = fromTop(...quill);
    const baseAngle = yaw(b, e);
    const robot = createScara(m, {
      pedestalHeight: 0.16, // tools clear the disc nests
      pedestalMaterial: m.pink,
      baseAngle,
      elbowAngle: yaw(e, q) - baseAngle,
      link1: dist(b, e),
      link2: dist(e, q),
      headHeight: 0.3,
      headWidth: 0.13,
      offset: i / scaras.length,
      ...motion,
    });
    robot.object.position.set(b.x, deckTop, b.z);
    add(robot.object);
    movers.push(robot);
  });

  // ── 6-axis arm on its base plate (front-right), reaching the disc rim ────
  const armBase = fromTop(955, 710);
  const armTarget = fromTop(840, 518);
  add(box(0.34, 0.012, 0.34, m.worktop, fromTop(935, 705).x, deckTop + 0.006, fromTop(935, 705).z));
  const armScale = 1.35;
  const reach = Math.hypot(armTarget.x - armBase.x, armTarget.z - armBase.z);
  const arm = createSixAxisRobot(m, { ...sixAxisPose(reach / armScale, (0.17 + 0.05 + 0.22) / armScale), tool: "pcb", swing: [1.1], dip: 0.03 });
  arm.object.scale.setScalar(armScale);
  arm.object.position.set(armBase.x, deckTop + 0.012, armBase.z);
  arm.object.rotation.y = Math.atan2(-(armTarget.z - armBase.z), armTarget.x - armBase.x);
  add(arm.object);
  movers.push(arm);
  discPickStarts.push(arm.object.userData.motion.offset * ROBOT_CYCLE);

  // ── Bowl feeders inside: green (left) and grey (back, under SCARA 1) ─────
  // (the grey one is lower so the back-left SCARA's arm passes over it)
  for (const [px, py, r, body, scale] of [[190, 375, 0.1, m.feederGreen, 1.4], [355, 85, 0.085, m.robotGrey, 1.15]] as const) {
    const { x, z } = fromTop(px, py);
    const feeder = createBowlFeeder(m, r, px * 0.01, body);
    feeder.object.scale.setScalar(scale);
    feeder.object.position.set(x, deckTop, z);
    feeder.object.rotation.y = -Math.PI / 2;
    add(feeder.object);
    movers.push(feeder);
  }

  // Green belt conveyor from the disc toward the front (px x 725–800, y 600–740)
  const b0 = fromTop(762, 600);
  const b1 = fromTop(762, 740);
  add(box(0.13, 0.02, b1.z - b0.z, m.pcbLight, b0.x, deckTop + 0.1, (b0.z + b1.z) / 2));
  for (const s of [-1, 1]) add(box(0.01, 0.04, b1.z - b0.z, m.amber, b0.x + s * 0.07, deckTop + 0.1, (b0.z + b1.z) / 2));
  for (const z of [b0.z, b1.z]) {
    const roller = cylinder(0.02, 0.02, 0.13, m.steel, b0.x, deckTop + 0.09, z, 16);
    roller.rotation.z = Math.PI / 2;
    add(roller);
  }
  for (const z of [b0.z + 0.03, b1.z - 0.03]) add(box(0.1, 0.08, 0.02, m.aluminum, b0.x, deckTop + 0.04, z));

  // Linear slide units, controllers and blocks (top view)
  for (const [ax, ay, bx, by, h, mat] of [
    [785, 370, 960, 410, 0.06, m.robotGrey], // slide right of the disc
    [265, 460, 440, 515, 0.07, m.pedestal], // slide unit left of the disc
    [135, 462, 215, 512, 0.12, m.dark], // drives (left)
    [420, 45, 505, 110, 0.14, m.dark], // controllers (back)
    [700, 65, 825, 140, 0.12, m.feederGreen], // controller (back, teal)
    [675, 160, 780, 185, 0.04, m.pedestal],
  ] as const) {
    const a = fromTop(ax, ay);
    const b = fromTop(bx, by);
    add(box(b.x - a.x, h, b.z - a.z, mat, (a.x + b.x) / 2, deckTop + h / 2, (a.z + b.z) / 2));
  }
  // Feed rails from the outside bowl feeders into the cell
  for (const py of [448, 557]) {
    const a = fromTop(870, py);
    const b = fromTop(1150, py);
    add(box(b.x - a.x, 0.02, 0.035, m.steel, (a.x + b.x) / 2, deckTop + 0.23, a.z));
    add(box(0.12, 0.2, 0.06, m.robotGrey, fromTop(930, py).x, deckTop + 0.12, a.z)); // escapement under the rail end
  }

  // Camera post at the front-left with an arm toward the disc
  const postAt = fromTop(362, 660);
  const camAt = fromTop(530, 632);
  add(box(0.07, 0.02, 0.07, m.accentBlue, postAt.x, deckTop + 0.01, postAt.z));
  add(cylinder(0.02, 0.02, 0.5, m.steel, postAt.x, deckTop + 0.25, postAt.z, 16));
  const armLen = Math.hypot(camAt.x - postAt.x, camAt.z - postAt.z);
  const camArm = cylinder(0.012, 0.012, armLen, m.steel, (postAt.x + camAt.x) / 2, deckTop + 0.32, (postAt.z + camAt.z) / 2, 12);
  camArm.rotation.z = Math.PI / 2;
  camArm.rotation.y = Math.atan2(-(camAt.z - postAt.z), camAt.x - postAt.x);
  add(camArm, box(0.05, 0.06, 0.05, m.dark, camAt.x, deckTop + 0.29, camAt.z));
  // Wedge chute plate by the disc (grey triangle in the iso)
  const wedge = fromTop(505, 612);
  add(new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 3), m.robotGrey).translateX(wedge.x).translateY(deckTop + 0.09).translateZ(wedge.z));

  // ── Outside: two big bowl feeders on stands (right, px x 1100–1395) ─────
  for (const [ay, by, phase] of [[165, 460, 0.4], [530, 830, 2.1]] as const) {
    const a = fromTop(1100, ay);
    const b = fromTop(1395, by);
    const stand = createFeederStand(m, b.x - a.x, b.z - a.z, 0.51);
    stand.position.set((a.x + b.x) / 2, 0, (a.z + b.z) / 2);
    add(stand);
    // No built-in outlet: at this scale it would reach into the cell; the feed rails
    // below carry parts in instead.
    const feeder = createBowlFeeder(m, 0.115, phase, m.robotGrey, false);
    feeder.object.scale.setScalar(2.4);
    feeder.object.position.set((a.x + b.x) / 2, 0.51, (a.z + b.z) / 2);
    add(feeder.object);
    movers.push(feeder);
    add(box(0.12, 0.07, 0.07, m.dark, b.x - 0.12, 0.55, b.z - 0.08)); // drive box on the stand
  }

  const update = (t: number) => movers.forEach((part) => part.update(t));
  update(0);
  return { object: root, update };
}
