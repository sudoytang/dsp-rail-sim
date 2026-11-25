import { useState } from "react";
import type { FormEvent } from "react";
import { METERS_PER_AU } from "../simulation/constants";
import type { BodyKind, BodyParameters } from "../simulation/types";
import { useAppStore } from "../state/store";
import { DistanceField, NumberField } from "./fields";
import { Modal } from "./Modal";
import { ConfirmDialog } from "./ConfirmDialog";

type NewObjectKind = BodyKind | "cloud";

export function AddObjectDialog({ parent, initialKind = "rocky", onClose }: { parent: BodyParameters | null; initialKind?: NewObjectKind; onClose: () => void }) {
  const [kind, setKind] = useState<NewObjectKind>(parent ? "rocky" : initialKind);
  return (
    <Modal title={parent ? `Add satellite to ${parent.name}` : initialKind === "cloud" ? "Add Dyson Swarm Orbit" : "Add system object"} onClose={onClose}>
      {!parent && initialKind !== "cloud" && (
        <label className="field"><span>Object type</span><select value={kind} onChange={(event) => setKind(event.target.value as NewObjectKind)}><option value="rocky">Terrestrial planet</option><option value="giant">Giant planet</option><option value="cloud">Dyson Swarm orbit</option></select></label>
      )}
      {parent && <p className="dialog-description">Create a satellite in a circular orbit around {parent.name}.</p>}
      <ObjectParametersForm key={`${parent?.id ?? "star"}-${kind}`} kind={kind} parent={parent} onClose={onClose} />
    </Modal>
  );
}

export function AddLauncherDialog({ body, onClose }: { body: BodyParameters; onClose: () => void }) {
  const config = useAppStore((state) => state.config);
  const addLauncher = useAppStore((state) => state.addLauncher);
  const [name, setName] = useState(`EM-Rail Ejector ${config.launchers.length + 1}`);
  const [latitude, setLatitude] = useState(0);
  const [longitude, setLongitude] = useState(0);
  const [target, setTarget] = useState(0);
  const [autoOrbit, setAutoOrbit] = useState(false);

  const apply = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    addLauncher({ id: uniqueId("launcher"), name: name.trim(), bodyId: body.id, latitudeDeg: latitude, longitudeDeg: longitude, targetOrbitSlot: target, autoOrbit });
    onClose();
  };

  return (
    <Modal title={`Add Ejector to ${body.name}`} onClose={onClose}>
      <form onSubmit={apply}>
        <label className="field"><span>Name</span><input autoFocus value={name} onChange={(event) => setName(event.target.value)} /></label>
        <div className="field-pair"><NumberField label="Latitude" value={latitude} min={-90} max={90} step={0.1} suffix="°" onChange={setLatitude} /><NumberField label="Longitude" value={longitude} step={0.1} suffix="°" onChange={setLongitude} /></div>
        <label className="field"><span>Target orbit</span><select value={target} onChange={(event) => setTarget(Number(event.target.value))}><option value={0}>None (0)</option>{config.clouds.map((cloud) => <option key={cloud.id} value={cloud.slot}>Orbit {cloud.slot} · {cloud.name}</option>)}</select></label>
        <label className="toggle-row"><input type="checkbox" checked={autoOrbit} onChange={(event) => setAutoOrbit(event.target.checked)} /><span>Auto Orbit</span></label>
        <div className="dialog-actions"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button type="submit" className="button primary">Apply</button></div>
      </form>
    </Modal>
  );
}

