import * as THREE from "three";
import {
  beam,
  box,
  createBowlFeeder,
  createCaster,
  createMaterials,
  createScara,
  createStackLight,
  cylinder,
  panelXY,
  panelZY,
  type MachineParts,
  type Materials,
  type RobotMotion,
} from "../parts";

/**
 * PILLAR SIDE PLATE LEFT ASSEMBLY cell, modelled from the drawings in
 * app/machine_data/PILLAR SIDE PLATE LEFT ASSEMBLY/ (iso, front, back, left, right).
 *
 * Glass-enclosed cell on casters: grey sheet-metal cabinet (two doors front and back, three panels
 * each side) with a lower step at the back, an aluminium-framed glass enclosure (roof split by a
 * beam, front panel of the right bay open at deck level), two SCARA robots, a large and a small
 * bowl feeder at the back, four tray nests with tray grids in the front-right bay, a small jig and
 * dispenser in the left bay, an HMI on the front panel, a cable chain and a stack light on the
 * back-left roof corner.
 *
 * The drawings carry no dimensions. Scale is ~2 mm per drawing pixel (front / back / left / right
 * views share it), chosen so the 30 mm extrusion, the casters (≈ 86 mm) and the bowl feeders (Ø 0.38 m)
 * come out at normal sizes: 1.136 m wide × 0.874 m deep × 1.35 m to the roof frame.
 * The TOP file in that folder is a second copy of the front view, so plan positions come from the
 * left / right / back views and the iso.
 * Axes: +x = right (front view), +y = up, +z = front (operator side).
 * Front view px → x = (px − 644) · 0.002; left view px → z = (px − 684.5) · 0.002;
 * heights y = (838 − px) · 0.002 (838 = floor in every elevation).
 */
export const LAYOUT = {
  width: 1.136,
  depth: 0.874,
  /** Top of the roof frame. */
  height: 1.35,
  casterHeight: 0.086,
  /** Worktop height over the front part of the cabinet and over the lower step at the back. */
  deckHeight: 0.642,
  backDeckHeight: 0.546,
  /** The back lower step ends at this z (the deck is higher in front of it). */
  stepZ: -0.115,
};

const P = 0.03; // aluminium extrusion size

/** Colour for a point-of-interest the viewer can't see in the drawings (cables, small fixtures). */
const SMALL = 0.006;

/** Sheet-metal cabinet block between z0 and z1, up to `top`, with its extrusion frame (no casters). */
function createCabinetBlock(m: Materials, width: number, z0: number, z1: number, top: number, casterHeight: number) {
  const g = new THREE.Group();
  const d = z1 - z0;
  const zc = (z0 + z1) / 2;
  const bodyH = top - casterHeight;
  g.add(box(width - 0.012, bodyH - 0.012, d - 0.012, m.sheet, 0, casterHeight + bodyH / 2, zc));
  const x = width / 2 - P / 2;
  const za = z0 + P / 2;
  const zb = z1 - P / 2;
  for (const sx of [-x, x]) for (const sz of [za, zb]) g.add(beam([sx, casterHeight, sz], [sx, top, sz], P, m.aluminum));
  for (const y of [casterHeight + P / 2, top - P / 2]) {
    g.add(beam([-x, y, za], [x, y, za], P, m.aluminum), beam([-x, y, zb], [x, y, zb], P, m.aluminum));
    g.add(beam([-x, y, za], [-x, y, zb], P, m.aluminum), beam([x, y, za], [x, y, zb], P, m.aluminum));
  }
  return g;
}

/** Recessed door panel with its handle cut-out, on a face looking `face`. (u, v) = position along the face and height. */
function createDoor(m: Materials, face: "+z" | "-z" | "+x" | "-x", at: { x?: number; z?: number }, width: number, y0: number, y1: number, handle: "start" | "end" | "none") {
  const g = new THREE.Group();
  const h = y1 - y0;
  const cy = (y0 + y1) / 2;
  const along = face === "+z" || face === "-z";
  const out = face.startsWith("+") ? 1 : -1;
  const door = along ? box(width, h, 0.008, m.pedestal, 0, cy, 0) : box(0.008, h, width, m.pedestal, 0, cy, 0);
  g.add(door);
  if (handle !== "none") {
    const s = handle === "start" ? -1 : 1;
    const off = s * (width / 2 - 0.035);
    const recess = along ? box(0.046, 0.09, 0.006, m.dark, off, cy, out * 0.004) : box(0.006, 0.09, 0.046, m.dark, out * 0.004, cy, off);
    const grip = along ? box(0.012, 0.07, 0.008, m.steel, off, cy, out * 0.008) : box(0.008, 0.07, 0.012, m.steel, out * 0.008, cy, off);
    g.add(recess, grip);
  }
  g.position.set(at.x ?? 0, 0, at.z ?? 0);
  return g;
}

