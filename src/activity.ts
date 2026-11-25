import type { CalcReport } from "./simulation/types";

export interface ActivitySegment {
  startSeconds: number;
  endSeconds: number;
  activeCount: number;
  activeRatio: number;
}

export function activitySegments(report: CalcReport): ActivitySegment[] {
  const duration = report.endSeconds - report.startSeconds;
  if (!(duration > 0) || report.launchers.length === 0) return [];
  const events = new Map<number, number>();
  for (const launcher of report.launchers) {
    for (const window of launcher.windows) {
      const start = Math.max(report.startSeconds, window.startSeconds);
      const end = Math.min(report.endSeconds, window.endSeconds);
      if (!(end > start)) continue;
      events.set(start, (events.get(start) ?? 0) + 1);
      events.set(end, (events.get(end) ?? 0) - 1);
    }
  }
  const timeline = [...events.entries()].sort(([first], [second]) => first - second);
  const segments: ActivitySegment[] = [];
  let activeCount = 0;
  let cursor = report.startSeconds;
  let index = 0;
  while (cursor < report.endSeconds - 1e-9) {
    const event = timeline[index];
    const boundary = event ? Math.min(event[0], report.endSeconds) : report.endSeconds;
    if (boundary > cursor + 1e-9) {
      const previous = segments[segments.length - 1];
      if (previous && previous.activeCount === activeCount && Math.abs(previous.endSeconds - cursor) < 1e-9) {
        previous.endSeconds = boundary;
      } else {
        segments.push({
          startSeconds: cursor,
          endSeconds: boundary,
          activeCount,
          activeRatio: activeCount / report.launchers.length,
        });
      }
    }
    if (!event || event[0] >= report.endSeconds) break;
    activeCount = Math.max(0, activeCount + event[1]);
    cursor = event[0];
    index += 1;
  }
  return segments;
}
