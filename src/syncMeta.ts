export type SyncMeta = {
  lastSyncAt?: string;
  lastSyncAtMs?: number;
  lastSyncKey?: string;
  lastSyncedAt?: string;
};

const SYNC_META_PREFIX = 'climbingNotesSyncMeta:';

const getSyncMetaKey = (userKey: string) => `${SYNC_META_PREFIX}${userKey}`;

export const readSyncMeta = (storage: Storage, userKey: string): SyncMeta => {
  const raw = storage.getItem(getSyncMetaKey(userKey));
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as SyncMeta;
    if (!parsed) return {};
    const lastSyncAtMs =
      typeof parsed.lastSyncAtMs === 'number'
        ? parsed.lastSyncAtMs
        : parsed.lastSyncAt
          ? Date.parse(parsed.lastSyncAt)
          : undefined;
    return {
      ...parsed,
      lastSyncAtMs: Number.isFinite(lastSyncAtMs) ? lastSyncAtMs : undefined,
    };
  } catch (error) {
    console.warn('Failed to parse sync metadata', error);
    return {};
  }
};

export const writeSyncMeta = (storage: Storage, userKey: string, meta: SyncMeta) => {
  storage.setItem(getSyncMetaKey(userKey), JSON.stringify(meta));
};
