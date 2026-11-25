import type { CalcJob, CalcReport, SimulationConfig } from "./types";

export type WorkerRequest =
  | { type: "start"; config: SimulationConfig; job: CalcJob }
  | { type: "cancel" };

export type WorkerResponse =
  | { type: "progress"; progress: number }
  | { type: "complete"; report: CalcReport }
  | { type: "error"; message: string };
