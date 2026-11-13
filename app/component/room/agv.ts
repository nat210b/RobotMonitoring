import * as THREE from "three";
import { box, cylinder, createMaterials, type MachineParts } from "../machine/parts";
import { ROOM } from "./floorPlan";

/** The last run goes down the middle of the aisle between the two PAD ELASTOMER rows (z 3.98 and 6.95). */
const AISLE_Z = 5.465;

/**
 * Route of the transport robot, traced from the orange guide line in the room drawing (metres,
 * floor centre = origin). It comes in through the entrance on the front wall, runs up the left aisle,
 * curves right and leaves the room through the open right-hand side.
 */
export const AGV_ROUTE: [number, number][] = [
  [-5.78, ROOM.maxZ],
  [-5.78, 3.2],
  [-1.0, 3.2],
  [0.55, AISLE_Z],
  [ROOM.maxX, AISLE_Z],
];

/** Radius (m) of the rounded bends: each corner of AGV_ROUTE becomes a smooth arc this wide. */
const BEND_RADIUS = 1.6;

/** AGV_ROUTE as straight runs joined by smooth curves, so there is no sudden change of direction. */
function buildRoute() {
  const pts = AGV_ROUTE.map(([x, z]) => new THREE.Vector3(x, 0, z));
  const path = new THREE.CurvePath<THREE.Vector3>();
  let cursor = pts[0];
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1];
    const corner = pts[i];
    const next = pts[i + 1];
    const back = Math.min(BEND_RADIUS, prev.distanceTo(corner) / 2);
    const fwd = Math.min(BEND_RADIUS, corner.distanceTo(next) / 2);
    const enter = corner.clone().add(prev.clone().sub(corner).setLength(back));
    const leave = corner.clone().add(next.clone().sub(corner).setLength(fwd));
    if (cursor.distanceTo(enter) > 1e-6) path.add(new THREE.LineCurve3(cursor, enter));
    path.add(new THREE.QuadraticBezierCurve3(enter, corner, leave));
    cursor = leave;
  }
  path.add(new THREE.LineCurve3(cursor, pts[pts.length - 1]));
  return path;
}

const AGV_COUNT = 2; // robots running the route
const SPEED = 0.9; // m/s
const OFFSTAGE = 4; // s the robot stays away between leaving and re-entering
const PATH_WIDTH = 0.22; // yellow guide tape (m)
const FADE_DISTANCE = 0.9; // the robot grows / shrinks over this much path next to the room edge

const smooth = (f: number) => {
  const c = Math.min(1, Math.max(0, f));
  return c * c * (3 - 2 * c);
};

