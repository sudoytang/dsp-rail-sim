import { cloudInsertionPoint, elevationDeg, launcherState } from "./astronomy";
import { MAX_ELEVATION_DEG, MIN_ELEVATION_DEG } from "./constants";
import type {
  CloudOrbitCandidate,
  DysonCloudOrbit,
  LauncherFiringState,
  LauncherParameters,
  SimulationConfig,
  SystemState,
  UnavailableReason,
  VisibilityState,
  Vec3,
} from "./types";
import { dot, subtract } from "./vectors";

export function segmentIntersectsSphere(start: Vec3, end: Vec3, center: Vec3, radiusM: number): boolean {
  const direction = subtract(end, start);
  const offset = subtract(start, center);
  const a = dot(direction, direction);
  if (a === 0) return false;
  const b = 2 * dot(offset, direction);
  const c = dot(offset, offset) - radiusM * radiusM;
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return false;
  const root = Math.sqrt(discriminant);
  const first = (-b - root) / (2 * a);
  const second = (-b + root) / (2 * a);
  const epsilon = 1e-9;
  return (first > epsilon && first < 1 - epsilon) || (second > epsilon && second < 1 - epsilon);
}

export function blockersAtPoint(
  config: SimulationConfig,
  state: SystemState,
  launcherPosition: Vec3,
  launcherBodyId: string,
  target: Vec3,
): string[] {
  const blockers: string[] = [];
  if (segmentIntersectsSphere(launcherPosition, target, state.star.center, state.star.radiusM)) {
    blockers.push(config.star.id);
  }
  for (const body of config.bodies) {
    if (body.id === launcherBodyId) continue;
    const bodyState = state.bodies.get(body.id);
    if (!bodyState) continue;
    if (segmentIntersectsSphere(launcherPosition, target, bodyState.center, bodyState.radiusM)) {
      blockers.push(body.id);
    }
  }
  return blockers;
}

export function cloudBySlot(config: SimulationConfig, slot: number): DysonCloudOrbit | null {
  return config.clouds.find((cloud) => cloud.slot === slot) ?? null;
}

export function orbitCandidate(
  config: SimulationConfig,
  system: SystemState,
  launcher: LauncherParameters,
  cloud: DysonCloudOrbit,
): CloudOrbitCandidate {
  const launcherStateValue = launcherState(launcher, system);
  const insertionPoint = cloudInsertionPoint(cloud, launcherStateValue.position);
  if (!insertionPoint) {
    return { cloudId: cloud.id, slot: cloud.slot, insertionPoint: null, elevationDeg: null, blockedBy: [], available: false };
  }
  const elevation = elevationDeg(launcherStateValue.position, launcherStateValue.up, insertionPoint);
  const elevationValid = elevation >= MIN_ELEVATION_DEG && elevation <= MAX_ELEVATION_DEG;
  const blockedBy = elevationValid
    ? blockersAtPoint(config, system, launcherStateValue.position, launcher.bodyId, insertionPoint)
    : [];
  return {
    cloudId: cloud.id,
    slot: cloud.slot,
    insertionPoint,
    elevationDeg: elevation,
    blockedBy,
    available: elevationValid && blockedBy.length === 0,
  };
}

export function currentCandidate(
  config: SimulationConfig,
  system: SystemState,
  launcher: LauncherParameters,
  state: LauncherFiringState,
): CloudOrbitCandidate | null {
  if (state.currentOrbitSlot === 0) return null;
  const cloud = cloudBySlot(config, state.currentOrbitSlot);
  return cloud ? orbitCandidate(config, system, launcher, cloud) : null;
}

export function visibilityForState(
  config: SimulationConfig,
  system: SystemState,
  launcher: LauncherParameters,
  timeSeconds: number,
  state: LauncherFiringState,
): VisibilityState {
  const candidate = currentCandidate(config, system, launcher, state);
  const available = Boolean(candidate?.available);
  const reason: UnavailableReason = available
    ? "available"
    : candidate?.insertionPoint === null
      ? "no-intersection"
      : candidate && candidate.elevationDeg !== null && (candidate.elevationDeg < MIN_ELEVATION_DEG || candidate.elevationDeg > MAX_ELEVATION_DEG)
        ? "elevation"
        : candidate && candidate.blockedBy.length > 0
          ? "occluded"
          : state.searchingForOrbit
            ? "searching"
            : "no-target";
  return {
    timeSeconds,
    available,
    reason,
    currentOrbitSlot: state.currentOrbitSlot,
    currentCloudId: candidate?.cloudId ?? null,
    candidate,
    state,
  };
}

export function currentOrbitValid(
  config: SimulationConfig,
  system: SystemState,
  launcher: LauncherParameters,
  state: LauncherFiringState,
): boolean {
  return Boolean(currentCandidate(config, system, launcher, state)?.available);
}
