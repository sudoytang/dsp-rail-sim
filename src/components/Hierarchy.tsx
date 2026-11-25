import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { BodyParameters, LauncherParameters } from "../simulation/types";
import { useAppStore } from "../state/store";
import type { Selection } from "../state/store";
import { AddCelestialIcon, LauncherIcon, TrashIcon } from "./icons";
import { AddLauncherDialog, AddObjectDialog, ConfirmDeleteDialog } from "./ObjectDialogs";

interface DeleteTarget {
  selection: Selection;
  name: string;
  detail?: string;
}

export function Hierarchy({ onImport, onExport }: { onImport: () => void; onExport: () => void }) {
  const config = useAppStore((state) => state.config);
  const selection = useAppStore((state) => state.selection);
  const setSelection = useAppStore((state) => state.setSelection);
  const deleteSelected = useAppStore((state) => state.deleteSelected);
  const [editing, setEditing] = useState(false);
  const [addDialog, setAddDialog] = useState<{ parent: BodyParameters | null; initialKind?: "rocky" | "giant" | "cloud" } | null>(null);
  const [launcherParent, setLauncherParent] = useState<BodyParameters | null>(null);
  const [deleting, setDeleting] = useState<DeleteTarget | null>(null);
  const roots = config.bodies.filter((body) => body.parentId === null);
  const cloudsBySlot = new Map(config.clouds.map((cloud) => [cloud.slot, cloud]));
  const selected = (candidate: Selection) => selection.type === candidate.type && selection.id === candidate.id;

  const launcherGroup = (body: BodyParameters) => {
    const launchers = config.launchers.filter((launcher) => launcher.bodyId === body.id);
    if (launchers.length === 0) return null;
    return (
      <LauncherGroup
        bodyName={body.name}
        launchers={launchers}
        selectedLauncherId={selection.type === "launcher" ? selection.id : null}
        editing={editing}
        onSelect={(launcher) => setSelection({ type: "launcher", id: launcher.id })}
        onDelete={(launcher) => setDeleting({ selection: { type: "launcher", id: launcher.id }, name: launcher.name })}
      />
    );
  };

  const bodyActions = (body: BodyParameters) => (
    <>
      <IconAction label={body.kind === "giant" ? `Add satellite to ${body.name}` : `Add Ejector to ${body.name}`} onClick={() => body.kind === "giant" ? setAddDialog({ parent: body }) : setLauncherParent(body)}>{body.kind === "giant" ? <AddCelestialIcon /> : <LauncherIcon withPlus />}</IconAction>
      <IconAction label={`Delete ${body.name}`} danger onClick={() => setDeleting({
        selection: { type: "body", id: body.id },
        name: body.name,
        detail: body.kind === "giant" ? "All satellites and their Ejectors will also be deleted." : "All Ejectors on this body will also be deleted.",
      })}><TrashIcon /></IconAction>
    </>
  );

  return (
    <aside className="panel hierarchy-panel">
      <div className="panel-heading"><div><span className="eyebrow">SYSTEM</span><h2>Objects</h2></div>{editing && <span className="editing-badge">EDITING</span>}</div>
      <div className="tree" role="tree">
        <ObjectRow selected={selected({ type: "star", id: "star" })} onSelect={() => setSelection({ type: "star", id: "star" })} icon={<span className="object-icon star-icon" />} name={config.star.name} type="STAR" actions={editing && <IconAction label={`Add object to ${config.star.name}`} onClick={() => setAddDialog({ parent: null })}><AddCelestialIcon /></IconAction>} />
        <div className="tree-children">
          {roots.map((body) => (
            <div key={body.id}>
              <ObjectRow selected={selected({ type: "body", id: body.id })} onSelect={() => setSelection({ type: "body", id: body.id })} icon={<span className={`object-icon ${body.kind}-icon`} />} name={body.name} type={body.kind === "rocky" ? "TERRESTRIAL" : "GIANT"} actions={editing && bodyActions(body)} />
              {config.bodies.filter((moon) => moon.parentId === body.id).map((moon) => (
                <div key={moon.id}>
                  <ObjectRow className="moon-row" selected={selected({ type: "body", id: moon.id })} onSelect={() => setSelection({ type: "body", id: moon.id })} icon={<span className="object-icon rocky-icon" />} name={moon.name} type="SATELLITE" actions={editing && bodyActions(moon)} />
                  {launcherGroup(moon)}
                </div>
              ))}
              {launcherGroup(body)}
            </div>
          ))}
        </div>
      </div>
      <div className="cloud-orbit-section">
        <div className="cloud-orbit-heading"><span className="eyebrow">DYSON SWARM ORBITS</span>{editing ? <button className="cloud-new-button" disabled={config.clouds.length >= 20} title={config.clouds.length >= 20 ? "All 20 orbit slots are in use" : "Add Dyson Swarm orbit"} onClick={() => setAddDialog({ parent: null, initialKind: "cloud" })}>New</button> : <small>{config.clouds.length} / 20</small>}</div>
        <div className="cloud-orbit-matrix">
          {Array.from({ length: 20 }, (_, index) => {
            const slot = index + 1;
            const cloud = cloudsBySlot.get(slot);
            const active = cloud ? selected({ type: "cloud", id: cloud.id }) : false;
            return <div className={`cloud-tile-wrap ${active ? "selected" : ""}`} key={slot}>
              <button className="cloud-tile" disabled={!cloud} aria-label={cloud ? `Select ${cloud.name}, orbit ${slot}` : `Orbit ${slot}, not configured`} title={cloud ? `Orbit ${slot} · ${cloud.name}` : `Orbit ${slot} · not configured`} onClick={() => cloud && setSelection({ type: "cloud", id: cloud.id })}>
                <span className="cloud-tile-slot">{slot}</span>
                {cloud && <i className="cloud-tile-dot" style={{ background: cloud.color }} />}
              </button>
              {editing && cloud && <button className="cloud-tile-delete" aria-label={`Delete ${cloud.name}`} title={`Delete ${cloud.name}`} onClick={() => setDeleting({ selection: { type: "cloud", id: cloud.id }, name: cloud.name })} />}
            </div>;
          })}
        </div>
      </div>
      <div className="hierarchy-actions editor-actions"><button className="button secondary" onClick={onImport}>Import</button><button className={`button secondary edit-toggle ${editing ? "active" : ""}`} onClick={() => setEditing(!editing)}>{editing ? "Done" : "Edit"}</button><button className="button secondary" onClick={onExport}>Export</button></div>
      {addDialog && <AddObjectDialog parent={addDialog.parent} initialKind={addDialog.initialKind} onClose={() => setAddDialog(null)} />}
      {launcherParent && <AddLauncherDialog body={launcherParent} onClose={() => setLauncherParent(null)} />}
      {deleting && <ConfirmDeleteDialog name={deleting.name} detail={deleting.detail} onCancel={() => setDeleting(null)} onConfirm={() => { setSelection(deleting.selection); deleteSelected(); setDeleting(null); }} />}
    </aside>
  );
}

