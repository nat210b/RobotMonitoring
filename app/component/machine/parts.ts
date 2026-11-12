import * as THREE from "three";

/** A built machine: the 3D object plus an optional per-frame animation step. */
export type MachineParts = {
  object: THREE.Object3D;
  update?: (time: number) => void;
};

type Vec3 = [number, number, number];

export function createMaterials() {
  const std = (color: number, roughness = 0.6, metalness = 0) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness });

  return {
    aluminum: std(0xc5cbd3, 0.35, 0.55),
    panel: std(0x2f3134, 0.75),
    worktop: std(0xdde2e8, 0.55, 0.05),
    pedestal: std(0xadb2c8, 0.5, 0.15),
    robotWhite: std(0xf0f0ec, 0.4),
    robotGrey: std(0xbec2c7, 0.45, 0.2),
    accentBlue: std(0x2337c6, 0.4),
    dark: std(0x1d1e20, 0.6),
    steel: std(0x9aa0a8, 0.3, 0.7),
    pcb: std(0x2f9a52, 0.6),
    red: std(0xd65050, 0.5),
    teal: std(0x2aa6c4, 0.4),
    rubber: std(0x111111, 0.9),
    disc: std(0xc9cde8, 0.4, 0.1),
    sheet: std(0xc4c8d4, 0.6, 0.15),
    screen: std(0x1a2230, 0.25, 0.1),
    amber: std(0xf0a020, 0.4),
    blackSteel: std(0x232427, 0.55, 0.35),
    epson: std(0xd9d5cc, 0.45, 0.1),
    panelGrey: std(0x4f5257, 0.55, 0.3),
    pcbLight: std(0x6fae78, 0.5),
    frameTeal: std(0x6aa79c, 0.4, 0.45),
    frameBlue: std(0x4f8fc6, 0.4, 0.45),
    deckBlue: std(0x5b8fe6, 0.55, 0.05),
    pink: std(0xd9a6c8, 0.5, 0.1),
    olive: std(0xa3ad7e, 0.6, 0.05),
    tan: std(0xc6a888, 0.6, 0.02),
    feederGreen: std(0x7fae94, 0.45, 0.2),
    frameDark: std(0x4a4d52, 0.45, 0.45),
    deckPurple: std(0x8487bd, 0.55, 0.05),
    tealDisc: std(0x4fa69a, 0.45, 0.1),
    maroon: std(0x7a2440, 0.55, 0.1),
    hopperGreen: std(0x23a127, 0.5, 0.05),
    mint: std(0x9fd6bd, 0.55, 0.05),
    white: std(0xf2f2ee, 0.5, 0.05),
    glass: new THREE.MeshStandardMaterial({
      color: 0xdbe6ef,
      transparent: true,
      opacity: 0.14,
      roughness: 0.05,
      metalness: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  };
}

export type Materials = ReturnType<typeof createMaterials>;

export function box(w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  return mesh;
}

/** Vertical cylinder (axis = y). */
export function cylinder(rTop: number, rBottom: number, h: number, mat: THREE.Material, x = 0, y = 0, z = 0, segments = 32) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, segments), mat);
  mesh.position.set(x, y, z);
  return mesh;
}

