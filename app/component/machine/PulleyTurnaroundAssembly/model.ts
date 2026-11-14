import * as THREE from "three";
import {
  beam,
  box,
  createBowlFeeder,
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
 * PULLEY TURNAROUND ASSEMBLY cell, modelled from the drawings in
 * app/machine_data/PULLEY TURNAROUND ASSEMBLY/ (front, back, left, right, top, iso).
 *
 * Rectangular cell with a dark extrusion frame: black-panelled lower cabinet (four front
 * doors, fans, red/yellow main switch), glass enclosure with door posts and the roof split
 * in four, purple deck. Inside: a teal rotary table, two Delta SCARAs on tall pedestals
 * (back-right and front-left), two bowl feeders, a long linear rail on the left, a feed
 * rail, valve bank and blocks. HMI bay at the front-right (screen, button strip, keyboard
 * tray sticking out). Stack light on the front-left corner. Outside at the back: a large
 * drum bulk feeder on a stand with a green hopper and a chute into the cell.
 *
 * Units are metres; top view ≈ 1.7 mm per drawing pixel (front view shares the scale),
 * sized from the SCARAs' ~0.6 m reach. Axes: +x = right, +y = up, +z = front.
 */
export const FRAME = {
  width: 1.69,
  depth: 1.01,
  height: 1.78,
  casterHeight: 0.11,
  deckHeight: 0.714,
};

const K = 0.0017;
/** Top-view drawing pixel → metres (main frame centre at px 875, 802). */
const fromTop = (px: number, py: number) => ({ x: (px - 875) * K, z: (py - 802) * K });
/** Front-view drawing pixel row → height above the floor (floor at px 1205). */
const fromFrontY = (py: number) => (1205 - py) * K;

type XZ = { x: number; z: number };

/** Cooling fan grille on a face looking toward +z. */
function frontFan(m: Materials, x: number, y: number, z: number) {
  const g = new THREE.Group();
  for (const mesh of [cylinder(0.05, 0.05, 0.008, m.dark, 0, 0, 0, 24), cylinder(0.015, 0.015, 0.01, m.steel, 0, 0, 0, 12)]) {
    mesh.rotation.x = Math.PI / 2;
    g.add(mesh);
  }
  g.position.set(x, y, z);
  return g;
}

/** Oval (slot) hole on a column face: `normal` is the face direction, (u, y) its centre. */
function ovalHole(m: Materials, normal: "-x" | "-z", fx: number, fz: number, y: number, len = 0.07, h = 0.035, mat: THREE.Material = m.dark) {
  const g = new THREE.Group();
  const alongZ = normal === "-x";
  const out = -0.003;
  g.add(box(alongZ ? 0.004 : len - h, h, alongZ ? len - h : 0.004, mat, 0, 0, 0));
  for (const s of [-1, 1]) {
    const end = cylinder(h / 2, h / 2, 0.004, mat, alongZ ? 0 : s * (len - h) / 2, 0, alongZ ? s * (len - h) / 2 : 0, 16);
    end.rotation[alongZ ? "z" : "x"] = Math.PI / 2;
    g.add(end);
  }
  g.position.set(fx + (alongZ ? out : 0), y, fz + (alongZ ? 0 : out));
  return g;
}

/** Safety-relay style module on a DIN rail, facing −z: body, dark window, red tab, terminals. */
function relayModule(m: Materials, x: number, y: number, z: number, width: number, wide = false) {
  const g = new THREE.Group();
  const h = 0.1;
  const d = 0.035;
  g.add(box(width, h, d, wide ? m.olive : m.amber, 0, 0, -d / 2));
  if (!wide) {
    g.add(box(width * 0.7, 0.045, 0.002, m.dark, 0, -0.005, -d - 0.001)); // window
    g.add(box(width * 0.7, 0.008, 0.003, m.red, 0, h / 2 - 0.012, -d - 0.001)); // red tab
  } else {
    g.add(box(width * 0.8, 0.012, 0.002, m.amber, 0, h / 2 - 0.012, -d - 0.001));
  }
  for (const s of [-1, 1]) g.add(box(width * 0.8, 0.012, 0.012, m.amber, 0, s * (h / 2 + 0.006), -0.012)); // terminal rows
  g.position.set(x, y, z);
  return g;
}

/**
 * Maroon support column under the hopper (back / left / right views): square column of two
 * channels with seams on the back and left faces, a top window in the back-left corner
 * showing the black contactor inside, oval holes near the bottom of each half, a DIN rail
 * with one wide and three narrow yellow relay modules on the back face (drum side), an
 * olive box on the left face, standing on a grey base plate.
 */
function createHopperColumn(m: Materials, at: XZ, base: number, top: number) {
  const g = new THREE.Group();
  const w = 0.23;
  const t = 0.008;
  const h = top - base;
  const cx = at.x;
  const cz = at.z;
  const half = w / 2;
  const winBottom = top - 0.17;
  const winTop = top - 0.03;
  g.add(box(w + 0.05, 0.012, w + 0.05, m.robotGrey, cx, base - 0.006, cz)); // base plate
  // Front (+z) and right (+x) faces: solid
  g.add(box(w, h, t, m.maroon, cx, base + h / 2, cz + half - t / 2));
  g.add(box(t, h, w, m.maroon, cx + half - t / 2, base + h / 2, cz));
  // Back (−z) face: drum-side (+x) half solid; −x half with the top window
  g.add(box(half, h, t, m.maroon, cx + half / 2, base + h / 2, cz - half + t / 2));
  g.add(box(half, winBottom - base, t, m.maroon, cx - half / 2, base + (winBottom - base) / 2, cz - half + t / 2));
  g.add(box(half, top - winTop, t, m.maroon, cx - half / 2, (winTop + top) / 2, cz - half + t / 2));
  // Left (−x) face: front (+z) half solid; back half with the same corner window
  g.add(box(t, h, half, m.maroon, cx - half + t / 2, base + h / 2, cz + half / 2));
  g.add(box(t, winBottom - base, half, m.maroon, cx - half + t / 2, base + (winBottom - base) / 2, cz - half / 2));
  g.add(box(t, top - winTop, half, m.maroon, cx - half + t / 2, (winTop + top) / 2, cz - half / 2));
  // Inner divider plates (two channels each way) and seams on the outer faces
  g.add(box(t, h, w - 2 * t, m.maroon, cx, base + h / 2, cz), box(w - 2 * t, h, t, m.maroon, cx, base + h / 2, cz));
  g.add(box(0.003, h, 0.004, m.dark, cx, base + h / 2, cz - half - 0.001), box(0.004, h, 0.003, m.dark, cx - half - 0.001, base + h / 2, cz));
  g.add(box(w, 0.008, w, m.maroon, cx, top - 0.004, cz)); // top cap
  // Black contactor visible through the corner window
  g.add(box(0.07, 0.08, 0.07, m.dark, cx - half / 2, winBottom + 0.05, cz - half / 2));
  g.add(box(0.05, 0.02, 0.004, m.panelGrey, cx - half / 2, winBottom + 0.075, cz - half / 2 - 0.036));
  // Oval holes near the bottom: two on the back face, two on the left face
  for (const dx of [-half / 2, half / 2]) g.add(ovalHole(m, "-z", cx + dx, cz - half, base + 0.055, 0.07, 0.035, dx < 0 ? m.white : m.dark));
  for (const dz of [-half / 2, half / 2]) g.add(ovalHole(m, "-x", cx - half, cz + dz, base + 0.055, 0.07, 0.035, dz < 0 ? m.white : m.dark));
  // DIN rail with one wide and three narrow relay modules (back face, drum side)
  const railY = top - 0.24;
  const backZ = cz - half;
  g.add(box(0.14, 0.035, 0.008, m.steel, cx + half / 2 + 0.02, railY, backZ - 0.004));
  g.add(relayModule(m, cx + 0.02, railY, backZ - 0.008, 0.045, true));
  for (let i = 0; i < 3; i++) g.add(relayModule(m, cx + 0.06 + i * 0.024, railY, backZ - 0.008, 0.022));
  // Olive box on the left face
  g.add(box(0.03, 0.12, 0.11, m.olive, cx - half - 0.015, top - 0.15, cz - 0.05));
  return g;
}

/**
 * Green bulk hopper (local frame, origin at the column centre): tall straight top split
 * into two halves, short funnel down to a 0.25 m outlet, neck box seated on the column top.
 */
function createHopper(m: Materials, colTop: number) {
  const g = new THREE.Group();
  const side = 0.4;
  const neck = 0.25;
  const neckTop = colTop + 0.07;
  const funnelTop = neckTop + 0.06;
  const top = funnelTop + 0.12;
  const wall = 0.008;
  // Straight top: open box (four walls) with a seam down the middle
  for (const s of [-1, 1]) {
    g.add(box(side, top - funnelTop, wall, m.hopperGreen, 0, (funnelTop + top) / 2, (s * side) / 2));
    g.add(box(wall, top - funnelTop, side, m.hopperGreen, (s * side) / 2, (funnelTop + top) / 2, 0));
  }
  for (const s of [-1, 1]) g.add(box(0.004, top - funnelTop, 0.004, m.dark, 0, (funnelTop + top) / 2, (s * side) / 2 + s * 0.003));
  // Funnel (open square frustum) and its floor
  const funnel = new THREE.Mesh(
    new THREE.CylinderGeometry((side / 2) * Math.SQRT2, (neck / 2) * Math.SQRT2, funnelTop - neckTop, 4, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x23a127, roughness: 0.5, metalness: 0.05, side: THREE.DoubleSide }),
  );
  funnel.rotation.y = Math.PI / 4;
  funnel.position.y = (funnelTop + neckTop) / 2;
  g.add(funnel);
  // Neck box on the column, with a darker band
  g.add(box(neck, neckTop - colTop, neck, m.hopperGreen, 0, (colTop + neckTop) / 2, 0));
  g.add(box(neck + 0.004, 0.012, neck + 0.004, m.pcb, 0, neckTop - 0.01, 0));
  // Two small sensor pins on the neck (right view)
  for (const dx of [-0.04, 0.0]) g.add(cylinder(0.005, 0.005, 0.04, m.steel, dx, neckTop + 0.02, neck / 2 - 0.02, 8));
  return g;
}

