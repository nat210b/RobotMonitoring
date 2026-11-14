import * as THREE from "three";
import {
  beam,
  box,
  createBowlFeeder,
  createCaster,
  createMaterials,
  createRotaryTable,
  createScara,
  createSixAxisRobot,
  createStackLight,
  SCARA_QUILL_OFFSET,
  sixAxisPose,
  panelXY,
  panelZY,
  type MachineParts,
} from "../parts";

/**
 * FEED ROLLER GEAR CLUSTER ASSEMBLY station, modelled from the drawings in
 * app/machine_data/FEED ROLLER GEAR CLUSTER ASSEMBLY/ (front, back, left, right, top, iso).
 *
 * Units are metres. The drawings carry no dimensions, so the frame is assumed 1.2 m wide;
 * depth and height follow the measured drawing ratio (W : D : H ≈ 1 : 0.83 : 1).
 * Axes: +x = right, +y = up, +z = front (operator side).
 */
export const FRAME = {
  width: 1.2,
  depth: 1.0,
  height: 1.2,
  casterHeight: 0.09,
  profile: 0.03,
  /** Upper deck at the front half of the machine. */
  deckFront: 0.54,
  /** Lower deck at the back half (bowl feeders, SCARA 1, 6-axis arm). */
  deckBack: 0.4,
};

/** Rotary table radius, and the height of a nest's top above the table's base (disc 0.05 + plate 0.012 + nest 0.03). */
const ROTARY_R = 0.17;
const NEST_TOP = 0.102; // top of the tallest nest part (its dark stop) above the table's base: disc 0.05 + plate 0.012 + 0.04
const CLEAR = 0.006; // tools stop this far above it (the motion check wants 5 mm)

