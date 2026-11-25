import { useEffect, useRef, useState } from "react";
import { bodyRadiusM, rockyBodies, starRadiusM } from "../simulation/config";
import { useAppStore } from "../state/store";
import { DistanceField, NumberField } from "./fields";
import { PencilIcon } from "./icons";

export function Inspector() {
  const config = useAppStore((state) => state.config);
  const selection = useAppStore((state) => state.selection);
  const updateConfig = useAppStore((state) => state.updateConfig);
  const deleteSelected = useAppStore((state) => state.deleteSelected);
  const body = selection.type === "body" ? config.bodies.find((item) => item.id === selection.id) : null;
  const cloud = selection.type === "cloud" ? config.clouds.find((item) => item.id === selection.id) : null;
  const launcher = selection.type === "launcher" ? config.launchers.find((item) => item.id === selection.id) : null;

  return (
    <section className="inspector-section">
      {selection.type === "star" && (
        <>
          <SectionTitle eyebrow="STAR" title={config.star.name} onRename={(name) => updateConfig((draft) => { draft.star.name = name; })} />
          <NumberField label="Radius coefficient" value={config.star.radiusScale} min={0.01} step={0.1} onChange={(value) => updateConfig((draft) => { draft.star.radiusScale = value; })} />
          <NumberField label="Actual radius" value={starRadiusM(config)} suffix="m" disabled onChange={() => undefined} />
        </>
      )}

      {body && (
        <>
          <SectionTitle eyebrow={body.parentId ? "SATELLITE" : body.kind === "rocky" ? "TERRESTRIAL PLANET" : "GIANT PLANET"} title={body.name} onRename={(name) => updateConfig((draft) => { const item = draft.bodies.find((candidate) => candidate.id === body.id); if (item) item.name = name; })} />
          <div className="field-pair">
            <NumberField label="Fixed radius" value={bodyRadiusM(body)} suffix="m" disabled onChange={() => undefined} />
            <label className="field"><span>Parent body</span><input value={body.parentId ? config.bodies.find((item) => item.id === body.parentId)?.name ?? "—" : config.star.name} disabled /></label>
          </div>
          <DistanceField label="Orbit radius" valueM={body.orbit.radiusM} onChange={(value) => updateConfig((draft) => { const item = draft.bodies.find((candidate) => candidate.id === body.id); if (item) item.orbit.radiusM = value; })} />
          <div className="field-pair">
            <NumberField label="Inclination" value={body.orbit.inclinationDeg} suffix="°" step={0.1} onChange={(value) => updateConfig((draft) => { const item = draft.bodies.find((candidate) => candidate.id === body.id); if (item) item.orbit.inclinationDeg = value; })} />
            <NumberField label="Longitude of AN" value={body.orbit.ascendingNodeDeg} suffix="°" step={0.1} onChange={(value) => updateConfig((draft) => { const item = draft.bodies.find((candidate) => candidate.id === body.id); if (item) item.orbit.ascendingNodeDeg = value; })} />
          </div>
          <div className="field-pair">
            <NumberField label="Orbital period" value={body.orbit.periodSeconds} suffix="s" min={0.001} step={10} onChange={(value) => updateConfig((draft) => { const item = draft.bodies.find((candidate) => candidate.id === body.id); if (item) item.orbit.periodSeconds = value; })} />
            <NumberField label="Initial orbit phase" value={body.orbit.initialPhaseDeg} suffix="°" step={0.1} onChange={(value) => updateConfig((draft) => { const item = draft.bodies.find((candidate) => candidate.id === body.id); if (item) item.orbit.initialPhaseDeg = value; })} />
          </div>
          <div className="field-pair">
            <NumberField label="Axial tilt" value={body.axialTiltDeg} suffix="°" step={0.1} onChange={(value) => updateConfig((draft) => { const item = draft.bodies.find((candidate) => candidate.id === body.id); if (item) item.axialTiltDeg = value; })} />
            <NumberField label="Rotation period" value={body.rotationPeriodSeconds} suffix="s" min={0.001} step={10} onChange={(value) => updateConfig((draft) => { const item = draft.bodies.find((candidate) => candidate.id === body.id); if (item) item.rotationPeriodSeconds = value; })} />
          </div>
          <p className="field-note">Tilt is measured from the body's orbital normal. Initial rotation phase is 0°.</p>
          <button className="button danger" onClick={deleteSelected}>Delete {body.parentId ? "satellite" : "body"}</button>
        </>
      )}

      {cloud && (
        <>
          <SectionTitle eyebrow={`DYSON SWARM ORBIT · ${cloud.slot}`} title={cloud.name} onRename={(name) => updateConfig((draft) => { const item = draft.clouds.find((candidate) => candidate.id === cloud.id); if (item) item.name = name; })} />
          <DistanceField label="Orbit radius" valueM={cloud.radiusM} onChange={(value) => updateConfig((draft) => { const item = draft.clouds.find((candidate) => candidate.id === cloud.id); if (item) item.radiusM = value; })} />
          <div className="field-pair">
            <NumberField label="Inclination" value={cloud.inclinationDeg} suffix="°" step={0.1} onChange={(value) => updateConfig((draft) => { const item = draft.clouds.find((candidate) => candidate.id === cloud.id); if (item) item.inclinationDeg = value; })} />
            <NumberField label="Longitude of AN" value={cloud.ascendingNodeDeg} suffix="°" step={0.1} onChange={(value) => updateConfig((draft) => { const item = draft.clouds.find((candidate) => candidate.id === cloud.id); if (item) item.ascendingNodeDeg = value; })} />
          </div>
          <label className="field"><span>Display color</span><input className="color-input" type="color" value={cloud.color} onChange={(event) => updateConfig((draft) => { const item = draft.clouds.find((candidate) => candidate.id === cloud.id); if (item) item.color = event.target.value; })} /></label>
          <p className="field-note">Dyson Swarm orbits are circular and centered on the star.</p>
          <button className="button danger" onClick={deleteSelected}>Delete Dyson Swarm orbit</button>
        </>
      )}

      {launcher && (
        <>
          <SectionTitle eyebrow="EM-RAIL EJECTOR" title={launcher.name} onRename={(name) => updateConfig((draft) => { const item = draft.launchers.find((candidate) => candidate.id === launcher.id); if (item) item.name = name; })} />
          <label className="field"><span>Terrestrial body</span><select value={launcher.bodyId} onChange={(event) => updateConfig((draft) => { const item = draft.launchers.find((candidate) => candidate.id === launcher.id); if (item) item.bodyId = event.target.value; })}>{rockyBodies(config).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <div className="field-pair">
            <NumberField label="Latitude" value={launcher.latitudeDeg} min={-90} max={90} step={0.1} suffix="°" onChange={(value) => updateConfig((draft) => { const item = draft.launchers.find((candidate) => candidate.id === launcher.id); if (item) item.latitudeDeg = value; })} />
            <NumberField label="Longitude" value={launcher.longitudeDeg} step={0.1} suffix="°" onChange={(value) => updateConfig((draft) => { const item = draft.launchers.find((candidate) => candidate.id === launcher.id); if (item) item.longitudeDeg = value; })} />
          </div>
          <label className="toggle-row"><input type="checkbox" checked={launcher.autoOrbit} onChange={(event) => updateConfig((draft) => { const item = draft.launchers.find((candidate) => candidate.id === launcher.id); if (item) item.autoOrbit = event.target.checked; })} /><span>Auto Orbit</span></label>
          <div className="target-heading"><span>Target orbit</span><small>{launcher.targetOrbitSlot === 0 ? "None" : `Slot ${launcher.targetOrbitSlot}`}</small></div>
          <div className="orbit-matrix">{Array.from({ length: 20 }, (_, index) => index + 1).map((slot) => {
            const cloud = config.clouds.find((item) => item.slot === slot);
            return <button key={slot} className={`orbit-slot ${launcher.targetOrbitSlot === slot ? "selected" : ""}`} disabled={!cloud} title={cloud ? `Orbit ${slot} · ${cloud.name}` : `Orbit ${slot} · not configured`} onClick={() => updateConfig((draft) => { const item = draft.launchers.find((candidate) => candidate.id === launcher.id); if (item) item.targetOrbitSlot = slot; })}>{slot}</button>;
          })}</div>
          <button className={`orbit-none ${launcher.targetOrbitSlot === 0 ? "selected" : ""}`} onClick={() => updateConfig((draft) => { const item = draft.launchers.find((candidate) => candidate.id === launcher.id); if (item) item.targetOrbitSlot = 0; })}>None (0)</button>
          <button className="button secondary apply-body-button" onClick={() => updateConfig((draft) => { for (const item of draft.launchers) if (item.bodyId === launcher.bodyId) { item.targetOrbitSlot = launcher.targetOrbitSlot; item.autoOrbit = launcher.autoOrbit; } })}>Apply target to all Ejectors on {config.bodies.find((body) => body.id === launcher.bodyId)?.name ?? "this body"}</button>
          <div className="rule-card"><span>Launch envelope</span><strong>5°–60°</strong><small>Target and Auto Orbit are independent. Auto search uses the game's 0.5 s tick and orbit slot order.</small></div>
          <button className="button danger" onClick={deleteSelected}>Delete Ejector</button>
        </>
      )}
    </section>
  );
}

function SectionTitle({ eyebrow, title, onRename }: { eyebrow: string; title: string; onRename: (name: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const cancelRef = useRef(false);

  useEffect(() => {
    setEditing(false);
    setDraft(title);
    cancelRef.current = false;
  }, [title]);

  const commit = () => {
    if (cancelRef.current) {
      cancelRef.current = false;
      return;
    }
    const next = draft.trim();
    if (next && next !== title) onRename(next);
    else setDraft(title);
    setEditing(false);
  };

  return (
    <div className="section-title">
      <span className="eyebrow">{eyebrow}</span>
      <div className="title-row">
        {editing ? <input className="title-edit" aria-label="Object name" autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} onFocus={(event) => event.currentTarget.select()} onBlur={commit} onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") {
            cancelRef.current = true;
            setDraft(title);
            setEditing(false);
          }
        }} /> : <><h2>{title}</h2><button className="rename-button" aria-label={`Rename ${title}`} title="Rename" onClick={() => { setDraft(title); setEditing(true); }}><PencilIcon /></button></>}
      </div>
    </div>
  );
}
