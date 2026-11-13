/*
 * Plain room layout data (no three.js) — safe to import from API routes and server code.
 * The 3D scene is built from it in ./model.ts.
 *
 * Robot combined room, laid out from
 * app/machine_data/New Robot Combine room ISO V5.pdf (labels: "… 10-Nov-2026.pdf").
 *
 * Scale: the drawing's floor tiles are 0.6 m, which makes the room 19.74 m × 16.52 m
 * (≈ 33 × 27.5 tiles). The UPG cells (1.94 m long ≈ 3.3 tiles in the drawing) confirm it.
 * Positions were read off the isometric drawing by rectifying the floor to a top-down
 * plan; each machine is placed so the front-right corner of its footprint (the
 * lowest point of its drawn shape) matches the drawing.
 *
 * Units are metres, origin at the floor centre. Axes: +x = toward the right-hand short
 * wall, −z = toward the long back wall (the UPG rows), +z = the open front side.
 */
export const ROOM_NAME = "Robot Combined Room";

export const ROOM = {
  minX: -9.87,
  maxX: 9.87,
  width: 19.74,
  minZ: -8.26,
  maxZ: 8.26,
  depth: 16.52,
  wallHeight: 2.6,
  tile: 0.6,
};

export type MachineType =
  | "FEED ROLLER GEAR CLUSTER ASSEMBLY"
  | "LEFT TRANSMISSION ASSEMBLY"
  | "PAD ELASTOMER ASSEMBLY"
  | "PHOTO TRAY ASSEMBLY"
  | "PICK ARM ASSEMBLY1"
  | "PICK ARM ASSEMBLY2"
  | "PICK DRIVE ASSEMBLY"
  | "PULLEY TURNAROUND ASSEMBLY"
  | "UPG ASSEMBLY";

export type MachinePlacement = {
  /** Stable id for linking live data (e.g. MongoDB robot / station records). */
  id: string;
  type: MachineType;
  /** Model origin on the floor (metres). */
  x: number;
  z: number;
  /** Turn about the vertical axis (radians); 0 = machine front faces +z. */
  rotation?: number;
  /** Uniform scale when the room drawing shows the machine at a different size than its model. */
  scale?: number;
};

/** Machine `rotation` for the wall its FRONT points at (0 = toward +z, the open front side). */
const FRONT_TO_FRONT_WALL = 0;
const FRONT_TO_BACK_WALL = Math.PI;
const FRONT_TO_RIGHT_WALL = Math.PI / 2;

/** The PICK ARM ASSEMBLY2 model is 0.257 m off-centre in x, so turning it 180° moves its footprint 2 × 0.257 m; shift it back. */
const PA2_TURN_SHIFT = 0.514;

/** UPG cells, ~5 tiles (3.0 m) apart in both rows. */
const UPG_X = [-4.07, -1.01, 1.94, 5.06, 8.09];

/** PAD ELASTOMER block: ~4.1 tiles (2.47 m) apart along a row, rows 5 tiles (3.0 m) apart. */
const PAD_X = [1.16, 3.63, 6.1, 8.62];
const PAD_Z = [3.98, 6.95];

