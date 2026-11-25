import { describe, expect, it } from "vitest";
import { metersToUnit, unitToMeters } from "./units";

describe("distance units", () => {
  it("uses the game distance conversions", () => {
    expect(unitToMeters(1, "AU")).toBe(40_000);
    expect(unitToMeters(1, "ly")).toBe(2_400_000);
    expect(metersToUnit(60_000, "AU")).toBe(1.5);
    expect(metersToUnit(240_000, "ly")).toBe(0.1);
  });
});