/**
 * Drum bulk feeder beside the cell (top / back / left views):
 * - round stand: four legs (front, back, left, right of the drum — three show in the back
 *   and left views), a round top plate, a tubular ring near the floor, levelling feet;
 * - cylindrical drum (looks rectangular from the side) with a wider lid, centre seam and
 *   four rim latches;
 * - green square hopper on a maroon support column fixed to the drum's side, with a short
 *   green outlet neck running from the hopper through the drum wall. The column carries
 *   three yellow terminal blocks, a black box and an olive box on its back face;
 * - discharge chute from the drum down into the cell.
 */
function createDrumFeeder(m: Materials, drum: XZ, hopper: XZ, chuteTo: XZ) {
  const g = new THREE.Group();
  const standH = 0.59; // drum base (back / left views)
  const drumR = 0.26; // body
  const lidR = 0.31; // lid seen in the top view
  const drumH = 0.51;

  // Round stand
  const legR = 0.29;
  g.add(cylinder(legR + 0.04, legR + 0.04, 0.03, m.frameDark, drum.x, standH - 0.015, drum.z, 64));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(legR, 0.02, 12, 64), m.frameDark);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(drum.x, 0.15, drum.z);
  g.add(ring);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const lx = drum.x + Math.cos(a) * legR;
    const lz = drum.z + Math.sin(a) * legR;
    g.add(beam([lx, 0.06, lz], [lx, standH - 0.03, lz], 0.045, m.frameDark)); // leg
    g.add(cylinder(0.009, 0.009, 0.05, m.steel, lx, 0.035, lz, 10)); // levelling screw
    g.add(cylinder(0.035, 0.04, 0.012, m.dark, lx, 0.006, lz, 20)); // foot pad
  }

  // Drum
  g.add(cylinder(drumR, drumR, drumH, m.panelGrey, drum.x, standH + drumH / 2, drum.z, 64));
  g.add(cylinder(lidR, lidR, 0.015, m.robotGrey, drum.x, standH + drumH + 0.0075, drum.z, 64));
  g.add(box(lidR * 2 - 0.02, 0.01, 0.025, m.steel, drum.x, standH + drumH + 0.02, drum.z)); // lid seam
  for (const dz of [-0.17, 0.17]) g.add(box(0.07, 0.012, 0.015, m.steel, drum.x, standH + drumH + 0.02, drum.z + dz)); // lid handles
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    g.add(cylinder(0.03, 0.03, 0.04, m.robotGrey, drum.x + Math.cos(a) * lidR, standH + drumH - 0.01, drum.z + Math.sin(a) * lidR, 16)); // rim latches
  }
  // Level sensor stub on the lid, next to the hopper outlet
  const toward = { x: hopper.x - drum.x, z: hopper.z - drum.z };
  const tl = Math.hypot(toward.x, toward.z);
  const stub = { x: drum.x + (toward.x / tl) * (drumR - 0.06), z: drum.z + (toward.z / tl) * (drumR - 0.06) };
  g.add(cylinder(0.012, 0.012, 0.06, m.steel, stub.x, standH + drumH + 0.045, stub.z, 12));
  g.add(cylinder(0.018, 0.018, 0.015, m.dark, stub.x, standH + drumH + 0.08, stub.z, 12));

  // Heights from the back view: column 0.59–1.04, neck 1.04–1.11, funnel 1.11–1.17, top 1.17–1.29
  const colTop = 1.04;
  g.add(createHopperColumn(m, hopper, standH, colTop));

  // Hopper, turned toward the drum (top view)
  const toDrum = Math.atan2(drum.x - hopper.x, drum.z - hopper.z);
  const hop = new THREE.Group();
  hop.position.set(hopper.x, 0, hopper.z);
  hop.rotation.y = toDrum;
  hop.add(createHopper(m, colTop));
  // Slotted green ledge from the neck onto the drum lid, and maroon brackets fixing the
  // column to the drum wall
  const reach = tl - drumR + 0.06;
  hop.add(box(0.16, 0.012, reach, m.hopperGreen, 0, colTop + 0.035, reach / 2));
  for (let i = 0; i < 3; i++) hop.add(box(0.012, 0.004, reach * 0.6, m.dark, -0.04 + i * 0.04, colTop + 0.043, reach * 0.55)); // ledge slots
  for (const s of [-1, 1]) hop.add(box(0.008, 0.03, reach, m.hopperGreen, s * 0.08, colTop + 0.05, reach / 2)); // ledge lips
  for (const y of [standH + 0.12, colTop - 0.1]) hop.add(box(0.1, 0.04, reach - 0.03, m.maroon, 0, y, (reach - 0.03) / 2));
  g.add(hop);

  // Discharge chute from the drum down into the cell
  const len = Math.hypot(chuteTo.x - drum.x, chuteTo.z - (drum.z + drumR));
  const chute = box(0.06, 0.012, len, m.steel, chuteTo.x, standH + 0.3, (drum.z + drumR + chuteTo.z) / 2);
  chute.rotation.x = -0.12;
  g.add(chute);
  return g;
}

