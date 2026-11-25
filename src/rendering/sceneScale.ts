import * as THREE from "three";
import { METERS_PER_AU } from "../simulation/constants";
import type { BodyParameters, SimulationConfig, Vec3 } from "../simulation/types";

export function displayOrbitRadius(radiusM: number): number {
  return 10 * Math.pow(Math.max(radiusM, 1) / METERS_PER_AU, 0.55);
}

export function displayMoonOrbitRadius(radiusM: number): number {
  return 2.4 * Math.pow(Math.max(radiusM, 1) / 10_000, 0.55);
}

export function displayBodyRadius(body: BodyParameters): number {
  return body.kind === "rocky" ? 0.38 : 0.9;
}

export function displayStarRadius(config: SimulationConfig): number {
  return 1.45 * Math.sqrt(config.star.radiusScale);
}

export function displayCloudPoint(point: Vec3, radiusM: number): THREE.Vector3 {
  return new THREE.Vector3(point.x, point.y, point.z).normalize().multiplyScalar(displayOrbitRadius(radiusM));
}

export function toThree(vector: Vec3): THREE.Vector3 {
  return new THREE.Vector3(vector.x, vector.y, vector.z);
}
