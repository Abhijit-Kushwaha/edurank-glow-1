import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { preflightResponse, withCors, withCorsError } from "../_shared/cors.ts";

function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
}

serve(async (req) => {
  const preflight = preflightResponse(req);
  if (preflight) return preflight;

  try {
    if (req.method !== "POST") return withCorsError(req, 405, "Method not allowed");

    const body = await req.json().catch(() => null);
    const email = body?.email;
    if (!isValidEmail(email)) return withCorsError(req, 400, "Invalid email");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) { console.error("Supabase env not configured"); return withCorsError(req, 500, "Server not configured"); }

    const supabaseClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { error } = await supabaseClient.auth.resetPasswordForEmail({ email: email.trim() } as any);

    if (error) { console.error("Error sending reset email:", error); return withCorsError(req, 500, error.message || "Failed to send reset email"); }

    return withCors(req, { json: { ok: true } });
  } catch (err) {
    console.error("forgot-password function error:", err);
    return withCorsError(req, 500, err instanceof Error ? err.message : "Unknown error");
  }
});