/** Axis-aligned square profile between two centre points (aluminium extrusion, rails, posts). */
export function beam(a: Vec3, b: Vec3, size: number, mat: THREE.Material) {
  const w = Math.abs(b[0] - a[0]) || size;
  const h = Math.abs(b[1] - a[1]) || size;
  const d = Math.abs(b[2] - a[2]) || size;
  return box(w, h, d, mat, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
}

/** Thin panel facing ±z, spanning x ∈ [x0, x1], y ∈ [y0, y1]. */
export function panelXY(x0: number, x1: number, y0: number, y1: number, z: number, mat: THREE.Material, thickness = 0.006) {
  return box(x1 - x0, y1 - y0, thickness, mat, (x0 + x1) / 2, (y0 + y1) / 2, z);
}

/** Thin panel facing ±x, spanning z ∈ [z0, z1], y ∈ [y0, y1]. */
export function panelZY(z0: number, z1: number, y0: number, y1: number, x: number, mat: THREE.Material, thickness = 0.006) {
  return box(thickness, y1 - y0, z1 - z0, mat, x, (y0 + y1) / 2, (z0 + z1) / 2);
}

const ease = (f: number) => f * f * (3 - 2 * f);

/** Sine motion offset that is exactly 0 at t = 0, so the resting pose is the drawn pose. */
const wave = (t: number, speed: number, phase = 0) => Math.sin(t * speed + phase) - Math.sin(phase);

type SixAxisOptions = {
  /** Resting joint angles (radians): shoulder lean, elbow, wrist pitch. */
  shoulder?: number;
  elbow?: number;
  wrist?: number;
  /** Arm body material (defaults to robot white). */
  body?: THREE.Material;
  /** Back-of-base detail: green cable cover (Delta) or grey connector panel (Epson). */
  baseCover?: "cable" | "connector";
};

/** Geometry of createSixAxisRobot (unscaled): shoulder pivot height, upper arm, forearm. */
const ARM_PIVOT = 0.22;
const ARM_UPPER = 0.32;
const ARM_FORE = 0.29;

/**
 * Pose for createSixAxisRobot that puts the wrist at `reach` (horizontal, along local +x)
 * and `height` above the base, elbow up, with the tool pointing straight down.
 * Units are the robot's unscaled units (divide world metres by the robot's scale).
 */
export function sixAxisPose(reach: number, height: number) {
  const dx = reach;
  const dy = height - ARM_PIVOT;
  const dist = Math.min(Math.hypot(dx, dy), ARM_UPPER + ARM_FORE - 1e-3);
  const cos = THREE.MathUtils.clamp((dist * dist - ARM_UPPER ** 2 - ARM_FORE ** 2) / (2 * ARM_UPPER * ARM_FORE), -1, 1);
  const bend = -Math.acos(cos); // forearm folds down relative to the upper arm
  const upper = Math.atan2(dy, dx) - Math.atan2(ARM_FORE * Math.sin(bend), ARM_UPPER + ARM_FORE * Math.cos(bend));
  const shoulder = upper - Math.PI / 2;
  const elbow = bend + Math.PI / 2;
  return { shoulder, elbow, wrist: -(shoulder + elbow) };
}

/** Grey connector panel on the back of an Epson-style base (faces local -x). */
function createConnectorPanel(m: Materials) {
  const g = new THREE.Group();
  g.name = "base";
  const face = -0.122;
  const onFace = (mesh: THREE.Mesh) => {
    mesh.rotation.z = Math.PI / 2; // cylinder axis along x
    return mesh;
  };
  g.add(box(0.06, 0.12, 0.11, m.panelGrey, -0.09, 0.065, 0));
  g.add(box(0.006, 0.016, 0.034, m.dark, face, 0.108, -0.022)); // rectangular connector
  g.add(box(0.005, 0.01, 0.022, m.steel, face, 0.108, 0.03)); // D-sub
  g.add(onFace(cylinder(0.036, 0.036, 0.004, m.panelGrey, face, 0.052, -0.008, 32))); // round plate
  for (const z of [-0.026, 0.01]) g.add(onFace(cylinder(0.014, 0.014, 0.012, m.steel, face - 0.004, 0.056, z, 24)));
  for (let i = 0; i < 4; i++) g.add(onFace(cylinder(0.006, 0.006, 0.01, m.dark, face - 0.002, 0.098 - i * 0.022, 0.044, 16)));
  for (let i = 0; i < 5; i++) g.add(box(0.004, 0.004, 0.004, m.dark, face, 0.022, -0.03 + i * 0.012));
  return g;
}

/** 6-axis articulated arm (Delta DRV style). Forward reach is local +x. */
export function createSixAxisRobot(
  m: Materials,
  { shoulder = -0.3, elbow = -0.55, wrist = -0.9, body, baseCover = "cable" }: SixAxisOptions = {},
) {
  const root = new THREE.Group();
  root.userData.kind = "robot";
  const white = body ?? m.robotWhite;
  root.add(cylinder(0.08, 0.09, 0.05, white, 0, 0.025, 0));
  if (baseCover === "connector") root.add(createConnectorPanel(m));
  else root.add(box(0.05, 0.1, 0.1, m.pcb, -0.08, 0.07, 0)); // cable cover

  const j1 = new THREE.Group();
  j1.position.y = 0.05;
  root.add(j1);
  j1.add(cylinder(0.065, 0.075, 0.13, white, 0, 0.065, 0));

  const j2 = new THREE.Group();
  j2.position.y = 0.17;
  j1.add(j2);
  const shoulderCap = cylinder(0.065, 0.065, 0.15, white);
  shoulderCap.rotation.x = Math.PI / 2;
  j2.add(shoulderCap);
  j2.add(box(0.08, 0.32, 0.075, white, 0, 0.16, 0.035));
  j2.add(box(0.002, 0.18, 0.05, m.teal, 0.041, 0.16, 0.035)); // trim

  const j3 = new THREE.Group();
  j3.position.set(0, 0.32, 0);
  j2.add(j3);
  const elbowCap = cylinder(0.055, 0.055, 0.13, white);
  elbowCap.rotation.x = Math.PI / 2;
  j3.add(elbowCap);
  j3.add(box(0.28, 0.068, 0.068, white, 0.14, 0, -0.02));
  j3.add(box(0.06, 0.002, 0.03, m.accentBlue, 0.15, 0.035, -0.02)); // logo plate

  const j5 = new THREE.Group();
  j5.position.set(0.29, 0, -0.02);
  j3.add(j5);
  const wristCap = cylinder(0.042, 0.042, 0.08, m.teal);
  wristCap.rotation.z = Math.PI / 2;
  j5.add(wristCap);
  j5.add(box(0.06, 0.07, 0.07, m.red, 0.03, -0.06, 0)); // gripper body
  j5.add(box(0.012, 0.05, 0.03, m.dark, 0.012, -0.12, 0)); // fingers
  j5.add(box(0.012, 0.05, 0.03, m.dark, 0.048, -0.12, 0));

  const update = (t: number) => {
    j1.rotation.y = 0.35 * wave(t, 0.6);
    j2.rotation.z = shoulder + 0.12 * wave(t, 0.9);
    j3.rotation.z = elbow + 0.2 * wave(t, 0.9, 1);
    j5.rotation.z = wrist + 0.25 * wave(t, 1.3);
  };
  update(0);
  return { object: root, update };
}

type ScaraOptions = {
  pedestalHeight: number;
  /** Absolute yaw of the first link (radians, 0 = +x). */
  baseAngle: number;
  /** Elbow angle relative to the first link. */
  elbowAngle: number;
  link1?: number;
  /** Elbow-to-quill distance. */
  link2?: number;
  /** Height / width of the second-link housing (motor head). */
  headHeight?: number;
  headWidth?: number;
  /** Add the green rear connector board to the base, on the given face (world axes). */
  connectorBoard?: "-z" | "+z" | "-x" | "+x";
  /** Pedestal colour (defaults to lavender). */
  pedestalMaterial?: THREE.Material;
  /** Extra tooling hung from the quill (e.g. a PCB fixture). */
  tool?: "pcb" | "gripper";
  phase?: number;
};

/**
 * Green rear connector board of a Delta SCARA base, built facing local +z
 * (u = +x to the right, v = +y up): D-sub, three blue air fittings, heavy-duty
 * connector with red latches, and the hinged "OPEN" cover.
 */
function createScaraConnectorBoard(m: Materials) {
  const g = new THREE.Group();
  g.name = "base";
  const t = 0.004;
  const f = t; // front face of the board
  g.add(box(0.12, 0.15, t, m.pcb, 0, 0, t / 2));
  for (const u of [-0.052, 0.052]) {
    for (const v of [-0.067, 0.067]) {
      const screw = cylinder(0.005, 0.005, 0.003, m.steel, u, v, f + 0.0015, 12);
      screw.rotation.x = Math.PI / 2;
      g.add(screw);
    }
  }
  // D-sub (top left) and three blue air fittings (top right)
  g.add(box(0.034, 0.011, 0.006, m.steel, -0.027, 0.054, f + 0.003));
  g.add(box(0.026, 0.006, 0.002, m.dark, -0.027, 0.054, f + 0.0065));
  for (const u of [0.006, 0.027, 0.048]) {
    const ring = cylinder(0.009, 0.009, 0.006, m.accentBlue, u, 0.054, f + 0.003, 16);
    ring.rotation.x = Math.PI / 2;
    const bore = cylinder(0.004, 0.004, 0.003, m.dark, u, 0.054, f + 0.0075, 12);
    bore.rotation.x = Math.PI / 2;
    g.add(ring, bore);
  }
  // Heavy-duty connector (bottom left): grey hood, split face, red latches
  g.add(box(0.048, 0.088, 0.03, m.robotGrey, -0.028, -0.016, f + 0.015));
  g.add(box(0.002, 0.07, 0.002, m.dark, -0.028, -0.016, f + 0.031));
  for (const s of [-1, 1]) g.add(box(0.006, 0.07, 0.012, m.red, -0.028 + s * 0.027, -0.016, f + 0.008));
  // Hinged "OPEN" cover (bottom right)
  g.add(box(0.046, 0.09, 0.003, m.pcbLight, 0.03, -0.018, f + 0.0015));
  g.add(box(0.01, 0.004, 0.002, m.dark, 0.03, 0.022, f + 0.0035));
  return g;
}

/** SCARA robot (Delta DRS style) on a pedestal. */
export function createScara(m: Materials, opts: ScaraOptions) {
  const {
    pedestalHeight: ph,
    baseAngle,
    elbowAngle,
    link1 = 0.24,
    link2 = SCARA_QUILL_OFFSET,
    headHeight = 0.13,
    headWidth = 0.12,
    connectorBoard,
    pedestalMaterial = m.pedestal,
    tool = "gripper",
    phase = 0,
  } = opts;
  const root = new THREE.Group();
  root.userData.kind = "robot";
  root.add(box(0.15, ph, 0.15, pedestalMaterial, 0, ph / 2, 0));
  root.add(box(0.13, 0.16, 0.16, m.robotGrey, 0, ph + 0.08, 0));
  if (connectorBoard) {
    const board = createScaraConnectorBoard(m);
    const half = connectorBoard.endsWith("z") ? 0.08 : 0.065; // base block half-depth / half-width
    const out = connectorBoard.startsWith("+") ? 1 : -1;
    if (connectorBoard.endsWith("z")) {
      board.position.set(0, ph + 0.08, out * half);
      board.rotation.y = out > 0 ? 0 : Math.PI;
    } else {
      board.position.set(out * half, ph + 0.08, 0);
      board.rotation.y = out * (Math.PI / 2);
    }
    root.add(board);
  }

  const j1 = new THREE.Group();
  j1.position.y = ph + 0.16;
  root.add(j1);
  j1.add(cylinder(0.06, 0.06, 0.05, m.robotWhite, 0, 0.025, 0));
  j1.add(box(link1, 0.05, 0.1, m.robotWhite, link1 / 2, 0.025, 0));

  const j2 = new THREE.Group();
  j2.position.set(link1, 0.05, 0);
  j1.add(j2);
  j2.add(cylinder(0.055, 0.055, 0.03, m.robotWhite, 0, 0.015, 0));
  // Second link housing with the blue Delta stripe
  const housingLength = link2 + 0.08;
  const housingCenter = (link2 - 0.03) / 2;
  const headTop = 0.03 + headHeight;
  j2.add(box(housingLength, headHeight, headWidth, m.robotGrey, housingCenter, 0.03 + headHeight / 2, 0));
  j2.add(box(housingLength + 0.004, 0.012, headWidth + 0.004, m.accentBlue, housingCenter, 0.035, 0));
  j2.add(cylinder(0.035, 0.035, 0.07, m.accentBlue, link2, headTop + 0.035, 0)); // quill cap
  j2.add(cylinder(0.022, 0.022, 0.05, m.dark, -0.02, headTop + 0.025, 0.03)); // motor connector

  const quill = new THREE.Group();
  quill.position.set(link2, 0, 0);
  j2.add(quill);
  const rodLength = headHeight + 0.23;
  quill.add(cylinder(0.012, 0.012, rodLength, m.steel, 0, -0.1 + rodLength / 2, 0));
  quill.add(cylinder(0.025, 0.025, 0.04, m.steel, 0, -0.1, 0));
  if (tool === "pcb") {
    quill.add(box(0.1, 0.12, 0.02, m.pcb, 0, -0.18, 0));
    quill.add(cylinder(0.03, 0.03, 0.04, m.dark, 0, -0.1, 0));
  } else {
    quill.add(cylinder(0.008, 0.008, 0.05, m.steel, 0, -0.145, 0));
  }

  j1.rotation.y = baseAngle;
  j2.rotation.y = elbowAngle;

  const update = (t: number) => {
    // Small swing around the drawn pose so neighbouring arms in crowded cells never meet
    j1.rotation.y = baseAngle + 0.12 * wave(t, 0.7, phase);
    j2.rotation.y = elbowAngle + 0.18 * wave(t, 0.7, phase + 0.8);
    quill.position.y = 0.02 - 0.05 * Math.abs(wave(t, 1.05, phase)); // rests retracted, dips down
  };
  return { object: root, update };
}

/** Indexing rotary table with part nests. Indexes one station every `period` seconds. */
export function createRotaryTable(m: Materials, radius: number, stations = 8, period = 2) {
  const root = new THREE.Group();
  root.add(cylinder(radius * 0.35, radius * 0.4, 0.05, m.robotGrey, 0, 0.025, 0));
  const disc = new THREE.Group();
  disc.position.y = 0.05;
  root.add(disc);
  disc.add(cylinder(radius, radius, 0.012, m.disc, 0, 0.006, 0, 64));
  disc.add(cylinder(0.03, 0.03, 0.02, m.steel, 0, 0.02, 0));
  for (let i = 0; i < stations; i++) {
    const a = (i / stations) * Math.PI * 2;
    const nest = new THREE.Group();
    nest.position.set(Math.cos(a) * radius * 0.8, 0.012, Math.sin(a) * radius * 0.8);
    nest.rotation.y = -a;
    nest.add(cylinder(0.032, 0.032, 0.008, m.robotGrey, 0, 0.004, 0));
    nest.add(box(0.03, 0.022, 0.035, m.steel, 0, 0.019, 0));
    nest.add(box(0.012, 0.02, 0.02, m.dark, 0.016, 0.03, 0));
    disc.add(nest);
  }
  const step = (Math.PI * 2) / stations;
  const update = (t: number) => {
    const k = t / period;
    const idx = Math.floor(k);
    const f = k - idx;
    disc.rotation.y = (idx + (f < 0.35 ? ease(f / 0.35) : 1)) * step;
  };
  return { object: root, update };
}

/** Vibratory bowl feeder with a linear outlet track pointing to local +x. */
export function createBowlFeeder(
  m: Materials,
  radius: number,
  phase = 0,
  body: THREE.Material = m.robotGrey,
  outlet = true,
  wallColor = 0xb4bac2,
) {
  const root = new THREE.Group();
  root.add(cylinder(radius * 0.7, radius * 0.75, 0.14, body, 0, 0.07, 0));
  const bowl = new THREE.Group();
  bowl.position.y = 0.14;
  root.add(bowl);
  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius * 0.78, 0.07, 48, 1, true),
    new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.3, metalness: wallColor === 0xb4bac2 ? 0.7 : 0.2, side: THREE.DoubleSide }),
  );
  wall.position.y = 0.035;
  bowl.add(wall);
  bowl.add(cylinder(radius * 0.78, radius * 0.78, 0.006, m.steel, 0, 0.003, 0));
  bowl.add(cylinder(0.015, radius * 0.55, 0.035, m.steel, 0, 0.022, 0)); // centre cone
  // Spiral track ring
  const track = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.88, 0.006, 6, 48, Math.PI * 1.6), m.steel);
  track.rotation.x = Math.PI / 2;
  track.position.y = 0.05;
  bowl.add(track);
  // Parts travelling around the bowl
  const parts = new THREE.Group();
  parts.position.y = 0.012;
  bowl.add(parts);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    parts.add(box(0.014, 0.01, 0.01, m.dark, Math.cos(a) * radius * 0.6, 0, Math.sin(a) * radius * 0.6));
  }
  if (outlet) {
    root.add(box(0.14, 0.02, 0.03, m.steel, radius + 0.06, 0.2, 0)); // linear track
    root.add(box(0.1, 0.06, 0.05, m.robotGrey, radius + 0.06, 0.16, 0)); // linear vibrator
  }

  const update = (t: number) => {
    parts.rotation.y = -t * 0.8 + phase;
    bowl.position.y = 0.14 + 0.0008 * Math.sin(t * 90 + phase);
  };
  return { object: root, update };
}

