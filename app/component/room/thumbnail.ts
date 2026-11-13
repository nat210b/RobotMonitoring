import * as THREE from "three";
import { MACHINE_FACTORIES, type MachineType } from "./model";

const SIZE = 160;

/**
 * Small PNG picture of each machine type's 3D model (data URLs), rendered offscreen in one go.
 * Browser only: needs WebGL. Returns an empty map if the context can't be created.
 */
export function renderMachineThumbnails(types: Iterable<MachineType>): Map<MachineType, string> {
  const out = new Map<MachineType, string>();
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch {
    return out;
  }
  renderer.setPixelRatio(1);
  renderer.setSize(SIZE, SIZE);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const camera = new THREE.PerspectiveCamera(35, 1);
  for (const type of new Set(types)) {
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0xaeb6c0, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(2, 4, 3);
    scene.add(sun);

    const { object } = MACHINE_FACTORIES[type]();
    scene.add(object);
    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    const radius = box.getSize(new THREE.Vector3()).length() / 2;
    camera.near = radius * 0.01;
    camera.far = radius * 50;
    camera.updateProjectionMatrix();
    camera.position.copy(center).add(new THREE.Vector3(1, 0.9, 1.2).normalize().multiplyScalar(radius * 2.6));
    camera.lookAt(center);

    renderer.render(scene, camera);
    out.set(type, renderer.domElement.toDataURL("image/png"));

    const materials = new Set<THREE.Material>();
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        (Array.isArray(child.material) ? child.material : [child.material]).forEach((m) => materials.add(m));
      }
    });
    materials.forEach((m) => m.dispose());
  }
  renderer.dispose();
  renderer.forceContextLoss();
  return out;
}
