import { describe, expect, it } from "vitest";
import { createDefaultConfig, validateConfig } from "./config";
import { parseConfig, serializeConfig } from "./io";

describe("configuration I/O", () => {
  it("round-trips AU and light-year distances", () => {
    const config = createDefaultConfig();
    for (const unit of ["AU", "ly"] as const) {
      const restored = parseConfig(serializeConfig(config, unit));
      expect(restored.bodies[0].orbit.radiusM).toBeCloseTo(config.bodies[0].orbit.radiusM);
      expect(restored.clouds[0].radiusM).toBeCloseTo(config.clouds[0].radiusM);
    }
  });

  it("rejects nested or non-terrestrial satellites", () => {
    const config = createDefaultConfig();
    const moon = config.bodies.find((body) => body.id === "moon-1")!;
    moon.parentId = "planet-1";
    expect(validateConfig(config).length).toBeGreaterThan(0);
  });

  it("rejects EM-Rail Ejectors on giant planets", () => {
    const config = createDefaultConfig();
    config.launchers[0].bodyId = "giant-1";
    expect(validateConfig(config)).toContain("EM-Rail Ejector 1 must be placed on a terrestrial body.");
  });

  it("migrates a legacy single-launcher configuration", () => {
    const config = createDefaultConfig();
    const legacy = { ...config, version: 1, launcher: config.launchers[0] } as Record<string, unknown>;
    delete legacy.launchers;
    const restored = parseConfig(JSON.stringify(legacy));
    expect(restored.version).toBe(3);
    expect(restored.launchers).toHaveLength(1);
    expect(restored.launchers[0].bodyId).toBe("planet-1");
  });
});
