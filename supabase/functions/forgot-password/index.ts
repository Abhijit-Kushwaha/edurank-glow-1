import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { preflightResponse, withCors, withCorsError } from "../_shared/cors.ts";

function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
}

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_HOUR = 3;

serve(async (req) => {
  const preflight = preflightResponse(req);
  if (preflight) return preflight;

  try {
    if (req.method !== "POST") return withCorsError(req, 405, "Method not allowed");

    const body = await req.json().catch(() => null);
    const email = body?.email;
    if (!isValidEmail(email)) return withCorsError(req, 400, "Invalid email");

    const normalizedEmail = email.trim().toLowerCase();

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      console.error("Supabase env not configured");
      return withCorsError(req, 500, "An internal error occurred");
    }

    const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Database-backed rate limiting (survives cold starts)
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    const { count, error: rlError } = await serviceClient
      .from("rate_limit_logs")
      .select("id", { count: "exact", head: true })
      .eq("operation", "forgot-password")
      .eq("ip_address", normalizedEmail)
      .gte("created_at", windowStart);

    if (rlError) {
      console.error("Rate limit check error:", rlError);
      // Fail closed
      return withCorsError(req, 429, "Too many requests. Please try again later.");
    }

    if ((count ?? 0) >= MAX_REQUESTS_PER_HOUR) {
      return withCorsError(req, 429, "Too many requests. Please try again later.");
    }

    // Log the request for rate limiting (use ip_address field to store email key since no user_id)
    await serviceClient.from("rate_limit_logs").insert({
      user_id: "00000000-0000-0000-0000-000000000000",
      operation: "forgot-password",
      ip_address: normalizedEmail,
      success: true,
    });

    const { error } = await serviceClient.auth.resetPasswordForEmail({ email: normalizedEmail } as any);

    if (error) {
      console.error("Error sending reset email:", error);
      // Always return success to prevent email enumeration
    }

    // Always return OK to prevent email enumeration attacks
    return withCors(req, { json: { ok: true } });
  } catch (err) {
    console.error("forgot-password function error:", err);
    return withCorsError(req, 500, "An internal error occurred");
  }
});
