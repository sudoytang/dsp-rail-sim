import { useState } from "react";
import type { FormEvent } from "react";
import type { CalcJob } from "../simulation/types";
import { useAppStore } from "../state/store";
import { NumberField } from "./fields";
import { Modal } from "./Modal";

export function CalcDialog({ onClose, onApply }: { onClose: () => void; onApply: (job: CalcJob) => void }) {
  const config = useAppStore((state) => state.config);
  const [name, setName] = useState(`Calculation ${useAppStore.getState().calcJobs.length + 1}`);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(3600);
  const [entries, setEntries] = useState<string[]>(config.launchers.map((launcher) => launcher.id));
  const [error, setError] = useState<string | null>(null);

  const apply = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return setError("Enter a calculation name.");
    if (entries.length === 0) return setError("Select at least one Ejector.");
    if (!(end > start)) return setError("Check the time interval.");
    onApply({ id: uniqueId("calc"), name: name.trim(), startSeconds: start, endSeconds: end, entries: entries.map((launcherId) => ({ launcherId })) });
    onClose();
  };

  return (
    <Modal title="Add calculation" eyebrow="CALCULATION" onClose={onClose} wide>
      <form onSubmit={apply}>
        <label className="field"><span>Calculation name</span><input autoFocus value={name} onChange={(event) => setName(event.target.value)} /></label>
        <div className="calc-entries-heading"><span>Ejectors</span><small>{entries.length} selected</small></div>
        <p className="dialog-note calc-dialog-note">Target orbit and Auto Orbit settings are read from each Ejector.</p>
        <div className="calc-entries dialog-calc-entries">
          {config.launchers.map((launcher) => {
            const included = entries.includes(launcher.id);
            const host = config.bodies.find((body) => body.id === launcher.bodyId);
            const target = launcher.targetOrbitSlot === 0 ? "No target" : `Orbit ${launcher.targetOrbitSlot}`;
            return <div className={`calc-entry ${included ? "included" : ""}`} key={launcher.id}>
              <label className="calc-entry-check"><input type="checkbox" checked={included} onChange={() => setEntries((current) => included ? current.filter((id) => id !== launcher.id) : [...current, launcher.id])} /><span><strong>{launcher.name}</strong><small>{host?.name ?? "Missing body"} · {target}{launcher.autoOrbit ? " · Auto" : ""}</small></span></label>
            </div>;
          })}
          {config.launchers.length === 0 && <p className="empty-state">Add an Ejector in the system editor first.</p>}
        </div>
        <div className="field-pair"><NumberField label="Interval start" value={start} suffix="s" step={10} onChange={setStart} /><NumberField label="Interval end" value={end} suffix="s" step={10} onChange={setEnd} /></div>
        <p className="dialog-note">Search and window resolution is fixed to the 0.5 s simulation tick.</p>
        {error && <p className="dialog-error" role="alert">{error}</p>}
        <div className="dialog-actions"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button type="submit" className="button primary" disabled={entries.length === 0}>Apply</button></div>
      </form>
    </Modal>
  );
}

function uniqueId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
