import { describe, expect, it } from "vitest";
import { isValidGrade, normalizeGrade, toRouteId } from "../src/domain.js";

describe("domain helpers", () => {
  it("normalizes and validates Yosemite grades", () => {
    expect(normalizeGrade("10a")).toBe("5.10a");
    expect(isValidGrade("5.10a")).toBe(true);
    expect(isValidGrade("6.0")).toBe(false);
  });

  it("builds route ids deterministically", () => {
    expect(toRouteId("Gym", "1", "Red", "2024-01-01")).toBe("Gym:1:Red:2024-01-01");
  });
});
