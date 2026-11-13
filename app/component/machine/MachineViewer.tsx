"use client";

import { useEffect, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { MachineParts } from "./parts";

type MachineViewerProps = {
  /** Builds the machine. Pass a stable (module-level) function. */
  create: () => MachineParts;
  /** Run the machine's motion (robots, rotary table, feeders). */
  animate?: boolean;
  /** Slowly orbit the camera until the user drags. */
  autoRotate?: boolean;
  /** Height of the 3D view in px, or "fill" to take the parent's full width and height. */
  height?: number | "fill";
  /** Closest camera distance as a fraction of the model's radius (small = can zoom right in). */
  minZoom?: number;
  /** Starting camera distance as a multiple of the model's radius (smaller = closer). */
  viewDistance?: number;
  /**
   * Called with a machine's id when the user clicks it (objects tagged `userData.kind === "machine"`),
   * or with null when they click empty space. Dragging to orbit never selects.
   */
  onSelect?: (id: string | null) => void;
  /** Machine id to outline. */
  selectedId?: string | null;
  /** Direction from the model centre to the starting camera (x, y, z); a higher y looks more from above. */
  cameraDirection?: readonly [number, number, number];
  /** Slide the model on screen by a fraction of the view's width / height: [right, up] (negative = left / down). */
  viewShift?: readonly [number, number];
  /** Extra floor margin (world units) added on every side of a hovered machine's footprint fill. */
  hoverPad?: number;
  /** Labels floating over machines' heads, keyed by machine id. Machines without an entry show none. */
  badges?: Record<string, ReactNode>;
  /**
   * Coloured floor highlights drawn round groups of machines. A zone's id can also be a key of
   * `badges`, which then floats over the zone. Pass a stable (module-level) array.
   */
  zones?: readonly { id: string; machineIds: readonly string[]; color: string }[];
  /** Floor margin (world units) between a zone's machines and its highlight edge. */
  zonePad?: number;
  /** Show the zones' floor tint and outline (they still shape badges and the hover fill's limits). */
  showZones?: boolean;
  /**
   * Camera mode: "free" orbits as the user drags; "iso" and "top" fly to the isometric (the
   * cameraDirection) or the top-down view and lock rotation (zoom and pan still work).
   */
  view?: "iso" | "top" | "free";
  className?: string;
};

/** Pointer travel (px) above which a press counts as a drag, not a click. */
const DEFAULT_CAMERA_DIRECTION = [1, 1.414, 1.5] as const;
const NO_SHIFT = [0, 0] as const;
const CLICK_TOLERANCE = 5;
/** The room floor (0xeceef1) in a darker shade, for the hovered / selected machine. */
const SELECTION_COLOR = 0xb4b9c1;

export default function MachineViewer({
  create,
  animate = false,
  autoRotate = false,
  height = 420,
  minZoom = 1.2,
  viewDistance = 3.1,
  onSelect,
  selectedId = null,
  hoverPad = 0,
  cameraDirection = DEFAULT_CAMERA_DIRECTION,
  viewShift = NO_SHIFT,
  badges,
  zones,
  zonePad = 0.25,
  showZones = true,
  view = "free",
  className,
}: MachineViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Kept in refs so changing them doesn't rebuild the whole scene.
  const onSelectRef = useRef(onSelect);
  const selectedIdRef = useRef(selectedId);
  const badgeEls = useRef(new Map<string, HTMLDivElement>());
  const highlightRef =useRef<((id: string | null) => void) | null>(null);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  const viewRef = useRef(view);
  const applyViewRef = useRef<((v: "iso" | "top" | "free", instant?: boolean) => void) | null>(null);
  useEffect(() => {
    viewRef.current = view;
    applyViewRef.current?.(view);
  }, [view]);

  const showZonesRef = useRef(showZones);
  const zoneGroupRef = useRef<THREE.Group | null>(null);
  useEffect(() => {
    showZonesRef.current = showZones;
    if (zoneGroupRef.current) zoneGroupRef.current.visible = showZones;
    highlightRef.current?.(selectedIdRef.current);
  }, [showZones]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
    highlightRef.current?.(selectedId);
  }, [selectedId]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const machine = create();
    scene.add(machine.object);

    // Fit camera to the model
    const bounds = new THREE.Box3().setFromObject(machine.object);
    const center = bounds.getCenter(new THREE.Vector3());
    const radius = bounds.getSize(new THREE.Vector3()).length() / 2;

    const camera = new THREE.PerspectiveCamera(35, 1, radius * 0.01, radius * 50);
    camera.position.copy(center).add(new THREE.Vector3(...cameraDirection).normalize().multiplyScalar(radius * viewDistance));

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.copy(center);
    controls.minDistance = radius * minZoom;
    controls.maxDistance = radius * 8;
    controls.maxPolarAngle = Math.PI / 2 - 0.02;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 0.8;
    const stopAutoRotate = () => (controls.autoRotate = false);
    controls.addEventListener("start", stopAutoRotate);

    // Camera presets: fly to the iso / top-down pose, lock rotation there; "free" gives rotation back.
    const isoDir = new THREE.Vector3(...cameraDirection).normalize();
    const topDir = new THREE.Vector3(0, 1, 0.0001).normalize();
    // The flight orbits the model (angle, tilt and distance eased together) rather than sliding in a
    // straight line, which would cut through the room and whip round near the top-down pose.
    let fly: { from: THREE.Spherical; to: THREE.Spherical; fromTarget: THREE.Vector3; start: number } | null = null;
    const FLY_MS = 1000;
    const flyPos = new THREE.Spherical();
    const flyOffset = new THREE.Vector3();
    const applyView = (v: "iso" | "top" | "free", instant = false) => {
      controls.enableRotate = v === "free";
      if (v === "free") {
        fly = null;
        return;
      }
      controls.autoRotate = false;
      const to = new THREE.Spherical().setFromVector3((v === "top" ? topDir : isoDir).clone().multiplyScalar(radius * viewDistance));
      if (instant) {
        camera.position.copy(center).add(new THREE.Vector3().setFromSpherical(to));
        controls.target.copy(center);
        fly = null;
      } else {
        const from = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
        // Turn the short way round.
        const dTheta = Math.atan2(Math.sin(to.theta - from.theta), Math.cos(to.theta - from.theta));
        to.theta = from.theta + dTheta;
        fly = { from, to, fromTarget: controls.target.clone(), start: performance.now() };
      }
    };
    applyViewRef.current = applyView;
    applyView(viewRef.current, true);

    scene.add(new THREE.HemisphereLight(0xffffff, 0xaeb6c0, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(center.x + radius * 2, radius * 4, center.z + radius * 3);
    sun.target.position.copy(center);
    scene.add(sun, sun.target);

    // Click-to-select: machines are the objects tagged userData.kind === "machine".
    const machines = new Map<string, THREE.Object3D>();
    machine.object.traverse((child) => {
      if (child.userData.kind === "machine" && typeof child.userData.id === "string") machines.set(child.userData.id, child);
    });
    // Floor fill (brand colour) over a machine's footprint, used for both hover and selection.
    const fillMat = new THREE.MeshBasicMaterial({ color: SELECTION_COLOR, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 });
    const fillGeo = new THREE.PlaneGeometry(1, 1);
    const makeFill = () => {
      const m = new THREE.Mesh(fillGeo, fillMat.clone()); // own material: each fill takes its section's colour
      m.rotation.x = -Math.PI / 2;
      m.renderOrder = 1;
      m.visible = false;
      scene.add(m);
      return m;
    };
    const footprints = new Map<string, THREE.Box3>();
    const zoneOfMachine = new Map<string, THREE.Box3>();
    /** Darker shade of each machine's section colour. */
    const zoneShade = new Map<string, THREE.Color>();
    const placeFill = (fill: THREE.Mesh, id: string | null) => {
      const target = id ? machines.get(id) : undefined;
      fill.visible = !!target;
      if (!target || !id) return false;
      let box = footprints.get(id);
      if (!box) footprints.set(id, (box = new THREE.Box3().setFromObject(target)));
      const size = box.getSize(new THREE.Vector3());
      const c = box.getCenter(new THREE.Vector3());
      let x0 = c.x - size.x / 2 - hoverPad;
      let x1 = c.x + size.x / 2 + hoverPad;
      let z0 = c.z - size.z / 2 - hoverPad;
      let z1 = c.z + size.z / 2 + hoverPad;
      // Stay inside the machine's section outline.
      const zb = showZonesRef.current ? zoneOfMachine.get(id) : undefined;
      (fill.material as THREE.MeshBasicMaterial).color.set((zb && zoneShade.get(id)) || SELECTION_COLOR);
      if (zb) {
        x0 = Math.max(x0, zb.min.x);
        x1 = Math.min(x1, zb.max.x);
        z0 = Math.max(z0, zb.min.z);
        z1 = Math.min(z1, zb.max.z);
      }
      fill.scale.set(x1 - x0, z1 - z0, 1);
      fill.position.set((x0 + x1) / 2, 0.004, (z0 + z1) / 2);
      return true;
    };
    // Zones: a tinted floor rectangle with a dashed outline round each group of machines.
    const zoneBoxes = new Map<string, THREE.Box3>();
    const zoneDisposables: { dispose(): void }[] = [];
    const zoneGroup = new THREE.Group();
    zoneGroup.visible = showZonesRef.current;
    zoneGroupRef.current = zoneGroup;
    scene.add(zoneGroup);
    for (const zone of zones ?? []) {
      const box = new THREE.Box3();
      for (const id of zone.machineIds) {
        const m = machines.get(id);
        if (m) box.expandByObject(m);
      }
      if (box.isEmpty()) continue;
      box.min.x -= zonePad;
      box.min.z -= zonePad;
      box.max.x += zonePad;
      box.max.z += zonePad;
      zoneBoxes.set(zone.id, box);
      const shade = new THREE.Color(zone.color).multiplyScalar(0.6);
      for (const id of zone.machineIds) {
        zoneOfMachine.set(id, box);
        zoneShade.set(id, shade);
      }
      const w = box.max.x - box.min.x;
      const d = box.max.z - box.min.z;
      const cx = (box.min.x + box.max.x) / 2;
      const cz = (box.min.z + box.max.z) / 2;
      const fillM = new THREE.MeshBasicMaterial({ color: zone.color, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1 });
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, d), fillM);
      plane.rotation.x = -Math.PI / 2;
      plane.position.set(cx, 0.003, cz);
      plane.renderOrder = 0;
      const y = 0.005;
      const loop = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(box.min.x, y, box.min.z),
          new THREE.Vector3(box.max.x, y, box.min.z),
          new THREE.Vector3(box.max.x, y, box.max.z),
          new THREE.Vector3(box.min.x, y, box.max.z),
        ]),
        new THREE.LineBasicMaterial({ color: zone.color }),
      );
      zoneGroup.add(plane, loop);
      zoneDisposables.push(plane.geometry, fillM, loop.geometry, loop.material as THREE.Material);
    }

    const selectFill = makeFill();
    const highlight = (id: string | null) => void placeFill(selectFill, id);
    highlightRef.current = highlight;
    highlight(selectedIdRef.current);

    const baseFill = makeFill();
    let hoveredId: string | null = null;
    const setHover = (id: string | null) => {
      if (id === hoveredId) return;
      hoveredId = id;
      renderer.domElement.style.cursor = placeFill(baseFill, id) ? "pointer" : "";
    };

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const pickMachine = (e: PointerEvent): string | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      for (const hit of raycaster.intersectObject(machine.object, true)) {
        let o: THREE.Object3D | null = hit.object;
        while (o && o.userData.kind !== "machine") o = o.parent;
        if (o) return o.userData.id;
      }
      return null;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (machines.size === 0 || e.buttons) return setHover(null); // no hover while orbiting
      setHover(pickMachine(e));
    };
    const onPointerLeave = () => setHover(null);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerleave", onPointerLeave);

    let down: { x: number; y: number } | null = null;
    const onPointerDown = (e: PointerEvent) => {
      down = e.button === 0 ? { x: e.clientX, y: e.clientY } : null;
    };
    const onPointerUp = (e: PointerEvent) => {
      const start = down;
      down = null;
      if (!start || !onSelectRef.current || machines.size === 0) return;
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > CLICK_TOLERANCE) return; // it was a drag
      onSelectRef.current(pickMachine(e));
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointerup", onPointerUp);

    const resize = () => {
      const width = container.clientWidth || 1;
      const h = height === "fill" ? container.clientHeight || 1 : height;
      renderer.setSize(width, h);
      camera.aspect = width / h;
      if (viewShift[0] || viewShift[1]) camera.setViewOffset(width, h, -viewShift[0] * width, viewShift[1] * h, width, h);
      else camera.clearViewOffset();
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    let start: number | undefined;
    let frame = 0;
    // Badges: HTML labels pinned to the top centre of each machine, re-projected every frame.
    const heads = new Map<string, THREE.Vector3>();
    const projected = new THREE.Vector3();
    const placeBadges = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      badgeEls.current.forEach((el, id) => {
        const target = machines.get(id);
        const zoneBox = zoneBoxes.get(id);
        if (!target && !zoneBox) {
          el.style.visibility = "hidden";
          return;
        }
        let head = heads.get(id);
        if (!head) {
          const box = zoneBox ?? new THREE.Box3().setFromObject(target!);
          heads.set(id, (head = new THREE.Vector3((box.min.x + box.max.x) / 2, box.max.y + radius * 0.01, (box.min.z + box.max.z) / 2)));
        }
        projected.copy(head).project(camera);
        if (projected.z > 1) {
          el.style.visibility = "hidden";
          return;
        }
        el.style.visibility = "visible";
        el.style.transform = `translate(${((projected.x + 1) / 2) * w}px, ${((1 - projected.y) / 2) * h}px) translate(-50%, -100%)`;
      });
    };

    const loop = (now: number) => {
      start ??= now;
      if (animate) machine.update?.((now - start) / 1000);
      if (fly) {
        const k = Math.min(1, (performance.now() - fly.start) / FLY_MS);
        const e = k * k * k * (k * (k * 6 - 15) + 10); // smootherstep: gentle start and stop
        flyPos.set(
          THREE.MathUtils.lerp(fly.from.radius, fly.to.radius, e),
          THREE.MathUtils.lerp(fly.from.phi, fly.to.phi, e),
          THREE.MathUtils.lerp(fly.from.theta, fly.to.theta, e),
        );
        controls.target.lerpVectors(fly.fromTarget, center, e);
        camera.position.copy(controls.target).add(flyOffset.setFromSpherical(flyPos));
        if (k >= 1) fly = null;
      }
      controls.update();
      renderer.render(scene, camera);
      placeBadges();
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      highlightRef.current = null;
      applyViewRef.current = null;
      zoneGroupRef.current = null;
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
      fillGeo.dispose();
      fillMat.dispose();
      zoneDisposables.forEach((d) => d.dispose());
      controls.removeEventListener("start", stopAutoRotate);
      controls.dispose();
      const materials = new Set<THREE.Material>();
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          (Array.isArray(child.material) ? child.material : [child.material]).forEach((mat) => materials.add(mat));
        }
      });
      materials.forEach((mat) => {
        (mat as THREE.MeshBasicMaterial).map?.dispose(); // canvas textures (floor signs)
        mat.dispose();
      });
      renderer.dispose();
      renderer.forceContextLoss(); // free the WebGL context now (browsers cap how many can be open)
      renderer.domElement.remove();
    };
  }, [create, animate, autoRotate, height, minZoom, viewDistance, hoverPad, cameraDirection, viewShift, zones, zonePad]);

  return (
    <div ref={containerRef} className={className} style={{ position: "relative", overflow: "hidden", width: "100%", height: height === "fill" ? "100%" : height }}>
      {badges &&
        Object.entries(badges).map(([id, node]) => (
          <div
            key={id}
            ref={(el) => {
              if (el) badgeEls.current.set(id, el);
              else badgeEls.current.delete(id);
            }}
            style={{ position: "absolute", left: 0, top: 0, visibility: "hidden", pointerEvents: "none", willChange: "transform" }}
          >
            {node}
          </div>
        ))}
    </div>
  );
}
