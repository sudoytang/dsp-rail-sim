import type { SimulationConfig, VisibilityState } from "./simulation/types";
import type { Selection } from "./state/store";

export interface AvailabilityScope {
  ids: string[];
  label: string;
}

export function highlightedLauncherId(selection: Selection): string | null {
  return selection.type === "launcher" ? selection.id : null;
}

export function availabilityScope(
  config: SimulationConfig,
  selection: Selection,
  visibilities: Record<string, VisibilityState>,
): AvailabilityScope {
  if (selection.type === "launcher") {
    const launcher = config.launchers.find((item) => item.id === selection.id);
    return { ids: launcher ? [launcher.id] : [], label: launcher?.name ?? "Unknown Ejector" };
  }
  if (selection.type === "star") {
    return { ids: config.launchers.map((launcher) => launcher.id), label: "Entire system" };
  }
  if (selection.type === "cloud") {
    const cloud = config.clouds.find((item) => item.id === selection.id);
    return {
      ids: config.launchers.filter((launcher) =>
        (!launcher.autoOrbit && launcher.targetOrbitSlot === cloud?.slot) ||
        visibilities[launcher.id]?.currentOrbitSlot === cloud?.slot,
      ).map((launcher) => launcher.id),
      label: cloud ? `Orbit ${cloud.slot} · ${cloud.name}` : "Unknown Dyson Swarm orbit",
    };
  }
  const body = config.bodies.find((item) => item.id === selection.id);
  if (!body) return { ids: [], label: "Unknown body" };
  const bodyIds = body.kind === "giant"
    ? config.bodies.filter((item) => item.parentId === body.id).map((item) => item.id)
    : [body.id];
  return {
    ids: config.launchers.filter((launcher) => bodyIds.includes(launcher.bodyId)).map((launcher) => launcher.id),
    label: body.kind === "giant" ? `${body.name} satellites` : body.name,
  };
}
