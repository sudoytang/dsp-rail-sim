import { create } from "zustand";
import { createDefaultConfig } from "../simulation/config";
import { parseConfig } from "../simulation/io";
import type {
  BodyParameters,
  CalcJob,
  CalcReport,
  DysonCloudOrbit,
  LauncherParameters,
  SimulationConfig,
  VisibilityState,
} from "../simulation/types";

export type Selection =
  | { type: "star"; id: "star" }
  | { type: "body" | "cloud" | "launcher"; id: string };

export type CalcRunStatus = "queued" | "running" | "completed" | "failed" | "outdated";

export interface CalcRunState {
  status: CalcRunStatus;
  progress: number;
  error?: string;
}

interface AppState {
  config: SimulationConfig;
  selection: Selection;
  currentTimeSeconds: number;
  playing: boolean;
  playbackSpeed: number;
  visibilities: Record<string, VisibilityState>;
  calcJobs: CalcJob[];
  calcRuns: Record<string, CalcRunState>;
  reports: Record<string, CalcReport>;
  error: string | null;
  setSelection: (selection: Selection) => void;
  setCurrentTime: (time: number) => void;
  setPlaying: (playing: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  setVisibilities: (visibilities: Record<string, VisibilityState>) => void;
  setReport: (jobId: string, report: CalcReport) => void;
  setCalcRun: (jobId: string, state: CalcRunState) => void;
  queueCalcJob: (jobId: string) => void;
  setError: (error: string | null) => void;
  replaceConfig: (config: SimulationConfig) => void;
  updateConfig: (recipe: (config: SimulationConfig) => void) => void;
  addBody: (body: BodyParameters) => void;
  addCloud: (cloud: DysonCloudOrbit) => void;
  addLauncher: (launcher: LauncherParameters) => void;
  addCalcJob: (job: CalcJob) => void;
  deleteCalcJob: (id: string) => void;
  deleteSelected: () => void;
}

const initialConfig = loadInitialConfig();
const initialCalcJobs = loadCalcJobs();

export const useAppStore = create<AppState>((set, get) => ({
  config: initialConfig,
  selection: initialConfig.launchers[0] ? { type: "launcher", id: initialConfig.launchers[0].id } : { type: "star", id: "star" },
  currentTimeSeconds: 0,
  playing: true,
  playbackSpeed: 30,
  visibilities: {},
  calcJobs: initialCalcJobs,
  calcRuns: Object.fromEntries(initialCalcJobs.map((job) => [job.id, { status: "outdated" as const, progress: 0 }])),
  reports: {},
  error: null,
  setSelection: (selection) => set({ selection }),
  setCurrentTime: (currentTimeSeconds) => set({ currentTimeSeconds }),
  setPlaying: (playing) => set({ playing }),
  setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),
  setVisibilities: (visibilities) => set({ visibilities }),
  setReport: (jobId, report) => set((state) => ({ reports: { ...state.reports, [jobId]: report } })),
  setCalcRun: (jobId, run) => set((state) => ({ calcRuns: { ...state.calcRuns, [jobId]: run } })),
  queueCalcJob: (jobId) => {
    const reports = { ...get().reports };
    delete reports[jobId];
    set((state) => ({
      reports,
      calcRuns: { ...state.calcRuns, [jobId]: { status: "queued", progress: 0 } },
    }));
  },
  setError: (error) => set({ error }),
  replaceConfig: (config) => {
    const calcJobs = sanitizeCalcJobs(get().calcJobs, config);
    set({
      config,
      selection: config.launchers[0] ? { type: "launcher", id: config.launchers[0].id } : { type: "star", id: "star" },
      calcJobs,
      calcRuns: markRunsOutdated(filterRuns(get().calcRuns, calcJobs)),
      reports: {},
      visibilities: {},
      error: null,
      currentTimeSeconds: 0,
    });
  },
  updateConfig: (recipe) => {
    const config = structuredClone(get().config);
    recipe(config);
    set({ config, calcRuns: markRunsOutdated(get().calcRuns), reports: {}, visibilities: {}, error: null });
  },
  addBody: (body) => {
    get().updateConfig((config) => { config.bodies.push(body); });
    set({ selection: { type: "body", id: body.id } });
  },
  addCloud: (cloud) => {
    get().updateConfig((config) => { config.clouds.push(cloud); });
    set({ selection: { type: "cloud", id: cloud.id } });
  },
  addLauncher: (launcher) => {
    get().updateConfig((config) => { config.launchers.push(launcher); });
    set({ selection: { type: "launcher", id: launcher.id } });
  },
  addCalcJob: (job) => set((state) => ({
    calcJobs: [...state.calcJobs, job],
    calcRuns: { ...state.calcRuns, [job.id]: { status: "queued", progress: 0 } },
  })),
  deleteCalcJob: (id) => {
    const reports = { ...get().reports };
    const calcRuns = { ...get().calcRuns };
    delete reports[id];
    delete calcRuns[id];
    set((state) => ({ calcJobs: state.calcJobs.filter((job) => job.id !== id), reports, calcRuns }));
  },
  deleteSelected: () => {
    const { selection } = get();
    if (selection.type === "star") return;
    get().updateConfig((draft) => {
      if (selection.type === "body") {
        const removed = new Set([selection.id]);
        for (const body of draft.bodies) if (body.parentId === selection.id) removed.add(body.id);
        draft.bodies = draft.bodies.filter((body) => !removed.has(body.id));
        draft.launchers = draft.launchers.filter((launcher) => !removed.has(launcher.bodyId));
      } else if (selection.type === "cloud") {
        const removedSlot = draft.clouds.find((cloud) => cloud.id === selection.id)?.slot;
        draft.clouds = draft.clouds.filter((cloud) => cloud.id !== selection.id);
        if (removedSlot !== undefined) {
          for (const launcher of draft.launchers) {
            if (launcher.targetOrbitSlot === removedSlot) launcher.targetOrbitSlot = 0;
          }
        }
      } else {
        draft.launchers = draft.launchers.filter((launcher) => launcher.id !== selection.id);
      }
    });
    const calcJobs = sanitizeCalcJobs(get().calcJobs, get().config);
    set({ selection: { type: "star", id: "star" }, calcJobs, calcRuns: filterRuns(get().calcRuns, calcJobs) });
  },
}));