/** Plain black cabinet hinge plate. */
const hinge = (m: Materials, x: number, y: number, z: number, alongZ: boolean) =>
  alongZ ? box(0.02, 0.045, 0.008, m.dark, x, y, z) : box(0.008, 0.045, 0.02, m.dark, x, y, z);

/** Tray nest: dark stage, light plate and a black tray with a lattice of cells. */
function createTrayNest(m: Materials, deckTop: number, w: number, d: number) {
  const g = new THREE.Group();
  g.add(box(w - 0.03, 0.03, d - 0.03, m.dark, 0, deckTop + 0.015, 0)); // stage
  g.add(box(w, 0.012, d, m.robotGrey, 0, deckTop + 0.036, 0)); // plate
  g.add(box(w - 0.02, 0.012, d - 0.02, m.dark, 0, deckTop + 0.048, 0)); // tray
  const top = deckTop + 0.056;
  const cols = 6;
  const rows = 4;
  for (let i = 1; i < cols; i++) g.add(box(0.004, 0.004, d - 0.03, m.steel, -(w - 0.04) / 2 + ((w - 0.04) * i) / cols, top, 0));
  for (let j = 1; j < rows; j++) g.add(box(w - 0.04, 0.004, 0.004, m.steel, 0, top, -(d - 0.04) / 2 + ((d - 0.04) * j) / rows));
  return g;
}

/** Short run of cable-chain links curling down off the front edge (visible on the right / left views). */
function createCableChain(m: Materials, x: number, z: number, y: number) {
  const g = new THREE.Group();
  const links = 10;
  for (let i = 0; i < links; i++) {
    const a = (i / (links - 1)) * (Math.PI * 0.85);
    const link = box(0.022, 0.014, 0.014, m.dark, x, y - 0.045 * (1 - Math.cos(a)) * 0.6, z + 0.07 * Math.sin(a));
    link.rotation.x = -a * 0.7;
    g.add(link);
  }
  return g;
}

/**
 * Grey cable hose in a SCARA head's frame (+x along the second link): up out of the head, then a quarter
 * turn back over it (−x). Drawn top ≈ 1.25 m, end pointing straight back, Ø ≈ 36 mm.
 */
function createHose(m: Materials) {
  const foot = 0.15; // top of the head housing above J2
  const rise = 0.09;
  const radius = 0.095;
  const points: THREE.Vector3[] = [new THREE.Vector3(0, foot, 0), new THREE.Vector3(0, foot + rise, 0)];
  for (let i = 1; i <= 8; i++) {
    const a = (i / 8) * (Math.PI / 2);
    points.push(new THREE.Vector3(-radius + radius * Math.cos(a), foot + rise + radius * Math.sin(a), 0));
  }
  const hose = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, false, "centripetal"), 40, 0.018, 12), m.robotGrey);
  return hose;
}

