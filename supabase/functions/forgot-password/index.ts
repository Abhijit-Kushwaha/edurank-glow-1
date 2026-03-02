import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://brainbuddy.app",
  "https://www.brainbuddy.app",
  "http://localhost:5173",
  "http://localhost:3000",
  "https://lovable.dev",
];

function getCORSHeaders(originHeader: string | null): Record<string, string> {
  const allowedOrigin =
    originHeader && ALLOWED_ORIGINS.includes(originHeader)
      ? originHeader
      : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "3600",
  };
}

function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const re = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  return re.test(email.trim());
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    const corsHeaders = getCORSHeaders(req.headers.get("origin"));
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const corsHeaders = getCORSHeaders(req.headers.get("origin"));

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => null);
    const email = body?.email;

    if (!isValidEmail(email)) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      console.error("Supabase env not configured");
      return new Response(JSON.stringify({ error: "Server not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Use the server-side client (service role) to trigger a password reset email
    const { error } = await supabaseClient.auth.resetPasswordForEmail({
      email: email.trim(),
    } as any);

    if (error) {
      console.error("Error sending reset email:", error);
      return new Response(
        JSON.stringify({
          error: error.message || "Failed to send reset email",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("forgot-password function error:", err);
    const errorCorsHeaders = getCORSHeaders(null);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...errorCorsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
