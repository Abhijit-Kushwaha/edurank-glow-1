// Shared CORS configuration — production-safe, SaaS-ready
// Supports: production domains, Vercel preview deployments, localhost, Lovable previews

const STATIC_ALLOWED_ORIGINS = [
  "https://brainbuddy.app",
  "https://www.brainbuddy.app",
  "https://brainbuddy-glow.vercel.app",
  "https://brainbuddy-glow.lovable.app",
  "http://localhost:5173",
  "http://localhost:3000",
  "https://lovable.dev",
];

const FALLBACK_ORIGIN = "https://brainbuddy.app";

/**
 * Dynamically validates origin:
 * 1. Exact match in static list
 * 2. Any *.vercel.app preview deployment
 * 3. Any *.lovable.app preview
 * 4. Falls back to production domain (never "*")
 */
function resolveOrigin(origin: string | null): string {
  if (!origin) return FALLBACK_ORIGIN;
  if (STATIC_ALLOWED_ORIGINS.includes(origin)) return origin;

  try {
    const url = new URL(origin);
    // Allow any Vercel preview: *.vercel.app
    if (url.hostname.endsWith(".vercel.app")) return origin;
    // Allow any Lovable preview: *.lovable.app or *.lovable.dev
    if (url.hostname.endsWith(".lovable.app") || url.hostname.endsWith(".lovable.dev")) return origin;
  } catch {
    // Invalid URL — fall through
  }

  return FALLBACK_ORIGIN;
}

function getCORSHeaders(origin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": resolveOrigin(origin),
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Max-Age": "3600",
  };
}

/** Handle OPTIONS preflight. Returns Response if OPTIONS, null otherwise. */
export function preflightResponse(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCORSHeaders(req.headers.get("origin")) });
  }
  return null;
}

/** Wrap a success JSON response with CORS headers. */
export function withCors(
  req: Request,
  { status = 200, json }: { status?: number; json: unknown },
): Response {
  return new Response(JSON.stringify(json), {
    status,
    headers: {
      ...getCORSHeaders(req.headers.get("origin")),
      "Content-Type": "application/json",
    },
  });
}

/** Wrap an error JSON response with CORS headers. */
export function withCorsError(
  req: Request,
  status: number,
  error: string,
): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: {
      ...getCORSHeaders(req.headers.get("origin")),
      "Content-Type": "application/json",
    },
  });
}

// Legacy export for backward compatibility
export { getCORSHeaders };
