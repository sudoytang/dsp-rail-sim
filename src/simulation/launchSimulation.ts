import { systemState } from "./astronomy";
import { SEARCH_TICK_SECONDS } from "./constants";
import type {
  LauncherFiringState,
  LauncherParameters,
  SimulationConfig,
  SystemState,
  VisibilityState,
} from "./types";
import { cloudBySlot, orbitCandidate, visibilityForState } from "./visibility";

export class LaunchSimulation {
  readonly config: SimulationConfig;
  readonly startSeconds: number;
  private states = new Map<string, LauncherFiringState>();
  private lastTickIndex: number;
  private lastSystem: SystemState;
  private lastSystemTime: number;

  constructor(config: SimulationConfig, startSeconds = 0, launcherIds?: string[]) {
    this.config = config;
    this.startSeconds = startSeconds;
    this.lastTickIndex = Math.ceil(startSeconds / SEARCH_TICK_SECONDS) - 1;
    const system = systemState(config, startSeconds);
    this.lastSystem = system;
    this.lastSystemTime = startSeconds;
    const included = launcherIds ? new Set(launcherIds) : null;
    for (const launcher of config.launchers) {
      if (!included || included.has(launcher.id)) this.states.set(launcher.id, initialFiringState(config, launcher, system));
    }
  }

  advanceTo(timeSeconds: number): void {
    const targetTick = Math.floor((timeSeconds + 1e-9) / SEARCH_TICK_SECONDS);
    while (this.lastTickIndex < targetTick) {
      this.lastTickIndex += 1;
      this.processTick(this.lastTickIndex * SEARCH_TICK_SECONDS);
    }
  }

  visibilityFor(launcherId: string, timeSeconds: number): VisibilityState {
    this.advanceTo(timeSeconds);
    const launcher = this.config.launchers.find((item) => item.id === launcherId);
    const state = this.states.get(launcherId);
    if (!launcher || !state) throw new Error(`Missing launcher state: ${launcherId}`);
    return visibilityForState(this.config, this.systemAt(timeSeconds), launcher, timeSeconds, state);
  }

  visibilitySnapshot(timeSeconds: number): Record<string, VisibilityState> {
    this.advanceTo(timeSeconds);
    const system = this.systemAt(timeSeconds);
    const result: Record<string, VisibilityState> = {};
    for (const launcher of this.config.launchers) {
      const state = this.states.get(launcher.id);
      if (state) result[launcher.id] = visibilityForState(this.config, system, launcher, timeSeconds, state);
    }
    return result;
  }

  stateFor(launcherId: string): LauncherFiringState {
    const state = this.states.get(launcherId);
    if (!state) throw new Error(`Missing launcher state: ${launcherId}`);
    return state;
  }

  systemAt(timeSeconds: number): SystemState {
    return Math.abs(timeSeconds - this.lastSystemTime) < 1e-9 ? this.lastSystem : systemState(this.config, timeSeconds);
  }

  private processTick(timeSeconds: number): void {
    const system = systemState(this.config, timeSeconds);
    this.lastSystem = system;
    this.lastSystemTime = timeSeconds;
    for (const launcher of this.config.launchers) {
      const state = this.states.get(launcher.id);
      if (!state) continue;
      stepFiringState(this.config, launcher, state, (slot) => {
        const cloud = cloudBySlot(this.config, slot);
        return cloud ? orbitCandidate(this.config, system, launcher, cloud).available : false;
      });
    }
  }
}

export function stepFiringState(
  config: SimulationConfig,
  launcher: LauncherParameters,
  state: LauncherFiringState,
  isValid: (slot: number) => boolean,
): void {
  if (!launcher.autoOrbit) {
    state.currentOrbitSlot = cloudBySlot(config, launcher.targetOrbitSlot)?.slot ?? 0;
    state.searchingForOrbit = false;
    return;
  }
  if (state.currentOrbitSlot !== 0 && isValid(state.currentOrbitSlot)) return;
  if (state.currentOrbitSlot !== 0) {
    state.searchAnchorSlot = state.currentOrbitSlot;
    state.currentOrbitSlot = 0;
    state.searchingForOrbit = true;
    state.nextCandidateSlot = nextConfiguredSlot(config, state.searchAnchorSlot);
    state.checkTargetNext = cloudBySlot(config, launcher.targetOrbitSlot) !== null;
  }
  if (!state.searchingForOrbit) {
    state.searchingForOrbit = true;
    state.searchAnchorSlot = 0;
    state.nextCandidateSlot = nextConfiguredSlot(config, 0);
    state.checkTargetNext = cloudBySlot(config, launcher.targetOrbitSlot) !== null;
  }
  let testSlot = 0;
  if (state.checkTargetNext && cloudBySlot(config, launcher.targetOrbitSlot)) {
    testSlot = launcher.targetOrbitSlot;
    state.checkTargetNext = false;
  } else {
    testSlot = state.nextCandidateSlot;
    if (testSlot !== 0) state.nextCandidateSlot = nextConfiguredSlot(config, testSlot);
    state.checkTargetNext = cloudBySlot(config, launcher.targetOrbitSlot) !== null;
  }
  if (testSlot !== 0 && isValid(testSlot)) {
    state.currentOrbitSlot = testSlot;
    state.searchingForOrbit = false;
  }
}

function initialFiringState(
  config: SimulationConfig,
  launcher: LauncherParameters,
  system: ReturnType<typeof systemState>,
): LauncherFiringState {
  const targetCloud = cloudBySlot(config, launcher.targetOrbitSlot);
  if (!launcher.autoOrbit) {
    return {
      currentOrbitSlot: targetCloud?.slot ?? 0,
      searchAnchorSlot: 0,
      nextCandidateSlot: 0,
      searchingForOrbit: false,
      checkTargetNext: false,
    };
  }
  if (targetCloud && orbitCandidate(config, system, launcher, targetCloud).available) {
    return {
      currentOrbitSlot: targetCloud.slot,
      searchAnchorSlot: 0,
      nextCandidateSlot: nextConfiguredSlot(config, targetCloud.slot),
      searchingForOrbit: false,
      checkTargetNext: false,
    };
  }
  return {
    currentOrbitSlot: 0,
    searchAnchorSlot: 0,
    nextCandidateSlot: nextConfiguredSlot(config, 0),
    searchingForOrbit: true,
    checkTargetNext: Boolean(targetCloud),
  };
}

export function nextConfiguredSlot(config: SimulationConfig, afterSlot: number): number {
  const slots = config.clouds.map((cloud) => cloud.slot).sort((a, b) => a - b);
  return slots.find((slot) => slot > afterSlot) ?? slots[0] ?? 0;
}

export function nextTick(timeSeconds: number): number {
  return Math.ceil((timeSeconds + 1e-9) / SEARCH_TICK_SECONDS) * SEARCH_TICK_SECONDS;
}