/** Distance from a SCARA's elbow joint to its quill (see createScara). */
export const SCARA_QUILL_OFFSET = 0.19;

/**
 * Two-link inverse kinematics for createScara: angles that put the quill at (dx, dz)
 * relative to the robot base. Lengths are in the robot's (scaled) units.
 */
export function scaraIK(dx: number, dz: number, link1: number, link2: number, elbowSign: 1 | -1 = 1) {
  const reach = Math.min(Math.hypot(dx, dz), link1 + link2 - 1e-3);
  const phi = Math.atan2(-dz, dx);
  const cos = THREE.MathUtils.clamp((reach * reach - link1 * link1 - link2 * link2) / (2 * link1 * link2), -1, 1);
  const elbowAngle = elbowSign * Math.acos(cos);
  const baseAngle = phi - Math.atan2(link2 * Math.sin(elbowAngle), link1 + link2 * Math.cos(elbowAngle));
  return { baseAngle, elbowAngle };
}

type CabinetOptions = {
  width: number;
  height: number;
  depth: number;
  casterHeight?: number;
  body?: THREE.Material;
  /** Extrusion colour (defaults to aluminium). */
  frame?: THREE.Material;
};

/** Sheet-metal cabinet on an aluminium frame with casters. Origin = floor centre. */
export function createCabinet(
  m: Materials,
  { width, height, depth, casterHeight = 0.1, body = m.sheet, frame = m.aluminum }: CabinetOptions,
) {
  const g = new THREE.Group();
  const P = 0.03;
  const bodyH = height - casterHeight;
  g.add(box(width - 0.012, bodyH - 0.012, depth - 0.012, body, 0, casterHeight + bodyH / 2, 0));
  const x = width / 2 - P / 2;
  const z = depth / 2 - P / 2;
  for (const sx of [-x, x]) for (const sz of [-z, z]) g.add(beam([sx, casterHeight, sz], [sx, height, sz], P, frame));
  for (const y of [casterHeight + P / 2, height - P / 2]) {
    g.add(beam([-x, y, -z], [x, y, -z], P, frame), beam([-x, y, z], [x, y, z], P, frame));
    g.add(beam([-x, y, -z], [-x, y, z], P, frame), beam([x, y, -z], [x, y, z], P, frame));
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const caster = createCaster(m, casterHeight);
      caster.position.set(sx * (width / 2 - 0.07), 0, sz * (depth / 2 - 0.07));
      caster.rotation.y = sx < 0 ? Math.PI : 0;
      g.add(caster);
    }
  }
  return g;
}

