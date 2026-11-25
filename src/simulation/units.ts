import { METERS_PER_AU, METERS_PER_LIGHT_YEAR } from "./constants";

export type DistanceUnit = "m" | "AU" | "ly";

const units: Record<DistanceUnit, number> = {
  m: 1,
  AU: METERS_PER_AU,
  ly: METERS_PER_LIGHT_YEAR,
};

export function metersToUnit(valueM: number, unit: DistanceUnit): number {
  return valueM / units[unit];
}

export function unitToMeters(value: number, unit: DistanceUnit): number {
  return value * units[unit];
}

export function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function radiansToDegrees(value: number): number {
  return (value * 180) / Math.PI;
}
