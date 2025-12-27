import type { SyncRow } from './syncClient.js';

const SYNC_QUEUE_KEY = 'climbingNotesSyncQueue';

const buildQueueKey = (userKey: string) => `${SYNC_QUEUE_KEY}:${userKey}`;

const normalizeRecordType = (value?: string) => (value ? value.trim().toLowerCase() : '');

export const getSyncRowKey = (
  row: Pick<SyncRow, 'record_type' | 'gym_name' | 'route_id' | 'attempt_id'>
) => {
  const recordType = normalizeRecordType(row.record_type);
  if (recordType === 'gym') {
    return row.gym_name ? `gym:${row.gym_name}` : null;
  }
  if (recordType === 'route') {
    return row.route_id ? `route:${row.route_id}` : null;
  }
  if (recordType === 'attempt') {
    return row.attempt_id ? `attempt:${row.attempt_id}` : null;
  }
  return null;
};

const normalizeRow = (row: SyncRow): SyncRow | null => {
  const recordType = normalizeRecordType(row.record_type);
  if (recordType === 'gym' && row.gym_name) {
    return { ...row, record_type: 'gym', gym_name: row.gym_name };
  }
  if (recordType === 'route' && row.route_id) {
    return { ...row, record_type: 'route', route_id: row.route_id };
  }
  if (recordType === 'attempt' && row.attempt_id) {
    return { ...row, record_type: 'attempt', attempt_id: row.attempt_id };
  }
  return null;
};

export const readSyncQueue = (storage: Storage, userKey: string): SyncRow[] => {
  const raw = storage.getItem(buildQueueKey(userKey));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as SyncRow[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeRow).filter((row): row is SyncRow => Boolean(row));
  } catch (error) {
    console.warn('Failed to parse sync queue', error);
    return [];
  }
};

const writeSyncQueue = (storage: Storage, userKey: string, rows: SyncRow[]) => {
  try {
    storage.setItem(buildQueueKey(userKey), JSON.stringify(rows));
  } catch (error) {
    console.warn('Failed to store sync queue', error);
  }
};

export const clearSyncQueue = (storage: Storage, userKey: string) => {
  storage.removeItem(buildQueueKey(userKey));
};

export const addSyncRows = (storage: Storage, userKey: string, incoming: SyncRow[]) => {
  const existing = readSyncQueue(storage, userKey);
  const map = new Map<string, SyncRow>();

  existing.forEach((row) => {
    const key = getSyncRowKey(row);
    if (key) map.set(key, row);
  });

  incoming.forEach((row) => {
    const normalized = normalizeRow(row);
    if (!normalized) return;
    const key = getSyncRowKey(normalized);
    if (key) map.set(key, normalized);
  });

  const rows = Array.from(map.values());
  writeSyncQueue(storage, userKey, rows);
  return rows;
};

export const removeSyncRows = (storage: Storage, userKey: string, keys: string[]) => {
  if (keys.length === 0) return readSyncQueue(storage, userKey);
  const keySet = new Set(keys);
  const filtered = readSyncQueue(storage, userKey).filter((row) => {
    const key = getSyncRowKey(row);
    return key ? !keySet.has(key) : false;
  });
  writeSyncQueue(storage, userKey, filtered);
  return filtered;
};
