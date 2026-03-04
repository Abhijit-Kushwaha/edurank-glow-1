import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { preflightResponse, withCors, withCorsError } from "../_shared/cors.ts";

serve(async (req) => {
  const preflight = preflightResponse(req);
  if (preflight) return preflight;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return withCorsError(req, 401, "Unauthorized");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return withCorsError(req, 401, "Unauthorized");
    const userId = claimsData.claims.sub as string;

    const { code } = await req.json();
    if (!code || typeof code !== "string" || code.trim().length === 0 || code.length > 20) {
      return withCors(req, { status: 400, json: { valid: false, error: "Invalid code format" } });
    }

    const serviceClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: invite, error: fetchError } = await serviceClient
      .from("friend_invite_codes")
      .select("id, user_id, is_used, expires_at")
      .eq("code", code.toUpperCase().trim())
      .eq("is_used", false)
      .maybeSingle();

    if (fetchError) { console.error("Error fetching invite code:", fetchError); return withCorsError(req, 500, "Lookup failed"); }
    if (!invite) return withCors(req, { json: { valid: false, error: "Invalid or expired invite code" } });
    if (new Date(invite.expires_at) < new Date()) return withCors(req, { json: { valid: false, error: "This invite code has expired" } });
    if (invite.user_id === userId) return withCors(req, { json: { valid: false, error: "You can't use your own invite code" } });

    await serviceClient.from("friend_invite_codes").update({ is_used: true, used_by: userId }).eq("id", invite.id);

    return withCors(req, { json: { valid: true, inviterUserId: invite.user_id } });
  } catch (error) {
    console.error("validate-invite-code error:", error);
    return withCorsError(req, 500, "Internal error");
  }
});
