import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, logRateLimitRequest } from "../_shared/rateLimit.ts";
import { preflightResponse, withCors, withCorsError } from "../_shared/cors.ts";

const MAX_NOTES_LENGTH = 50000;
const MAX_ID_LENGTH = 100;
const FORBIDDEN_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /disregard\s+(all\s+)?previous/i,
  /forget\s+(all\s+)?previous/i,
  /\[\s*INST\s*\]/i,
  /\<\s*\|\s*im_start\s*\|\s*\>/i,
  /\<\s*\|\s*im_end\s*\|\s*\>/i,
  /\{\{\s*system/i,
  /override\s+instructions/i,
];

function sanitizeInput(input: string, maxLength: number): { isValid: boolean; sanitized: string; error?: string } {
  if (!input || typeof input !== "string") return { isValid: false, sanitized: "", error: "Input must be a non-empty string" };
  let sanitized = input.trim();
  if (!sanitized) return { isValid: false, sanitized: "", error: "Input cannot be empty" };
  if (sanitized.length > maxLength) return { isValid: false, sanitized: "", error: `Input exceeds maximum length of ${maxLength} characters` };
  for (const pattern of FORBIDDEN_PATTERNS) { if (pattern.test(sanitized)) { console.warn("Potential prompt injection detected"); return { isValid: false, sanitized: "", error: "Invalid input detected" }; } }
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").replace(/\\/g, "").trim();
  return { isValid: true, sanitized };
}

function validateId(id: string): { isValid: boolean; error?: string } {
  if (!id || typeof id !== "string") return { isValid: false, error: "ID must be a non-empty string" };
  if (id.length > MAX_ID_LENGTH) return { isValid: false, error: `ID exceeds maximum length` };
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) return { isValid: false, error: "Invalid ID format" };
  return { isValid: true };
}

const SYSTEM_PROMPT = `You are an assessment designer specializing in conceptual understanding.

Generate quiz questions that test deep comprehension, not surface recall.
Wrong options must be plausible but incorrect.

QUESTION TYPES TO INCLUDE:
1. Concept Check - Tests understanding of main idea
2. Mechanism Check - Tests how something works
3. Application Check - Tests real-world usage
4. Misconception Trap - Uses common wrong belief as an option
5. "Why" Question - Tests reasoning, not facts

QUALITY RULES:
- No "All of the above" or "None of the above"
- Avoid absolute words (always, never)
- Explanations must be simple and corrective

You must respond with ONLY a valid JSON array, no markdown, no code blocks.
Each question must have this structure:
{
  "id": 1,
  "type": "concept_check",
  "question": "Question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": 0,
  "explanation": "1-2 lines explaining why the correct answer is right"
}

Types: concept_check, mechanism_check, application_check, misconception_trap, why_question
correctAnswer is the 0-based index of the correct option.`;

const LOVABLE_AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function callLovableAI(messages: { role: string; content: string }[]): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
  const response = await fetch(LOVABLE_AI_GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages, temperature: 0.7, max_tokens: 2000 }),
  });
  if (!response.ok) {
    if (response.status === 429) throw new Error("Rate limit exceeded. Please try again later.");
    if (response.status === 402) throw new Error("Payment required.");
    if (response.status === 401) throw new Error("Invalid API key or authentication failed.");
    throw new Error(`AI gateway error: ${response.status}`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

const FALLBACK_QUESTIONS = [
  { id: 1, type: "concept_check", question: "What is the main concept covered in this material?", options: ["Option A", "Option B", "Option C", "Option D"], correctAnswer: 0, explanation: "This tests your understanding of the core concept presented." },
  { id: 2, type: "mechanism_check", question: "How does this process work?", options: ["Statement A", "Statement B", "Statement C", "Statement D"], correctAnswer: 1, explanation: "Understanding the mechanism helps you apply the concept." },
  { id: 3, type: "application_check", question: "How can this knowledge be applied in practice?", options: ["Application A", "Application B", "Application C", "Application D"], correctAnswer: 2, explanation: "Real-world application demonstrates true understanding." },
  { id: 4, type: "misconception_trap", question: "Which of the following is a common misconception?", options: ["Misconception A", "Misconception B", "Misconception C", "Correct understanding"], correctAnswer: 3, explanation: "Identifying misconceptions helps solidify correct understanding." },
  { id: 5, type: "why_question", question: "Why is this concept important?", options: ["Reason A", "Reason B", "Reason C", "Reason D"], correctAnswer: 1, explanation: "Understanding 'why' deepens your comprehension." },
];

serve(async (req) => {
  const preflight = preflightResponse(req);
  if (preflight) return preflight;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return withCorsError(req, 401, "No authorization header");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return withCorsError(req, 401, "Unauthorized");
    const userId = claimsData.claims.sub as string;

    const rateLimitResult = await checkRateLimit(supabaseClient, { operation: "generate-quiz", userId, limitsPerHour: 5, limitsPerDay: 20 });
    if (!rateLimitResult.allowed) return withCorsError(req, 429, rateLimitResult.message || "Rate limit exceeded");

    const { todoId, notes } = await req.json();
    if (!todoId || !notes) return withCorsError(req, 400, "Missing required fields: todoId, notes");

    const todoIdValidation = validateId(todoId);
    if (!todoIdValidation.isValid) return withCorsError(req, 400, todoIdValidation.error || "Invalid todo ID");
    const notesValidation = sanitizeInput(notes, MAX_NOTES_LENGTH);
    if (!notesValidation.isValid) return withCorsError(req, 400, notesValidation.error || "Invalid notes content");

    console.log(`Generating quiz for todo: ${todoId}`);

    const { data: existingQuiz } = await supabaseClient.from("quizzes").select("*").eq("todo_id", todoId).maybeSingle();
    if (existingQuiz) return withCors(req, { json: { quiz: existingQuiz.questions, quizId: existingQuiz.id } });

    const questionsContent = await callLovableAI([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Generate 5 MCQ questions based on these study notes:\n\n${notesValidation.sanitized}` },
    ]);

    let questions;
    try {
      let cleanContent = questionsContent.trim();
      if (cleanContent.startsWith("```json")) cleanContent = cleanContent.slice(7);
      if (cleanContent.startsWith("```")) cleanContent = cleanContent.slice(3);
      if (cleanContent.endsWith("```")) cleanContent = cleanContent.slice(0, -3);
      questions = JSON.parse(cleanContent.trim());
    } catch { questions = FALLBACK_QUESTIONS; }

    console.log("Quiz generated successfully");
    await logRateLimitRequest(supabaseClient, userId, "generate-quiz", true);

    const { data: savedQuiz, error: saveError } = await supabaseClient
      .from("quizzes").insert({ user_id: userId, todo_id: todoId, questions }).select().single();

    if (saveError) {
      console.error("Error saving quiz:", saveError);
      return withCors(req, { json: { quiz: questions, saved: false } });
    }

    return withCors(req, { json: { quiz: questions, quizId: savedQuiz.id, saved: true } });
  } catch (error) {
    console.error("Error in generate-quiz function:", error);
    return withCorsError(req, 500, error instanceof Error ? error.message : "Unknown error");
  }
});
