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

    const { quizId, todoId, answers, difficulty } = await req.json();

    if (!quizId || !todoId || !Array.isArray(answers)) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch the quiz questions to verify answers server-side
    const { data: quiz, error: quizError } = await serviceClient
      .from("quizzes")
      .select("questions, user_id")
      .eq("id", quizId)
      .eq("user_id", user.id)
      .single();

    if (quizError || !quiz) {
      return new Response(JSON.stringify({ error: "Quiz not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const questions = quiz.questions as Array<{ correctAnswer: number; difficulty?: string; question?: string }>;

    if (!Array.isArray(questions) || questions.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid quiz data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (answers.length !== questions.length) {
      return new Response(JSON.stringify({ error: "Answer count mismatch" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Server-side verification of correct answers
    let correctCount = 0;
    const verifiedAnswers = answers.map((selectedAnswer: number, index: number) => {
      const q = questions[index];
      const isCorrect = selectedAnswer === q.correctAnswer;
      if (isCorrect) correctCount++;
      return {
        selected: selectedAnswer,
        correct: q.correctAnswer,
        difficulty: q.difficulty || "medium",
        isCorrect,
      };
    });

    const totalQuestions = questions.length;
    const score = Math.round(((correctCount / totalQuestions) * 100) * 10) / 10;

    // Insert verified result
    const { data: result, error: insertError } = await serviceClient
      .from("quiz_results")
      .insert({
        user_id: user.id,
        todo_id: todoId,
        score,
        correct_answers: correctCount,
        total_questions: totalQuestions,
        answers: verifiedAnswers,
        difficulty: difficulty || questions[0]?.difficulty || "medium",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to save results" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, score, correctCount, totalQuestions }),
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
