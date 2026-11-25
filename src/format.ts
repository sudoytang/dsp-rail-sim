export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return "—";
  const sign = seconds < 0 ? "−" : "";
  const absolute = Math.abs(seconds);
  if (absolute < 60) return `${sign}${absolute.toFixed(1)} s`;
  const minutes = Math.floor(absolute / 60);
  const remaining = Math.floor(absolute % 60);
  if (minutes < 60) return `${sign}${minutes}m ${remaining.toString().padStart(2, "0")}s`;
  const hours = Math.floor(minutes / 60);
  return `${sign}${hours}h ${(minutes % 60).toString().padStart(2, "0")}m`;
}

export function formatPercent(ratio: number): string {
  return `${(ratio * 100).toFixed(2)}%`;
}