function filterRuns(runs: Record<string, CalcRunState>, jobs: CalcJob[]): Record<string, CalcRunState> {
  const ids = new Set(jobs.map((job) => job.id));
  return Object.fromEntries(Object.entries(runs).filter(([id]) => ids.has(id)));
}

function markRunsOutdated(runs: Record<string, CalcRunState>): Record<string, CalcRunState> {
  return Object.fromEntries(Object.keys(runs).map((id) => [id, { status: "outdated" as const, progress: 0 }]));
}

function sanitizeCalcJobs(jobs: CalcJob[], config: SimulationConfig): CalcJob[] {
  const launcherIds = new Set(config.launchers.map((launcher) => launcher.id));
  return jobs.map((job) => ({
    ...job,
    entries: job.entries.filter((entry) => launcherIds.has(entry.launcherId)),
  }));
}

function loadInitialConfig(): SimulationConfig {
  try {
    const stored = localStorage.getItem("dsp-rail-sim-config");
    return stored ? parseConfig(stored) : createDefaultConfig();
  } catch {
    return createDefaultConfig();
  }
}

function loadCalcJobs(): CalcJob[] {
  try {
    const stored = localStorage.getItem("dsp-rail-sim-calc-jobs");
    const jobs = stored ? JSON.parse(stored) as CalcJob[] : [];
    return Array.isArray(jobs) ? jobs : [];
  } catch {
    return [];
  }
}