function ObjectParametersForm({ kind, parent, onClose }: { kind: NewObjectKind; parent: BodyParameters | null; onClose: () => void }) {
  const addBody = useAppStore((state) => state.addBody);
  const addCloud = useAppStore((state) => state.addCloud);
  const [name, setName] = useState(parent ? "New satellite" : kind === "cloud" ? "New Dyson Swarm" : kind === "giant" ? "New giant planet" : "New terrestrial planet");
  const [radiusM, setRadiusM] = useState(parent ? 10_000 : kind === "cloud" ? 1.5 * METERS_PER_AU : 2.5 * METERS_PER_AU);
  const [inclination, setInclination] = useState(0);
  const [node, setNode] = useState(0);
  const [period, setPeriod] = useState(parent ? 1200 : 7200);
  const [phase, setPhase] = useState(0);
  const [tilt, setTilt] = useState(0);
  const [rotation, setRotation] = useState(600);
  const [color, setColor] = useState("#60a5fa");
  const [error, setError] = useState<string | null>(null);
  const nextSlot = nextAvailableSlot(useAppStore.getState().config.clouds.map((cloud) => cloud.slot));

  const apply = (event: FormEvent) => {
    event.preventDefault();
    const values = [radiusM, inclination, node, period, phase, tilt, rotation];
    if (!name.trim() || values.some((value) => !Number.isFinite(value)) || radiusM <= 0) {
      setError("Enter a name and a positive orbit radius.");
      return;
    }
    if (kind !== "cloud" && (period <= 0 || rotation <= 0)) {
      setError("Orbital and rotation periods must be positive.");
      return;
    }
    const id = uniqueId(parent ? "moon" : kind);
    if (kind === "cloud") {
      if (nextSlot === 0) {
        setError("All 20 Dyson Swarm orbit slots are in use.");
        return;
      }
      addCloud({ id, slot: nextSlot, name: name.trim(), radiusM, inclinationDeg: inclination, ascendingNodeDeg: node, color });
    } else {
      addBody({
        id,
        kind: parent ? "rocky" : kind,
        name: name.trim(),
        parentId: parent?.id ?? null,
        orbit: { radiusM, inclinationDeg: inclination, ascendingNodeDeg: node, periodSeconds: period, initialPhaseDeg: phase },
        axialTiltDeg: tilt,
        rotationPeriodSeconds: rotation,
      });
    }
    onClose();
  };

  return (
    <form onSubmit={apply}>
      <label className="field"><span>Name</span><input autoFocus value={name} onChange={(event) => setName(event.target.value)} /></label>
      <DistanceField label="Orbit radius" valueM={radiusM} onChange={setRadiusM} />
      <div className="field-pair">
        <NumberField label="Inclination" value={inclination} suffix="°" step={0.1} onChange={setInclination} />
        <NumberField label="Longitude of AN" value={node} suffix="°" step={0.1} onChange={setNode} />
      </div>
      {kind !== "cloud" && <div className="field-pair"><NumberField label="Orbital period" value={period} suffix="s" min={0.001} step={0.001} onChange={setPeriod} /><NumberField label="Initial orbit phase" value={phase} suffix="°" step={0.1} onChange={setPhase} /></div>}
      {kind !== "cloud" && <div className="field-pair"><NumberField label="Axial tilt" value={tilt} suffix="°" step={0.1} onChange={setTilt} /><NumberField label="Rotation period" value={rotation} suffix="s" min={0.001} step={0.001} onChange={setRotation} /></div>}
      {kind === "cloud" && <><label className="field"><span>Display color</span><input className="color-input" type="color" value={color} onChange={(event) => setColor(event.target.value)} /></label><p className="dialog-note">Assigns Dyson Swarm orbit {nextSlot || "—"} of 20.</p></>}
      {kind !== "cloud" && <p className="dialog-note">Fixed body radius: {kind === "giant" && !parent ? "800 m" : "200 m"}. Initial rotation phase: 0°.</p>}
      {error && <p className="dialog-error" role="alert">{error}</p>}
      <div className="dialog-actions"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button type="submit" className="button primary">Apply</button></div>
    </form>
  );
}

export function ConfirmDeleteDialog({ name, detail, onCancel, onConfirm }: { name: string; detail?: string; onCancel: () => void; onConfirm: () => void }) {
  return <ConfirmDialog title="Delete object" message={<>Delete <strong>{name}</strong>?</>} detail={detail} confirmLabel="Delete" danger onCancel={onCancel} onConfirm={onConfirm} />;
}

function nextAvailableSlot(usedSlots: number[]): number {
  const used = new Set(usedSlots);
  for (let slot = 1; slot <= 20; slot += 1) if (!used.has(slot)) return slot;
  return 0;
}

function uniqueId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
