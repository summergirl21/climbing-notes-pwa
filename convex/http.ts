import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
};

http.route({
  path: "/hello",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }),
});

http.route({
  path: "/hello",
  method: "GET",
  handler: httpAction(async (ctx) => {
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
        message: "hello 123",
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

export default http;