export function createFeedRollerGearClusterAssembly(): MachineParts {
  const m = createMaterials();
  const { width: W, depth: D, height: H, casterHeight: C, profile: P, deckFront, deckBack } = FRAME;

  const root = new THREE.Group();
  const machine = new THREE.Group();
  machine.position.y = C;
  root.add(machine);
  const add = (...objects: THREE.Object3D[]) => machine.add(...objects);

  const x0 = -W / 2 + P / 2;
  const x1 = W / 2 - P / 2;
  const z0 = -D / 2 + P / 2;
  const z1 = D / 2 - P / 2;
  const top = H - P / 2;
  const rail = (a: [number, number, number], b: [number, number, number]) => add(beam(a, b, P, m.aluminum));

  // ── Aluminium extrusion frame ──────────────────────────────────────────
  for (const x of [x0, x1]) for (const z of [z0, z1]) rail([x, 0, z], [x, H, z]);
  for (const y of [P / 2, top]) {
    rail([x0, y, z0], [x1, y, z0]);
    rail([x0, y, z1], [x1, y, z1]);
    rail([x0, y, z0], [x0, y, z1]);
    rail([x1, y, z0], [x1, y, z1]);
  }
  // Roof cross members (top view shows the roof split in four)
  rail([0, top, z0], [0, top, z1]);
  rail([x0, top, 0], [x1, top, 0]);
  // Front deck ring (upper) and back deck ring (lower), with the step at z = 0
  rail([x0, deckFront, z1], [x1, deckFront, z1]);
  rail([x0, deckFront, 0], [x1, deckFront, 0]);
  rail([x0, deckFront, 0], [x0, deckFront, z1]);
  rail([x1, deckFront, 0], [x1, deckFront, z1]);
  rail([x0, deckBack, z0], [x1, deckBack, z0]);
  rail([x0, deckBack, 0], [x1, deckBack, 0]);
  rail([x0, deckBack, z0], [x0, deckBack, 0]);
  rail([x1, deckBack, z0], [x1, deckBack, 0]);
  rail([x0, deckBack, 0], [x0, deckFront, 0]);
  rail([x1, deckBack, 0], [x1, deckFront, 0]);
  // Cabinet mid posts (front: two panels, back: two panels)
  rail([0, 0, z1], [0, deckFront, z1]);
  rail([0, 0, z0], [0, deckBack, z0]);
  // Side mid posts (left/right cabinets split front/back)
  rail([x0, 0, 0], [x0, deckBack, 0]);
  rail([x1, 0, 0], [x1, deckBack, 0]);

  // ── Lower cabinet panels ──────────────────────────────────────────────
  const inset = P * 0.3;
  const yLow = P;
  add(
    panelXY(x0 + P / 2, -P / 2, yLow, deckFront - P / 2, D / 2 - inset, m.panel),
    panelXY(P / 2, x1 - P / 2, yLow, deckFront - P / 2, D / 2 - inset, m.panel),
    panelXY(x0 + P / 2, -P / 2, yLow, deckBack - P / 2, -D / 2 + inset, m.panel),
    panelXY(P / 2, x1 - P / 2, yLow, deckBack - P / 2, -D / 2 + inset, m.panel),
  );
  for (const [x, sign] of [[-W / 2 + inset, -1], [W / 2 - inset, 1]] as const) {
    add(
      panelZY(P / 2, z1 - P / 2, yLow, deckFront - P / 2, x, m.panel),
      panelZY(z0 + P / 2, -P / 2, yLow, deckBack - P / 2, x, m.panel),
    );
    // Right-hand side has hinged doors with handles
    if (sign === 1) {
      add(
        box(0.012, 0.12, 0.012, m.steel, x + 0.012, (yLow + deckFront) / 2, 0.06),
        box(0.012, 0.12, 0.012, m.steel, x + 0.012, (yLow + deckBack) / 2, -0.06),
      );
    }
  }

  // ── Worktops ─────────────────────────────────────────────────────────
  const plate = 0.015;
  const topFront = deckFront + P / 2;
  const topBack = deckBack + P / 2;
  add(
    box(W - 2 * P, plate, D / 2 - P, m.worktop, 0, topFront - plate / 2, (D / 2 - P) / 2),
    box(W - 2 * P, plate, D / 2 - P, m.worktop, 0, topBack - plate / 2, -(D / 2 - P) / 2),
    panelXY(x0 + P / 2, x1 - P / 2, deckBack, deckFront, -P / 2, m.worktop, 0.01),
  );

  // ── Safety glass enclosure ────────────────────────────────────────────
  add(
    panelXY(x0, x1, topFront, top, D / 2 - inset, m.glass, 0.004),
    panelXY(x0, x1, topBack, top, -D / 2 + inset, m.glass, 0.004),
    panelZY(0, z1, topFront, top, -W / 2 + inset, m.glass, 0.004),
    panelZY(z0, 0, topBack, top, -W / 2 + inset, m.glass, 0.004),
    panelZY(0, z1, topFront, top, W / 2 - inset, m.glass, 0.004),
    panelZY(z0, 0, topBack, top, W / 2 - inset, m.glass, 0.004),
    box(W - P, 0.004, D - P, m.glass, 0, top + P / 2 - 0.002, 0),
  );

  // ── Equipment (positions taken from the top view) ─────────────────────
  const rotaryPos = new THREE.Vector3(-0.08, topFront, 0.22);
  const rotary = createRotaryTable(m, ROTARY_R);
  rotary.object.position.copy(rotaryPos);
  add(rotary.object);

  // The rotary table stops with a nest at every 45° (0° = +x, measured as atan2(z, x)). Each robot
  // works one of them: the 6-axis arm picks from the nest nearest to it, SCARA 1 and SCARA 2 place onto
  // theirs. A nest sits at 0.8 × the table radius from its centre.
  const nest = (deg: number) => {
    const a = (deg * Math.PI) / 180;
    return new THREE.Vector3(rotaryPos.x + Math.cos(a) * ROTARY_R * 0.8, 0, rotaryPos.z + Math.sin(a) * ROTARY_R * 0.8);
  };
  const GRIP_REACH = 0.03; // the 6-axis fingers sit this far ahead of its wrist
  const GRIP_DROP = 0.145; // wrist to fingertip
  const HOVER = 0.04; // gap between fingertips and nest at the top of the stroke
  const armBase = new THREE.Vector3(-0.4, topBack, -0.18);
  const armNest = nest(-135);
  const armFace = Math.atan2(-(armNest.z - armBase.z), armNest.x - armBase.x); // J1 yaw that points at the nest
  const armPose = sixAxisPose(
    Math.hypot(armNest.x - armBase.x, armNest.z - armBase.z) - GRIP_REACH,
    rotaryPos.y + NEST_TOP + CLEAR + GRIP_DROP + HOVER - armBase.y,
  );
  // Swings and cycle offsets checked collision-free by scripts/check-motion.ts
  const arm = createSixAxisRobot(m, { ...armPose, tool: "pcb", swing: [-0.9 + (Math.atan2(-(rotaryPos.z - armBase.z), rotaryPos.x - armBase.x) - armFace)], offset: 1 / 8, dip: HOVER / 0.3 });
  arm.object.position.copy(armBase);
  arm.object.rotation.y = armFace; // face the nest it picks from
  add(arm.object);

  /** J1 / J2 angles that put a SCARA's quill over `target`, elbow folded to `side` (-1: negative, as drawn). */
  const scaraAngles = (base: THREE.Vector3, target: THREE.Vector3, link1: number, side: 1 | -1 = -1) => {
    const link2 = SCARA_QUILL_OFFSET;
    const dx = target.x - base.x;
    const dy = -(target.z - base.z); // joint angles turn from +x towards -z
    const dist = Math.min(Math.hypot(dx, dy), link1 + link2 - 1e-3);
    const elbow = side * Math.acos(THREE.MathUtils.clamp((dist * dist - link1 * link1 - link2 * link2) / (2 * link1 * link2), -1, 1));
    const baseAngle = Math.atan2(dy, dx) - Math.atan2(link2 * Math.sin(elbow), link1 + link2 * Math.cos(elbow));
    return { baseAngle, elbow };
  };
  const NEST_Y = rotaryPos.y + NEST_TOP;
  const quillDrop = (ph: number, toolBottom: number, base: THREE.Vector3, targetY = NEST_Y) => base.y + ph + 0.16 + 0.05 + 0.02 - toolBottom - targetY; // stroke that lands the tool on targetY (a nest top by default)

  // Bowl feeder 1 ("bucket"): SCARA 1 picks the parts from its linear outlet track, 0.13 m along it
  // (track top is 0.21 m above the deck; the track runs from the bowl rim along the bowl's local +x).
  const BOWL1 = { pos: new THREE.Vector3(0.2, topBack, -0.26), rotY: Math.PI * 0.85, radius: 0.1 };
  const trackPick = new THREE.Vector3(BOWL1.radius + 0.03, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), BOWL1.rotY).add(BOWL1.pos);
  const TRACK_TOP_Y = BOWL1.pos.y + 0.21;

  const scaraTop = 0.64; // both SCARA bases sit at the same height in the front view
  const scara1Base = new THREE.Vector3(-0.12, topBack, -0.3);
  const scara1Pick = scaraAngles(scara1Base, trackPick, 0.26, 1); // picks from bowl feeder 1's track
  const scara1Place = scaraAngles(scara1Base, nest(-90), 0.26, 1); // places onto the nest at -90°
  const scara1 = createScara(m, {
    pedestalHeight: scaraTop - topBack,
    baseAngle: scara1Pick.baseAngle,
    elbowAngle: scara1Pick.elbow,
    link1: 0.26,
    connectorBoard: "+z", // green connector panel on the front face of the base
    swing: [scara1Place.baseAngle - scara1Pick.baseAngle, scara1Place.elbow - scara1Pick.elbow],
    dip: Math.max(0.01, quillDrop(scaraTop - topBack, 0.17, scara1Base, TRACK_TOP_Y) - CLEAR),
    dipPlace: Math.max(0.01, quillDrop(scaraTop - topBack, 0.17, scara1Base) - CLEAR),
    lift: 0, // quill already sits just under the overhead beam
  });
  scara1.object.position.copy(scara1Base);
  add(scara1.object);

  const scara2Base = new THREE.Vector3(0.4, topFront, 0.24);
  const scara2Place = scaraAngles(scara2Base, nest(0), 0.26); // places onto the nest at 0°
  const scara2Ped = scaraTop - topFront;
  const scara2 = createScara(m, {
    pedestalHeight: scara2Ped,
    baseAngle: 1.73,
    elbowAngle: -2.44,
    link1: 0.26,
    connectorBoard: "+z",
    swing: [scara2Place.baseAngle - 1.73 + (scara2Place.baseAngle < 1.73 ? 2 * Math.PI : 0), scara2Place.elbow + 2.44],
    dip: Math.max(0.01, quillDrop(scara2Ped, 0.17, scara2Base) - CLEAR),
    lift: 0.03, // its quill rod would otherwise brush the glass roof while travelling
    offset: 3 / 8,
  });
  scara2.object.position.copy(scara2Base);
  add(scara2.object);

  const bowl1 = createBowlFeeder(m, BOWL1.radius);
  bowl1.object.position.copy(BOWL1.pos);
  bowl1.object.rotation.y = BOWL1.rotY;
  add(bowl1.object);

  const bowl2 = createBowlFeeder(m, 0.09, 2);
  bowl2.object.position.set(0.38, topBack, -0.1);
  bowl2.object.rotation.y = Math.PI * 0.6;
  add(bowl2.object);

  // Control boxes (back-right corner of the top view) and front switch panel
  add(
    box(0.04, 0.1, 0.13, m.robotGrey, 0.5, topBack + 0.05, -0.38),
    box(0.04, 0.1, 0.13, m.robotGrey, 0.545, topBack + 0.05, -0.38),
    box(0.03, 0.02, 0.1, m.red, 0.5, topBack + 0.11, -0.38),
    box(0.03, 0.02, 0.1, m.red, 0.545, topBack + 0.11, -0.38),
  );

  // ── Casters ──────────────────────────────────────────────────────────
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const caster = createCaster(m, C);
      caster.position.set(sx * (W / 2 - 0.07), 0, sz * (D / 2 - 0.07));
      caster.rotation.y = sx < 0 ? Math.PI : 0;
      root.add(caster);
    }
  }

  // Stack light on the back-right corner of the roof
  add(createStackLight(m, x1 - 0.06, H, z0 + 0.06));

  // Tools go down on nests at 0.52–1.24 s (SCARA 1, start 0 s), 0.77–1.49 s (SCARA 2, start 2.25 s) and 0.75–1.47 s
  // (6-axis pick, start 0.75 s) of every 2 s. The table's indexing is shifted to turn only at 1.64–2.34 s, so it
  // is standing still whenever a tool is down on a nest. (Start times found with the motion check.)
  const ROTARY_PHASE = 1.64;
  root.userData.rotaryPhase = ROTARY_PHASE;
  const movers = [arm, scara1, scara2, bowl1, bowl2];
  const update = (t: number) => {
    movers.forEach((part) => part.update(t));
    rotary.update(t - (root.userData.rotaryPhase as number)); // tunable by tooling like the robots' motion settings
  };
  update(0);

  return { object: root, update };
}
