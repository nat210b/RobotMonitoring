import * as THREE from "three";
import type { FloorSign } from "./floorPlan";

/**
 * A sponsor-style sign painted on the floor: a sharp-cornered dark panel with a small spaced-out caption
 * ("POWERED BY") over the text in large extra-bold white, and a brand-green stripe along the bottom. It
 * lies flat so it reads upright from the front / top views. Drawn onto a canvas texture.
 * Browser only (needs `document`).
 */
export function createFloorSign({ text, caption, x, z, width, depth, color = "#1e293b", ink = "#ffffff" }: FloorSign) {
  const pxPerMetre = 640;
  const W = Math.round(width * pxPerMetre);
  const H = Math.round(depth * pxPerMetre);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#64a70b"; // --brand
  ctx.fillRect(0, H * 0.93, W, H * 0.07);

  // Page font (Geist); extra-bold for the name, the caption lighter and widely spaced.
  const family = getComputedStyle(document.body).fontFamily || "sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const hasCaption = !!caption;

  if (caption) {
    const size = H * 0.14;
    ctx.font = `600 ${size}px ${family}`;
    ctx.letterSpacing = `${size * 0.35}px`;
    ctx.fillStyle = "#cbd5e1";
    ctx.fillText(caption.toUpperCase(), W / 2, H * 0.2);
    ctx.letterSpacing = "0px";
  }

  // Name: as large as fits (88% of the width, at most ~52% of the height), shrunk to fit.
  let size = H * (hasCaption ? 0.52 : 0.7);
  ctx.font = `800 ${size}px ${family}`;
  const measured = ctx.measureText(text).width;
  const maxWidth = W * 0.88;
  if (measured > maxWidth) {
    size *= maxWidth / measured;
    ctx.font = `800 ${size}px ${family}`;
  }
  ctx.fillStyle = ink;
  ctx.fillText(text, W / 2, hasCaption ? H * 0.58 : H * 0.5);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshBasicMaterial({ map: texture, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -3 }),
  );
  mesh.rotation.x = -Math.PI / 2; // flat on the floor, canvas top toward -z (the back wall)
  mesh.position.set(x, 0.008, z);
  mesh.renderOrder = 2;
  mesh.name = `sign:${text}`;
  return mesh;
}

/**
 * Small tall plate for a pillar face: dark rectangle, extra-bold white text running up the plate (reading
 * bottom to top), brand-green stripe at the top. Facing +z; turn it half a circle for a back face.
 * Browser only (needs `document`).
 */
export function createPillarSign(text: string, width: number, height: number, color = "#1e293b", ink = "#ffffff") {
  const pxPerMetre = 1000;
  const W = Math.round(width * pxPerMetre);
  const H = Math.round(height * pxPerMetre);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#64a70b"; // --brand
  ctx.fillRect(0, 0, W, H * 0.025);

  const family = getComputedStyle(document.body).fontFamily || "sans-serif";
  ctx.translate(W / 2, H / 2);
  ctx.rotate(-Math.PI / 2); // text runs bottom to top
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  let size = W * 0.55;
  ctx.font = `800 ${size}px ${family}`;
  const maxLength = H * 0.88;
  const measured = ctx.measureText(text).width;
  if (measured > maxLength) {
    size *= maxLength / measured;
    ctx.font = `800 ${size}px ${family}`;
  }
  ctx.fillStyle = ink;
  ctx.fillText(text, 0, size * 0.04);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }));
  mesh.name = `pillar-sign:${text}`;
  return mesh;
}
