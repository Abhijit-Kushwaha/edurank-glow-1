import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { preflightResponse, withCors, withCorsError } from "../_shared/cors.ts";

function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
}

// Simple in-memory rate limiter for unauthenticated endpoint
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_HOUR = 3;

function checkForgotPasswordRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= MAX_REQUESTS_PER_HOUR) return false;
  entry.count++;
  return true;
}

serve(async (req) => {
  const preflight = preflightResponse(req);
  if (preflight) return preflight;

  try {
    if (req.method !== "POST") return withCorsError(req, 405, "Method not allowed");

    const body = await req.json().catch(() => null);
    const email = body?.email;
    if (!isValidEmail(email)) return withCorsError(req, 400, "Invalid email");

    // Rate limit by email to prevent inbox flooding
    const normalizedEmail = email.trim().toLowerCase();
    if (!checkForgotPasswordRateLimit(normalizedEmail)) {
      return withCorsError(req, 429, "Too many requests. Please try again later.");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      console.error("Supabase env not configured");
      return withCorsError(req, 500, "An internal error occurred");
    }

    const supabaseClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { error } = await supabaseClient.auth.resetPasswordForEmail({ email: normalizedEmail } as any);

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
