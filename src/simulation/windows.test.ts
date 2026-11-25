import { describe, expect, it } from "vitest";
import { createDefaultConfig } from "./config";
import type { CalcJob, CalcReport } from "./types";
import { scanCalcJob } from "./windows";

function calculate(config: ReturnType<typeof createDefaultConfig>, job: CalcJob): CalcReport {
  const scanner = scanCalcJob(config, job);
  let result = scanner.next();
  while (!result.done) result = scanner.next();
  return result.value;
}

describe("calculation jobs", () => {
  it("returns zero when the insertion point stays below the horizon", () => {
    const config = createDefaultConfig();
    config.clouds = [config.clouds[0]];
    config.clouds[0].radiusM = 100;
    config.clouds[0].inclinationDeg = 0;
    config.clouds[0].ascendingNodeDeg = 0;
    config.launchers[0].targetOrbitSlot = 1;
    const report = calculate(config, {
      id: "calc-1", name: "Test", startSeconds: 0, endSeconds: 10,
      entries: [{ launcherId: "launcher-1" }],
    });
    expect(report.aggregateRatio).toBe(0);
    expect(report.systemCoverageRatio).toBe(0);
    expect(report.launchers[0].windows).toEqual([]);
  });

  it("accounts for all available window durations", () => {
    const config = createDefaultConfig();
    const report = calculate(config, {
      id: "calc-1", name: "Test", startSeconds: 0, endSeconds: 30,
      entries: [{ launcherId: "launcher-1" }],
    });
    const result = report.launchers[0];
    const duration = result.windows.reduce((total, window) => total + window.endSeconds - window.startSeconds, 0);
    expect(duration).toBeCloseTo(result.availableSeconds, 8);
    expect(result.availableRatio).toBeGreaterThanOrEqual(0);
    expect(result.availableRatio).toBeLessThanOrEqual(1);
    expect(report.tickSeconds).toBe(0.5);
  });

  it("averages machine availability and computes system coverage", () => {
    const config = createDefaultConfig();
    config.launchers.push({ ...config.launchers[0], id: "launcher-2", name: "EM-Rail Ejector 2", latitudeDeg: -35, targetOrbitSlot: 2, autoOrbit: true });
    const report = calculate(config, {
      id: "calc-1", name: "Test", startSeconds: 0, endSeconds: 60,
      entries: [{ launcherId: "launcher-1" }, { launcherId: "launcher-2" }],
    });
    const mean = report.launchers.reduce((sum, launcher) => sum + launcher.availableRatio, 0) / report.launchers.length;
    expect(report.aggregateRatio).toBeCloseTo(mean, 10);
    expect(report.availableMachineSeconds).toBeCloseTo(report.launchers.reduce((sum, launcher) => sum + launcher.availableSeconds, 0), 8);
    expect(report.systemCoverageRatio).toBeGreaterThanOrEqual(report.aggregateRatio);
    expect(report.systemCoverageRatio).toBeLessThanOrEqual(1);
    expect(Object.values(report.launchers[1].orbitUsageSeconds).reduce((sum, value) => sum + value, 0)).toBeCloseTo(report.launchers[1].availableSeconds, 8);
  });
});
