import { useEffect, useRef, useState } from "react";
import { formatDuration, formatPercent } from "../format";
import type { CalcJob, CalcReport } from "../simulation/types";
import type { WorkerResponse } from "../simulation/workerMessages";
import { useAppStore } from "../state/store";
import type { CalcRunState } from "../state/store";
import { CalcDialog } from "./CalcDialog";
import { ConfirmDialog } from "./ConfirmDialog";

const STATUS_LABELS: Record<CalcRunState["status"], string> = {
  queued: "QUEUED",
  running: "RUNNING",
  completed: "COMPLETED",
  failed: "FAILED",
  outdated: "OUTDATED",
};

export function CalcPanel() {
  const config = useAppStore((state) => state.config);
  const jobs = useAppStore((state) => state.calcJobs);
  const runs = useAppStore((state) => state.calcRuns);
  const reports = useAppStore((state) => state.reports);
  const setCalcRun = useAppStore((state) => state.setCalcRun);
  const queueCalcJob = useAppStore((state) => state.queueCalcJob);
  const addCalcJob = useAppStore((state) => state.addCalcJob);
  const deleteCalcJob = useAppStore((state) => state.deleteCalcJob);
  const setReport = useAppStore((state) => state.setReport);
  const setError = useAppStore((state) => state.setError);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<CalcJob | null>(null);
  const [workerTick, setWorkerTick] = useState(0);
  const activeId = useRef<string | null>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    if (activeId.current) return;
    const queued = jobs.find((job) => useAppStore.getState().calcRuns[job.id]?.status === "queued");
    if (!queued) return;
    const worker = new Worker(new URL("../simulation/windows.worker.ts", import.meta.url), { type: "module" });
    workerRef.current = worker;
    activeId.current = queued.id;
    setCalcRun(queued.id, { status: "running", progress: 0 });
    worker.postMessage({ type: "start", config, job: queued });
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data;
      if (message.type === "progress") setCalcRun(queued.id, { status: "running", progress: message.progress });
      if (message.type === "complete") {
        setReport(message.report.jobId, message.report);
        setCalcRun(queued.id, { status: "completed", progress: 1 });
        worker.terminate();
        workerRef.current = null;
        activeId.current = null;
        setWorkerTick((tick) => tick + 1);
      }
      if (message.type === "error") {
        setCalcRun(queued.id, { status: "failed", progress: 0, error: message.message });
        setError(message.message);
        worker.terminate();
        workerRef.current = null;
        activeId.current = null;
        setWorkerTick((tick) => tick + 1);
      }
    };
    worker.onerror = (event) => {
      setCalcRun(queued.id, { status: "failed", progress: 0, error: event.message });
      setError(event.message);
      worker.terminate();
      workerRef.current = null;
      activeId.current = null;
      setWorkerTick((tick) => tick + 1);
    };
  }, [config, jobs, workerTick, setCalcRun, setReport, setError]);

  useEffect(() => {
    const id = activeId.current;
    if (!id) return;
    workerRef.current?.terminate();
    workerRef.current = null;
    activeId.current = null;
    setCalcRun(id, { status: "outdated", progress: 0 });
    setWorkerTick((tick) => tick + 1);
  }, [config, setCalcRun]);

  useEffect(() => () => {
    workerRef.current?.terminate();
    workerRef.current = null;
    activeId.current = null;
  }, []);

  const runAgain = (id: string) => {
    queueCalcJob(id);
    setWorkerTick((tick) => tick + 1);
  };

  const removeJob = (job: CalcJob) => {
    if (activeId.current === job.id) {
      workerRef.current?.terminate();
      workerRef.current = null;
      activeId.current = null;
      setWorkerTick((tick) => tick + 1);
    }
    deleteCalcJob(job.id);
    setPendingDelete(null);
  };

  return (
    <section className="calc-section">
      <div className="section-title window-title"><div><span className="eyebrow">BATCH ANALYSIS</span><h2>Calculations</h2></div><button className="button primary small-button" onClick={() => setDialogOpen(true)}>Add calculation</button></div>
      {jobs.length === 0 ? <div className="empty-calc"><p>No calculation runs yet. Add one to compare Ejectors over a shared time interval.</p><button className="button primary" onClick={() => setDialogOpen(true)}>Create first calculation</button></div> : (
        <div className="calc-pipeline">
          {[...jobs].reverse().map((job) => {
            const run = runs[job.id] ?? { status: "outdated" as const, progress: 0 };
            const report = reports[job.id];
            const open = expanded.has(job.id);
            return <article className={`calc-run status-${run.status}`} key={job.id}>
              <div className="calc-run-header">
                <button className="calc-run-toggle" aria-expanded={open} onClick={() => setExpanded((current) => { const next = new Set(current); if (next.has(job.id)) next.delete(job.id); else next.add(job.id); return next; })}>
                  <span className="run-status-icon" />
                  <span className="run-heading"><strong>{job.name}</strong><small>{STATUS_LABELS[run.status]} · {job.entries.length} Ejectors</small></span>
                  {run.status === "completed" && report && <span className="run-summary">{formatPercent(report.aggregateRatio)}</span>}
                  {run.status === "running" && <span className="run-progress-value">{Math.round(run.progress * 100)}%</span>}
                  <span className="run-chevron">{open ? "▾" : "▸"}</span>
                </button>
              </div>
              {(run.status === "running" || run.status === "queued") && <div className="run-progress"><span style={{ width: `${Math.max(run.progress * 100, run.status === "queued" ? 2 : 0)}%` }} /></div>}
              {(run.status === "failed" || run.status === "outdated") && <p className="run-message">{run.status === "failed" ? run.error : "The system or run definition changed. Run again for current results."}</p>}
              {open && <div className="calc-run-detail">
                {report ? <CalcResults job={job} report={report} /> : <p className="run-detail-empty">No result is available for this run.</p>}
                <div className="run-detail-actions"><span>Interval {formatDuration(job.startSeconds)} → {formatDuration(job.endSeconds)} · 0.5 s tick</span><button className="button secondary" onClick={() => runAgain(job.id)} disabled={run.status === "running" || run.status === "queued"}>Run again</button><button className="button danger-outline" onClick={() => setPendingDelete(job)}>Delete</button></div>
              </div>}
            </article>;
          })}
        </div>
      )}
      {dialogOpen && <CalcDialog onClose={() => setDialogOpen(false)} onApply={(job) => addCalcJob(job)} />}
      {pendingDelete && <ConfirmDialog title="Delete calculation" eyebrow="CALCULATION" message={<>Delete <strong>{pendingDelete.name}</strong>?</>} detail="Its result and run history will also be removed." confirmLabel="Delete" danger onCancel={() => setPendingDelete(null)} onConfirm={() => removeJob(pendingDelete)} />}
    </section>
  );
}

