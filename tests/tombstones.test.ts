import { describe, expect, it } from "vitest";
import { addTombstones, clearTombstones, readTombstones } from "../src/tombstones.js";

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

describe("tombstones", () => {
  it("reads empty storage as empty list", () => {
    const storage = new MemoryStorage();
    expect(readTombstones(storage, "user-1")).toEqual([]);
  });

  it("adds and dedupes tombstones", () => {
    const storage = new MemoryStorage();
    const rows = addTombstones(storage, "user-1", [
      { record_type: "tombstone_gym", gym_name: "Base" },
      { record_type: "tombstone_gym", gym_name: "Base" },
      { record_type: "tombstone_route", route_id: "r1" },
    ]);

    expect(rows).toHaveLength(2);
    expect(readTombstones(storage, "user-1")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ record_type: "tombstone_gym", gym_name: "Base" }),
        expect.objectContaining({ record_type: "tombstone_route", route_id: "r1" }),
      ])
    );
  });

  it("clears tombstones", () => {
    const storage = new MemoryStorage();
    addTombstones(storage, "user-1", [
      { record_type: "tombstone_attempt", attempt_id: "a1" },
    ]);
    clearTombstones(storage, "user-1");
    expect(readTombstones(storage, "user-1")).toEqual([]);
  });

  it("keeps tombstones isolated per user", () => {
    const storage = new MemoryStorage();
    addTombstones(storage, "user-1", [{ record_type: "tombstone_gym", gym_name: "Base" }]);
    addTombstones(storage, "user-2", [{ record_type: "tombstone_gym", gym_name: "Mesa" }]);

    expect(readTombstones(storage, "user-1")).toEqual([
      expect.objectContaining({ record_type: "tombstone_gym", gym_name: "Base" }),
    ]);
    expect(readTombstones(storage, "user-2")).toEqual([
      expect.objectContaining({ record_type: "tombstone_gym", gym_name: "Mesa" }),
    ]);
  });
});
