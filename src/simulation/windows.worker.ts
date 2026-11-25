import { scanCalcJob } from "./windows";
import type { WorkerRequest, WorkerResponse } from "./workerMessages";

const workerScope = self as unknown as DedicatedWorkerGlobalScope;
let activeScan = 0;

workerScope.onmessage = (event: MessageEvent<WorkerRequest>) => {
  if (event.data.type === "cancel") {
    activeScan += 1;
    return;
  }
  const scanId = ++activeScan;
  void runScan(scanId, event.data);
};

async function runScan(scanId: number, request: Extract<WorkerRequest, { type: "start" }>): Promise<void> {
  try {
    const scanner = scanCalcJob(request.config, request.job);
    while (scanId === activeScan) {
      let result = scanner.next();
      for (let count = 0; count < 100 && !result.done; count += 1) result = scanner.next();
      if (result.done) {
        post({ type: "complete", report: result.value });
        return;
      }
      post({ type: "progress", progress: result.value });
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  } catch (error) {
    post({ type: "error", message: error instanceof Error ? error.message : String(error) });
  }
}

function post(message: WorkerResponse): void {
  workerScope.postMessage(message);
}
