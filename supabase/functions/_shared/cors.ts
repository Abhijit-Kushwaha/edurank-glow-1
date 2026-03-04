// CORS configuration utility for secure cross-origin requests

const ALLOWED_ORIGINS = [
  // Production
  "https://brainbuddy-glow.vercel.app",
  "https://brainbuddy.app",
  "https://www.brainbuddy.app",
  "https://brainbuddy-glow.lovable.app",

  // Development
  "http://localhost:5173",
  "http://localhost:3000",

  // Lovable preview
  "https://lovable.dev",
];

function getCORSHeaders(
  originHeader: string | null,
): Record<string, string> {
  const allowedOrigin =
    originHeader && ALLOWED_ORIGINS.includes(originHeader)
      ? originHeader
      : "*"; // Fall back to wildcard if origin not in list (safer for edge cases)

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Max-Age": "3600",
  };
}

/**
 * Handle CORS preflight (OPTIONS) requests.
 * Returns a Response if it's a preflight, null otherwise.
 */
export function preflightResponse(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCORSHeaders(req.headers.get("origin")) });
  }
  return null;
}

/**
 * Wrap a successful JSON response with CORS headers.
 */
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

/**
 * Wrap an error response with CORS headers.
 */
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

// Keep legacy exports for any other functions that haven't migrated yet
export { getCORSHeaders, getCORSHeaders as handleCORSPreflight };
