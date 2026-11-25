import { describe, expect, it } from "vitest";
import { activitySegments } from "./activity";
import type { CalcReport } from "./simulation/types";

function reportWithWindows(windows: Array<Array<{ startSeconds: number; endSeconds: number }>>): CalcReport {
  return {
    jobId: "test",
    startSeconds: 0,
    endSeconds: 10,
    aggregateRatio: 0,
    systemCoverageRatio: 0,
    availableMachineSeconds: 0,
    coverageWindows: [],
    tickSeconds: 0.5,
    launchers: windows.map((launcherWindows, index) => ({
      launcherId: `launcher-${index}`,
      availableSeconds: launcherWindows.reduce((sum, window) => sum + window.endSeconds - window.startSeconds, 0),
      availableRatio: 0,
      windows: launcherWindows,
      orbitUsageSeconds: {},
    })),
  };
}

describe("activity segments", () => {
  it("keeps a single full-height segment for one fully active Ejector", () => {
    const segments = activitySegments(reportWithWindows([[{ startSeconds: 0, endSeconds: 10 }]]));
    expect(segments).toEqual([{ startSeconds: 0, endSeconds: 10, activeCount: 1, activeRatio: 1 }]);
  });

  it("uses exact window boundaries instead of buckets", () => {
    const segments = activitySegments(reportWithWindows([
      [{ startSeconds: 0, endSeconds: 10 }],
      [{ startSeconds: 5, endSeconds: 10 }],
    ]));
    expect(segments).toEqual([
      { startSeconds: 0, endSeconds: 5, activeCount: 1, activeRatio: 0.5 },
      { startSeconds: 5, endSeconds: 10, activeCount: 2, activeRatio: 1 },
    ]);
  });

  it("preserves short gaps between windows", () => {
    const segments = activitySegments(reportWithWindows([[
      { startSeconds: 2, endSeconds: 4 },
      { startSeconds: 4.5, endSeconds: 6 },
    ]]));
    expect(segments.map((segment) => [segment.startSeconds, segment.endSeconds, segment.activeRatio])).toEqual([
      [0, 2, 0],
      [2, 4, 1],
      [4, 4.5, 0],
      [4.5, 6, 1],
      [6, 10, 0],
    ]);
  });
});
