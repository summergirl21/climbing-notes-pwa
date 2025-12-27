export const RECORD_TYPES = [
  "gym",
  "route",
  "attempt",
  "tombstone_gym",
  "tombstone_route",
  "tombstone_attempt",
] as const;

export type SyncRecordType = (typeof RECORD_TYPES)[number];
export type TombstoneType = Extract<SyncRecordType, `tombstone_${string}`>;

export type SyncRowIdentity = {
  record_type: SyncRecordType;
  gym_name?: string;
  route_id?: string;
  attempt_id?: string;
};

export type SyncRowInput = {
  record_type: string;
  gym_name?: string;
  route_id?: string;
  attempt_id?: string;
  rope_number?: string;
  color?: string;
  set_date?: string;
  grade?: string;
  climb_date?: string;
  attempt_index?: string;
  climb_style?: string;
  completion_style?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  updated_at_ms?: number;
};

export type SyncRowComparable = SyncRowIdentity & {
  rope_number?: string;
  color?: string;
  set_date?: string;
  grade?: string;
  climb_date?: string;
  attempt_index?: string;
  climb_style?: string;
  completion_style?: string;
  notes?: string;
};

const tombstoneTypes = new Set<TombstoneType>([
  "tombstone_gym",
  "tombstone_route",
  "tombstone_attempt",
]);

export const isTombstoneType = (recordType: string): recordType is TombstoneType =>
  tombstoneTypes.has(recordType as TombstoneType);

const normalizeText = (value?: string) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const normalizeRecordType = (value?: string) => {
  const normalized = normalizeText(value)?.toLowerCase();
  if (!normalized) return undefined;
  return RECORD_TYPES.includes(normalized as SyncRecordType)
    ? (normalized as SyncRecordType)
    : undefined;
};

const normalizeAttemptIndex = (value?: string) => {
  if (value === undefined || value === null) return undefined;
  return normalizeText(String(value));
};

export const normalizeSyncRow = (row: SyncRowInput): SyncRowComparable | null => {
  const recordType = normalizeRecordType(row.record_type);
  if (!recordType) return null;
  return {
    record_type: recordType,
    gym_name: normalizeText(row.gym_name),
    route_id: normalizeText(row.route_id),
    attempt_id: normalizeText(row.attempt_id),
    rope_number: normalizeText(row.rope_number),
    color: normalizeText(row.color),
    set_date: normalizeText(row.set_date),
    grade: normalizeText(row.grade),
    climb_date: normalizeText(row.climb_date),
    attempt_index: normalizeAttemptIndex(row.attempt_index),
    climb_style: normalizeText(row.climb_style),
    completion_style: normalizeText(row.completion_style),
    notes: normalizeText(row.notes),
  };
};

export const buildSyncKey = (row: SyncRowIdentity): string | null => {
  const recordType = row.record_type;
  if (recordType === "gym" || recordType === "tombstone_gym") {
    return row.gym_name ? `gym:${row.gym_name}` : null;
  }
  if (recordType === "route" || recordType === "tombstone_route") {
    return row.route_id ? `route:${row.route_id}` : null;
  }
  if (recordType === "attempt" || recordType === "tombstone_attempt") {
    return row.attempt_id ? `attempt:${row.attempt_id}` : null;
  }
  return null;
};

const compareFields = [
  "record_type",
  "gym_name",
  "route_id",
  "attempt_id",
  "rope_number",
  "color",
  "set_date",
  "grade",
  "climb_date",
  "attempt_index",
  "climb_style",
  "completion_style",
  "notes",
] as const;

export const rowsEqual = (
  existing: SyncRowComparable,
  incoming: SyncRowComparable
): boolean =>
  compareFields.every((field) => (existing[field] ?? "") === (incoming[field] ?? ""));
