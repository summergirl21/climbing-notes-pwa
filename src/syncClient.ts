import { CSV_COLUMNS, buildCsv, mergeImportedData, parseCsvData } from './csv.js';
import type { Attempt, DataStore, Gym, Route } from './models.js';

export type SyncRow = {
  sync_key?: string;
  record_type: string;
  gym_name?: string;
  route_id?: string;
  attempt_id?: string;
  rope_number?: string;
  color?: string;
  set_date?: string;
  grade?: string;
  climb_date?: string;
  attempt_index?: string | number;
  climb_style?: string;
  completion_style?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  updated_at_ms?: number;
};

type TombstoneRow = SyncRow & {
  record_type: 'tombstone_gym' | 'tombstone_route' | 'tombstone_attempt';
};

const isTombstoneRow = (row: SyncRow): row is TombstoneRow =>
  row.record_type === 'tombstone_gym' ||
  row.record_type === 'tombstone_route' ||
  row.record_type === 'tombstone_attempt';

const normalizeRecordType = (value?: string) => (value ? value.trim().toLowerCase() : '');

const toCsvRow = (row: SyncRow) =>
  CSV_COLUMNS.map((column) => {
    const value = row[column as keyof SyncRow];
    if (value === undefined || value === null) return '';
    return String(value);
  });

const getTimestampMs = (value?: string) => {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getLocalTimestampMs = (record: { updatedAt?: string; createdAt?: string }) =>
  getTimestampMs(record.updatedAt ?? record.createdAt);

const getRowTimestampMs = (row: { updated_at?: string; updated_at_ms?: number }) => {
  if (typeof row.updated_at_ms === 'number') return row.updated_at_ms;
  return getTimestampMs(row.updated_at);
};

const shouldApplyTombstone = (localTimestamp: number | null, tombstoneTimestamp: number | null) => {
  if (!tombstoneTimestamp) return true;
  if (!localTimestamp) return true;
  return tombstoneTimestamp >= localTimestamp;
};

const applyTombstones = (data: DataStore, tombstones: TombstoneRow[]) => {
  let gyms = data.gyms.slice();
  let routes = data.routes.slice();
  let attempts = data.attempts.slice();

  tombstones.forEach((tombstone) => {
    if (tombstone.record_type === 'tombstone_gym' && tombstone.gym_name) {
      const gym = gyms.find((item) => item.name === tombstone.gym_name);
      if (
        gym &&
        shouldApplyTombstone(getLocalTimestampMs(gym), getRowTimestampMs(tombstone))
      ) {
        gyms = gyms.filter((item) => item.name !== tombstone.gym_name);
        const routeIds = new Set(
          routes.filter((route) => route.gymName === tombstone.gym_name).map((route) => route.routeId)
        );
        routes = routes.filter((route) => route.gymName !== tombstone.gym_name);
        attempts = attempts.filter((attempt) => !routeIds.has(attempt.routeId));
      }
      return;
    }

    if (tombstone.record_type === 'tombstone_route' && tombstone.route_id) {
      const route = routes.find((item) => item.routeId === tombstone.route_id);
      if (
        route &&
        shouldApplyTombstone(getLocalTimestampMs(route), getRowTimestampMs(tombstone))
      ) {
        routes = routes.filter((item) => item.routeId !== tombstone.route_id);
        attempts = attempts.filter((attempt) => attempt.routeId !== tombstone.route_id);
      }
      return;
    }

    if (tombstone.record_type === 'tombstone_attempt' && tombstone.attempt_id) {
      const attempt = attempts.find((item) => item.attemptId === tombstone.attempt_id);
      if (
        attempt &&
        shouldApplyTombstone(getLocalTimestampMs(attempt), getRowTimestampMs(tombstone))
      ) {
        attempts = attempts.filter((item) => item.attemptId !== tombstone.attempt_id);
      }
    }
  });

  return { ...data, gyms, routes, attempts };
};

export const applySyncRows = (current: DataStore, rows: SyncRow[]) => {
  const tombstones: TombstoneRow[] = [];
  const records: SyncRow[] = [];

  rows.forEach((row) => {
    const recordType = normalizeRecordType(row.record_type);
    if (!recordType) return;
    const normalized = { ...row, record_type: recordType };
    if (isTombstoneRow(normalized)) {
      tombstones.push(normalized);
    } else {
      records.push(normalized);
    }
  });

  let data = current;

  if (records.length > 0) {
    const csvRows = [CSV_COLUMNS.slice(), ...records.map((row) => toCsvRow(row))];
    const csv = buildCsv(csvRows);
    const parsed = parseCsvData(csv, new Date().toISOString());
    data = mergeImportedData(data, parsed).data;
  }

  if (tombstones.length > 0) {
    data = applyTombstones(data, tombstones);
  }

  return { data, tombstoneCount: tombstones.length, recordCount: records.length };
};

export const buildGymSyncRow = (gym: Gym): SyncRow => ({
  record_type: 'gym',
  gym_name: gym.name,
  created_at: gym.createdAt,
  updated_at: gym.updatedAt,
});

export const buildRouteSyncRow = (route: Route): SyncRow => ({
  record_type: 'route',
  gym_name: route.gymName,
  route_id: route.routeId,
  rope_number: route.ropeNumber,
  color: route.color,
  set_date: route.setDate,
  grade: route.grade,
  created_at: route.createdAt,
  updated_at: route.updatedAt,
});

export const buildAttemptSyncRow = (attempt: Attempt): SyncRow => ({
  record_type: 'attempt',
  route_id: attempt.routeId,
  attempt_id: attempt.attemptId,
  climb_date: attempt.climbDate,
  attempt_index: String(attempt.attemptIndex),
  climb_style: attempt.climbStyle,
  completion_style: attempt.completionStyle,
  notes: attempt.notes,
  created_at: attempt.createdAt,
  updated_at: attempt.updatedAt,
});

export const buildSyncRowsFromData = (data: DataStore): SyncRow[] => [
  ...data.gyms.map((gym) => buildGymSyncRow(gym)),
  ...data.routes.map((route) => buildRouteSyncRow(route)),
  ...data.attempts.map((attempt) => buildAttemptSyncRow(attempt)),
];

const getRowSyncKey = (row: SyncRow) => {
  if (row.sync_key) return row.sync_key;
  if (row.record_type === 'gym' || row.record_type === 'tombstone_gym') {
    return row.gym_name ? `gym:${row.gym_name}` : null;
  }
  if (row.record_type === 'route' || row.record_type === 'tombstone_route') {
    return row.route_id ? `route:${row.route_id}` : null;
  }
  if (row.record_type === 'attempt' || row.record_type === 'tombstone_attempt') {
    return row.attempt_id ? `attempt:${row.attempt_id}` : null;
  }
  return null;
};

export const getMaxCursor = (rows: SyncRow[]) => {
  let maxMs = Number.NEGATIVE_INFINITY;
  let maxKey = '';
  let found = false;

  rows.forEach((row) => {
    const timestampMs = getRowTimestampMs(row);
    const key = getRowSyncKey(row);
    if (!key || timestampMs === null || !Number.isFinite(timestampMs)) {
      return;
    }
    if (!found || timestampMs > maxMs || (timestampMs === maxMs && key > maxKey)) {
      maxMs = timestampMs;
      maxKey = key;
      found = true;
    }
  });

  if (!found) return null;
  return { lastSyncAtMs: maxMs, lastSyncKey: maxKey };
};