/** Grid of ventilation slots on a face. `face` = which way the face looks. */
export function vents(
  m: Materials,
  face: "+x" | "-x" | "+z" | "-z",
  center: Vec3,
  cols: number,
  rows: number,
  pitch = 0.04,
) {
  const g = new THREE.Group();
  const alongX = face === "+z" || face === "-z";
  const out = face.startsWith("+") ? 0.004 : -0.004;
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const u = (c - (cols - 1) / 2) * pitch;
      const v = (r - (rows - 1) / 2) * pitch * 0.5;
      g.add(
        alongX
          ? box(pitch * 0.7, pitch * 0.22, 0.004, m.dark, center[0] + u, center[1] + v, center[2] + out)
          : box(0.004, pitch * 0.22, pitch * 0.7, m.dark, center[0] + out, center[1] + v, center[2] + u),
      );
    }
  }
  return g;
}

type LoopConveyorOptions = {
  /** Half the distance between the two straight runs (= end radius). */
  halfWidth: number;
  zBack: number;
  zFront: number;
  pallets?: number;
  /** Pallet speed in m/s. */
  speed?: number;
};

/** Closed pallet loop (stadium shape) running round the deck. Origin = deck surface. */
export function createLoopConveyor(m: Materials, { halfWidth: r, zBack, zFront, pallets = 10, speed = 0.06 }: LoopConveyorOptions) {
  const root = new THREE.Group();
  const cBack = zBack + r;
  const cFront = zFront - r;
  const straight = cFront - cBack;
  const length = 2 * straight + 2 * Math.PI * r;

  // Track: stadium ring extruded upward. Shape (x, y) maps to world (x, -z) after rotating.
  const stadium = (path: THREE.Path, rr: number) => {
    path.moveTo(rr, -cBack);
    path.lineTo(rr, -cFront);
    path.absarc(0, -cFront, rr, 0, -Math.PI, true);
    path.lineTo(-rr, -cBack);
    path.absarc(0, -cBack, rr, Math.PI, 0, true);
  };
  const outer = new THREE.Shape();
  stadium(outer, r + 0.04);
  const hole = new THREE.Path();
  stadium(hole, r - 0.04);
  outer.holes.push(hole);
  const track = new THREE.Mesh(new THREE.ExtrudeGeometry(outer, { depth: 0.03, bevelEnabled: false, curveSegments: 32 }), m.robotGrey);
  track.rotation.x = -Math.PI / 2;
  root.add(track);

  const pointAt = (s: number) => {
    s = ((s % length) + length) % length;
    if (s < straight) return new THREE.Vector3(r, 0, cBack + s);
    s -= straight;
    if (s < Math.PI * r) return new THREE.Vector3(r * Math.cos(s / r), 0, cFront + r * Math.sin(s / r));
    s -= Math.PI * r;
    if (s < straight) return new THREE.Vector3(-r, 0, cFront - s);
    s -= straight;
    return new THREE.Vector3(-r * Math.cos(s / r), 0, cBack - r * Math.sin(s / r));
  };

  const items: THREE.Group[] = [];
  for (let i = 0; i < pallets; i++) {
    const pallet = new THREE.Group();
    pallet.add(box(0.07, 0.015, 0.09, m.steel, 0, 0.0375, 0));
    pallet.add(box(0.03, 0.025, 0.04, m.dark, 0, 0.058, 0));
    root.add(pallet);
    items.push(pallet);
  }

  const update = (t: number) => {
    items.forEach((pallet, i) => {
      const s = t * speed + (i / pallets) * length;
      const p = pointAt(s);
      const ahead = pointAt(s + 0.01);
      pallet.position.copy(p);
      pallet.rotation.y = Math.atan2(ahead.x - p.x, ahead.z - p.z);
    });
  };
  update(0);
  return { object: root, update };
}

