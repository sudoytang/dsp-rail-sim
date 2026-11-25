import { describe, expect, it } from "vitest";
import { cloudInsertionPoint, cloudPoint, elevationDeg, orbitDirection, surfaceDirection, systemState } from "./astronomy";
import { createDefaultConfig } from "./config";
import { vec3 } from "./vectors";

function expectVector(actual: { x: number; y: number; z: number }, expected: number[]) {
  expect(actual.x).toBeCloseTo(expected[0], 8);
  expect(actual.y).toBeCloseTo(expected[1], 8);
  expect(actual.z).toBeCloseTo(expected[2], 8);
}

describe("orbital mechanics", () => {
  it("evaluates a circular equatorial orbit", () => {
    const orbit = createDefaultConfig().bodies[0].orbit;
    orbit.inclinationDeg = 0;
    orbit.ascendingNodeDeg = 0;
    orbit.initialPhaseDeg = 0;
    orbit.periodSeconds = 100;
    expectVector(orbitDirection(orbit, 0), [1, 0, 0]);
    expectVector(orbitDirection(orbit, 25), [0, 1, 0]);
  });

  it("moves clockwise around the orbit normal", () => {
    const cloud = createDefaultConfig().clouds[0];
    cloud.inclinationDeg = 90;
    cloud.ascendingNodeDeg = 0;
    cloud.radiusM = 10;
    expectVector(cloudPoint(cloud, 90), [0, 0, -10]);
  });

  it("builds the unique tangential insertion point", () => {
    const cloud = createDefaultConfig().clouds[0];
    cloud.inclinationDeg = 0;
    cloud.ascendingNodeDeg = 0;
    cloud.radiusM = 100;
    expectVector(cloudInsertionPoint(cloud, vec3(200, 0, 0))!, [0, -100, 0]);
  });

  it("extends the projected ray when the launcher is inside the orbit", () => {
    const cloud = createDefaultConfig().clouds[0];
    cloud.inclinationDeg = 0;
    cloud.ascendingNodeDeg = 0;
    cloud.radiusM = 100;
    expectVector(cloudInsertionPoint(cloud, vec3(50, 0, 0))!, [0, -100, 0]);
  });

  it("adds the parent position for a satellite", () => {
    const config = createDefaultConfig();
    const giant = config.bodies.find((body) => body.id === "giant-1")!;
    const moon = config.bodies.find((body) => body.id === "moon-1")!;
    giant.orbit.inclinationDeg = 0;
    giant.orbit.ascendingNodeDeg = 0;
    const state = systemState(config, 0);
    const giantState = state.bodies.get(giant.id)!;
    const moonState = state.bodies.get(moon.id)!;
    expectVector(giantState.center, [giant.orbit.radiusM * Math.cos(145 * Math.PI / 180), giant.orbit.radiusM * Math.sin(145 * Math.PI / 180), 0]);
    const distance = Math.hypot(
      moonState.center.x - giantState.center.x,
      moonState.center.y - giantState.center.y,
      moonState.center.z - giantState.center.z,
    );
    expect(distance).toBeCloseTo(moon.orbit.radiusM, 8);
  });
});

describe("body orientation", () => {
  it("maps latitude and longitude at zero rotation", () => {
    const config = createDefaultConfig();
    const body = config.bodies[0];
    body.orbit.inclinationDeg = 0;
    body.orbit.ascendingNodeDeg = 0;
    body.axialTiltDeg = 0;
    const state = systemState(config, 0).bodies.get(body.id)!;
    expectVector(surfaceDirection(state, 0, 0), [1, 0, 0]);
    expectVector(surfaceDirection(state, 0, 90), [0, 1, 0]);
    expectVector(surfaceDirection(state, 90, 0), [0, 0, 1]);
  });

  it("rotates the prime meridian with the body", () => {
    const config = createDefaultConfig();
    const body = config.bodies[0];
    body.orbit.inclinationDeg = 0;
    body.orbit.ascendingNodeDeg = 0;
    body.axialTiltDeg = 0;
    body.rotationPeriodSeconds = 100;
    const state = systemState(config, 25).bodies.get(body.id)!;
    expectVector(surfaceDirection(state, 0, 0), [0, 1, 0]);
  });
});

describe("elevation", () => {
  it("measures angle above the local horizon", () => {
    const position = vec3(200, 0, 0);
    const up = vec3(1, 0, 0);
    expect(elevationDeg(position, up, vec3(400, 0, 0))).toBeCloseTo(90);
    expect(elevationDeg(position, up, vec3(200, 200, 0))).toBeCloseTo(0);
    expect(elevationDeg(position, up, vec3(400, 200, 0))).toBeCloseTo(45);
  });
});
