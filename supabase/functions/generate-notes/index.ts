import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, logRateLimitRequest } from "../_shared/rateLimit.ts";
import { preflightResponse, withCors, withCorsError } from "../_shared/cors.ts";

const MAX_TITLE_LENGTH = 500;
const MAX_ID_LENGTH = 100;
const FORBIDDEN_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /disregard\s+(all\s+)?previous/i,
  /forget\s+(all\s+)?previous/i,
  /system\s*:\s*/i,
  /\[\s*INST\s*\]/i,
  /\<\s*\|\s*im_start\s*\|\s*\>/i,
  /\<\s*\|\s*im_end\s*\|\s*\>/i,
  /\{\{\s*system/i,
  /pretend\s+you\s+are/i,
  /act\s+as\s+if/i,
  /you\s+are\s+now/i,
  /new\s+instructions/i,
  /override\s+instructions/i,
];

function sanitizeInput(input: string, maxLength: number): { isValid: boolean; sanitized: string; error?: string } {
  if (!input || typeof input !== "string") return { isValid: false, sanitized: "", error: "Input must be a non-empty string" };
  let sanitized = input.trim();
  if (sanitized.length === 0) return { isValid: false, sanitized: "", error: "Input cannot be empty" };
  if (sanitized.length > maxLength) return { isValid: false, sanitized: "", error: `Input exceeds maximum length of ${maxLength} characters` };
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(sanitized)) { console.warn("Potential prompt injection detected"); return { isValid: false, sanitized: "", error: "Invalid input detected" }; }
  }
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").replace(/[<>]/g, "").replace(/\\/g, "").trim();
  return { isValid: true, sanitized };
}

function validateId(id: string): { isValid: boolean; error?: string } {
  if (!id || typeof id !== "string") return { isValid: false, error: "ID must be a non-empty string" };
  if (id.length > MAX_ID_LENGTH) return { isValid: false, error: `ID exceeds maximum length of ${MAX_ID_LENGTH} characters` };
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) return { isValid: false, error: "Invalid ID format" };
  return { isValid: true };
}

async function fetchVideoContext(videoTitle: string, videoId: string): Promise<string> {
  const PERPLEXITY_API_KEY = Deno.env.get("perplexity_api_key");
  if (!PERPLEXITY_API_KEY) { console.log("Perplexity API key not configured, skipping context fetch"); return ""; }
  try {
    console.log("Fetching video context using Perplexity...");
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${PERPLEXITY_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          { role: "system", content: "You are a research assistant. Provide comprehensive educational content and key concepts related to the given YouTube video topic." },
          { role: "user", content: `Research the topic of this YouTube video and provide key educational content:\nTitle: "${videoTitle}"\nYouTube Video ID: ${videoId}\n\nProvide:\n1. Main concepts and definitions\n2. Key facts and important points\n3. Related subtopics\n4. Study-worthy information` },
        ],
        max_tokens: 2000,
      }),
    });
    if (!response.ok) { console.error("Perplexity API error:", response.status); return ""; }
    const data = await response.json();
    const context = data.choices?.[0]?.message?.content || "";
    console.log("Video context fetched successfully, length:", context.length);
    return context;
  } catch (error) {
    console.error("Error fetching video context:", error instanceof Error ? error.message : "Unknown error");
    return "";
  }
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
    if (response.status === 402) throw new Error("Payment required. Please add funds to your Lovable AI workspace.");
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

    const serviceClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    const rateLimitResult = await checkRateLimit(supabaseClient, { operation: "generate-notes", userId: user.id, limitsPerHour: 3, limitsPerDay: 10 });
    if (!rateLimitResult.allowed) return withCorsError(req, 429, rateLimitResult.message || "Rate limit exceeded");

    const { videoTitle, videoId, todoId } = await req.json();
    if (!videoTitle || !videoId || !todoId) return withCorsError(req, 400, "Missing required fields: videoTitle, videoId, todoId");

    const titleValidation = sanitizeInput(videoTitle, MAX_TITLE_LENGTH);
    if (!titleValidation.isValid) return withCorsError(req, 400, titleValidation.error || "Invalid video title");
    const videoIdValidation = validateId(videoId);
    if (!videoIdValidation.isValid) return withCorsError(req, 400, videoIdValidation.error || "Invalid video ID");
    const todoIdValidation = validateId(todoId);
    if (!todoIdValidation.isValid) return withCorsError(req, 400, todoIdValidation.error || "Invalid todo ID");

    const sanitizedTitle = titleValidation.sanitized;
    console.log(`Generating notes for video: ${sanitizedTitle} (${videoId})`);

    const videoContext = await fetchVideoContext(sanitizedTitle, videoId);
    const generatedNotes = await callLovableAI([
      { role: "system", content: `You are an expert educational content creator specializing in generating comprehensive, well-structured study notes.\n\nYour notes must be:\n- Accurate and based on the provided context\n- Well-organized with clear headings\n- Student-friendly with practical examples\n- Complete with key definitions and concepts\n\nFormat your response in clear markdown with:\n## Key Concepts\n## Important Points\n## Summary\n## Study Tips` },
      { role: "user", content: `Generate detailed, comprehensive study notes for an educational video.\n\n**Video Title:** "${sanitizedTitle}"\n**Video ID:** ${videoId}\n\n${videoContext ? `**Research Context:**\n${videoContext}\n\nUse the above research context to create accurate, detailed study notes.` : ""}\n\nCreate professional study notes that would help a student:\n1. Understand the core concepts\n2. Remember key facts and definitions\n3. Apply the knowledge effectively\n4. Prepare for exams on this topic\n\nMake the notes comprehensive and educational.` },
    ]);

    if (!generatedNotes) throw new Error("No content generated from AI");
    console.log("Notes generated successfully using Lovable AI");

    await logRateLimitRequest(supabaseClient, user.id, "generate-notes", true);
    await serviceClient.rpc("check_achievements", { uid: user.id });

    const { data: savedNote, error: saveError } = await supabaseClient
      .from("notes")
      .insert({ user_id: user.id, todo_id: todoId, video_id: videoId, content: generatedNotes, is_ai_generated: true })
      .select()
      .single();

    if (saveError) {
      console.error("Error saving notes:", saveError);
      return withCors(req, { json: { notes: generatedNotes, saved: false, error: "Notes generated but failed to save" } });
    }

    return withCors(req, { json: { notes: generatedNotes, saved: true, noteId: savedNote.id } });
  } catch (error) {
    console.error("Error in generate-notes function:", error);
    return withCorsError(req, 500, "An internal error occurred");
  }
});
