import { formatDuration } from "../format";
import { availabilityScope } from "../selection";
import { useAppStore } from "../state/store";
import { PauseIcon, PlayIcon, ResetIcon } from "./icons";

export function TimeControls() {
  const config = useAppStore((state) => state.config);
  const selection = useAppStore((state) => state.selection);
  const currentTime = useAppStore((state) => state.currentTimeSeconds);
  const playing = useAppStore((state) => state.playing);
  const speed = useAppStore((state) => state.playbackSpeed);
  const visibilities = useAppStore((state) => state.visibilities);
  const setCurrentTime = useAppStore((state) => state.setCurrentTime);
  const setPlaying = useAppStore((state) => state.setPlaying);
  const setSpeed = useAppStore((state) => state.setPlaybackSpeed);
  const scope = availabilityScope(config, selection, visibilities);
  const scopeVisibilities = scope.ids.map((id) => visibilities[id]);
  const pending = scope.ids.length > 0 && scopeVisibilities.some((visibility) => !visibility);
  const availableCount = scopeVisibilities.filter((visibility) => visibility?.available).length;
  const single = selection.type === "launcher" ? scopeVisibilities[0] : null;
  const empty = scope.ids.length === 0;
  const available = !empty && !pending && availableCount > 0;
  const statusClass = empty || pending ? "is-neutral" : available ? "is-available" : "is-unavailable";
  const percentage = scope.ids.length > 0 ? Math.round((availableCount / scope.ids.length) * 100) : 0;

  return (
    <div className="time-controls">
      <button className="play-button" onClick={() => setPlaying(!playing)} aria-label={playing ? "Pause simulation" : "Play simulation"}>{playing ? <PauseIcon /> : <PlayIcon />}</button>
      <button className="icon-button" onClick={() => { setPlaying(false); setCurrentTime(0); }} title="Reset time" aria-label="Reset simulation time"><ResetIcon /></button>
      <div className="time-readout"><span>SIMULATION TIME</span><strong>{formatDuration(currentTime)}</strong></div>
      <input className="time-slider" type="range" min={0} max={3600} step={0.1} value={Math.min(currentTime, 3600)} onChange={(event) => { setPlaying(false); setCurrentTime(Number(event.target.value)); }} aria-label="Simulation time" />
      <label className="speed-control"><span>Speed</span><select value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>{[1, 10, 30, 100, 300, 1000].map((value) => <option key={value} value={value}>{value}×</option>)}</select></label>
      <div className={`live-status ${statusClass}`}>
        <span className="status-dot" />
        <div>
          {empty ? <><strong>NO EJECTORS IN SCOPE</strong><small>{scope.label}</small></> : pending ? <><strong>CALCULATING AVAILABILITY</strong><small>Waiting for orbital data</small></> : single ? (
            <><strong>{single.available ? "READY TO LAUNCH" : "LAUNCH BLOCKED"}</strong><small>{single.available ? `Firing at orbit ${single.currentOrbitSlot}` : single.reason === "occluded" ? "Insertion point occluded by another body" : single.reason === "elevation" ? "Insertion point outside 5°–60°" : single.reason === "searching" ? "Searching for the next available orbit" : single.reason === "no-intersection" ? "No valid tangential insertion point" : "No target orbit; enable Auto Orbit"}</small></>
          ) : (
            <><strong>{availableCount} / {scope.ids.length} EJECTORS AVAILABLE</strong><small>{percentage}% available at this instant · {scope.label}</small></>
          )}
        </div>
      </div>
    </div>
  );
}