/** Open-top transport robot (AGV). Built facing local +x, origin on the floor under its centre. */
export function createAgv() {
  const m = createMaterials();
  const body = new THREE.MeshStandardMaterial({ color: 0x9da2a8, roughness: 0.55, metalness: 0.15 });
  const chassis = new THREE.MeshStandardMaterial({ color: 0x33363b, roughness: 0.6, metalness: 0.25 });
  const g = new THREE.Group();

  g.add(box(1.0, 0.12, 0.62, chassis, 0, 0.11, 0));
  // Open-top tray: floor + four walls
  const L = 0.84;
  const W = 0.58;
  const H = 0.3;
  const y0 = 0.17;
  const wall = 0.035;
  g.add(box(L, 0.03, W, body, 0, y0 + 0.015, 0));
  for (const s of [-1, 1]) {
    g.add(box(L, H, wall, body, 0, y0 + H / 2, s * (W / 2 - wall / 2)));
    g.add(box(wall, H, W, body, s * (L / 2 - wall / 2), y0 + H / 2, 0));
  }
  g.add(box(L - 2 * wall, 0.01, W - 2 * wall, m.blackSteel, 0, y0 + 0.035, 0)); // dark liner
  // Contents: green controller board and a few modules
  g.add(box(0.28, 0.02, 0.2, m.pcb, 0.12, y0 + 0.05, -0.1));
  g.add(box(0.16, 0.07, 0.12, m.steel, -0.18, y0 + 0.08, 0.1));
  g.add(box(0.2, 0.05, 0.1, m.dark, 0.1, y0 + 0.07, 0.12));
  g.add(box(0.05, 0.03, 0.08, m.amber, -0.25, y0 + 0.05, -0.12));
  // Side panel and green rear plate
  g.add(box(0.3, 0.2, 0.012, m.olive, -0.05, y0 + 0.15, W / 2 + 0.002));
  g.add(box(0.25, 0.1, 0.012, m.pcb, -0.3, 0.1, W / 2 + 0.07));
  // Front bumper (purple) with the sensor strip
  g.add(box(0.1, 0.1, 0.64, m.deckPurple, 0.5, 0.1, 0));
  g.add(box(0.012, 0.03, 0.5, m.accentBlue, 0.553, 0.1, 0));
  // Corner beacons
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      g.add(cylinder(0.03, 0.03, 0.05, m.robotGrey, sx * (L / 2 - 0.05), y0 + H + 0.025, sz * (W / 2 - 0.05), 16));
      g.add(cylinder(0.02, 0.02, 0.012, m.dark, sx * (L / 2 - 0.05), y0 + H + 0.056, sz * (W / 2 - 0.05), 16));
    }
  }
  // Wheels
  for (const sx of [-0.38, 0.38]) {
    for (const sz of [-1, 1]) {
      const wheel = cylinder(0.065, 0.065, 0.05, m.rubber, sx, 0.065, sz * 0.33, 20);
      wheel.rotation.x = Math.PI / 2;
      g.add(wheel);
    }
  }
  return g;
}

/** Yellow guide tape along the route, a flat strip just above the floor. */
function createGuideTape(curve: THREE.CurvePath<THREE.Vector3>) {
  const pts = curve.getSpacedPoints(Math.ceil(curve.getLength() / 0.1));
  const positions: number[] = [];
  const index: number[] = [];
  pts.forEach((p, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const tx = b.x - a.x;
    const tz = b.z - a.z;
    const len = Math.hypot(tx, tz) || 1;
    const nx = (-tz / len) * (PATH_WIDTH / 2);
    const nz = (tx / len) * (PATH_WIDTH / 2);
    positions.push(p.x + nx, 0.004, p.z + nz, p.x - nx, 0.004, p.z - nz);
    if (i < pts.length - 1) index.push(2 * i, 2 * i + 1, 2 * i + 2, 2 * i + 1, 2 * i + 3, 2 * i + 2);
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(index);
  const mat = new THREE.MeshBasicMaterial({ color: 0xf5c518, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1 });
  return new THREE.Mesh(geo, mat);
}

/**
 * The transport robot and its yellow path. The robot follows the path, shrinks away as it leaves
 * the room, stays out of sight for a few seconds, then grows back in at the entrance — forever.
 */
export function createAgvRoute(): MachineParts {
  const root = new THREE.Group();
  const curve = buildRoute();
  const length = curve.getLength();
  root.add(createGuideTape(curve));
  const cycle = length + OFFSTAGE * SPEED;
  // Robots share the path, evenly spaced round the loop.
  const robots = Array.from({ length: AGV_COUNT }, (_, i) => {
    const agv = createAgv();
    root.add(agv);
    return { agv, phase: (i / AGV_COUNT) * cycle };
  });

  const update = (t: number) => {
    for (const { agv, phase } of robots) {
      const s = (((t * SPEED + phase) % cycle) + cycle) % cycle;
      if (s >= length) {
        agv.visible = false;
        continue;
      }
      const u = s / length;
      const p = curve.getPointAt(u);
      const dir = curve.getTangentAt(u);
      agv.position.copy(p);
      agv.rotation.y = Math.atan2(-dir.z, dir.x);
      // Distance to the room edge it enters / leaves through, converted to a grow / shrink factor.
      const f = smooth(Math.min(s, length - s, ROOM.maxZ - p.z, ROOM.maxX - p.x) / FADE_DISTANCE);
      agv.scale.setScalar(Math.max(f, 0.0001));
      agv.visible = f > 0.001;
    }
  };
  update((length * 0.1) / SPEED);
  return { object: root, update };
}
