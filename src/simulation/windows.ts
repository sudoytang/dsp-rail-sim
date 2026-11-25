import { SEARCH_TICK_SECONDS } from "./constants";
import { LaunchSimulation, nextTick } from "./launchSimulation";
import type { CalcJob, CalcReport, LaunchWindow, SimulationConfig, SystemState } from "./types";
import { currentCandidate } from "./visibility";

interface Accumulator {
  previous: boolean;
  windowStart: number | null;
  availableSeconds: number;
  windows: LaunchWindow[];
}

interface TickStatus {
  available: boolean;
  orbitSlot: number;
}

export function validateCalcJob(config: SimulationConfig, job: CalcJob): void {
  if (!(job.endSeconds > job.startSeconds)) throw new Error("The scan end time must be after the start time.");
  if (job.entries.length === 0) throw new Error("Select at least one Ejector.");
  if (new Set(job.entries.map((entry) => entry.launcherId)).size !== job.entries.length) {
    throw new Error("An Ejector can appear only once in a calculation.");
  }
  const launcherIds = new Set(config.launchers.map((launcher) => launcher.id));
  for (const entry of job.entries) {
    if (!launcherIds.has(entry.launcherId)) throw new Error(`Missing Ejector: ${entry.launcherId}`);
  }
}

export function* scanCalcJob(config: SimulationConfig, job: CalcJob): Generator<number, CalcReport, void> {
  validateCalcJob(config, job);
  const duration = job.endSeconds - job.startSeconds;
  const simulation = new LaunchSimulation(config, job.startSeconds, job.entries.map((entry) => entry.launcherId));
  simulation.advanceTo(job.startSeconds);
  let time = job.startSeconds;
  let system = simulation.systemAt(time);
  let statuses = job.entries.map((entry) => statusFor(config, system, simulation, entry.launcherId));
  const accumulators = statuses.map((status) => accumulator(status.available, time));
  let coverage = accumulator(statuses.some((status) => status.available), time);
  const orbitUsage = statuses.map((status) => {
    const usage: Record<number, number> = {};
    if (status.available && status.orbitSlot !== 0) usage[status.orbitSlot] = 0;
    return usage;
  });
  let tick = nextTick(job.startSeconds);
  if (tick <= job.startSeconds + 1e-9) tick += SEARCH_TICK_SECONDS;
  yield 0;

  while (tick <= job.endSeconds + 1e-9) {
    const tickTime = Math.min(tick, job.endSeconds);
    statuses.forEach((status, index) => {
      if (status.available && status.orbitSlot !== 0) {
        orbitUsage[index][status.orbitSlot] = (orbitUsage[index][status.orbitSlot] ?? 0) + tickTime - time;
      }
    });
    time = tickTime;
    simulation.advanceTo(time);
    system = simulation.systemAt(time);
    statuses = job.entries.map((entry) => statusFor(config, system, simulation, entry.launcherId));
    statuses.forEach((status, index) => {
      if (status.available !== accumulators[index].previous) transition(accumulators[index], time, status.available);
    });
    const covered = statuses.some((status) => status.available);
    if (covered !== coverage.previous) transition(coverage, time, covered);
    yield (time - job.startSeconds) / duration;
    if (time >= job.endSeconds) break;
    tick += SEARCH_TICK_SECONDS;
  }

  if (job.endSeconds > time) {
    statuses.forEach((status, index) => {
      if (status.available && status.orbitSlot !== 0) {
        orbitUsage[index][status.orbitSlot] = (orbitUsage[index][status.orbitSlot] ?? 0) + job.endSeconds - time;
      }
    });
  }
  for (const state of accumulators) finish(state, job.endSeconds);
  finish(coverage, job.endSeconds);
  const availableMachineSeconds = accumulators.reduce((sum, state) => sum + state.availableSeconds, 0);
  return {
    jobId: job.id,
    startSeconds: job.startSeconds,
    endSeconds: job.endSeconds,
    aggregateRatio: availableMachineSeconds / (job.entries.length * duration),
    systemCoverageRatio: coverage.availableSeconds / duration,
    availableMachineSeconds,
    coverageWindows: coverage.windows,
    launchers: job.entries.map((entry, index) => ({
      launcherId: entry.launcherId,
      availableSeconds: accumulators[index].availableSeconds,
      availableRatio: accumulators[index].availableSeconds / duration,
      windows: accumulators[index].windows,
      orbitUsageSeconds: orbitUsage[index],
    })),
    tickSeconds: SEARCH_TICK_SECONDS,
  };
}

function statusFor(
  config: SimulationConfig,
  system: SystemState,
  simulation: LaunchSimulation,
  launcherId: string,
): TickStatus {
  const launcher = config.launchers.find((item) => item.id === launcherId);
  if (!launcher) throw new Error(`Missing Ejector: ${launcherId}`);
  const state = simulation.stateFor(launcherId);
  const candidate = currentCandidate(config, system, launcher, state);
  return {
    available: Boolean(candidate?.available),
    orbitSlot: candidate?.available ? candidate.slot : 0,
  };
}

function accumulator(available: boolean, startSeconds: number): Accumulator {
  return { previous: available, windowStart: available ? startSeconds : null, availableSeconds: 0, windows: [] };
}

function transition(state: Accumulator, boundary: number, available: boolean): void {
  if (state.previous && state.windowStart !== null) {
    state.windows.push({ startSeconds: state.windowStart, endSeconds: boundary });
    state.availableSeconds += boundary - state.windowStart;
  }
  state.windowStart = available ? boundary : null;
  state.previous = available;
}

function finish(state: Accumulator, endSeconds: number): void {
  if (state.windowStart !== null) {
    state.windows.push({ startSeconds: state.windowStart, endSeconds });
    state.availableSeconds += endSeconds - state.windowStart;
  }
}
