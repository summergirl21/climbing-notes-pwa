import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  buildSyncKey,
  isTombstoneType,
  normalizeSyncRow,
  rowsEqual,
  type SyncRowInput,
} from "./syncHelpers";

const parseTimestampMs = (value?: string) => {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getClientTimestamp = (row: SyncRowInput, fallback: { ms: number; iso: string }) => {
  const raw = row.updated_at ?? row.created_at;
  const parsed = parseTimestampMs(raw);
  if (parsed === null) return fallback;
  return { ms: parsed, iso: new Date(parsed).toISOString() };
};

const getExistingClientMs = (existing?: { client_updated_at_ms?: number; client_updated_at?: string }) => {
  if (typeof existing?.client_updated_at_ms === "number") return existing.client_updated_at_ms;
  return parseTimestampMs(existing?.client_updated_at);
};

export const syncPull = query({
  args: {
    lastSyncAtMs: v.optional(v.number()),
    lastSyncKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }
    const userId = identity.subject;
    const lastSyncAtMs = args.lastSyncAtMs;
    let rows;

    if (typeof lastSyncAtMs === "number") {
      rows = await ctx.db
        .query("sync_rows")
        .withIndex("by_user_updated_at_sync_key", (q) =>
          q.eq("user_id", userId).gte("updated_at_ms", lastSyncAtMs)
        )
        .collect();
    } else {
      rows = await ctx.db
        .query("sync_rows")
        .withIndex("by_user_updated_at_sync_key", (q) => q.eq("user_id", userId))
        .collect();
    }

    return { rows, serverTime: new Date().toISOString() };
  },
});

export const syncPush = mutation({
  args: {
    rows: v.array(
      v.object({
        record_type: v.string(),
        gym_name: v.optional(v.string()),
        route_id: v.optional(v.string()),
        attempt_id: v.optional(v.string()),
        rope_number: v.optional(v.string()),
        color: v.optional(v.string()),
        set_date: v.optional(v.string()),
        grade: v.optional(v.string()),
        climb_date: v.optional(v.string()),
        attempt_index: v.optional(v.string()),
        climb_style: v.optional(v.string()),
        completion_style: v.optional(v.string()),
        notes: v.optional(v.string()),
        created_at: v.optional(v.string()),
        updated_at: v.optional(v.string()),
        updated_at_ms: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }
    const userId = identity.subject;
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    let applied = 0;
    let skipped = 0;
    const conflicts: Array<{ sync_key: string; record_type: string }> = [];

    for (const row of args.rows as SyncRowInput[]) {
      const normalized = normalizeSyncRow(row);
      if (!normalized) {
        skipped += 1;
        continue;
      }
      const syncKey = buildSyncKey(normalized);
      if (!syncKey) {
        skipped += 1;
        continue;
      }

      const existing = await ctx.db
        .query("sync_rows")
        .withIndex("by_user_sync_key", (q) => q.eq("user_id", userId).eq("sync_key", syncKey))
        .unique();

      const existingNormalized = existing ? normalizeSyncRow(existing as SyncRowInput) : null;
      if (existingNormalized && rowsEqual(existingNormalized, normalized)) {
        skipped += 1;
        continue;
      }

      const clientTimestamp = getClientTimestamp(row, { ms: nowMs, iso: nowIso });
      const existingClientMs = getExistingClientMs(existing ?? undefined);
      if (existingClientMs !== null) {
        if (clientTimestamp.ms < existingClientMs) {
          conflicts.push({ sync_key: syncKey, record_type: normalized.record_type });
          continue;
        }
        if (clientTimestamp.ms === existingClientMs) {
          const incomingIsTombstone = isTombstoneType(normalized.record_type);
          const existingIsTombstone =
            existing?.record_type && isTombstoneType(existing.record_type);
          if (!incomingIsTombstone && existingIsTombstone) {
            conflicts.push({ sync_key: syncKey, record_type: normalized.record_type });
            continue;
          }
          if (!incomingIsTombstone || existingIsTombstone) {
            skipped += 1;
            continue;
          }
        }
      }

      const createdAt = existing?.created_at ?? row.created_at ?? nowIso;
      const payload = {
        user_id: userId,
        sync_key: syncKey,
        record_type: normalized.record_type,
        gym_name: normalized.gym_name,
        route_id: normalized.route_id,
        attempt_id: normalized.attempt_id,
        rope_number: normalized.rope_number,
        color: normalized.color,
        set_date: normalized.set_date,
        grade: normalized.grade,
        climb_date: normalized.climb_date,
        attempt_index: normalized.attempt_index,
        climb_style: normalized.climb_style,
        completion_style: normalized.completion_style,
        notes: normalized.notes,
        created_at: createdAt,
        updated_at: nowIso,
        updated_at_ms: nowMs,
        client_updated_at: clientTimestamp.iso,
        client_updated_at_ms: clientTimestamp.ms,
      };

      if (existing) {
        await ctx.db.patch(existing._id, payload);
      } else {
        await ctx.db.insert("sync_rows", payload);
      }
      applied += 1;
    }

    return { applied, skipped, conflicts, serverTime: nowIso };
  },
});