export function createPulleyTurnaroundAssembly(): MachineParts {
  const m = createMaterials();
  const { width: W, depth: D, height: H, casterHeight: C, deckHeight: deck } = FRAME;
  const P = 0.035;
  const root = new THREE.Group();
  const add = (...objects: THREE.Object3D[]) => root.add(...objects);
  const movers: { update: (t: number) => void }[] = [];

  // ── Lower cabinet: black panels, four front doors, fans, main switch ─────
  add(createCabinet(m, { width: W, height: deck, depth: D, casterHeight: C, body: m.panel, frame: m.frameDark }));
  const fz = D / 2 + 0.003;
  const doorSplits = [-W / 2 + P, fromTop(625, 0).x, fromTop(870, 0).x, fromTop(1125, 0).x, W / 2 - P];
  for (let i = 0; i < doorSplits.length - 1; i++) add(panelXY(doorSplits[i] + 0.006, doorSplits[i + 1] - 0.006, C + 0.08, deck - 0.09, fz, m.panel, 0.006));
  for (const x of [fromTop(625, 0).x, fromTop(870, 0).x, fromTop(1125, 0).x]) add(beam([x, C, D / 2 - P / 2], [x, deck, D / 2 - P / 2], P, m.frameDark));
  add(frontFan(m, fromTop(500, 0).x, fromFrontY(965), fz + 0.006), frontFan(m, fromTop(998, 0).x, fromFrontY(965), fz + 0.006));
  for (const px of [645, 1142]) add(box(0.016, 0.07, 0.01, m.dark, fromTop(px, 0).x, fromFrontY(965), fz + 0.01)); // flush latches
  // Main switch: yellow plate with red rotary handle and a green lamp
  const ms = fromTop(740, 0).x;
  add(box(0.11, 0.1, 0.01, m.panelGrey, ms + 0.01, fromFrontY(965), fz + 0.007));
  add(box(0.055, 0.055, 0.008, m.amber, ms, fromFrontY(965), fz + 0.014));
  const handleKnob = cylinder(0.022, 0.022, 0.02, m.red, ms, fromFrontY(965), fz + 0.025, 20);
  handleKnob.rotation.x = Math.PI / 2;
  add(handleKnob, box(0.045, 0.012, 0.01, m.red, ms, fromFrontY(965), fz + 0.035));
  const lamp = cylinder(0.008, 0.008, 0.01, m.pcb, ms + 0.05, fromFrontY(965), fz + 0.014, 12);
  lamp.rotation.x = Math.PI / 2;
  add(lamp);
  // Side doors and side lifting handles
  for (const sx of [-1, 1]) {
    const x = sx * (W / 2 + 0.003);
    add(panelZY(-D / 2 + P, -0.006, C + 0.08, deck - 0.09, x, m.panel, 0.006), panelZY(0.006, D / 2 - P, C + 0.08, deck - 0.09, x, m.panel, 0.006));
    for (const y of [fromFrontY(470), fromFrontY(1000)]) add(box(0.03, 0.12, 0.016, m.dark, x + sx * 0.03, y, 0));
  }
  add(box(W, 0.012, 0.012, m.accentBlue, 0, deck - 0.006, D / 2 + 0.002)); // blue trim line at the deck

  // ── Deck and dark-framed glass enclosure ─────────────────────────────
  add(box(W - 0.01, 0.015, D - 0.01, m.deckPurple, 0, deck + 0.0075, 0));
  const deckTop = deck + 0.015;
  const x0 = -W / 2 + P / 2;
  const x1 = W / 2 - P / 2;
  const z0 = -D / 2 + P / 2;
  const z1 = D / 2 - P / 2;
  const top = H - P / 2;
  const rail = (a: [number, number, number], b: [number, number, number]) => add(beam(a, b, P, m.frameDark));
  for (const x of [x0, x1]) for (const z of [z0, z1]) rail([x, deck, z], [x, H, z]);
  for (const y of [deck + P / 2, top]) {
    rail([x0, y, z0], [x1, y, z0]);
    rail([x0, y, z1], [x1, y, z1]);
    rail([x0, y, z0], [x0, y, z1]);
    rail([x1, y, z0], [x1, y, z1]);
  }
  rail([0, top, z0], [0, top, z1]); // roof split in four
  rail([x0, top, 0], [x1, top, 0]);
  for (const px of [695, 990]) for (const z of [z0, z1]) rail([fromTop(px, 0).x, deck, z], [fromTop(px, 0).x, H, z]); // door posts
  for (const x of [x0, x1]) rail([x, deck, 0], [x, H, 0]);
  const g0 = deck + P;
  const g1 = H - P;
  add(
    panelXY(x0, x1, g0, g1, D / 2 - 0.012, m.glass, 0.004),
    panelXY(x0, x1, g0, g1, -D / 2 + 0.012, m.glass, 0.004),
    panelZY(z0, z1, g0, g1, -W / 2 + 0.012, m.glass, 0.004),
    panelZY(z0, z1, g0, g1, W / 2 - 0.012, m.glass, 0.004),
    box(W - P, 0.004, D - P, m.glass, 0, H - 0.002, 0),
  );
  for (const px of [680, 710, 1015]) add(box(0.016, 0.16, 0.02, m.dark, fromTop(px, 0).x, fromFrontY(470), D / 2 + 0.02)); // glass door handles

  // HMI bay (front-right): panel with screen, button strip, keyboard tray sticking out
  const hmiX = fromTop(1180, 0).x;
  const hz = D / 2 - 0.04;
  add(box(0.3, 0.6, 0.02, m.panelGrey, hmiX, fromFrontY(520), hz));
  add(box(0.17, 0.13, 0.03, m.dark, hmiX, fromFrontY(462), hz + 0.02), box(0.14, 0.09, 0.004, m.screen, hmiX, fromFrontY(458), hz + 0.037));
  [m.steel, m.pcb, m.steel, m.red, m.steel, m.dark, m.red, m.steel].forEach((mat, i) => {
    const b = cylinder(0.009, 0.009, 0.012, mat, hmiX - 0.11 + i * 0.031, fromFrontY(530), hz + 0.017, 16);
    b.rotation.x = Math.PI / 2;
    add(b);
  });
  const tray = new THREE.Group();
  tray.add(box(0.4, 0.02, 0.16, m.panelGrey, 0, 0, 0));
  tray.add(box(0.26, 0.008, 0.11, m.dark, -0.04, 0.014, 0));
  for (let r = 0; r < 4; r++) for (let c = 0; c < 12; c++) tray.add(box(0.016, 0.006, 0.016, m.tealDisc, -0.155 + c * 0.0205, 0.02, -0.035 + r * 0.023));
  tray.add(box(0.05, 0.02, 0.07, m.steel, 0.14, 0.018, 0)); // mouse
  tray.position.set(fromTop(1180, 0).x, fromFrontY(650), D / 2 + 0.07);
  tray.rotation.x = 0.12;
  add(tray);

  // Stack light on the front-left corner
  const sl = fromTop(437, 1042);
  add(cylinder(0.04, 0.045, 0.02, m.dark, sl.x, H + 0.01, sl.z, 20), cylinder(0.012, 0.012, 0.11, m.dark, sl.x, H + 0.075, sl.z, 12));
  ([[m.pcb, "green"], [m.amber, "amber"], [m.red, "red"]] as const).forEach(([mat, color], i) => add(markLamp(cylinder(0.028, 0.028, 0.05, mat, sl.x, H + 0.155 + i * 0.052, sl.z, 20), color)));

  // ── Deck equipment (top view) ─────────────────────────────────────────
  const disc = fromTop(893, 762);
  const table = createRotaryTable(m, 0.19, 6, 2.5);
  table.object.traverse((o) => {
    if (o instanceof THREE.Mesh && o.material === m.disc) o.material = m.tealDisc;
  });
  table.object.position.set(disc.x, deckTop, disc.z);
  add(table.object);
  movers.push(table);

  // Two SCARAs on tall pedestals, posed as drawn (base J1, elbow J2, quill)
  const scaras: { base: [number, number]; elbow: [number, number]; quill: [number, number]; board: "+x" | "+z"; motion: Partial<RobotMotion> }[] = [
    { base: [1250, 628], elbow: [1130, 782], quill: [1022, 712], board: "+x", motion: { swing: [-0.8, 1.28] } }, // back-right
    { base: [745, 962], elbow: [855, 822], quill: [978, 875], board: "+z", motion: { swing: [-0.8, 1.28] } }, // front-left
  ];
  const yaw = (a: XZ, b: XZ) => Math.atan2(-(b.z - a.z), b.x - a.x);
  const dist = (a: XZ, b: XZ) => Math.hypot(b.x - a.x, b.z - a.z);
  scaras.forEach(({ base, elbow, quill, board, motion }, i) => {
    const b = fromTop(...base);
    const e = fromTop(...elbow);
    const q = fromTop(...quill);
    const baseAngle = yaw(b, e);
    const robot = createScara(m, {
      pedestalHeight: 0.33,
      pedestalMaterial: m.robotGrey,
      baseAngle,
      elbowAngle: yaw(e, q) - baseAngle,
      link1: dist(b, e),
      link2: dist(e, q),
      headHeight: 0.15,
      headWidth: 0.13,
      connectorBoard: board,
      offset: i / scaras.length,
      ...motion,
    });
    robot.object.position.set(b.x, deckTop, b.z);
    add(robot.object);
    movers.push(robot);
  });

  // Bowl feeders: front-right and back-right (under SCARA 1's reach)
  for (const [px, py, r, turn, phase] of [[1060, 1010, 0.1, Math.PI, 0.3], [1255, 870, 0.11, Math.PI / 2, 1.9]] as const) {
    const { x, z } = fromTop(px, py);
    const feeder = createBowlFeeder(m, r, phase);
    feeder.object.position.set(x, deckTop, z);
    feeder.object.rotation.y = turn;
    add(feeder.object);
    movers.push(feeder);
  }

  // Long linear rail on the left (px x 520–555, y 560–1020) with carriages
  const r0 = fromTop(537, 560);
  const r1 = fromTop(537, 1020);
  add(box(0.06, 0.03, r1.z - r0.z, m.robotGrey, r0.x, deckTop + 0.015, (r0.z + r1.z) / 2));
  for (const py of [625, 730]) {
    const c = fromTop(537, py);
    add(box(0.05, 0.05, 0.08, m.steel, c.x, deckTop + 0.055, c.z), box(0.02, 0.02, 0.06, m.dark, c.x, deckTop + 0.09, c.z));
  }
  // Feed rail along z beside the table (px x 860, y 540–1010)
  const f0 = fromTop(860, 540);
  const f1 = fromTop(860, 1010);
  add(box(0.025, 0.04, f1.z - f0.z, m.accentBlue, f0.x, deckTop + 0.2, (f0.z + f1.z) / 2));
  for (const py of [600, 950]) add(box(0.03, 0.18, 0.03, m.pink, f0.x, deckTop + 0.09, fromTop(0, py).z));

  // Valve bank, black tool plate, power supplies, escapement blocks
  for (const [ax, ay, bx, by, h, mat] of [
    [1170, 975, 1260, 1060, 0.06, m.steel], // valve bank
    [1255, 985, 1355, 1060, 0.012, m.dark], // black plate
    [905, 1000, 1000, 1055, 0.09, m.robotGrey], // power supplies
    [1170, 920, 1230, 990, 0.08, m.olive], // escapement (yellow-green)
    [1060, 820, 1140, 860, 0.05, m.steel], // slide
    [1040, 625, 1120, 690, 0.06, m.tealDisc], // station
  ] as const) {
    const a = fromTop(ax, ay);
    const b = fromTop(bx, by);
    add(box(b.x - a.x, h, b.z - a.z, mat, (a.x + b.x) / 2, deckTop + h / 2, (a.z + b.z) / 2));
  }

  // ── Outside: drum bulk feeder with hopper, chute into the cell ─────────
  add(createDrumFeeder(m, fromTop(1040, 290), fromTop(830, 110), fromTop(905, 500)));

  const update = (t: number) => movers.forEach((part) => part.update(t));
  update(0);
  return { object: root, update };
}
