import { describe, expect, it } from 'vitest';
import { createEmptyData } from '../src/models.js';
import { createPersistence, loadLegacyData, STORAGE_KEY } from '../src/persistence.js';

class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length() {
    return this.store.size;
  }

  clear() {
    this.store.clear();
  }

  getItem(key: string) {
    return this.store.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
}

describe('persistence', () => {
  it('returns empty data when no legacy storage exists', async () => {
    const storage = new MemoryStorage();
    const { readData } = createPersistence({ localStorage: storage, indexedDB: null });
    const data = await readData();
    expect(data).toEqual(createEmptyData());
  });

  it('saves to and loads from legacy storage without indexedDB', async () => {
    const storage = new MemoryStorage();
    const { readData, saveData } = createPersistence({ localStorage: storage, indexedDB: null });
    const data = createEmptyData();
    data.gyms.push({ name: 'Local', createdAt: '2024-01-01T00:00:00.000Z' });
    await saveData(data);
    const loaded = await readData();
    expect(loaded).toEqual(data);
  });

  it('normalizes legacy data on load', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        gyms: [],
        routes: [],
        attempts: [
          {
            attemptId: 'a1',
            routeId: 'r1',
            climbDate: '2024-01-01',
            attemptIndex: 1,
            completionStyle: 'attempt',
            notes: '',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ],
      })
    );

    const legacy = loadLegacyData(storage);
    expect(legacy?.attempts[0]?.climbStyle).toBe('top_rope');
  });
});
