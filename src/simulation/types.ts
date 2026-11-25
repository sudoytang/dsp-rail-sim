export type Vec3 = {
  x: number;
  y: number;
  z: number;
};

export type BodyKind = "rocky" | "giant";

export interface OrbitParameters {
  radiusM: number;
  inclinationDeg: number;
  ascendingNodeDeg: number;
  periodSeconds: number;
  initialPhaseDeg: number;
}

export interface StarParameters {
  id: "star";
  kind: "star";
  name: string;
  radiusScale: number;
}

export interface BodyParameters {
  id: string;
  kind: BodyKind;
  name: string;
  parentId: string | null;
  orbit: OrbitParameters;
  axialTiltDeg: number;
  rotationPeriodSeconds: number;
}

export interface DysonCloudOrbit {
  id: string;
  slot: number;
  name: string;
  radiusM: number;
  inclinationDeg: number;
  ascendingNodeDeg: number;
  color: string;
}

export interface LauncherParameters {
  id: string;
  name: string;
  bodyId: string;
  latitudeDeg: number;
  longitudeDeg: number;
  targetOrbitSlot: number;
  autoOrbit: boolean;
}

export interface SimulationConfig {
  version: 3;
  star: StarParameters;
  bodies: BodyParameters[];
  clouds: DysonCloudOrbit[];
  launchers: LauncherParameters[];
}

export interface OrbitalBasis {
  p: Vec3;
  q: Vec3;
  normal: Vec3;
}

export interface BodyState {
  id: string;
  center: Vec3;
  axis: Vec3;
  equatorX: Vec3;
  equatorY: Vec3;
  radiusM: number;
}

export interface SystemState {
  star: BodyState;
  bodies: Map<string, BodyState>;
}

export interface LauncherState {
  position: Vec3;
  up: Vec3;
}

export type UnavailableReason = "available" | "elevation" | "occluded" | "no-intersection" | "no-target" | "searching";

export interface CloudOrbitCandidate {
  cloudId: string;
  slot: number;
  insertionPoint: Vec3 | null;
  elevationDeg: number | null;
  blockedBy: string[];
  available: boolean;
}

export interface LauncherFiringState {
  currentOrbitSlot: number;
  searchAnchorSlot: number;
  nextCandidateSlot: number;
  searchingForOrbit: boolean;
  checkTargetNext: boolean;
}

export interface VisibilityState {
  timeSeconds: number;
  available: boolean;
  reason: UnavailableReason;
  currentOrbitSlot: number;
  currentCloudId: string | null;
  candidate: CloudOrbitCandidate | null;
  state: LauncherFiringState;
}

export interface LaunchWindow {
  startSeconds: number;
  endSeconds: number;
}

export interface CalcEntry {
  launcherId: string;
}

export interface CalcJob {
  id: string;
  name: string;
  startSeconds: number;
  endSeconds: number;
  entries: CalcEntry[];
}

export interface LauncherCalcReport {
  launcherId: string;
  availableSeconds: number;
  availableRatio: number;
  windows: LaunchWindow[];
  orbitUsageSeconds: Record<number, number>;
}

export interface CalcReport {
  jobId: string;
  startSeconds: number;
  endSeconds: number;
  aggregateRatio: number;
  systemCoverageRatio: number;
  availableMachineSeconds: number;
  coverageWindows: LaunchWindow[];
  launchers: LauncherCalcReport[];
  tickSeconds: number;
}