/** Swivel caster with a levelling foot beside it. `height` = floor to frame bottom. */
export function createCaster(m: Materials, height: number) {
  const root = new THREE.Group();
  const r = height * 0.32;
  root.add(box(0.07, 0.008, 0.07, m.steel, 0, height - 0.004, 0));
  root.add(box(0.012, height - r, 0.04, m.steel, -0.022, height - (height - r) / 2, 0));
  root.add(box(0.012, height - r, 0.04, m.steel, 0.022, height - (height - r) / 2, 0));
  const wheel = cylinder(r, r, 0.03, m.rubber, 0, r, 0, 24);
  wheel.rotation.z = Math.PI / 2;
  root.add(wheel);
  root.add(cylinder(0.006, 0.006, height, m.steel, 0.06, height / 2, 0, 12));
  root.add(cylinder(0.026, 0.03, 0.012, m.rubber, 0.06, 0.006, 0, 20));
  return root;
}

// ── Shared station pieces (PICK ARM / PICK DRIVE family) ─────────────────────

/** Open-top U-channel cross-section (left-view detail): outer width / height, wall and floor thickness. */
export const U_CHANNEL = { width: 0.07, height: 0.085, wall: 0.017, floor: 0.018 };

/** Black U-channel chute running in x from `a` to `b` (x, y = floor underside), sloped. */
export function createUChannel(m: Materials, a: { x: number; y: number }, b: { x: number; y: number }, z: number) {
  const U = U_CHANNEL;
  const g = new THREE.Group();
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  g.add(box(len, U.floor, U.width, m.dark, 0, U.floor / 2, 0));
  for (const s of [-1, 1]) g.add(box(len, U.height, U.wall, m.dark, 0, U.height / 2, s * (U.width / 2 - U.wall / 2)));
  g.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, z);
  g.rotation.z = Math.atan2(b.y - a.y, b.x - a.x) + (b.x < a.x ? Math.PI : 0);
  return g;
}