export function createPillarSidePlateLeftAssembly(): MachineParts {
  const m = createMaterials();
  const { width: W, depth: D, height: H, casterHeight: C, deckHeight: DECK, backDeckHeight: BACK_DECK, stepZ } = LAYOUT;
  const hw = W / 2;
  const hd = D / 2;
  const root = new THREE.Group();
  const add = (...objects: THREE.Object3D[]) => root.add(...objects);
  const movers: { update: (t: number) => void }[] = [];

  // ── Cabinet: lower step at the back, taller part in front, casters + levelling feet ──────────
  add(createCabinetBlock(m, W, stepZ, hd, DECK, C));
  add(createCabinetBlock(m, W, -hd, stepZ, BACK_DECK, C));
  add(box(W - 0.01, 0.012, hd - stepZ - 0.01, m.worktop, 0, DECK - 0.006, (hd + stepZ) / 2));
  add(box(W - 0.01, 0.012, stepZ + hd - 0.01, m.worktop, 0, BACK_DECK - 0.006, (-hd + stepZ) / 2));
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const caster = createCaster(m, C);
      caster.position.set(sx * (hw - 0.07), 0, sz * (hd - 0.07));
      caster.rotation.y = sx < 0 ? Math.PI : 0;
      add(caster);
    }
  }

  // Doors: two on the front and two on the back (left / back views), three panels on each side.
  const doorBottom = 0.146;
  const doorTop = 0.556;
  for (const [cx, handle] of [[-0.28, "end"], [0.28, "start"]] as const) {
    add(createDoor(m, "+z", { x: cx, z: hd + 0.002 }, 0.48, doorBottom, doorTop, handle));
    add(createDoor(m, "-z", { x: -cx, z: -hd - 0.002 }, 0.5, 0.116, 0.48, "none"));
  }
  for (const y of [0.24, 0.5]) for (const sx of [-1, 1]) add(hinge(m, sx * (hw + 0.002), y, hd + 0.003, true));
  for (const sx of [-1, 1]) {
    const x = sx * (hw + 0.002);
    const face = sx < 0 ? "-x" : "+x";
    add(createDoor(m, face, { x, z: -0.261 }, 0.296, 0.116, 0.48, "none")); // back panel (lower step)
    add(createDoor(m, face, { x, z: 0.009 }, 0.196, 0.116, 0.5, "none")); // middle panel
    add(box(0.008, 0.074, 0.19, m.pedestal, x, 0.543, 0.009)); // drawer panel above it
    add(createDoor(m, face, { x, z: 0.273 }, 0.276, 0.116, 0.576, "none")); // front panel
  }

  // ── Glass enclosure: frame, posts, roof beam and glass ─────────────────────────────────────
  const x0 = -hw + P / 2;
  const x1 = hw - P / 2;
  const zb = -hd + P / 2;
  const zf = hd - P / 2;
  const top = H - P / 2;
  for (const x of [x0, x1]) {
    add(beam([x, BACK_DECK, zb], [x, H, zb], P, m.aluminum));
    add(beam([x, DECK, zf], [x, H, zf], P, m.aluminum));
  }
  // Rails: top frame, one rail around the deck at the front, one at the back step
  for (const [y, z0b, z1b] of [[top, zb, zf], [DECK + P / 2, stepZ + P / 2, zf], [BACK_DECK + P / 2, zb, stepZ - P / 2]] as const) {
    add(beam([x0, y, z0b], [x1, y, z0b], P, m.aluminum), beam([x0, y, z1b], [x1, y, z1b], P, m.aluminum));
    add(beam([x0, y, z0b], [x0, y, z1b], P, m.aluminum), beam([x1, y, z0b], [x1, y, z1b], P, m.aluminum));
  }
  // Bay posts: front at x = −0.238 and +0.068, back at x = 0, roof beam along z over the right bay edge
  for (const x of [-0.238, 0.068]) add(beam([x, DECK, zf], [x, H, zf], P, m.aluminum));
  add(beam([0, BACK_DECK, zb], [0, H, zb], P, m.aluminum));
  add(beam([0.04, top, zb], [0.04, top, zf], P, m.aluminum));
  // Divider between the left and right bays (glass), in line with the right-bay post
  add(panelZY(stepZ, zf, DECK + P, H - P, 0.068, m.glass, 0.004));

  const gTop = H - P;
  add(
    panelXY(x0, x1, BACK_DECK + P, gTop, -hd + 0.01, m.glass, 0.004), // back
    panelXY(x0, 0.068, DECK + P, gTop, hd - 0.01, m.glass, 0.004), // front, left + middle bays down to the deck
    panelXY(0.068, x1, 0.774, gTop, hd - 0.01, m.glass, 0.004), // front, right bay: open between deck and 0.77 m
    box(W - P, 0.004, D - P, m.glass, 0, H - 0.002, 0), // roof
  );
  for (const sx of [-1, 1]) {
    const x = sx * (hw - 0.01);
    add(panelZY(zb, stepZ - P / 2, BACK_DECK + P, gTop, x, m.glass, 0.004), panelZY(stepZ, zf, DECK + P, gTop, x, m.glass, 0.004));
  }
  // Rail across the front-right opening
  add(beam([0.068, 0.774, zf], [x1, 0.774, zf], 0.02, m.aluminum));

  // HMI on the front panel of the right bay (Ø holes and a handle cut-out beside it), plus a handle on the left bay
  const frontZ = hd + 0.006;
  add(box(0.148, 0.112, 0.04, m.dark, 0.318, 1.054, frontZ + 0.016));
  add(box(0.126, 0.074, 0.004, m.screen, 0.318, 1.062, frontZ + 0.037));
  add(box(0.046, 0.012, 0.004, m.panelGrey, 0.318, 1.004, frontZ + 0.037));
  for (const x of [0.244, 0.318, 0.39]) {
    const hole = cylinder(0.008, 0.008, 0.006, m.dark, x, 0.948, frontZ);
    hole.rotation.x = Math.PI / 2;
    add(hole);
  }
  add(box(0.046, 0.1, 0.008, m.dark, 0.155, 0.885, frontZ));
  add(box(0.046, 0.1, 0.008, m.dark, -0.295, 0.985, frontZ));
  for (const [x, y] of [[-0.55, 1.2], [-0.55, 0.78], [0.55, 1.2], [0.55, 0.78]] as const) add(hinge(m, x, y, hd + 0.003, true));

  // ── Two SCARAs, posed as drawn ───────────────────────────────────────────────────────────
  // R1: base box with the connector board at the left (x −0.41), link 1 along +x to the elbow, link 2
  // forward (+z) to the quill (left view: arm ~0.24 m long, quill z ≈ 0.27). R2: base at the right,
  // arm forward to the front, quill at x 0.494.
  const yaw = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.atan2(-(b.z - a.z), b.x - a.x);
  const dist = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(b.x - a.x, b.z - a.z);
  const scaras: { base: [number, number]; elbow: [number, number]; quill: [number, number]; board?: "-x"; motion: Partial<RobotMotion> }[] = [
    { base: [-0.41, 0.04], elbow: [-0.17, 0.07], quill: [-0.115, 0.265], board: "-x", motion: { swing: [0.25, -0.45], dip: 0.012 } },
    { base: [0.41, 0.04], elbow: [0.43, 0.24], quill: [0.494, 0.29], motion: { swing: [-0.35, 0.5], dip: 0.012 } },
  ];
  scaras.forEach(({ base, elbow, quill, board, motion }, i) => {
    const b = { x: base[0], z: base[1] };
    const e = { x: elbow[0], z: elbow[1] };
    const q = { x: quill[0], z: quill[1] };
    const baseAngle = yaw(b, e);
    const robot = createScara(m, {
      pedestalHeight: 0.064,
      baseAngle,
      elbowAngle: yaw(e, q) - baseAngle,
      link1: dist(b, e),
      link2: dist(e, q),
      headHeight: 0.12,
      headWidth: 0.13,
      connectorBoard: board,
      offset: i / scaras.length,
      ...motion,
    });
    robot.object.position.set(b.x, DECK, b.z);
    // Cable hose rising from the head and curling back over it, as in every drawn view. It rides on J2 so it
    // follows the arm.
    // (J1 is the last group in the robot root, after the optional connector board; J2 the last group in J1.)
    const lastGroup = (o?: THREE.Object3D) => o?.children.filter((c): c is THREE.Group => c instanceof THREE.Group).pop();
    const j2 = lastGroup(lastGroup(robot.object));
    j2?.add(createHose(m));
    add(robot.object);
    movers.push(robot);
  });
  // Two feed tubes beside R1's base (left view: Ø 36 mm, tops at 1.06 m), clear of its turning hub
  for (const z of [0.015, 0.05]) add(cylinder(0.018, 0.018, 1.06 - 0.7, m.aluminum, -0.505, 0.7 + (1.06 - 0.7) / 2, z, 20));

  // ── Bowl feeders on the back step (rim top ≈ 0.81 m): large at the left, small at the right ──
  // Built with the shared bowl (radius = rim radius from the back / left views), stretched to the drawn height.
  const bowls: { x: number; z: number; r: number; phase: number }[] = [
    { x: -0.33, z: -0.22, r: 0.19, phase: 0 },
    { x: 0.218, z: -0.25, r: 0.16, phase: 1.5 },
  ];
  for (const { x, z, r, phase } of bowls) {
    const feeder = createBowlFeeder(m, r, phase, m.robotGrey, false);
    feeder.object.scale.y = (0.81 - BACK_DECK) / 0.21;
    feeder.object.position.set(x, BACK_DECK, z);
    add(feeder.object);
    movers.push(feeder);
  }

  // ── Front-right bay: four tray nests (2 across × 2 deep) ─────────────────────────────────
  for (const x of [0.226, 0.43]) for (const z of [0.17, 0.32]) {
    const nest = createTrayNest(m, DECK, 0.19, 0.14);
    nest.position.set(x, 0, z);
    add(nest);
  }
  add(createCableChain(m, 0.5, hd, DECK - 0.02));

  // ── Front-left bay: jig with locating plate and dispenser ────────────────────────────────
  // Kept below R1's tool path (the tool tip works ≈ 0.74 m high over x −0.2…−0.08) so the arm swings clear.
  add(box(0.14, 0.07, 0.13, m.robotGrey, -0.3, DECK + 0.035, 0.22)); // jig body
  add(box(0.14, 0.01, 0.12, m.steel, -0.3, DECK + 0.075, 0.22)); // locating plate
  add(cylinder(0.008, 0.008, 0.17, m.steel, 0.008, DECK + 0.17, 0.24, 14)); // dispenser barrel
  add(cylinder(SMALL / 2, SMALL / 2, 0.04, m.dark, 0.008, DECK + 0.065, 0.24, 8)); // needle

  // ── Stack light on the back-left roof corner (tower ≈ 0.19 m, reaches 1.536 m) ────────────
  add(createStackLight(m, -hw + P / 2, H, -hd + P / 2, 0.005));

  const update = (t: number) => movers.forEach((part) => part.update(t));
  update(0);
  return { object: root, update };
}
