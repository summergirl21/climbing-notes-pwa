import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  sync_rows: defineTable({
    user_id: v.string(),
    sync_key: v.string(),
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
    updated_at: v.string(),
    updated_at_ms: v.number(),
    client_updated_at: v.optional(v.string()),
    client_updated_at_ms: v.optional(v.number()),
  })
    .index("by_user_updated_at", ["user_id", "updated_at"])
    .index("by_user_updated_at_sync_key", ["user_id", "updated_at_ms", "sync_key"])
    .index("by_user_sync_key", ["user_id", "sync_key"]),
});
