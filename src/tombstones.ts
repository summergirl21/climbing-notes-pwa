export type TombstoneRow = {
  record_type: 'tombstone_gym' | 'tombstone_route' | 'tombstone_attempt';
  gym_name?: string;
  route_id?: string;
  attempt_id?: string;
  updated_at?: string;
};

const TOMBSTONES_PREFIX = 'climbingNotesTombstones:';

const getTombstonesKey = (userKey: string) => `${TOMBSTONES_PREFIX}${userKey}`;

const buildTombstoneKey = (row: TombstoneRow) => {
  if (row.record_type === 'tombstone_gym') {
    return row.gym_name ? `gym:${row.gym_name}` : null;
  }
  if (row.record_type === 'tombstone_route') {
    return row.route_id ? `route:${row.route_id}` : null;
  }
  if (row.record_type === 'tombstone_attempt') {
    return row.attempt_id ? `attempt:${row.attempt_id}` : null;
  }
  return null;
};

const normalizeRow = (row: TombstoneRow): TombstoneRow | null => {
  const updatedAt = row.updated_at ? String(row.updated_at) : undefined;
  if (row.record_type === 'tombstone_gym' && row.gym_name) {
    return { record_type: 'tombstone_gym', gym_name: row.gym_name, updated_at: updatedAt };
  }
  if (row.record_type === 'tombstone_route' && row.route_id) {
    return { record_type: 'tombstone_route', route_id: row.route_id, updated_at: updatedAt };
  }
  if (row.record_type === 'tombstone_attempt' && row.attempt_id) {
    return {
      record_type: 'tombstone_attempt',
      attempt_id: row.attempt_id,
      updated_at: updatedAt,
    };
  }
  return null;
};

export const readTombstones = (storage: Storage, userKey: string): TombstoneRow[] => {
  const raw = storage.getItem(getTombstonesKey(userKey));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as TombstoneRow[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeRow).filter((row): row is TombstoneRow => Boolean(row));
  } catch (error) {
    console.warn('Failed to parse tombstones', error);
    return [];
  }
};

const writeTombstones = (storage: Storage, userKey: string, rows: TombstoneRow[]) => {
  try {
    storage.setItem(getTombstonesKey(userKey), JSON.stringify(rows));
  } catch (error) {
    console.warn('Failed to store tombstones', error);
  }
};

export const clearTombstones = (storage: Storage, userKey: string) => {
  storage.removeItem(getTombstonesKey(userKey));
};

export const addTombstones = (storage: Storage, userKey: string, incoming: TombstoneRow[]) => {
  const existing = readTombstones(storage, userKey);
  const map = new Map<string, TombstoneRow>();

  existing.forEach((row) => {
    const key = buildTombstoneKey(row);
    if (key) map.set(key, row);
  });

  incoming.forEach((row) => {
    const normalized = normalizeRow(row);
    if (!normalized) return;
    const key = buildTombstoneKey(normalized);
    if (key) map.set(key, normalized);
  });

  const rows = Array.from(map.values());
  writeTombstones(storage, userKey, rows);
  return rows;
};