function CalcResults({ job, report }: { job: CalcJob; report: CalcReport }) {
  const config = useAppStore((state) => state.config);
  const duration = report.endSeconds - report.startSeconds;
  return (
    <div className="report calc-report">
      <div className="ratio-card"><span>AGGREGATE MACHINE AVAILABILITY</span><strong>{formatPercent(report.aggregateRatio)}</strong></div>
      <div className="coverage-card"><span>System coverage</span><strong>{formatPercent(report.systemCoverageRatio)}</strong><small>At least one selected Ejector can launch</small></div>
      <div className="window-timeline" aria-label="System coverage timeline">{report.coverageWindows.map((window, index) => <span key={index} className="window-segment" style={{ left: `${((window.startSeconds - report.startSeconds) / duration) * 100}%`, width: `${Math.max(((window.endSeconds - window.startSeconds) / duration) * 100, 0.25)}%` }} />)}</div>
      <div className="timeline-labels"><span>{formatDuration(report.startSeconds)}</span><span>{formatDuration(report.endSeconds)}</span></div>
      <div className="calc-results-heading">Individual availability</div>
      <div className="individual-results">{report.launchers.map((result) => {
        const launcher = config.launchers.find((item) => item.id === result.launcherId);
        const usedOrbits = Object.entries(result.orbitUsageSeconds)
          .filter(([, seconds]) => seconds > 0)
          .sort(([, first], [, second]) => second - first)
          .slice(0, 3)
          .map(([slot, seconds]) => `O${slot} ${formatDuration(seconds)}`)
          .join(" · ");
        return <div className="individual-result" key={result.launcherId}><div><strong>{launcher?.name ?? "Deleted Ejector"}</strong><span>{formatPercent(result.availableRatio)}</span></div><small>{formatDuration(result.availableSeconds)} · {result.windows.length} windows{usedOrbits ? ` · ${usedOrbits}` : ""}</small><div className="individual-bar"><span style={{ width: `${result.availableRatio * 100}%` }} /></div></div>;
      })}</div>
      <p className="field-note">{job.name} · Numerical result · {report.tickSeconds}s simulation tick</p>
    </div>
  );
}
