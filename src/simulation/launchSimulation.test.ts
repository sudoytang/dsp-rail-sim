import { describe, expect, it } from "vitest";
import { createDefaultConfig } from "./config";
import { nextConfiguredSlot, stepFiringState } from "./launchSimulation";
import type { LauncherFiringState } from "./types";

function configWithTwentyOrbits() {
  const config = createDefaultConfig();
  const template = config.clouds[0];
  config.clouds = Array.from({ length: 20 }, (_, index) => ({
    ...template,
    id: `orbit-${index + 1}`,
    slot: index + 1,
    name: `Orbit ${index + 1}`,
  }));
  return config;
}

function stateAt(currentOrbitSlot: number): LauncherFiringState {
  return {
    currentOrbitSlot,
    searchAnchorSlot: 0,
    nextCandidateSlot: 0,
    searchingForOrbit: false,
    checkTargetNext: false,
  };
}

describe("automatic orbit search", () => {
  it("alternates target and increasing candidates after failure", () => {
    const config = configWithTwentyOrbits();
    const launcher = { ...config.launchers[0], targetOrbitSlot: 5, autoOrbit: true };
    const state = stateAt(8);
    const tested: number[] = [];
    const invalid = (slot: number) => { tested.push(slot); return false; };
    for (let tick = 0; tick < 5; tick += 1) stepFiringState(config, launcher, state, invalid);
    expect(tested.slice(1)).toEqual([5, 9, 5, 10, 5]);
    expect(state.currentOrbitSlot).toBe(0);
  });

  it("does not switch while the current orbit remains valid", () => {
    const config = configWithTwentyOrbits();
    const launcher = { ...config.launchers[0], targetOrbitSlot: 5, autoOrbit: true };
    const state = stateAt(8);
    const tested: number[] = [];
    stepFiringState(config, launcher, state, (slot) => { tested.push(slot); return slot === 8; });
    expect(tested).toEqual([8]);
    expect(state.currentOrbitSlot).toBe(8);
  });

  it("uses increasing slots only when target is zero", () => {
    const config = configWithTwentyOrbits();
    const launcher = { ...config.launchers[0], targetOrbitSlot: 0, autoOrbit: true };
    const state = stateAt(8);
    const tested: number[] = [];
    const invalid = (slot: number) => { tested.push(slot); return false; };
    stepFiringState(config, launcher, state, invalid);
    stepFiringState(config, launcher, state, invalid);
    expect(tested).toEqual([8, 9, 10]);
  });

  it("stops searching when a candidate becomes valid", () => {
    const config = configWithTwentyOrbits();
    const launcher = { ...config.launchers[0], targetOrbitSlot: 5, autoOrbit: true };
    const state = stateAt(8);
    stepFiringState(config, launcher, state, (slot) => slot === 9);
    expect(state.currentOrbitSlot).toBe(0);
    stepFiringState(config, launcher, state, (slot) => slot === 9);
    expect(state.currentOrbitSlot).toBe(9);
    expect(state.searchingForOrbit).toBe(false);
  });

  it("wraps the next configured slot from 20 to 1", () => {
    const config = configWithTwentyOrbits();
    expect(nextConfiguredSlot(config, 20)).toBe(1);
    expect(nextConfiguredSlot(config, 0)).toBe(1);
  });
});
