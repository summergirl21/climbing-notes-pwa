import { describe, expect, it } from "vitest";
import {
  addSyncRows,
  clearSyncQueue,
  getSyncRowKey,
  readSyncQueue,
  removeSyncRows,
} from "../src/syncQueue.js";

class MemoryStorage implements Storage {
  private data = new Map<string, string>();

  get length() {
    return this.data.size;
  }

  clear() {
    this.data.clear();
  }

  getItem(key: string) {
    return this.data.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(this.data.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.data.delete(key);
  }

  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}

describe("sync queue", () => {
  it("adds and dedupes queued rows", () => {
    const storage = new MemoryStorage();
    addSyncRows(storage, "user-1", [
      { record_type: "gym", gym_name: "Base", created_at: "2024-01-01T00:00:00.000Z" },
      { record_type: "gym", gym_name: "Base", updated_at: "2024-01-02T00:00:00.000Z" },
    ]);

    const rows = readSyncQueue(storage, "user-1");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.updated_at).toBe("2024-01-02T00:00:00.000Z");
  });

  it("removes rows by key", () => {
    const storage = new MemoryStorage();
    addSyncRows(storage, "user-1", [
      { record_type: "gym", gym_name: "Base" },
      { record_type: "route", route_id: "r1", gym_name: "Base" },
    ]);
    const key = getSyncRowKey({ record_type: "route", route_id: "r1" });
    if (key) {
      removeSyncRows(storage, "user-1", [key]);
    }

    const rows = readSyncQueue(storage, "user-1");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.record_type).toBe("gym");
    clearSyncQueue(storage, "user-1");
    expect(readSyncQueue(storage, "user-1")).toEqual([]);
  });

  it("keeps queues isolated per user", () => {
    const storage = new MemoryStorage();
    addSyncRows(storage, "user-1", [{ record_type: "gym", gym_name: "Base" }]);
    addSyncRows(storage, "user-2", [{ record_type: "gym", gym_name: "Mesa" }]);

    expect(readSyncQueue(storage, "user-1")).toEqual([
      { record_type: "gym", gym_name: "Base" },
    ]);
    expect(readSyncQueue(storage, "user-2")).toEqual([
      { record_type: "gym", gym_name: "Mesa" },
    ]);
  });
});
