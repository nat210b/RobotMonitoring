import * as THREE from "three";
import {
  box,
  createBowlFeeder,
  createCabinet,
  createLoopConveyor,
  createMaterials,
  createRotaryTable,
  createScara,
  createStackLight,
  cylinder,
  vents,
  type MachineParts,
  type RobotMotion,
  type Materials,
} from "../parts";

/**
 * LEFT TRANSMISSION ASSEMBLY cell, modelled from the drawings in
 * app/machine_data/LEFT TRANSMISSION ASSEMBLY/ (front, back, left, right, top, iso).
 *
 * The cell is several units pushed together:
 *   back   – two bowl-feeder tables carrying 6 bowl feeders
 *   centre – main machine: 5 SCARA robots, 2 dial plates, pallet loop conveyor
 *   front  – two tray-magazine towers (HMI on top) with tray cabinets behind them
 *
 * Units are metres. Positions come from the top view at ~2 mm per drawing pixel
 * (main deck height ≈ 1.07 × main-body depth, taken from the left view).
 * Axes: +x = right, +y = up, +z = front (operator side).
 */
export const LAYOUT = {
  width: 1.91,
  depth: 2.51,
  deckHeight: 0.95,
  feederTableHeight: 0.71,
  trayCabinetHeight: 1.0,
  magazineHeight: 1.4,
};

const CASTER = 0.1;

/** Top-view drawing pixel → metres (drawing centre at px 922, 645). */
const fromTop = (px: number, py: number) => ({ x: (px - 922) * 0.002, z: (py - 645) * 0.002 });

/** Place a cabinet spanning x0..x1, z0..z1 (metres). */
function placeCabinet(m: Materials, x0: number, x1: number, z0: number, z1: number, height: number) {
  const cab = createCabinet(m, { width: x1 - x0, height, depth: z1 - z0, casterHeight: CASTER });
  cab.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2);
  return cab;
}

/** Front tray magazine: open aluminium tower with HMI panel and a stack of tray shelves. */
function createTrayMagazine(m: Materials, width: number, depth: number, height: number) {
  const g = new THREE.Group();
  const P = 0.03;
  const x = width / 2 - P / 2;
  const z = depth / 2 - P / 2;
  for (const sx of [-x, x]) for (const sz of [-z, z]) g.add(box(P, height - CASTER, P, m.aluminum, sx, CASTER + (height - CASTER) / 2, sz));
  g.add(box(width, 0.2, depth, m.sheet, 0, CASTER + 0.1, 0)); // base drawer
  g.add(box(width, P, depth, m.aluminum, 0, height - P / 2, 0)); // top cap

  // HMI panel across the top front
  const hmiY = height - 0.15;
  g.add(box(width - 0.04, 0.24, 0.12, m.sheet, 0, hmiY, depth / 2 - 0.06));
  g.add(box(0.2, 0.13, 0.006, m.screen, -width * 0.2, hmiY + 0.01, depth / 2 + 0.003));
  for (let i = 0; i < 3; i++) {
    const button = cylinder(0.018, 0.018, 0.012, i === 0 ? m.pcb : i === 1 ? m.red : m.steel, width * 0.12 + i * 0.06, hmiY - 0.03, depth / 2 + 0.006, 20);
    button.rotation.x = Math.PI / 2;
    g.add(button);
  }

  // Elevator guide columns and tray shelves
  for (const sx of [-1, 1]) g.add(box(0.035, height - 0.6, 0.035, m.aluminum, sx * width * 0.3, CASTER + 0.2 + (height - 0.6) / 2, 0));
  const shelves = new THREE.Group();
  for (let i = 0; i < 12; i++) {
    shelves.add(box(width - 0.1, 0.012, depth - 0.08, m.robotGrey, 0, 0.38 + i * 0.058, 0));
    shelves.add(box(width * 0.5, 0.015, depth * 0.6, m.steel, 0, 0.395 + i * 0.058, 0));
  }
  g.add(shelves);
  return g;
}

