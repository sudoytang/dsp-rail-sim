import { validateConfig } from "./config";
import type { SimulationConfig } from "./types";
import { metersToUnit, unitToMeters } from "./units";
import type { DistanceUnit } from "./units";

export function serializeConfig(config: SimulationConfig, unit: Exclude<DistanceUnit, "m">): string {
  const output = structuredClone(config) as unknown as Record<string, unknown>;
  output.distanceUnit = unit;
  const bodies = output.bodies as Array<{ orbit: Record<string, unknown> }>;
  for (const body of bodies) {
    body.orbit.radius = metersToUnit(body.orbit.radiusM as number, unit);
    delete body.orbit.radiusM;
  }
  const clouds = output.clouds as Array<Record<string, unknown>>;
  for (const cloud of clouds) {
    cloud.radius = metersToUnit(cloud.radiusM as number, unit);
    delete cloud.radiusM;
  }
  return JSON.stringify(output, null, 2);
}

export function parseConfig(source: string): SimulationConfig {
  const parsed = JSON.parse(source) as Record<string, unknown>;
  if ((parsed.version !== 1 && parsed.version !== 2 && parsed.version !== 3) || !parsed.star || !Array.isArray(parsed.bodies) || !Array.isArray(parsed.clouds)) {
    throw new Error("This is not a supported simulator configuration.");
  }
  if (parsed.version !== 1 && !Array.isArray(parsed.launchers)) {
    throw new Error("The configuration is missing its launcher list.");
  }
  const unit = parsed.distanceUnit === "AU" || parsed.distanceUnit === "ly" ? parsed.distanceUnit : "m";
  for (const body of parsed.bodies as Array<{ orbit?: Record<string, unknown> }>) {
    if (!body.orbit) throw new Error("A body is missing its orbit parameters.");
    if (typeof body.orbit.radius === "number") {
      body.orbit.radiusM = unitToMeters(body.orbit.radius, unit);
      delete body.orbit.radius;
    }
  }
  for (const cloud of parsed.clouds as Array<Record<string, unknown>>) {
    if (typeof cloud.radius === "number") {
      cloud.radiusM = unitToMeters(cloud.radius, unit);
      delete cloud.radius;
    }
  }
  delete parsed.distanceUnit;
  if (parsed.version === 1) {
    if (!parsed.launcher) throw new Error("The legacy configuration is missing its launcher.");
    parsed.version = 2;
    parsed.launchers = [{ id: "launcher-1", name: "EM-Rail Ejector 1", ...parsed.launcher as Record<string, unknown> }];
    delete parsed.launcher;
  }
  if (parsed.version === 2) {
    const clouds = parsed.clouds as Array<Record<string, unknown>>;
    const slotByCloudId = new Map<string, number>();
    clouds.forEach((cloud, index) => {
      cloud.slot = index + 1;
      slotByCloudId.set(String(cloud.id), index + 1);
    });
    for (const launcher of parsed.launchers as Array<Record<string, unknown>>) {
      const legacyTarget = launcher.targetOrbitId;
      launcher.autoOrbit = legacyTarget === "any";
      launcher.targetOrbitSlot = legacyTarget === "any" || legacyTarget === undefined ? 0 : slotByCloudId.get(String(legacyTarget)) ?? 0;
      delete launcher.targetOrbitId;
    }
    parsed.version = 3;
  }
  const config = parsed as unknown as SimulationConfig;
  const errors = validateConfig(config);
  if (errors.length > 0) throw new Error(errors.join(" "));
  return config;
}

export function downloadConfig(config: SimulationConfig, unit: "AU" | "ly"): void {
  const blob = new Blob([serializeConfig(config, unit)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "dsp-rail-sim.json";
  anchor.click();
  URL.revokeObjectURL(url);
}
