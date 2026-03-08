import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callLovableAI } from "../_shared/lovableAI.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { consumeCredits, CREDIT_COSTS } from "../_shared/credits.ts";

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

    const { subject, difficulty, numQuestions, battleId, source } = await req.json();

    if (!difficulty || !numQuestions || !battleId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user is the battle creator
    const { data: battle, error: battleError } = await supabase
      .from("battles")
      .select("creator_id")
      .eq("id", battleId)
      .single();

    if (battleError || !battle || battle.creator_id !== user.id) {
      return new Response(JSON.stringify({ error: "Not authorized for this battle" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validDifficulties = ["easy", "medium", "hard", "adaptive"];
    const safeDifficulty = validDifficulties.includes(difficulty) ? difficulty : "medium";
    const safeNum = Math.min(Math.max(Number(numQuestions) || 5, 3), 15);

    // Build context based on source type
    let sourceContext = "";
    const sourceType = source?.type || "custom_topic";

    if (sourceType === "my_notes" && source?.noteContent) {
      const noteContent = String(source.noteContent).slice(0, 3000);
      sourceContext = `Generate questions STRICTLY based on these study notes:\n\n${noteContent}\n\nExtract key concepts and create questions testing understanding of the material.`;
    } else if (sourceType === "my_videos" && source?.videoTitle) {
      const videoTitle = String(source.videoTitle).slice(0, 200);
      sourceContext = `Generate questions based on the educational video titled "${videoTitle}". Create questions about the key concepts that would typically be covered in this video topic.`;
    } else if (sourceType === "ai_mixed") {
      sourceContext = `Generate a diverse mix of educational questions from various popular academic topics including science, math, history, technology, and general knowledge. Make it interesting and varied.`;
    } else {
      const sanitizedSubject = (subject || "General Knowledge").replace(/[<>"\x00-\x1f]/g, "").slice(0, 50);
      sourceContext = `Generate questions about "${sanitizedSubject}".`;
    }

    const systemPrompt = `You are a quiz question generator for students. Generate exactly ${safeNum} multiple-choice questions at ${safeDifficulty} difficulty level. Each question must have exactly 4 options with one correct answer.`;

    const userPrompt = `${sourceContext}

Generate ${safeNum} quiz questions at "${safeDifficulty}" difficulty. Return a JSON array where each element has: question_text (string), options (array of 4 strings), correct_answer (0-3 index), difficulty ("easy"/"medium"/"hard"). Only return the JSON array, no other text.`;

    const aiResponse = await callLovableAI(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { temperature: 0.8, max_tokens: 3000 }
    );

    // Parse AI response
    let questions;
    try {
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("No JSON array found");
      questions = JSON.parse(jsonMatch[0]);
    } catch {
      return new Response(JSON.stringify({ error: "Failed to parse AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate and insert questions
    const validQuestions = questions
      .filter((q: any) =>
        q.question_text &&
        Array.isArray(q.options) &&
        q.options.length === 4 &&
        typeof q.correct_answer === "number" &&
        q.correct_answer >= 0 &&
        q.correct_answer <= 3
      )
      .slice(0, safeNum);

    if (validQuestions.length === 0) {
      return new Response(JSON.stringify({ error: "No valid questions generated" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to insert questions
    const serviceSupabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const questionsToInsert = validQuestions.map((q: any, i: number) => ({
      battle_id: battleId,
      question_text: q.question_text.slice(0, 500),
      options: q.options.map((o: string) => String(o).slice(0, 200)),
      correct_answer: q.correct_answer,
      difficulty: ["easy", "medium", "hard"].includes(q.difficulty) ? q.difficulty : safeDifficulty,
      order_index: i,
      time_limit: safeDifficulty === "easy" ? 15 : safeDifficulty === "hard" ? 8 : 10,
    }));

    const { error: insertError } = await serviceSupabase
      .from("battle_questions")
      .insert(questionsToInsert);

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to save questions" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, count: questionsToInsert.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: unknown) {
    console.error("Error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg.includes("Rate limit") ? 429 : msg.includes("Payment") ? 402 : 500;
    return new Response(
      JSON.stringify({ error: msg }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
