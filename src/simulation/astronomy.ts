import { TAU } from "./constants";
import { bodyRadiusM, starRadiusM } from "./config";
import type {
  BodyParameters,
  BodyState,
  DysonCloudOrbit,
  OrbitalBasis,
  OrbitParameters,
  LauncherParameters,
  LauncherState,
  SimulationConfig,
  SystemState,
  Vec3,
} from "./types";
import { degreesToRadians, radiansToDegrees } from "./units";
import { add, cross, dot, length, normalize, scale, subtract, vec3 } from "./vectors";

export function orbitalBasis(inclinationDeg: number, ascendingNodeDeg: number): OrbitalBasis {
  const inclination = degreesToRadians(inclinationDeg);
  const node = degreesToRadians(ascendingNodeDeg);
  const cosNode = Math.cos(node);
  const sinNode = Math.sin(node);
  const cosInclination = Math.cos(inclination);
  const sinInclination = Math.sin(inclination);
  const p = vec3(cosNode, sinNode, 0);
  const q = vec3(-sinNode * cosInclination, cosNode * cosInclination, sinInclination);
  return { p, q, normal: cross(p, q) };
}

export function orbitDirection(orbit: OrbitParameters, timeSeconds: number): Vec3 {
  const basis = orbitalBasis(orbit.inclinationDeg, orbit.ascendingNodeDeg);
  const phase = degreesToRadians(orbit.initialPhaseDeg) + (TAU * timeSeconds) / orbit.periodSeconds;
  return add(scale(basis.p, Math.cos(phase)), scale(basis.q, Math.sin(phase)));
}

export function cloudPoint(cloud: DysonCloudOrbit, angleDeg: number): Vec3 {
  const basis = orbitalBasis(cloud.inclinationDeg, cloud.ascendingNodeDeg);
  const angle = -degreesToRadians(angleDeg);
  return scale(
    add(scale(basis.p, Math.cos(angle)), scale(basis.q, Math.sin(angle))),
    cloud.radiusM,
  );
}

export function cloudInsertionPoint(cloud: DysonCloudOrbit, launcherPosition: Vec3): Vec3 | null {
  const basis = orbitalBasis(cloud.inclinationDeg, cloud.ascendingNodeDeg);
  const projected = subtract(launcherPosition, scale(basis.normal, dot(launcherPosition, basis.normal)));
  if (length(projected) < 1e-9) return null;
  const direction = normalize(projected);
  const intersection = scale(direction, cloud.radiusM);
  const angle = Math.atan2(dot(intersection, basis.q), dot(intersection, basis.p)) - Math.PI / 2;
  return scale(add(scale(basis.p, Math.cos(angle)), scale(basis.q, Math.sin(angle))), cloud.radiusM);
}

export function bodyState(body: BodyParameters, center: Vec3, timeSeconds: number): BodyState {
  const basis = orbitalBasis(body.orbit.inclinationDeg, body.orbit.ascendingNodeDeg);
  const tilt = degreesToRadians(body.axialTiltDeg);
  const axis = normalize(
    add(scale(basis.normal, Math.cos(tilt)), scale(basis.q, Math.sin(tilt))),
  );
  const equatorX = basis.p;
  const equatorY = cross(axis, equatorX);
  const spin = (TAU * timeSeconds) / body.rotationPeriodSeconds;
  return {
    id: body.id,
    center,
    axis: vec3(axis.x, axis.y, axis.z),
    equatorX: rotateInPlane(equatorX, equatorY, spin),
    equatorY: rotateInPlane(equatorY, scale(equatorX, -1), spin),
    radiusM: bodyRadiusM(body),
  };
}

function rotateInPlane(vector: Vec3, perpendicular: Vec3, angle: number): Vec3 {
  return add(scale(vector, Math.cos(angle)), scale(perpendicular, Math.sin(angle)));
}

export function surfaceDirection(state: BodyState, latitudeDeg: number, longitudeDeg: number): Vec3 {
  const latitude = degreesToRadians(latitudeDeg);
  const longitude = degreesToRadians(longitudeDeg);
  const equatorial = Math.cos(latitude);
  return normalize(
    add(
      add(
        scale(state.equatorX, equatorial * Math.cos(longitude)),
        scale(state.equatorY, equatorial * Math.sin(longitude)),
      ),
      scale(state.axis, Math.sin(latitude)),
    ),
  );
}

export function systemState(config: SimulationConfig, timeSeconds: number): SystemState {
  const bodies = new Map<string, BodyState>();
  const star: BodyState = {
    id: config.star.id,
    center: vec3(),
    axis: vec3(0, 0, 1),
    equatorX: vec3(1, 0, 0),
    equatorY: vec3(0, 1, 0),
    radiusM: starRadiusM(config),
  };

  for (const body of config.bodies) {
    if (body.parentId !== null) continue;
    const center = scale(orbitDirection(body.orbit, timeSeconds), body.orbit.radiusM);
    bodies.set(body.id, bodyState(body, center, timeSeconds));
  }

  for (const body of config.bodies) {
    if (body.parentId === null) continue;
    const parent = bodies.get(body.parentId);
    if (!parent) throw new Error(`Missing parent body: ${body.parentId}`);
    const local = scale(orbitDirection(body.orbit, timeSeconds), body.orbit.radiusM);
    bodies.set(body.id, bodyState(body, add(parent.center, local), timeSeconds));
  }

  return { star, bodies };
}

export function launcherState(
  launcher: LauncherParameters,
  system: SystemState,
): LauncherState {
  const body = system.bodies.get(launcher.bodyId);
  if (!body) throw new Error(`Missing launcher body: ${launcher.bodyId}`);
  const up = surfaceDirection(body, launcher.latitudeDeg, launcher.longitudeDeg);
  return { position: add(body.center, scale(up, body.radiusM)), up };
}

export function elevationDeg(position: Vec3, up: Vec3, target: Vec3): number {
  const direction = normalize(vec3(target.x - position.x, target.y - position.y, target.z - position.z));
  return radiansToDegrees(Math.asin(Math.max(-1, Math.min(1, dot(direction, up)))));
}