/**
 * Vertical drop guide at the inner end of a chute: black U cradle on the deck, two grey
 * plates rising from its walls to form a slot, a grey block on the back side with an
 * outer plate, and a pusher rod coming down into the slot.
 */
export function createDropGuide(m: Materials, rod = true) {
  const U = U_CHANNEL;
  const g = new THREE.Group();
  const len = 0.08; // along x
  const plateH = 0.19;
  const wallZ = U.width / 2 - U.wall / 2;
  g.add(box(len, U.floor, U.width, m.dark, 0, U.floor / 2, 0));
  for (const s of [-1, 1]) g.add(box(len, U.height, U.wall, m.dark, 0, U.height / 2, s * wallZ));
  for (const s of [-1, 1]) g.add(box(len, plateH, U.wall, m.panelGrey, 0, U.height + plateH / 2, s * wallZ));
  g.add(box(len, 0.115, 0.054, m.panelGrey, 0, U.height + 0.015 + 0.0575, -0.062));
  g.add(box(len, plateH, U.wall, m.panelGrey, 0, U.height + plateH / 2, -0.08));
  if (rod) {
    g.add(cylinder(0.013, 0.013, 0.2, m.steel, 0, U.height + plateH + 0.06, -0.011, 20));
    g.add(cylinder(0.022, 0.022, 0.05, m.steel, 0, U.height + plateH + 0.18, -0.011, 20));
  }
  return g;
}

