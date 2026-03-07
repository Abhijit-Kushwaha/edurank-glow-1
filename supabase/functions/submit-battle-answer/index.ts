import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { battleId, questionId, selectedAnswer, timeTaken, streakCount } = await req.json();

    if (!battleId || !questionId || typeof selectedAnswer !== "number" || typeof timeTaken !== "number") {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify user is a participant
    const { data: player, error: playerError } = await serviceClient
      .from("battle_players")
      .select("id, score")
      .eq("battle_id", battleId)
      .eq("user_id", user.id)
      .single();

    if (playerError || !player) {
      return new Response(JSON.stringify({ error: "Not a participant" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the question and verify correct answer SERVER-SIDE
    const { data: question, error: qError } = await serviceClient
      .from("battle_questions")
      .select("correct_answer, difficulty")
      .eq("id", questionId)
      .eq("battle_id", battleId)
      .single();

    if (qError || !question) {
      return new Response(JSON.stringify({ error: "Question not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for duplicate answer
    const { data: existing } = await serviceClient
      .from("battle_answers")
      .select("id")
      .eq("battle_id", battleId)
      .eq("question_id", questionId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: "Already answered" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Server-side evaluation
    const isCorrect = selectedAnswer === question.correct_answer;
    const safeStreak = isCorrect ? Math.min(Math.max(streakCount || 0, 0), 50) : 0;
    const safeTime = Math.min(Math.max(timeTaken, 0), 60);

    // Compute points server-side
    let pointsEarned = 0;
    if (isCorrect) {
      pointsEarned += 10; // accuracy
      if (safeTime <= 3) pointsEarned += 5; // speed bonus
      if (question.difficulty === "hard") pointsEarned += 10; // hard bonus
      if (safeStreak >= 2) pointsEarned += 5; // streak bonus
    }

    // Insert answer
    const { error: insertError } = await serviceClient.from("battle_answers").insert({
      battle_id: battleId,
      question_id: questionId,
      user_id: user.id,
      selected_answer: selectedAnswer,
      is_correct: isCorrect,
      time_taken_seconds: safeTime,
      points_earned: pointsEarned,
      streak_count: safeStreak,
    });

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to save answer" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update player score atomically
    const newScore = (player.score || 0) + pointsEarned;
    await serviceClient
      .from("battle_players")
      .update({ score: newScore })
      .eq("battle_id", battleId)
      .eq("user_id", user.id);

    return new Response(
      JSON.stringify({ isCorrect, pointsEarned, newScore, streak: safeStreak }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: unknown) {
    console.error("Error:", e);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