function LauncherGroup({ bodyName, launchers, selectedLauncherId, editing, onSelect, onDelete }: {
  bodyName: string;
  launchers: LauncherParameters[];
  selectedLauncherId: string | null;
  editing: boolean;
  onSelect: (launcher: LauncherParameters) => void;
  onDelete: (launcher: LauncherParameters) => void;
}) {
  const [open, setOpen] = useState(launchers.length <= 5);
  const previousSelection = useRef(selectedLauncherId);
  const containsSelection = launchers.some((launcher) => launcher.id === selectedLauncherId);

  useEffect(() => {
    if (selectedLauncherId && selectedLauncherId !== previousSelection.current && launchers.some((launcher) => launcher.id === selectedLauncherId)) {
      setOpen(true);
    }
    previousSelection.current = selectedLauncherId;
  }, [selectedLauncherId]);

  return (
    <>
      <div className={`ejector-group-row ${containsSelection ? "contains-selection" : ""}`}>
        <button className="ejector-group-toggle" aria-expanded={open} aria-label={`${open ? "Collapse" : "Expand"} Ejectors on ${bodyName}`} onClick={() => setOpen(!open)}>
          <span className={`group-chevron ${open ? "open" : ""}`} />
          <span className="object-icon launcher-object-icon"><LauncherIcon /></span>
          <span className="group-label">Ejectors</span>
          <small>{launchers.length}</small>
        </button>
      </div>
      {open && launchers.map((launcher) => (
        <ObjectRow key={launcher.id} className="launcher-row grouped-launcher-row" selected={launcher.id === selectedLauncherId} onSelect={() => onSelect(launcher)} icon={<span className="object-icon launcher-object-icon"><LauncherIcon /></span>} name={launcher.name} type="EJECTOR" actions={editing && <IconAction label={`Delete ${launcher.name}`} danger onClick={() => onDelete(launcher)}><TrashIcon /></IconAction>} />
      ))}
    </>
  );
}

function ObjectRow({ selected, onSelect, icon, name, type, actions, className = "" }: { selected: boolean; onSelect: () => void; icon: ReactNode; name: string; type: string; actions?: ReactNode; className?: string }) {
  return <div className={`tree-row ${selected ? "selected" : ""} ${className}`}><button className="tree-select" onClick={onSelect}>{icon}<span>{name}</span><small>{type}</small></button>{actions && <div className="row-actions">{actions}</div>}</div>;
}

function IconAction({ label, onClick, danger = false, children }: { label: string; onClick: () => void; danger?: boolean; children: ReactNode }) {
  return <button className={`row-icon ${danger ? "danger" : ""}`} aria-label={label} title={label} onClick={onClick}>{children}</button>;
}