/** Tray of gear parts in a grid (left tray unit) or pocketed trays (right tray unit). */
function createTrayTop(m: Materials, width: number, depth: number, kind: "parts" | "pockets") {
  const g = new THREE.Group();
  g.add(box(width - 0.08, 0.012, depth - 0.1, m.robotGrey, 0, 0.006, 0));
  if (kind === "parts") {
    for (let c = 0; c < 4; c++) {
      for (let r = 0; r < 10; r++) {
        const part = box(0.05, 0.012, 0.022, m.steel, (c - 1.5) * 0.11, 0.018, (r - 4.5) * 0.05 + (r >= 5 ? 0.03 : -0.03));
        part.rotation.y = 0.5;
        g.add(part);
      }
    }
  } else {
    for (let c = 0; c < 4; c++) {
      for (let r = 0; r < 2; r++) {
        const tray = new THREE.Group();
        tray.position.set((c - 1.5) * 0.12, 0.012, (r - 0.5) * 0.28);
        tray.add(box(0.11, 0.025, 0.26, m.disc, 0, 0.0125, 0));
        for (let k = 0; k < 4; k++) tray.add(box(0.012, 0.012, 0.22, m.robotGrey, (k - 1.5) * 0.022, 0.03, 0));
        g.add(tray);
      }
    }
  }
  return g;
}

