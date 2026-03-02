import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, logRateLimitRequest } from "../_shared/rateLimit.ts";
import { getCORSHeaders, handleCORSPreflight } from "../_shared/cors.ts";

const LOVABLE_AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

const MAX_MESSAGE_LENGTH = 2000;
const MAX_MESSAGES = 50;
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

function validateMessages(messages: any[]): {
  isValid: boolean;
  error?: string;
} {
  if (!Array.isArray(messages) || messages.length === 0) {
    return { isValid: false, error: "Messages must be a non-empty array" };
  }
  if (messages.length > MAX_MESSAGES) {
    return { isValid: false, error: "Too many messages" };
  }
  for (const msg of messages) {
    if (!msg.role || typeof msg.role !== "string") {
      return { isValid: false, error: "Invalid message structure" };
    }
    if (!msg.content || typeof msg.content !== "string") {
      return { isValid: false, error: "Invalid message structure" };
    }
    if (msg.content.length > MAX_MESSAGE_LENGTH) {
      return { isValid: false, error: "Message too long" };
    }
    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.test(msg.content)) {
        return { isValid: false, error: "Invalid message content" };
      }
    }
  }
  return { isValid: true };
}

serve(async (req) => {
  const preflightResponse = handleCORSPreflight(req);
  if (preflightResponse) return preflightResponse;

  const corsHeaders = getCORSHeaders(req.headers.get("origin"));

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit check
    const rateLimitResult = await checkRateLimit(supabaseClient, {
      operation: "ai-chat",
      userId: user.id,
      limitsPerHour: 30,
      limitsPerDay: 100,
    });
    if (!rateLimitResult.allowed) {
      return new Response(JSON.stringify({ error: rateLimitResult.message }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, userContext } = await req.json();

    // Input validation
    const validation = validateMessages(messages);
    if (!validation.isValid) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are BrainBuddy, a friendly and smart AI study partner for students.

Your capabilities:
- Solve doubts across ALL subjects (Math, Science, History, Geography, CS, etc.)
- Provide exam tips and study guidance
- Explain concepts in simple, student-friendly language
- Give step-by-step solutions
- Suggest study strategies

Rules:
- Keep answers clear, structured, and concise
- Use bullet points and headings when helpful
- If the question is about math, show step-by-step working
- Be encouraging and supportive
- If you don't know something, say so honestly
- Use markdown formatting for better readability

${userContext?.name ? `Student name: ${userContext.name}` : ""}
${userContext?.class ? `Class: ${userContext.class}` : ""}
${userContext?.subject ? `Current subject: ${userContext.subject}` : ""}`;

    const response = await fetch(LOVABLE_AI_GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.slice(-20),
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({
            error: "Rate limit exceeded. Please try again later.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add funds." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const reply =
      data.choices?.[0]?.message?.content ||
      "Sorry, I couldn't generate a response.";

    // Log successful request
    await logRateLimitRequest(supabaseClient, user.id, "ai-chat", true);

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("ai-chat error:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred processing your request" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
