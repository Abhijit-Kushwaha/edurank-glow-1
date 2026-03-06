import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rateLimit.ts";
import { preflightResponse, withCors, withCorsError } from "../_shared/cors.ts";

interface TopicInput { name: string; weaknessScore: number; }

const LOVABLE_AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

const FORBIDDEN_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /disregard\s+(all\s+)?previous/i,
  /you\s+are\s+now\s+(a|an)/i,
  /system\s*:\s*/i,
  /\bpretend\s+(you|to)\b/i,
  /act\s+as\s+(a|an)/i,
  /forget\s+(all\s+)?(your|previous)/i,
  /new\s+instructions?\s*:/i,
  /override\s+(all\s+)?instructions/i,
  /jailbreak/i,
];

function sanitizeInput(input: string, maxLength: number): { isValid: boolean; sanitized: string; error?: string } {
  if (typeof input !== "string") return { isValid: false, sanitized: "", error: "Input must be a string" };
  const trimmed = input.trim().substring(0, maxLength);
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { isValid: false, sanitized: "", error: "Input contains prohibited content" };
    }
  }
  return { isValid: true, sanitized: trimmed };
}

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
    if (!authHeader?.startsWith("Bearer ")) return withCorsError(req, 401, "No authorization header");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return withCorsError(req, 401, "Unauthorized");

    const rateLimitResult = await checkRateLimit(supabaseClient, {
      operation: "fix-weak-areas-quiz", userId: claimsData.claims.sub as string, limitsPerHour: 3, limitsPerDay: 10,
    });
    if (!rateLimitResult.allowed) return withCorsError(req, 429, rateLimitResult.message || "Rate limit exceeded");

    const { topics, notes, questionsPerTopic = 2 } = await req.json();
    if (!topics || !Array.isArray(topics) || topics.length === 0) return withCorsError(req, 400, "No topics provided");
    if (topics.length > 20) return withCorsError(req, 400, "Too many topics");

    const typedTopics = topics as TopicInput[];

    // Validate each topic name for injection
    for (const topic of typedTopics) {
      if (typeof topic.name !== "string" || topic.name.length > 200) {
        return withCorsError(req, 400, "Invalid topic name");
      }
      const nameCheck = sanitizeInput(topic.name, 200);
      if (!nameCheck.isValid) return withCorsError(req, 400, nameCheck.error || "Invalid topic name");
      if (typeof topic.weaknessScore !== "number" || topic.weaknessScore < 0 || topic.weaknessScore > 100) {
        return withCorsError(req, 400, "Invalid weakness score");
      }
    }

    const sortedTopics = [...typedTopics].sort((a, b) => b.weaknessScore - a.weaknessScore);
    const topicsDescription = sortedTopics.map((t) => `- ${t.name} (weakness score: ${Math.round(t.weaknessScore)}%)`).join("\n");

    let contentContext = "";
    if (notes) {
      const notesCheck = sanitizeInput(notes, 6000);
      if (!notesCheck.isValid) return withCorsError(req, 400, notesCheck.error || "Invalid notes content");
      contentContext = `\n\nHere is study material related to these topics:\n\n${notesCheck.sanitized}\n`;
    }

    const totalQuestions = Math.min(sortedTopics.length * questionsPerTopic, 10);

    const content = await callLovableAI([
      { role: "system", content: `You are an educational quiz generator specialized in helping students improve their weak areas.\n\nYour task is to generate targeted practice questions that:\n1. Focus on the EXACT concepts the student is weak in\n2. Start with easier questions to build confidence\n3. Include clear explanations for each answer\n4. Test understanding, not just memorization\n\nCRITICAL: Generate questions that specifically target the weak concepts listed.\n\nReturn ONLY a valid JSON object in this exact format:\n{\n  "questions": [\n    {\n      "topicName": "Topic Name",\n      "difficulty": "easy|medium|hard",\n      "question": "Question text here?",\n      "options": ["Option A", "Option B", "Option C", "Option D"],\n      "correctAnswer": 0,\n      "explanation": "Why this answer is correct."\n    }\n  ]\n}` },
      { role: "user", content: `Generate ${totalQuestions} practice questions targeting these weak topics:\n\n${topicsDescription}${contentContext}\n\nFor each question:\n1. Clearly connect it to one of the weak topics\n2. Match difficulty to weakness score (higher score = start easier)\n3. Include a helpful explanation` },
    ]);

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Invalid AI response format");

    const parsed = JSON.parse(jsonMatch[0]);
    const questions = (parsed.questions || []).map((q: any, index: number) => {
      const matchingTopic = sortedTopics.find((t) => t.name.toLowerCase() === (q.topicName || "").toLowerCase());
      return { ...q, id: index + 1, topicId: matchingTopic ? q.topicName : undefined };
    });

    console.log(`Generated ${questions.length} questions for weak areas`);
    return withCors(req, { json: { questions } });
  } catch (error) {
    console.error("Error in fix-weak-areas-quiz:", error);
    return withCorsError(req, 500, "An internal error occurred");
  }
});
