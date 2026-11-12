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

/** UPG cells, ~5 tiles (3.0 m) apart in both rows. */
const UPG_X = [-4.07, -1.01, 1.94, 5.06, 8.09];

/** PAD ELASTOMER block: ~4.1 tiles (2.47 m) apart along a row, rows 5 tiles (3.0 m) apart. */
const PAD_X = [1.16, 3.63, 6.1, 8.62];
const PAD_Z = [3.98, 6.95];

/** Machine positions read from the room drawing (label numbers in the PDF in brackets). */
export const ROOM_LAYOUT: MachinePlacement[] = [
  // Two UPG rows along the back wall [labels 0–8]
  ...UPG_X.map((x, i) => ({ id: `UPG-${String(i + 1).padStart(2, "0")}`, type: "UPG ASSEMBLY" as const, x, z: -6.95 })),
  ...UPG_X.map((x, i) => ({ id: `UPG-${String(i + 6).padStart(2, "0")}`, type: "UPG ASSEMBLY" as const, x, z: -3.9 })),

  // Back-left corner [9, 10]
  { id: "FRG-01", type: "FEED ROLLER GEAR CLUSTER ASSEMBLY", x: -8.32, z: -6.33 },
  { id: "FRG-02", type: "FEED ROLLER GEAR CLUSTER ASSEMBLY", x: -8.32, z: -4.16 },

  // Along the left wall, facing each other [11, 12]
  { id: "LTA-01", type: "LEFT TRANSMISSION ASSEMBLY", x: -7.97, z: 1.15 },
  { id: "LTA-02", type: "LEFT TRANSMISSION ASSEMBLY", x: -7.97, z: 6.66, rotation: Math.PI },

  // Middle-left pair [23, 24]
  { id: "PA2-01", type: "PICK ARM ASSEMBLY2", x: -4.73, z: -0.82 },
  { id: "PA2-02", type: "PICK ARM ASSEMBLY2", x: -0.34, z: -0.82 },

  // Back-right pair: labelled PAD ELASTOMER in the PDF [28, 29], but the drawing shows the
  // wide dark-framed cells with drum feeder and green hopper — PULLEY TURNAROUND.
  { id: "PTA-01", type: "PULLEY TURNAROUND ASSEMBLY", x: 5.26, z: -0.5 },
  { id: "PTA-02", type: "PULLEY TURNAROUND ASSEMBLY", x: 8.32, z: -0.5 },

  // Front-left [20]. Turned 180° as in the room drawing: bowl feeder at the front, one
  // fence at the back, the other fence and a tray rack on the right, robot stands on the left.
  { id: "PHT-01", type: "PHOTO TRAY ASSEMBLY", x: -4.12, z: 5.49, rotation: Math.PI },

  // Robot row behind the PAD block [21, 22, 25, 26, 27]
  { id: "PA1-01", type: "PICK ARM ASSEMBLY1", x: 0.55, z: 1.93 },
  { id: "PA1-02", type: "PICK ARM ASSEMBLY1", x: 2.56, z: 1.93 },
  { id: "PDA-01", type: "PICK DRIVE ASSEMBLY", x: 4.39, z: 1.93 },
  { id: "PDA-02", type: "PICK DRIVE ASSEMBLY", x: 6.63, z: 1.93 },
  { id: "PDA-03", type: "PICK DRIVE ASSEMBLY", x: 8.65, z: 1.93 },

  // PAD ELASTOMER block, two rows of four [13–19]
  ...PAD_X.flatMap((x, i) => [
    { id: `PAD-0${i + 1}`, type: "PAD ELASTOMER ASSEMBLY" as const, x, z: PAD_Z[0] },
    { id: `PAD-0${i + 5}`, type: "PAD ELASTOMER ASSEMBLY" as const, x, z: PAD_Z[1] },
  ]),
];

export const MACHINE_IDS = new Set(ROOM_LAYOUT.map((m) => m.id));