/**
 * Height-adjustable support pole for a chute: aluminium profile post on a foot plate, a
 * pivot bracket tilted to the chute angle, a saddle plate under the chute and a clamp knob.
 */
export function createSupportPole(m: Materials, x: number, z: number, floorY: number, chuteY: number, angle: number) {
  const g = new THREE.Group();
  const P = 0.03;
  const postTop = chuteY - 0.03;
  g.add(box(0.07, 0.008, 0.07, m.steel, x, floorY + 0.004, z));
  g.add(beam([x, floorY, z], [x, postTop, z], P, m.aluminum));
  for (const s of [-1, 1]) g.add(box(0.002, postTop - floorY - 0.02, 0.006, m.panelGrey, x + s * (P / 2 + 0.001), (floorY + postTop) / 2, z));
  const pivot = box(0.035, 0.035, 0.04, m.aluminum, x, postTop + 0.012, z);
  pivot.rotation.z = angle + Math.PI / 4;
  g.add(pivot);
  const saddle = box(0.07, 0.006, U_CHANNEL.width + 0.01, m.panelGrey, x, chuteY - 0.004, z);
  saddle.rotation.z = angle;
  g.add(saddle);
  const knob = cylinder(0.012, 0.012, 0.02, m.dark, x, postTop + 0.012, z + 0.03, 16);
  knob.rotation.x = Math.PI / 2;
  g.add(knob);
  return g;
}

type DischargeChuteOptions = {
  /** Drop guide position on the deck (world x / z). */
  guideX: number;
  z: number;
  /** World x where the chute ends outside the left wall. */
  outX: number;
  /** World x of the support pole. */
  poleX: number;
  deckTop: number;
  /** Own pusher rod above the guide (leave off when a robot quill works the slot). */
  rod?: boolean;
};

/** Drop guide + U-channel chute sloping down to the left and out of the cell, on a support pole. */
export function createDischargeChute(m: Materials, { guideX, z, outX, poleX, deckTop, rod = true }: DischargeChuteOptions) {
  const g = new THREE.Group();
  const guide = createDropGuide(m, rod);
  guide.position.set(guideX, deckTop, z);
  g.add(guide);
  const a = { x: guideX - 0.045, y: deckTop + 0.2 };
  const b = { x: outX, y: deckTop + 0.02 };
  g.add(createUChannel(m, a, b, z));
  const chuteY = a.y + ((poleX - a.x) * (b.y - a.y)) / (b.x - a.x);
  g.add(createSupportPole(m, poleX, z, deckTop, chuteY, Math.atan2(a.y - b.y, a.x - b.x)));
  return g;
}

/** Power supply size (top view 175 × 47 px, left view ~90 mm tall). */
export const POWER_SUPPLY = { width: 0.17, height: 0.09, depth: 0.05 };

