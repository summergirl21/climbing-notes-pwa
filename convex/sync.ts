import { v } from "convex/values";
import { query } from "./_generated/server";

export const syncPull = query({
  args: {
    lastSyncAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }
    const userId = identity.subject;
    const rows = await ctx.db
      .query("sync_rows")
      .withIndex("by_user_updated_at", (q) => {
        const scoped = q.eq("user_id", userId);
        return args.lastSyncAt ? scoped.gt("updated_at", args.lastSyncAt) : scoped;
      })
      .collect();
    return { rows, serverTime: new Date().toISOString() };
  },
});
