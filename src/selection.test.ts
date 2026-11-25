import { describe, expect, it } from "vitest";
import { availabilityScope, highlightedLauncherId } from "./selection";
import { createDefaultConfig } from "./simulation/config";
import type { VisibilityState } from "./simulation/types";

function visibilityAtOrbit(currentOrbitSlot: number): VisibilityState {
  return {
    timeSeconds: 0,
    available: currentOrbitSlot !== 0,
    reason: currentOrbitSlot === 0 ? "searching" : "available",
    currentOrbitSlot,
    currentCloudId: null,
    candidate: null,
    state: {
      currentOrbitSlot,
      searchAnchorSlot: 0,
      nextCandidateSlot: 0,
      searchingForOrbit: currentOrbitSlot === 0,
      checkTargetNext: false,
    },
  };
}

describe("3D firing highlight", () => {
  it("highlights only an explicitly selected EM-Rail Ejector", () => {
    expect(highlightedLauncherId({ type: "launcher", id: "launcher-1" })).toBe("launcher-1");
    expect(highlightedLauncherId({ type: "star", id: "star" })).toBeNull();
    expect(highlightedLauncherId({ type: "body", id: "planet-1" })).toBeNull();
    expect(highlightedLauncherId({ type: "cloud", id: "cloud-1" })).toBeNull();
  });
});

describe("availability scopes", () => {
  it("assigns an automatic ejector only to its current orbit", () => {
    const config = createDefaultConfig();
    const launcher = config.launchers[0];
    launcher.targetOrbitSlot = 0;
    launcher.autoOrbit = true;
    const visibilities = { [launcher.id]: visibilityAtOrbit(2) };

    expect(availabilityScope(config, { type: "cloud", id: "cloud-2" }, visibilities).ids).toEqual([launcher.id]);
    expect(availabilityScope(config, { type: "cloud", id: "cloud-1" }, visibilities).ids).toEqual([]);
    expect(availabilityScope(config, { type: "star", id: "star" }, visibilities).ids).toEqual([launcher.id]);
  });

  it("counts an automatic ejector at its current orbit instead of its preferred target", () => {
    const config = createDefaultConfig();
    const launcher = config.launchers[0];
    launcher.targetOrbitSlot = 1;
    launcher.autoOrbit = true;
    const visibilities = { [launcher.id]: visibilityAtOrbit(2) };

    expect(availabilityScope(config, { type: "cloud", id: "cloud-1" }, visibilities).ids).toEqual([]);
    expect(availabilityScope(config, { type: "cloud", id: "cloud-2" }, visibilities).ids).toEqual([launcher.id]);
  });

  it("keeps an explicit target in scope even when blocked", () => {
    const config = createDefaultConfig();
    const launcher = config.launchers[0];
    launcher.targetOrbitSlot = 1;
    launcher.autoOrbit = false;
    const visibilities = { [launcher.id]: visibilityAtOrbit(0) };

    expect(availabilityScope(config, { type: "cloud", id: "cloud-1" }, visibilities).ids).toEqual([launcher.id]);
    expect(availabilityScope(config, { type: "cloud", id: "cloud-2" }, visibilities).ids).toEqual([]);
  });
});
