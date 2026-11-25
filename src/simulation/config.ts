import { GIANT_RADIUS_M, MAX_CLOUD_ORBITS, METERS_PER_AU, ROCKY_RADIUS_M, STAR_STANDARD_RADIUS_M } from "./constants";
import type { BodyParameters, SimulationConfig } from "./types";

export function bodyRadiusM(body: BodyParameters): number {
  return body.kind === "rocky" ? ROCKY_RADIUS_M : GIANT_RADIUS_M;
}

export function starRadiusM(config: SimulationConfig): number {
  return STAR_STANDARD_RADIUS_M * config.star.radiusScale;
}

export function rockyBodies(config: SimulationConfig): BodyParameters[] {
  return config.bodies.filter((body) => body.kind === "rocky");
}

export function validateConfig(config: SimulationConfig): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const bodyIds = new Set(config.bodies.map((body) => body.id));

  if (!Number.isFinite(config.star.radiusScale) || config.star.radiusScale <= 0) {
    errors.push("The star radius scale must be positive.");
  }

  for (const item of [...config.bodies, ...config.clouds, ...config.launchers]) {
    if (ids.has(item.id)) {
      errors.push(`Duplicate object id: ${item.id}`);
    }
    ids.add(item.id);
  }

  for (const body of config.bodies) {
    if (body.parentId !== null) {
      const parent = config.bodies.find((candidate) => candidate.id === body.parentId);
      if (body.kind !== "rocky" || parent?.kind !== "giant") {
        errors.push(`${body.name} must orbit either the star or a giant planet.`);
      }
    }
    if (!isPositive(body.orbit.radiusM) || !isPositive(body.orbit.periodSeconds)) {
      errors.push(`${body.name} has an invalid orbit radius or period.`);
    }
    if (!isPositive(body.rotationPeriodSeconds)) {
      errors.push(`${body.name} has an invalid rotation period.`);
    }
  }

  const slots = new Set<number>();
  if (config.clouds.length > MAX_CLOUD_ORBITS) {
    errors.push(`A system can contain at most ${MAX_CLOUD_ORBITS} Dyson Swarm orbits.`);
  }
  for (const cloud of config.clouds) {
    if (!isPositive(cloud.radiusM)) {
      errors.push(`${cloud.name} has an invalid orbit radius.`);
    }
    if (!Number.isInteger(cloud.slot) || cloud.slot < 1 || cloud.slot > MAX_CLOUD_ORBITS) {
      errors.push(`${cloud.name} has an invalid orbit slot.`);
    } else if (slots.has(cloud.slot)) {
      errors.push(`Orbit slot ${cloud.slot} is assigned more than once.`);
    }
    slots.add(cloud.slot);
  }

  for (const launcher of config.launchers) {
    const launcherBody = config.bodies.find((body) => body.id === launcher.bodyId);
    if (!launcherBody || launcherBody.kind !== "rocky") {
      errors.push(`${launcher.name} must be placed on a terrestrial body.`);
    }
    if (!bodyIds.has(launcher.bodyId)) {
      errors.push(`The body for ${launcher.name} does not exist.`);
    }
    if (!Number.isInteger(launcher.targetOrbitSlot) || launcher.targetOrbitSlot < 0 || launcher.targetOrbitSlot > MAX_CLOUD_ORBITS) {
      errors.push(`${launcher.name} has an invalid target orbit slot.`);
    } else if (launcher.targetOrbitSlot !== 0 && !slots.has(launcher.targetOrbitSlot)) {
      errors.push(`The target orbit slot for ${launcher.name} is not configured.`);
    }
  }
  return errors;
}

function isPositive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

export function createDefaultConfig(): SimulationConfig {
  return {
    version: 3,
    star: { id: "star", kind: "star", name: "Alpha", radiusScale: 1 },
    bodies: [
      {
        id: "planet-1",
        kind: "rocky",
        name: "Terran I",
        parentId: null,
        orbit: {
          radiusM: METERS_PER_AU,
          inclinationDeg: 8,
          ascendingNodeDeg: 20,
          periodSeconds: 3_600,
          initialPhaseDeg: 0,
        },
        axialTiltDeg: 23,
        rotationPeriodSeconds: 600,
      },
      {
        id: "giant-1",
        kind: "giant",
        name: "Giant II",
        parentId: null,
        orbit: {
          radiusM: 2.2 * METERS_PER_AU,
          inclinationDeg: -12,
          ascendingNodeDeg: 100,
          periodSeconds: 7_200,
          initialPhaseDeg: 145,
        },
        axialTiltDeg: 12,
        rotationPeriodSeconds: 900,
      },
      {
        id: "moon-1",
        kind: "rocky",
        name: "Satellite II-a",
        parentId: "giant-1",
        orbit: {
          radiusM: 12_000,
          inclinationDeg: 18,
          ascendingNodeDeg: 40,
          periodSeconds: 1_200,
          initialPhaseDeg: 70,
        },
        axialTiltDeg: 5,
        rotationPeriodSeconds: 1_200,
      },
    ],
    clouds: [
      {
        id: "cloud-1",
        slot: 1,
        name: "Dyson Swarm I",
        radiusM: 1.45 * METERS_PER_AU,
        inclinationDeg: 32,
        ascendingNodeDeg: 65,
        color: "#60a5fa",
      },
      {
        id: "cloud-2",
        slot: 2,
        name: "Dyson Swarm II",
        radiusM: 1.8 * METERS_PER_AU,
        inclinationDeg: -42,
        ascendingNodeDeg: 150,
        color: "#c084fc",
      },
    ],
    launchers: [
      {
        id: "launcher-1",
        name: "EM-Rail Ejector 1",
        bodyId: "planet-1",
        latitudeDeg: 20,
        longitudeDeg: 0,
        targetOrbitSlot: 1,
        autoOrbit: false,
      },
    ],
  };
}
