import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import type { SyncRowInput } from "./syncHelpers";

const http = httpRouter();

const ALLOWED_ORIGINS = new Set(["http://localhost:8000", "https://summergirl21.github.io"]);

const buildCorsHeaders = (origin: string | null) => {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
  }
  return headers;
};

const isAllowedOrigin = (origin: string | null) => !origin || ALLOWED_ORIGINS.has(origin);

http.route({
  path: "/hello",
  method: "OPTIONS",
  handler: httpAction(async (_ctx, request) => {
    const origin = request.headers.get("Origin");
    const corsHeaders = buildCorsHeaders(origin);
    if (!isAllowedOrigin(origin)) {
      return new Response("Forbidden", { status: 403, headers: corsHeaders });
    }
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }),
});

http.route({
  path: "/sync/pull",
  method: "OPTIONS",
  handler: httpAction(async (_ctx, request) => {
    const origin = request.headers.get("Origin");
    const corsHeaders = buildCorsHeaders(origin);
    if (!isAllowedOrigin(origin)) {
      return new Response("Forbidden", { status: 403, headers: corsHeaders });
    }
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }),
});

http.route({
  path: "/sync/push",
  method: "OPTIONS",
  handler: httpAction(async (_ctx, request) => {
    const origin = request.headers.get("Origin");
    const corsHeaders = buildCorsHeaders(origin);
    if (!isAllowedOrigin(origin)) {
      return new Response("Forbidden", { status: 403, headers: corsHeaders });
    }
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }),
});

http.route({
  path: "/hello",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("Origin");
    const corsHeaders = buildCorsHeaders(origin);
    if (!isAllowedOrigin(origin)) {
      return new Response("Forbidden", { status: 403, headers: corsHeaders });
    }
    let identity = null;
    try {
      identity = await ctx.auth.getUserIdentity();
    } catch (error) {
      console.error("Auth failed", error);
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }
    if (!identity) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }
    return new Response(
      JSON.stringify({
        message: "hello from convex",
        subject: identity.subject,
        email: identity.email,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }),
});

http.route({
  path: "/sync/pull",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("Origin");
    const corsHeaders = buildCorsHeaders(origin);
    if (!isAllowedOrigin(origin)) {
      return new Response("Forbidden", { status: 403, headers: corsHeaders });
    }
    let identity = null;
    try {
      identity = await ctx.auth.getUserIdentity();
    } catch (error) {
      console.error("Auth failed", error);
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }
    if (!identity) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    let payload: { lastSyncAtMs?: number; lastSyncKey?: string } = {};
    try {
      payload = (await request.json()) as { lastSyncAtMs?: number; lastSyncKey?: string };
    } catch (error) {
      console.warn("Invalid sync payload", error);
    }

    try {
      const result = await ctx.runQuery(api.sync.syncPull, {
        lastSyncAtMs: payload.lastSyncAtMs,
        lastSyncKey: payload.lastSyncKey,
      });
      return new Response(JSON.stringify(result), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.error("Sync pull failed", error);
      return new Response("Sync failed", { status: 500, headers: corsHeaders });
    }
  }),
});

http.route({
  path: "/sync/push",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("Origin");
    const corsHeaders = buildCorsHeaders(origin);
    if (!isAllowedOrigin(origin)) {
      return new Response("Forbidden", { status: 403, headers: corsHeaders });
    }
    let identity = null;
    try {
      identity = await ctx.auth.getUserIdentity();
    } catch (error) {
      console.error("Auth failed", error);
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }
    if (!identity) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    let payload: { rows?: unknown[] } = {};
    try {
      payload = (await request.json()) as { rows?: unknown[] };
    } catch (error) {
      console.warn("Invalid sync payload", error);
    }

    if (!Array.isArray(payload.rows)) {
      return new Response("Invalid payload", { status: 400, headers: corsHeaders });
    }

    try {
      const rows = payload.rows.map((row) => {
        if (!row || typeof row !== "object") return {};
        const record = row as { attempt_index?: string | number };
        return {
          ...record,
          attempt_index:
            record.attempt_index === undefined || record.attempt_index === null
              ? undefined
              : String(record.attempt_index),
        };
      }) as SyncRowInput[];
      const result = await ctx.runMutation(api.sync.syncPush, { rows });
      return new Response(JSON.stringify(result), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.error("Sync push failed", error);
      return new Response("Sync failed", { status: 500, headers: corsHeaders });
    }
  }),
});

export default http;
