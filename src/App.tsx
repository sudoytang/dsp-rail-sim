import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { Hierarchy } from "./components/Hierarchy";
import { SystemScene } from "./components/SystemScene";
import { TimeControls } from "./components/TimeControls";
import { RightPanel } from "./components/RightPanel";
import { createDefaultConfig } from "./simulation/config";
import { downloadConfig, parseConfig } from "./simulation/io";
import { useAppStore } from "./state/store";

export default function App() {
  const config = useAppStore((state) => state.config);
  const calcJobs = useAppStore((state) => state.calcJobs);
  const error = useAppStore((state) => state.error);
  const setError = useAppStore((state) => state.setError);
  const replaceConfig = useAppStore((state) => state.replaceConfig);
  const fileRef = useRef<HTMLInputElement>(null);
  const [exportUnit, setExportUnit] = useState<"AU" | "ly">("AU");
  const [resetOpen, setResetOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(loadSidebarWidth);
  const resizeStart = useRef<{ x: number; width: number } | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem("dsp-rail-sim-sidebar-width", String(sidebarWidth));
    } catch {
      return;
    }
  }, [sidebarWidth]);

  const startResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeStart.current = { x: event.clientX, width: sidebarWidth };
  };

  const resizeSidebar = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!resizeStart.current) return;
    const maximum = Math.max(220, Math.min(460, window.innerWidth - 540));
    setSidebarWidth(Math.max(190, Math.min(maximum, resizeStart.current.width + event.clientX - resizeStart.current.x)));
  };

  const finishResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!resizeStart.current) return;
    resizeStart.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        localStorage.setItem("dsp-rail-sim-config", JSON.stringify(config));
      } catch {
        return;
      }
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [config]);

  useEffect(() => {
    try {
      localStorage.setItem("dsp-rail-sim-calc-jobs", JSON.stringify(calcJobs));
    } catch {
      return;
    }
  }, [calcJobs]);

  const importFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      replaceConfig(parseConfig(await file.text()));
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : String(importError));
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand"><div className="brand-mark"><span /><i /></div><div><strong>DYSON SPHERE PROGRAM</strong><h1>EM-Rail Ejector Simulator</h1></div></div>
        <div className="header-center"><span>1 AU = 40,000 m</span><i /><span>1 ly = 60 AU</span></div>
        <div className="header-actions">
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(event) => void importFile(event.target.files?.[0])} />
          <select className="export-unit" value={exportUnit} onChange={(event) => setExportUnit(event.target.value as "AU" | "ly")} aria-label="Export distance unit"><option value="AU">AU</option><option value="ly">ly</option></select>
          <button className="button text-button" onClick={() => setResetOpen(true)}>Reset</button>
        </div>
      </header>
      {error && <div className="error-banner" role="alert"><span>{error}</span><button onClick={() => setError(null)} aria-label="Dismiss error">×</button></div>}
      <main className="workspace" style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
        <Hierarchy onImport={() => fileRef.current?.click()} onExport={() => downloadConfig(config, exportUnit)} />
        <div className="sidebar-resizer" role="separator" aria-label="Resize object panel" aria-orientation="vertical" aria-valuemin={190} aria-valuemax={460} aria-valuenow={sidebarWidth} tabIndex={0} style={{ left: sidebarWidth }} onPointerDown={startResize} onPointerMove={resizeSidebar} onPointerUp={finishResize} onPointerCancel={finishResize} onKeyDown={(event) => {
          if (event.key === "ArrowLeft") setSidebarWidth((width) => Math.max(190, width - 10));
          if (event.key === "ArrowRight") setSidebarWidth((width) => Math.min(460, width + 10));
        }} />
        <section className="center-panel"><SystemScene /><TimeControls /></section>
        <RightPanel />
      </main>
      {resetOpen && <ConfirmDialog title="Reset star system" eyebrow="SYSTEM" message="Reset the current star system to its default configuration?" detail="Saved calculations will be kept but marked outdated." confirmLabel="Reset" onCancel={() => setResetOpen(false)} onConfirm={() => { replaceConfig(createDefaultConfig()); setResetOpen(false); }} />}
    </div>
  );
}

function loadSidebarWidth(): number {
  const saved = Number(localStorage.getItem("dsp-rail-sim-sidebar-width"));
  return Number.isFinite(saved) && saved >= 190 && saved <= 460 ? saved : 240;
}
