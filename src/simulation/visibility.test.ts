import { describe, expect, it } from "vitest";
import { launcherState, systemState } from "./astronomy";
import { createDefaultConfig } from "./config";
import { vec3 } from "./vectors";
import { blockersAtPoint, orbitCandidate, segmentIntersectsSphere } from "./visibility";

describe("sphere occlusion", () => {
  it("detects a sphere between the endpoints", () => {
    expect(segmentIntersectsSphere(vec3(-10, 0, 0), vec3(10, 0, 0), vec3(), 1)).toBe(true);
  });

  it("ignores spheres behind either endpoint", () => {
    expect(segmentIntersectsSphere(vec3(-10, 0, 0), vec3(10, 0, 0), vec3(20, 0, 0), 1)).toBe(false);
    expect(segmentIntersectsSphere(vec3(-10, 0, 0), vec3(10, 0, 0), vec3(-20, 0, 0), 1)).toBe(false);
  });

  it("detects the star on a direct segment", () => {
    const config = createDefaultConfig();
    const body = config.bodies[0];
    const launcher = config.launchers[0];
    body.orbit.inclinationDeg = 0;
    body.orbit.ascendingNodeDeg = 0;
    body.axialTiltDeg = 0;
    launcher.latitudeDeg = 0;
    launcher.longitudeDeg = 0;
    const system = systemState(config, 0);
    const state = launcherState(launcher, system);
    expect(blockersAtPoint(config, system, state.position, launcher.bodyId, vec3(-20_000, 0, 0))).toContain("star");
  });
});

describe("tangential orbit candidates", () => {
  it("evaluates only the insertion point", () => {
    const config = createDefaultConfig();
    const launcher = config.launchers[0];
    const system = systemState(config, 0);
    const candidate = orbitCandidate(config, system, launcher, config.clouds[0]);
    expect(candidate.insertionPoint).not.toBeNull();
    expect(candidate.elevationDeg).not.toBeNull();
    expect(typeof candidate.available).toBe("boolean");
  });
});
