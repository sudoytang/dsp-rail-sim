import type { Vec3 } from "./types";

export const vec3 = (x = 0, y = 0, z = 0): Vec3 => ({ x, y, z });
export const add = (a: Vec3, b: Vec3): Vec3 => vec3(a.x + b.x, a.y + b.y, a.z + b.z);
export const subtract = (a: Vec3, b: Vec3): Vec3 => vec3(a.x - b.x, a.y - b.y, a.z - b.z);
export const scale = (v: Vec3, scalar: number): Vec3 => vec3(v.x * scalar, v.y * scalar, v.z * scalar);
export const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;
export const cross = (a: Vec3, b: Vec3): Vec3 =>
  vec3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
export const length = (v: Vec3): number => Math.hypot(v.x, v.y, v.z);

export function normalize(v: Vec3): Vec3 {
  const magnitude = length(v);
  if (magnitude === 0) {
    throw new Error("Cannot normalize a zero-length vector");
  }
  return scale(v, 1 / magnitude);
}

export function rotateAroundAxis(v: Vec3, axis: Vec3, angle: number): Vec3 {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return add(
    add(scale(v, cosine), scale(cross(axis, v), sine)),
    scale(axis, dot(axis, v) * (1 - cosine)),
  );
}
