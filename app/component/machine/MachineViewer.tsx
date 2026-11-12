"use client";

import { useEffect, useRef } from "react";
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
  className?: string;
};

/** Pointer travel (px) above which a press counts as a drag, not a click. */
const CLICK_TOLERANCE = 5;
const SELECTION_COLOR = 0x64a70b; // --brand

export default function MachineViewer({
  create,
  animate = false,
  autoRotate = false,
  height = 420,
  minZoom = 1.2,
  viewDistance = 3.1,
  onSelect,
  selectedId = null,
  className,
}: MachineViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Kept in refs so changing them doesn't rebuild the whole scene.
  const onSelectRef = useRef(onSelect);
  const selectedIdRef = useRef(selectedId);
  const highlightRef = useRef<((id: string | null) => void) | null>(null);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

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
    camera.position.copy(center).add(new THREE.Vector3(1, 1.414, 1).normalize().multiplyScalar(radius * viewDistance));

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
    const outline = new THREE.Box3Helper(new THREE.Box3(), SELECTION_COLOR);
    outline.visible = false;
    scene.add(outline);
    const highlight = (id: string | null) => {
      const target = id ? machines.get(id) : undefined;
      outline.visible = !!target;
      if (target) outline.box.setFromObject(target).expandByScalar(radius * 0.004);
    };
    highlightRef.current = highlight;
    highlight(selectedIdRef.current);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let down: { x: number; y: number } | null = null;
    const onPointerDown = (e: PointerEvent) => {
      down = e.button === 0 ? { x: e.clientX, y: e.clientY } : null;
    };
    const onPointerUp = (e: PointerEvent) => {
      const start = down;
      down = null;
      if (!start || !onSelectRef.current || machines.size === 0) return;
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > CLICK_TOLERANCE) return; // it was a drag
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      let hitId: string | null = null;
      for (const hit of raycaster.intersectObject(machine.object, true)) {
        let o: THREE.Object3D | null = hit.object;
        while (o && o.userData.kind !== "machine") o = o.parent;
        if (o) {
          hitId = o.userData.id;
          break;
        }
      }
      onSelectRef.current(hitId);
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointerup", onPointerUp);

    const resize = () => {
      const width = container.clientWidth || 1;
      const h = height === "fill" ? container.clientHeight || 1 : height;
      renderer.setSize(width, h);
      camera.aspect = width / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    let start: number | undefined;
    let frame = 0;
    const loop = (now: number) => {
      start ??= now;
      if (animate) machine.update?.((now - start) / 1000);
      controls.update();
      renderer.render(scene, camera);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      highlightRef.current = null;
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      outline.geometry.dispose();
      (outline.material as THREE.Material).dispose();
      controls.removeEventListener("start", stopAutoRotate);
      controls.dispose();
      const materials = new Set<THREE.Material>();
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          (Array.isArray(child.material) ? child.material : [child.material]).forEach((mat) => materials.add(mat));
        }
      });
      materials.forEach((mat) => mat.dispose());
      renderer.dispose();
      renderer.forceContextLoss(); // free the WebGL context now (browsers cap how many can be open)
      renderer.domElement.remove();
    };
  }, [create, animate, autoRotate, height, minZoom, viewDistance]);

  return <div ref={containerRef} className={className} style={{ width: "100%", height: height === "fill" ? "100%" : height }} />;
}
