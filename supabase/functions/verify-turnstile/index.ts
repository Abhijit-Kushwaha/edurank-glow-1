import { preflightResponse, withCors, withCorsError } from "../_shared/cors.ts";

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

Deno.serve(async (req) => {
  const preflight = preflightResponse(req);
  if (preflight) return preflight;

  try {
    const { token } = await req.json();

    if (!token || typeof token !== "string") {
      return withCorsError(req, 400, "Missing or invalid token");
    }

    const secretKey = Deno.env.get("TURNSTILE_SECRET_KEY");
    if (!secretKey) {
      console.error("TURNSTILE_SECRET_KEY not configured");
      return withCorsError(req, 500, "Server configuration error");
    }

    const formData = new FormData();
    formData.append("secret", secretKey);
    formData.append("response", token);

    // Get client IP from request headers
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
                     req.headers.get("cf-connecting-ip") ||
                     req.headers.get("x-real-ip");
    
    if (clientIp) {
      formData.append("remoteip", clientIp);
    }

    const verifyResponse = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      body: formData,
    });

    const result = await verifyResponse.json();

    if (result.success) {
      return withCors(req, { json: { success: true } });
    } else {
      console.error("Turnstile verification failed:", result["error-codes"]);
      return withCorsError(req, 400, "Verification failed");
    }
  } catch (error) {
    console.error("Turnstile verification error:", error);
    return withCorsError(req, 500, "Verification failed");
  }
});
