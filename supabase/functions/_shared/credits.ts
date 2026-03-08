import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Consume credits for a user. Uses the service role client to call the
 * consume_credits RPC so it bypasses RLS.
 * 
 * @returns { success: boolean, remaining?: number, error?: string }
 */
export async function consumeCredits(
  userId: string,
  amount: number = 1,
): Promise<{ success: boolean; remaining?: number; error?: string }> {
  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  // Ensure user has a credit record
  await serviceClient
    .from("user_credits")
    .upsert(
      { user_id: userId, credits_remaining: 100, credits_used: 0 },
      { onConflict: "user_id", ignoreDuplicates: true },
    );

  // Check current credits
  const { data: creditData, error: fetchError } = await serviceClient
    .from("user_credits")
    .select("credits_remaining, last_reset_at")
    .eq("user_id", userId)
    .single();

  if (fetchError || !creditData) {
    console.error("Failed to fetch credits:", fetchError?.message);
    return { success: false, error: "Failed to check credits" };
  }

  // Auto-reset if 30+ days since last reset
  const lastReset = new Date(creditData.last_reset_at);
  const now = new Date();
  const daysSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceReset >= 30) {
    await serviceClient
      .from("user_credits")
      .update({ credits_remaining: 100, credits_used: 0, last_reset_at: now.toISOString(), updated_at: now.toISOString() })
      .eq("user_id", userId);
    creditData.credits_remaining = 100;
  }

  if (creditData.credits_remaining < amount) {
    return {
      success: false,
      remaining: creditData.credits_remaining,
      error: `Insufficient credits. You have ${creditData.credits_remaining} credits remaining.`,
    };
  }

  // Deduct credits
  const { error: updateError } = await serviceClient
    .from("user_credits")
    .update({
      credits_remaining: creditData.credits_remaining - amount,
      credits_used: creditData.credits_remaining >= amount ? amount : 0,
      updated_at: now.toISOString(),
    })
    .eq("user_id", userId);

  if (updateError) {
    console.error("Failed to deduct credits:", updateError.message);
    return { success: false, error: "Failed to deduct credits" };
  }

  return {
    success: true,
    remaining: creditData.credits_remaining - amount,
  };
}

/** Credit costs for each feature */
export const CREDIT_COSTS: Record<string, number> = {
  "ai-chat": 1,
  "ai-notes-gen": 2,
  "generate-quiz": 2,
  "find-video": 1,
  "generate-flashcards": 2,
  "analyze-weakness": 1,
  "fix-weak-areas-quiz": 2,
  "generate-battle-questions": 1,
  "analyze-battle": 1,
  "adaptive-question": 1,
};
