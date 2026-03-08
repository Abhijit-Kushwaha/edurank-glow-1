import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, logRateLimitRequest } from "../_shared/rateLimit.ts";
import { preflightResponse, withCors, withCorsError } from "../_shared/cors.ts";
import { consumeCredits, CREDIT_COSTS } from "../_shared/credits.ts";

const LOVABLE_AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

function detectSubjectType(subject?: string, topic?: string): string {
  const combined = `${subject || ""} ${topic || ""}`.toLowerCase();
  if (/math|algebra|geometry|calculus|trigonometry|equation/.test(combined)) return "numerical";
  if (/history|civics|geography|political|economics/.test(combined)) return "theory-heavy";
  if (/physics|chemistry|biology|science/.test(combined)) return "conceptual";
  return "general";
}

serve(async (req) => {
  const preflight = preflightResponse(req);
  if (preflight) return preflight;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return withCorsError(req, 401, "Unauthorized");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) return withCorsError(req, 401, "Unauthorized");

    const rateLimitResult = await checkRateLimit(supabaseClient, {
      operation: "ai-notes-gen", userId: user.id, limitsPerHour: 5, limitsPerDay: 20,
    });
    if (!rateLimitResult.allowed) return withCorsError(req, 429, rateLimitResult.message || "Rate limit exceeded");

    const creditResult = await consumeCredits(user.id, CREDIT_COSTS["ai-notes-gen"]);
    if (!creditResult.success) return withCorsError(req, 402, creditResult.error || "Insufficient credits");

    const { topic, subject, classLevel } = await req.json();

    if (!topic || typeof topic !== "string" || topic.trim().length === 0) return withCorsError(req, 400, "Topic is required");
    if (topic.length > 500) return withCorsError(req, 400, "Topic too long");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const subjectType = detectSubjectType(subject, topic);

    let subjectHint = "";
    if (subjectType === "numerical") subjectHint = "Focus on step-by-step solutions, formulas, and worked examples.";
    else if (subjectType === "theory-heavy") subjectHint = "Focus on timelines, causes & effects, key dates, and important facts.";
    else if (subjectType === "conceptual") subjectHint = "Focus on concepts, diagrams explanation (in text), processes, and scientific principles.";

    const systemPrompt = `You are BrainBuddy Notes Engine — an ultra-fast, exam-focused notes generator for students.

Generate notes in this EXACT structure (use markdown headings):

## Quick Overview
(2-3 lines, simple language summary)

## Key Concepts
(Bullet points of core ideas)

## Detailed Explanation
(Short paragraphs, no fluff — clear and direct)

## Examples / Applications
(Real-world or exam-based examples)

## Formulas / Facts / Rules
(If applicable — list all important formulas, dates, rules)

## Exam Tips & Common Traps
(Common mistakes students make, tricky points)

## Quick Revision Box
(One-glance summary — the absolute essentials)

Rules:
- Be concise. Use bullet points heavily.
- Prioritize exam-readiness.
- ${subjectHint}
- Adapt depth to the class level if provided.
- No storytelling. No filler.`;

    const userPrompt = `Generate comprehensive study notes for:
Topic: "${topic.trim()}"${subject ? `\nSubject: ${subject}` : ""}${classLevel ? `\nClass: ${classLevel}` : ""}`;

    const response = await fetch(LOVABLE_AI_GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        temperature: 0.5,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return withCorsError(req, 429, "Rate limit exceeded");
      if (response.status === 402) return withCorsError(req, 402, "Payment required");
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const notes = data.choices?.[0]?.message?.content || "";
    if (!notes) throw new Error("No notes generated");

    await logRateLimitRequest(supabaseClient, user.id, "ai-notes-gen", true);

    return withCors(req, { json: { notes } });
  } catch (error) {
    console.error("ai-notes-gen error:", error);
    return withCorsError(req, 500, "An error occurred generating notes");
  }
});
