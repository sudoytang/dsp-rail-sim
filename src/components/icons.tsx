export function AddCelestialIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><circle className="fill-shape" cx="8.5" cy="11.5" r="5.5" /><path d="M15 2.5v6M12 5.5h6" /></svg>;
}

export function LauncherIcon({ withPlus = false }: { withPlus?: boolean }) {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3.5 17h13M5.5 14.5l2-4h5l2 4" /><path className="fill-shape" d="m10 2 2.2 3.2h-1.3V9H9.1V5.2H7.8L10 2Z" />{withPlus && <path d="M15.5 1v5M13 3.5h5" />}</svg>;
}

export function CloseIcon() {
  return <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8" /></svg>;
}

export function PencilIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m4 16 3.8-.9L16 6.9 13.1 4 5 12.2 4 16ZM11.5 5.5l3 3" /></svg>;
}

export function TrashIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 6h12M8 3h4l1 3H7l1-3ZM6 6l1 11h6l1-11M9 9v5M11 9v5" /></svg>;
}

export function PauseIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true" className="fill-icon"><rect x="5" y="4" width="3.5" height="12" rx="1" /><rect x="11.5" y="4" width="3.5" height="12" rx="1" /></svg>;
}

export function PlayIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true" className="fill-icon"><path d="M6 4.5a1 1 0 0 1 1.52-.85l9 5.5a1 1 0 0 1 0 1.7l-9 5.5A1 1 0 0 1 6 15.5v-11Z" /></svg>;
}

export function ResetIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5.2 6.3A6 6 0 1 1 4 10M4 4v4h4" /></svg>;
}