/** Machine positions read from the room drawing (label numbers in the PDF in brackets). */
export const ROOM_LAYOUT: MachinePlacement[] = [
  // Two UPG rows along the back wall [labels 0–8]
  // Facing from the arrows on the section map, which mark each machine's BACK side: the back row has its
  // back to the back wall (front toward the room), the front row the other way round.
  ...UPG_X.map((x, i) => ({ id: `UPG-${String(i + 1).padStart(2, "0")}`, type: "UPG ASSEMBLY" as const, x, z: -6.95, rotation: FRONT_TO_FRONT_WALL })),
  ...UPG_X.map((x, i) => ({ id: `UPG-${String(i + 6).padStart(2, "0")}`, type: "UPG ASSEMBLY" as const, x, z: -3.9, rotation: FRONT_TO_BACK_WALL })),

  // Back-left corner [9, 10]
  { id: "FRG-01", type: "FEED ROLLER GEAR CLUSTER ASSEMBLY", x: -8.32, z: -6.33, rotation: FRONT_TO_RIGHT_WALL },
  { id: "FRG-02", type: "FEED ROLLER GEAR CLUSTER ASSEMBLY", x: -8.32, z: -4.16, rotation: FRONT_TO_RIGHT_WALL },

  // Along the left wall, facing each other [11, 12]
  { id: "LTA-01", type: "LEFT TRANSMISSION ASSEMBLY", x: -7.97, z: 1.15 },
  { id: "LTA-02", type: "LEFT TRANSMISSION ASSEMBLY", x: -7.97, z: 6.66, rotation: Math.PI },

  // Pick Arm / Pick Drive machines: back toward the front wall, so the front faces the back wall (no arrows
  // on the section map for these; facing chosen by the user).
  // Middle-left pair [23, 24]
  { id: "PA2-01", type: "PICK ARM ASSEMBLY2", x: -4.73 + PA2_TURN_SHIFT, z: -0.82, rotation: FRONT_TO_BACK_WALL },
  { id: "PA2-02", type: "PICK ARM ASSEMBLY2", x: -0.34 + PA2_TURN_SHIFT, z: -0.82, rotation: FRONT_TO_BACK_WALL },

  // Back-right pair: labelled PAD ELASTOMER in the PDF [28, 29], but the drawing shows the
  // wide dark-framed cells with drum feeder and green hopper — PULLEY TURNAROUND.
  { id: "PTA-01", type: "PULLEY TURNAROUND ASSEMBLY", x: 5.26, z: -0.5 },
  { id: "PTA-02", type: "PULLEY TURNAROUND ASSEMBLY", x: 8.32, z: -0.5 },

  // Front-left [20]. Turned 180° as in the room drawing: bowl feeder at the front, one
  // fence at the back, the other fence and a tray rack on the right, robot stands on the left.
  { id: "PHT-01", type: "PHOTO TRAY ASSEMBLY", x: -4.12 + 3 * ROOM.tile, z: 5.49, rotation: Math.PI },

  // Robot row behind the PAD block [21, 22, 25, 26, 27]
  { id: "PA1-01", type: "PICK ARM ASSEMBLY1", x: 0.55, z: 1.93, rotation: FRONT_TO_BACK_WALL },
  { id: "PA1-02", type: "PICK ARM ASSEMBLY1", x: 2.56, z: 1.93, rotation: FRONT_TO_BACK_WALL },
  { id: "PDA-01", type: "PICK DRIVE ASSEMBLY", x: 4.39, z: 1.93, rotation: FRONT_TO_BACK_WALL },
  { id: "PDA-02", type: "PICK DRIVE ASSEMBLY", x: 6.63, z: 1.93, rotation: FRONT_TO_BACK_WALL },
  { id: "PDA-03", type: "PICK DRIVE ASSEMBLY", x: 8.65, z: 1.93, rotation: FRONT_TO_BACK_WALL },

  // PAD ELASTOMER block, two rows of four [13–19]
  ...PAD_X.flatMap((x, i) => [
    { id: `PAD-0${i + 1}`, type: "PAD ELASTOMER ASSEMBLY" as const, x, z: PAD_Z[0], rotation: FRONT_TO_FRONT_WALL },
    { id: `PAD-0${i + 5}`, type: "PAD ELASTOMER ASSEMBLY" as const, x, z: PAD_Z[1], rotation: FRONT_TO_BACK_WALL },
  ]),
];

/** A named group of machines, highlighted on the floor and labelled with one badge (as in the section map). */
export type RoomSection = {
  id: string;
  label: string;
  /** Highlight / badge colour. */
  color: string;
  /** Text colour that reads on `color`. */
  ink: string;
  machineIds: string[];
};

const GREEN = "#16a34a";
const ids = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => `${prefix}-${String(i + 1).padStart(2, "0")}`);

/** Sections, named and coloured as in the reference section map. */
export const ROOM_SECTIONS: RoomSection[] = [
  { id: "gear-cluster", label: "Gear Cluster", color: GREEN, ink: "#fff", machineIds: ids("FRG", 2) },
  { id: "upg", label: "UPG", color: GREEN, ink: "#fff", machineIds: ids("UPG", 10) },
  { id: "narita", label: "Narita Left Trans Ass'y", color: GREEN, ink: "#fff", machineIds: ["LTA-01"] },
  { id: "moreto", label: "Moreto Left Trans Ass'y", color: GREEN, ink: "#fff", machineIds: ["LTA-02"] },
  { id: "pick-arm-2", label: "Pick Arm", color: "#facc15", ink: "#000", machineIds: ids("PA2", 2) },
  { id: "pulley", label: "Pulley Turn Around", color: GREEN, ink: "#fff", machineIds: ids("PTA", 2) },
  { id: "pick-arm-1", label: "Pick Arm", color: GREEN, ink: "#fff", machineIds: ids("PA1", 2) },
  { id: "pick-drive", label: "Pick Drive", color: "#fb923c", ink: "#000", machineIds: ids("PDA", 3) },
  { id: "photo-tray", label: "Photo Tray Ass'y", color: GREEN, ink: "#fff", machineIds: ["PHT-01"] },
  { id: "pad", label: "Pad Elastomer", color: GREEN, ink: "#fff", machineIds: ids("PAD", 8) },
];

/** A sign painted on the floor (see floorSign.ts). x / z is its centre (m); width runs along x, depth along z. */
export type FloorSign = { text: string; /** Small line above the text, e.g. "Powered by". */ caption?: string; x: number; z: number; width: number; depth: number; color?: string; ink?: string };

/**
 * Floor signs. The team sign is a large "Powered by" panel in the same row as the green Pick Arm section
 * (z 1.34–2.49), on the open floor to its left: free from the Narita section (ends x ≈ -7.2) to the Pick Arm
 * section (starts x ≈ -0.3), and clear of the yellow Pick Arm section behind it (ends z ≈ 0.2).
 */
export const ROOM_FLOOR_SIGNS: FloorSign[] = [{ text: "TH-CP1-Innovation Team", x: -3.7, z: 1.93, width: 6, depth: 1.4 }];

export const MACHINE_IDS = new Set(ROOM_LAYOUT.map((m) => m.id));
