import { describe, expect, it } from "vitest";
import { applySyncRows, buildSyncRowsFromData, getMaxCursor } from "../src/syncClient.js";
import { createEmptyData } from "../src/models.js";

describe("sync client", () => {
  it("merges rows into the local data store", () => {
    const data = createEmptyData();
    const rows = [
      {
        record_type: "gym",
        gym_name: "Base",
        created_at: "2024-01-01T00:00:00.000Z",
        updated_at: "2024-01-02T00:00:00.000Z",
      },
      {
        record_type: "route",
        gym_name: "Base",
        route_id: "Base:1:Blue:2024-01-01",
        rope_number: "1",
        color: "Blue",
        set_date: "2024-01-01",
        grade: "5.9",
        created_at: "2024-01-01T00:00:00.000Z",
        updated_at: "2024-01-02T00:00:00.000Z",
      },
    ];

    const result = applySyncRows(data, rows);
    expect(result.data.gyms).toHaveLength(1);
    expect(result.data.routes).toHaveLength(1);
  });

  it("applies tombstones to remove routes and attempts", () => {
    const data = createEmptyData();
    data.gyms.push({
      name: "Base",
      createdAt: "2024-01-01T00:00:00.000Z",
    });
    data.routes.push({
      routeId: "Base:1:Blue:2024-01-01",
      gymName: "Base",
      ropeNumber: "1",
      color: "Blue",
      setDate: "2024-01-01",
      grade: "5.9",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-02-01T00:00:00.000Z",
    });
    data.attempts.push({
      attemptId: "attempt-1",
      routeId: "Base:1:Blue:2024-01-01",
      climbDate: "2024-02-02",
      attemptIndex: 1,
      climbStyle: "top_rope",
      completionStyle: "attempt",
      notes: "",
      createdAt: "2024-02-02T00:00:00.000Z",
    });

    const result = applySyncRows(data, [
      {
        record_type: "tombstone_route",
        route_id: "Base:1:Blue:2024-01-01",
        updated_at: "2024-03-01T00:00:00.000Z",
      },
    ]);

    expect(result.data.routes).toHaveLength(0);
    expect(result.data.attempts).toHaveLength(0);
    expect(result.data.gyms).toHaveLength(1);
  });

  it("builds sync rows from local data", () => {
    const data = createEmptyData();
    data.gyms.push({ name: "Base", createdAt: "2024-01-01T00:00:00.000Z" });
    data.routes.push({
      routeId: "Base:1:Blue:2024-01-01",
      gymName: "Base",
      ropeNumber: "1",
      color: "Blue",
      setDate: "2024-01-01",
      grade: "5.9",
      createdAt: "2024-01-01T00:00:00.000Z",
    });
    data.attempts.push({
      attemptId: "attempt-1",
      routeId: "Base:1:Blue:2024-01-01",
      climbDate: "2024-02-02",
      attemptIndex: 2,
      climbStyle: "top_rope",
      completionStyle: "attempt",
      notes: "",
      createdAt: "2024-02-02T00:00:00.000Z",
    });

    const rows = buildSyncRowsFromData(data);
    expect(rows).toHaveLength(3);
    const attemptRow = rows.find((row) => row.record_type === "attempt");
    expect(attemptRow?.attempt_index).toBe("2");
  });

  it("finds the latest updated_at value", () => {
    const rows = [
      {
        record_type: "gym",
        gym_name: "Base",
        sync_key: "gym:Base",
        updated_at: "2024-01-02T00:00:00.000Z",
        updated_at_ms: 1704153600000,
      },
      {
        record_type: "route",
        route_id: "r1",
        sync_key: "route:r1",
        updated_at: "2024-03-01T00:00:00.000Z",
        updated_at_ms: 1709251200000,
      },
    ];
    expect(getMaxCursor(rows)).toEqual({
      lastSyncAtMs: 1709251200000,
      lastSyncKey: "route:r1",
    });
    expect(getMaxCursor([])).toBeNull();
  });
});