/**
 * Power supply unit: beige metal case with vent slots and mounting feet. The front panel
 * (two round connectors, red rocker switch, power LED) sits on one end face; `panel` says
 * which way that end faces in the world. Origin = centre of the footprint on the floor.
 */
export function createPowerSupply(m: Materials, panel: "-x" | "+x" | "-z" | "+z" = "-x") {
  const g = new THREE.Group();
  const { width: w, height: h, depth: d } = POWER_SUPPLY;
  g.add(box(w, h, d, m.epson, 0, h / 2, 0));
  for (const s of [-1, 1]) g.add(box(0.02, 0.004, d + 0.02, m.steel, s * (w / 2 - 0.012), 0.002, 0));
  for (let i = 0; i < 5; i++) g.add(box(0.03, 0.003, d - 0.012, m.dark, -0.05 + i * 0.025, h + 0.0005, 0));
  const f = -w / 2;
  const onFace = (mesh: THREE.Mesh) => {
    mesh.rotation.z = Math.PI / 2;
    return mesh;
  };
  g.add(box(0.003, h - 0.016, d - 0.01, m.panelGrey, f - 0.0015, h / 2, 0));
  for (const v of [h / 2 + 0.02, h / 2 - 0.01]) g.add(onFace(cylinder(0.008, 0.008, 0.012, m.steel, f - 0.006, v, -0.009, 16)));
  g.add(box(0.008, 0.016, 0.01, m.red, f - 0.005, h / 2 - 0.012, 0.012));
  g.add(onFace(cylinder(0.003, 0.003, 0.004, m.pcb, f - 0.004, h / 2 + 0.02, 0.012, 10)));
  // Built with the panel on −x; turn so it faces the requested way.
  g.rotation.y = { "-x": 0, "+x": Math.PI, "-z": -Math.PI / 2, "+z": Math.PI / 2 }[panel];
  return g;
}

type GlassCellOptions = {
  width: number;
  depth: number;
  height: number;
  casterHeight: number;
  deckHeight: number;
};

/**
 * Square station body: black-panelled lower cabinet on casters with two front doors
 * (handles, hinges), a worktop deck, and an aluminium-framed glass enclosure with the
 * roof split in four and a lifting handle on the right side. Returns the deck top height.
 */
export function createGlassCell(m: Materials, { width: W, depth: D, height: H, casterHeight: C, deckHeight: deck }: GlassCellOptions) {
  const g = new THREE.Group();
  const P = 0.03;
  g.add(createCabinet(m, { width: W, height: deck, depth: D, casterHeight: C, body: m.panel }));
  g.add(beam([0, C, D / 2 - P / 2], [0, deck, D / 2 - P / 2], P, m.aluminum));
  for (const x of [-0.045, 0.045]) g.add(box(0.012, 0.13, 0.012, m.steel, x, C + (deck - C) * 0.55, D / 2 + 0.02));
  for (const sx of [-1, 1]) for (const y of [C + 0.08, deck - 0.1]) g.add(box(0.03, 0.05, 0.012, m.dark, sx * (W / 2 - 0.05), y, D / 2 + 0.008));

  const top = H - P / 2;
  const x0 = -W / 2 + P / 2;
  const x1 = W / 2 - P / 2;
  const z0 = -D / 2 + P / 2;
  const z1 = D / 2 - P / 2;
  g.add(box(W - 0.01, 0.015, D - 0.01, m.worktop, 0, deck + 0.0075, 0));
  for (const x of [x0, x1]) for (const z of [z0, z1]) g.add(beam([x, deck, z], [x, H, z], P, m.aluminum));
  for (const y of [deck + P / 2, top]) {
    g.add(beam([x0, y, z0], [x1, y, z0], P, m.aluminum), beam([x0, y, z1], [x1, y, z1], P, m.aluminum));
    g.add(beam([x0, y, z0], [x0, y, z1], P, m.aluminum), beam([x1, y, z0], [x1, y, z1], P, m.aluminum));
  }
  g.add(beam([0, top, z0], [0, top, z1], P, m.aluminum), beam([x0, top, 0], [x1, top, 0], P, m.aluminum));
  const g0 = deck + P;
  g.add(
    panelXY(x0, x1, g0, H - P, D / 2 - 0.01, m.glass, 0.004),
    panelXY(x0, x1, g0, H - P, -D / 2 + 0.01, m.glass, 0.004),
    panelZY(z0, z1, g0, H - P, -W / 2 + 0.01, m.glass, 0.004),
    panelZY(z0, z1, g0, H - P, W / 2 - 0.01, m.glass, 0.004),
    box(W - P, 0.004, D - P, m.glass, 0, H - 0.002, 0),
  );
  g.add(box(0.012, 0.1, 0.012, m.steel, W / 2 + 0.02, deck + 0.38, 0.1));
  return { object: g, deckTop: deck + 0.015 };
}
