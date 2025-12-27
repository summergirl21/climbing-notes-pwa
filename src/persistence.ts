import { createEmptyData, normalizeData } from './models.js';
import type { DataStore } from './models.js';

export const STORAGE_KEY = 'climbingNotesData';

const DB_NAME = 'climbingNotesDb';
const DB_STORE = 'appData';
const DB_DATA_KEY = 'data';

export type PersistenceDeps = {
  localStorage: Storage;
  indexedDB?: IDBFactory | null;
};

export const loadLegacyData = (storage: Storage): DataStore | null => {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DataStore;
    if (!parsed || !Array.isArray(parsed.gyms)) {
      return null;
    }
    return normalizeData(parsed);
  } catch (error) {
    console.warn('Failed to load legacy data', error);
    return null;
  }
};

const openDatabase = (indexedDB: IDBFactory) =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

export const createPersistence = ({ localStorage, indexedDB }: PersistenceDeps) => {
  const saveData = async (data: DataStore) => {
    const normalized = normalizeData(data);
    if (!indexedDB) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      return;
    }
    let db: IDBDatabase | null = null;
    try {
      db = await openDatabase(indexedDB);
      await new Promise<void>((resolve, reject) => {
        const tx = db?.transaction(DB_STORE, 'readwrite');
        if (!tx) {
          reject(new Error('Failed to create transaction'));
          return;
        }
        const store = tx.objectStore(DB_STORE);
        store.put({ key: DB_DATA_KEY, value: normalized });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    } catch (error) {
      console.error('Failed to save data', error);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      } catch (fallbackError) {
        console.error('Failed to save fallback data', fallbackError);
      }
    } finally {
      db?.close();
    }
  };

  const readData = async (): Promise<DataStore> => {
    if (!indexedDB) {
      return loadLegacyData(localStorage) ?? createEmptyData();
    }
    try {
      const db = await openDatabase(indexedDB);
      return await new Promise((resolve) => {
        const tx = db.transaction(DB_STORE, 'readonly');
        const store = tx.objectStore(DB_STORE);
        const request = store.get(DB_DATA_KEY);
        request.onsuccess = () => {
          const record = request.result as { key: string; value: DataStore } | undefined;
          if (record?.value) {
            resolve(normalizeData(record.value));
            return;
          }
          const legacy = loadLegacyData(localStorage);
          if (legacy) {
            void saveData(legacy);
            resolve(legacy);
            return;
          }
          resolve(createEmptyData());
        };
        request.onerror = () => {
          console.error('Failed to read data', request.error);
          resolve(loadLegacyData(localStorage) ?? createEmptyData());
        };
        tx.oncomplete = () => {
          db.close();
        };
        tx.onabort = () => {
          db.close();
        };
      });
    } catch (error) {
      console.error('Failed to open database', error);
      return loadLegacyData(localStorage) ?? createEmptyData();
    }
  };

  return { readData, saveData };
};
