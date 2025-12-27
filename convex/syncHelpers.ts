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

const tombstoneTypes = new Set<TombstoneType>([
  "tombstone_gym",
  "tombstone_route",
  "tombstone_attempt",
]);

export const isTombstoneType = (recordType: string): recordType is TombstoneType =>
  tombstoneTypes.has(recordType as TombstoneType);

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
