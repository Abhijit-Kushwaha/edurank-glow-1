import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { callLovableAI } from "../_shared/lovableAI.ts";
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
    // Auth check
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

    const creditResult = await consumeCredits(user.id, CREDIT_COSTS["analyze-battle"]);
    if (!creditResult.success) {
      return new Response(JSON.stringify({ error: creditResult.error || "Insufficient credits" }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { subject, correctQuestions, wrongQuestions, totalQuestions, correctCount } = await req.json();

    // Input sanitization — match patterns used across all other AI edge functions
    const FORBIDDEN_PATTERNS = [
      /ignore\s+(all\s+)?previous\s+instructions/i,
      /disregard\s+(all\s+)?previous/i,
      /forget\s+(all\s+)?previous/i,
      /override\s+instructions/i,
      /you\s+are\s+now/i,
      /act\s+as\s+a/i,
      /system\s*:\s*/i,
    ];

    function sanitize(input: string, max: number): string {
      if (typeof input !== "string") return "";
      const trimmed = input.replace(/[\x00-\x1F\x7F]/g, "").trim().slice(0, max);
      for (const p of FORBIDDEN_PATTERNS) {
        if (p.test(trimmed)) throw new Error("Invalid input");
      }
      return trimmed;
    }

    const safeSubject = sanitize(subject ?? "", 100);
    const safeCorrect = (correctQuestions ?? []).slice(0, 20).map((q: string) => sanitize(q, 200));
    const safeWrong = (wrongQuestions ?? []).slice(0, 20).map((q: string) => sanitize(q, 200));
    const safeTotalQuestions = Math.min(Math.max(Number(totalQuestions) || 0, 0), 100);
    const safeCorrectCount = Math.min(Math.max(Number(correctCount) || 0, 0), safeTotalQuestions);

    const prompt = `Analyze this quiz battle performance and return a JSON object.

Subject: ${safeSubject}
Total Questions: ${safeTotalQuestions}
Correct: ${safeCorrectCount}

Correctly answered questions:
${safeCorrect.map((q: string) => `- ${q}`).join("\n") || "None"}

Incorrectly answered questions:
${safeWrong.map((q: string) => `- ${q}`).join("\n") || "None"}

Return ONLY a JSON object with these fields:
{
  "strong_topics": ["topic1", "topic2"],
  "weak_topics": ["topic1"],
  "suggestions": ["suggestion1", "suggestion2"],
  "overall_message": "Brief encouraging message about performance"
}

Keep topics concise (2-4 words each). Keep suggestions actionable (1 sentence each). Maximum 3 items per array.`;

    const aiResponse = await callLovableAI(
      [
        { role: "system", content: "You are a learning analytics AI. Analyze quiz performance and identify strengths/weaknesses. Return only valid JSON." },
        { role: "user", content: prompt },
      ],
      { temperature: 0.5, max_tokens: 500 }
    );

    let analysis;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");
      analysis = JSON.parse(jsonMatch[0]);
    } catch {
      analysis = {
        strong_topics: safeCorrectCount > 0 ? [`${safeSubject} basics`] : [],
        weak_topics: safeWrong.length > 0 ? [`${safeSubject} advanced concepts`] : [],
        suggestions: ["Review missed questions", "Practice more in this subject"],
        overall_message: `You scored ${safeCorrectCount}/${safeTotalQuestions}. ${safeCorrectCount >= safeTotalQuestions / 2 ? "Good job!" : "Keep practicing!"}`,
      };
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg.includes("Rate limit") ? 429 : msg.includes("Payment") ? 402 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