export function createLeftTransmissionAssembly(): MachineParts {
  const m = createMaterials();
  const root = new THREE.Group();
  const movers: { update: (t: number) => void }[] = [];
  const { deckHeight: deck, feederTableHeight, trayCabinetHeight, magazineHeight } = LAYOUT;

  // ── Back: bowl-feeder tables (top view px x 462–1400, y 18–290) ──────────
  const feedBack = fromTop(0, 18).z;
  const feedFront = fromTop(0, 290).z;
  for (const [x0, x1] of [[fromTop(462, 0).x, 0], [0, fromTop(1400, 0).x]]) {
    root.add(placeCabinet(m, x0 + 0.005, x1 - 0.005, feedBack, feedFront, feederTableHeight));
    root.add(vents(m, "-z", [(x0 + x1) / 2, 0.3, feedBack], 6, 4));
  }
  const bowlCentres: [number, number][] = [[575, 200], [680, 130], [845, 130], [995, 130], [1160, 130], [1270, 200]];
  bowlCentres.forEach(([px, py], i) => {
    const { x, z } = fromTop(px, py);
    const bowl = createBowlFeeder(m, 0.1, i * 1.3);
    bowl.object.scale.setScalar(1.25);
    bowl.object.position.set(x, feederTableHeight, z);
    bowl.object.rotation.y = -Math.PI / 2; // outlet track runs toward the main machine (+z)
    root.add(bowl.object);
    movers.push(bowl);
  });

  // ── Centre: main machine body (wide back part + narrow front part) ──────
  const wide = { x0: fromTop(573, 0).x, x1: fromTop(1272, 0).x, z0: fromTop(0, 300).z, z1: fromTop(0, 745).z };
  const narrow = { x0: fromTop(768, 0).x, x1: fromTop(1078, 0).x, z0: wide.z1, z1: fromTop(0, 1272).z };
  root.add(placeCabinet(m, wide.x0, wide.x1, wide.z0, wide.z1, deck));
  root.add(placeCabinet(m, narrow.x0, narrow.x1, narrow.z0, narrow.z1, deck));
  // Door handles: front door, and the double doors on the left side (left view)
  root.add(
    box(0.014, 0.16, 0.014, m.steel, narrow.x1 - 0.08, deck * 0.55, narrow.z1 + 0.012),
    box(0.014, 0.16, 0.014, m.steel, wide.x0 - 0.012, deck * 0.55, (wide.z0 + wide.z1) / 2 - 0.03),
    box(0.014, 0.16, 0.014, m.steel, wide.x0 - 0.012, deck * 0.55, (wide.z0 + wide.z1) / 2 + 0.03),
  );

  // Dial plates and the pallet loop that runs round them
  const dialA = fromTop(920, 445);
  const dialB = fromTop(920, 715);
  for (const [dial, phase] of [[dialA, 0], [dialB, 1.2]] as const) {
    const table = createRotaryTable(m, 0.15, 6, 2.5);
    table.object.position.set(dial.x, deck, dial.z);
    root.add(table.object);
    movers.push({ update: (t) => table.update(t + phase) });
  }
  const loop = createLoopConveyor(m, { halfWidth: 0.27, zBack: dialA.z - 0.27, zFront: dialB.z + 0.27, pallets: 14 });
  loop.object.position.set(0, deck, 0);
  root.add(loop.object);
  movers.push(loop);

  // Five SCARA robots posed exactly as in the top view (base J1, elbow J2 and quill, in
  // drawing px), so the arms sit side by side without crossing each other.
  const scaras: { base: [number, number]; elbow: [number, number]; quill: [number, number]; motion: Partial<RobotMotion> }[] = [
    { base: [650, 449], elbow: [780, 345], quill: [782, 477], motion: { swing: [-0.8, 1.28] } }, // top-left
    { base: [1192, 449], elbow: [1075, 315], quill: [1019, 449], motion: { swing: [0.8, -0.8] } }, // top-right
    { base: [632, 560], elbow: [655, 760], quill: [778, 677], motion: { swing: [0.8, -1.28] } }, // middle-left
    { base: [1192, 630], elbow: [1210, 832], quill: [1075, 760], motion: { swing: [0.8, 0.48] } }, // middle-right
    { base: [922, 1010], elbow: [805, 882], quill: [944, 827], motion: { swing: [-0.8, 1.28] } }, // front
  ];
  const yaw = (from: { x: number; z: number }, to: { x: number; z: number }) => Math.atan2(-(to.z - from.z), to.x - from.x);
  const dist = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(b.x - a.x, b.z - a.z);
  scaras.forEach(({ base, elbow, quill, motion }, i) => {
    const b = fromTop(...base);
    const e = fromTop(...elbow);
    const q = fromTop(...quill);
    const baseAngle = yaw(b, e);
    const robot = createScara(m, {
      pedestalHeight: 0.08,
      baseAngle,
      elbowAngle: yaw(e, q) - baseAngle,
      link1: dist(b, e),
      link2: dist(e, q),
      offset: i / scaras.length,
      ...motion,
    });
    robot.object.position.set(b.x, deck, b.z);
    root.add(robot.object);
    movers.push(robot);
  });

  // Small press / check stations on the deck
  for (const [px, py] of [[920, 330], [725, 480], [1120, 520], [1120, 690], [945, 905]] as const) {
    const { x, z } = fromTop(px, py);
    root.add(box(0.08, 0.12, 0.06, m.robotGrey, x, deck + 0.06, z), box(0.03, 0.05, 0.03, m.red, x, deck + 0.145, z));
  }

  // ── Front: tray units (top view px x 445–760 and 1085–1400, y 748–1272) ──
  const trayUnits = [
    { x0: fromTop(445, 0).x, x1: fromTop(760, 0).x, kind: "parts" as const },
    { x0: fromTop(1085, 0).x, x1: fromTop(1400, 0).x, kind: "pockets" as const },
  ];
  const unitZ0 = fromTop(0, 748).z;
  const unitZ1 = fromTop(0, 1272).z;
  const magazineDepth = 0.36;
  for (const { x0, x1, kind } of trayUnits) {
    const w = x1 - x0;
    const cx = (x0 + x1) / 2;
    root.add(placeCabinet(m, x0, x1, unitZ0, unitZ1 - magazineDepth, trayCabinetHeight));
    const outer = kind === "parts" ? x0 : x1;
    root.add(vents(m, kind === "parts" ? "-x" : "+x", [outer, 0.3, (unitZ0 + unitZ1 - magazineDepth) / 2], 10, 4));
    const tray = createTrayTop(m, w, unitZ1 - magazineDepth - unitZ0, kind);
    tray.position.set(cx, trayCabinetHeight, (unitZ0 + unitZ1 - magazineDepth) / 2);
    root.add(tray);
    const magazine = createTrayMagazine(m, w, magazineDepth, magazineHeight);
    magazine.position.set(cx, 0, unitZ1 - magazineDepth / 2);
    root.add(magazine);
    // Stack light on top of the first (left) tray magazine
    if (kind === "parts") root.add(createStackLight(m, x0 + 0.07, magazineHeight, unitZ1 - magazineDepth + 0.07));
  }

  const update = (t: number) => movers.forEach((part) => part.update(t));
  update(0);
  return { object: root, update };
}
