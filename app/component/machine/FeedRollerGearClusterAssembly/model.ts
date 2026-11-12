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
  const rotary = createRotaryTable(m, 0.17);
  rotary.object.position.copy(rotaryPos);
  add(rotary.object);

  // Swings and cycle offsets checked collision-free by scripts/check-motion.ts
  const arm = createSixAxisRobot(m, { swing: [-1.1], offset: 1 / 3 });
  arm.object.position.set(-0.4, topBack, -0.18);
  arm.object.rotation.y = Math.atan2(-(rotaryPos.z + 0.18), rotaryPos.x + 0.4); // face the rotary table
  add(arm.object);

  const scaraTop = 0.64; // both SCARA bases sit at the same height in the front view
  const scara1 = createScara(m, {
    pedestalHeight: scaraTop - topBack,
    baseAngle: 0,
    elbowAngle: -2.25,
    link1: 0.26,
    swing: [-0.8, 1.28],
    lift: 0, // quill already sits just under the overhead beam
  });
  scara1.object.position.set(-0.12, topBack, -0.3);
  add(scara1.object);

  const scara2 = createScara(m, {
    pedestalHeight: scaraTop - topFront,
    baseAngle: 1.73,
    elbowAngle: -2.44,
    link1: 0.26,
    tool: "pcb",
    swing: [0.8, 0],
    offset: 2 / 3,
  });
  scara2.object.position.set(0.4, topFront, 0.24);
  add(scara2.object);

  const bowl1 = createBowlFeeder(m, 0.1);
  bowl1.object.position.set(0.2, topBack, -0.26);
  bowl1.object.rotation.y = Math.PI * 0.85;
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

  const movers = [arm, scara1, scara2, rotary, bowl1, bowl2];
  const update = (t: number) => movers.forEach((part) => part.update(t));
  update(0);

  return { object: root, update };
}
