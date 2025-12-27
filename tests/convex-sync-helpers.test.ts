import { describe, expect, it } from "vitest";
import {
  buildSyncKey,
  isTombstoneType,
  normalizeSyncRow,
  rowsEqual,
} from "../convex/syncHelpers.js";

describe("convex sync helpers", () => {
  it("builds sync keys for normal rows", () => {
    expect(buildSyncKey({ record_type: "gym", gym_name: "Base" })).toBe("gym:Base");
    expect(buildSyncKey({ record_type: "route", route_id: "r1" })).toBe("route:r1");
    expect(buildSyncKey({ record_type: "attempt", attempt_id: "a1" })).toBe("attempt:a1");
  });

  it("builds sync keys for tombstones", () => {
    expect(buildSyncKey({ record_type: "tombstone_gym", gym_name: "Base" })).toBe("gym:Base");
    expect(buildSyncKey({ record_type: "tombstone_route", route_id: "r1" })).toBe("route:r1");
    expect(buildSyncKey({ record_type: "tombstone_attempt", attempt_id: "a1" })).toBe(
      "attempt:a1"
    );
  });

  it("identifies tombstone record types", () => {
    expect(isTombstoneType("tombstone_gym")).toBe(true);
    expect(isTombstoneType("route")).toBe(false);
  });

  it("normalizes incoming rows", () => {
    const row = normalizeSyncRow({
      record_type: "GYM",
      gym_name: "  Base ",
      attempt_index: "1",
    });
    expect(row?.record_type).toBe("gym");
    expect(row?.gym_name).toBe("Base");
  });

  it("compares rows without updated fields", () => {
    const existing = normalizeSyncRow({
      record_type: "route",
      route_id: "r1",
      grade: "5.9",
    });
    const incoming = normalizeSyncRow({
      record_type: "route",
      route_id: "r1",
      grade: "5.9",
    });
    expect(existing).not.toBeNull();
    expect(incoming).not.toBeNull();
    expect(rowsEqual(existing!, incoming!)).toBe(true);
  });
});
