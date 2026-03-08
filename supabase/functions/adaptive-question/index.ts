import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, logRateLimitRequest } from "../_shared/rateLimit.ts";
import { preflightResponse, withCors, withCorsError } from "../_shared/cors.ts";
import { consumeCredits, CREDIT_COSTS } from "../_shared/credits.ts";

const MAX_NOTES_LENGTH = 50000;
const FORBIDDEN_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /disregard\s+(all\s+)?previous/i,
  /forget\s+(all\s+)?previous/i,
  /system\s*:\s*/i,
  /\[\s*INST\s*\]/i,
  /pretend\s+you\s+are/i,
  /act\s+as\s+if/i,
  /you\s+are\s+now/i,
  /new\s+instructions/i,
  /override\s+instructions/i,
];

function sanitizeInput(input: string, maxLength: number): { isValid: boolean; sanitized: string; error?: string } {
  if (!input || typeof input !== "string") return { isValid: false, sanitized: "", error: "Input must be a non-empty string" };
  let sanitized = input.trim();
  if (!sanitized) return { isValid: false, sanitized: "", error: "Input cannot be empty" };
  if (sanitized.length > maxLength) return { isValid: false, sanitized: "", error: `Input exceeds maximum length of ${maxLength} characters` };
  for (const pattern of FORBIDDEN_PATTERNS) { if (pattern.test(sanitized)) return { isValid: false, sanitized: "", error: "Invalid input detected" }; }
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").replace(/\\/g, "").trim();
  return { isValid: true, sanitized };
}

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

serve(async (req) => {
  const preflight = preflightResponse(req);
  if (preflight) return preflight;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return withCorsError(req, 401, "No authorization header");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) return withCorsError(req, 401, "Unauthorized");

    const rateLimitResult = await checkRateLimit(supabaseClient, { operation: "adaptive-question", userId: user.id, limitsPerHour: 20, limitsPerDay: 100 });
    if (!rateLimitResult.allowed) return withCorsError(req, 429, rateLimitResult.message || "Rate limit exceeded");

    const { notes, previousQuestion, wasCorrect, difficulty } = await req.json();
    if (!notes || !previousQuestion) return withCorsError(req, 400, "Missing required fields: notes, previousQuestion");

    const notesValidation = sanitizeInput(notes, MAX_NOTES_LENGTH);
    if (!notesValidation.isValid) return withCorsError(req, 400, notesValidation.error || "Invalid notes content");

    const currentDifficulty = difficulty || "medium";
    let newDifficulty: string;
    let difficultyInstruction: string;

    if (wasCorrect) {
      if (currentDifficulty === "easy") { newDifficulty = "medium"; difficultyInstruction = "Generate a MEDIUM difficulty question that requires deeper understanding."; }
      else if (currentDifficulty === "medium") { newDifficulty = "hard"; difficultyInstruction = "Generate a HARD difficulty question that requires complex reasoning or application."; }
      else { newDifficulty = "hard"; difficultyInstruction = "Generate another challenging HARD question testing advanced understanding."; }
    } else {
      if (currentDifficulty === "hard") { newDifficulty = "medium"; difficultyInstruction = "Generate an EASIER MEDIUM difficulty question on the same concept."; }
      else if (currentDifficulty === "medium") { newDifficulty = "easy"; difficultyInstruction = "Generate an EASY question that helps reinforce the basic concept."; }
      else { newDifficulty = "easy"; difficultyInstruction = "Generate another EASY foundational question to build understanding."; }
    }

    const questionContent = await callLovableAI([
      { role: "system", content: `You are an adaptive assessment designer. Generate a single follow-up question based on the student's performance.\n\n${difficultyInstruction}\n\nThe question should:\n- Test conceptual understanding, not memorization\n- Have plausible but clearly incorrect distractors\n- Include a brief explanation for the correct answer\n- Be related to the topic but DIFFERENT from the previous question\n\nQUALITY RULES:\n- No "All of the above" or "None of the above"\n- Avoid absolute words (always, never)\n- Clear, unambiguous wording\n\nRespond with ONLY valid JSON, no markdown:\n{\n  "id": 1,\n  "type": "adaptive",\n  "difficulty": "${newDifficulty}",\n  "question": "Question text",\n  "options": ["Option A", "Option B", "Option C", "Option D"],\n  "correctAnswer": 0,\n  "explanation": "Why this answer is correct"\n}` },
      { role: "user", content: `Study Notes:\n${notesValidation.sanitized}\n\nPrevious Question: "${previousQuestion}"\nStudent answered: ${wasCorrect ? "CORRECTLY" : "INCORRECTLY"}\n\nGenerate an appropriate follow-up question.` },
    ]);

    if (!questionContent) throw new Error("No content generated from AI");

    let question;
    try {
      let cleanContent = questionContent.trim();
      if (cleanContent.startsWith("```json")) cleanContent = cleanContent.slice(7);
      if (cleanContent.startsWith("```")) cleanContent = cleanContent.slice(3);
      if (cleanContent.endsWith("```")) cleanContent = cleanContent.slice(0, -3);
      question = JSON.parse(cleanContent.trim());
    } catch { throw new Error("Failed to generate adaptive question"); }

    await logRateLimitRequest(supabaseClient, user.id, "adaptive-question", true);

    return withCors(req, { json: { question, difficulty: newDifficulty } });
  } catch (error) {
    console.error("Error in adaptive-question function:", error);
    return withCorsError(req, 500, "An internal error occurred");
  }
});
