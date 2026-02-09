import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://brainbuddy.app',
  'https://www.brainbuddy.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'https://lovable.dev',
];

function getCORSHeaders(originHeader: string | null): Record<string, string> {
  const allowedOrigin = (originHeader && ALLOWED_ORIGINS.includes(originHeader))
    ? originHeader
    : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '3600',
  };
}

interface TopicInput {
  name: string;
  weaknessScore: number;
}

// Lovable AI Gateway call
const LOVABLE_AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function callLovableAI(messages: { role: string; content: string }[]): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY is not configured");
  }

  console.log("Calling Lovable AI (gemini-3-flash-preview) for weak areas quiz...");
  
  const response = await fetch(LOVABLE_AI_GATEWAY, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages,
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    console.error("Lovable AI error:", response.status);
    
    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }
    if (response.status === 402) {
      throw new Error("Payment required. Please add funds to your Lovable AI workspace.");
    }
    if (response.status === 401) {
      throw new Error("Invalid API key or authentication failed.");
    }
    throw new Error(`AI gateway error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    const corsHeaders = getCORSHeaders(req.headers.get('origin'));
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const corsHeaders = getCORSHeaders(req.headers.get('origin'));
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error("Auth error:", claimsError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { topics, notes, questionsPerTopic = 2 } = await req.json();

    if (!topics || !Array.isArray(topics) || topics.length === 0) {
      return new Response(
        JSON.stringify({ error: "No topics provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const typedTopics = topics as TopicInput[];
    console.log(`Generating fix-weak-areas quiz for ${typedTopics.length} topics`);

    const sortedTopics = [...typedTopics].sort((a, b) => b.weaknessScore - a.weaknessScore);
    
    const topicsDescription = sortedTopics
      .map(t => `- ${t.name} (weakness score: ${Math.round(t.weaknessScore)}%)`)
      .join('\n');

    let contentContext = "";
    if (notes) {
      contentContext = `

Here is study material related to these topics:

${notes.substring(0, 6000)}
`;
    }

    const totalQuestions = Math.min(sortedTopics.length * questionsPerTopic, 10);

    const content = await callLovableAI([
      {
        role: "system",
        content: `You are an educational quiz generator specialized in helping students improve their weak areas.

Your task is to generate targeted practice questions that:
1. Focus on the EXACT concepts the student is weak in
2. Start with easier questions to build confidence
3. Include clear explanations for each answer
4. Test understanding, not just memorization

CRITICAL: Generate questions that specifically target the weak concepts listed.

Return ONLY a valid JSON object in this exact format:
{
  "questions": [
    {
      "topicName": "Topic Name",
      "difficulty": "easy|medium|hard",
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Why this answer is correct."
    }
  ]
}`
      },
      {
        role: "user",
        content: `Generate ${totalQuestions} practice questions targeting these weak topics:

${topicsDescription}
${contentContext}

For each question:
1. Clearly connect it to one of the weak topics
2. Match difficulty to weakness score (higher score = start easier)
3. Include a helpful explanation`
      }
    ]);

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON found in response:", content);
      throw new Error("Invalid AI response format");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const questions = parsed.questions || [];

    const questionsWithIds = questions.map((q: any, index: number) => {
      const matchingTopic = sortedTopics.find(
        t => t.name.toLowerCase() === (q.topicName || "").toLowerCase()
      );
      return {
        ...q,
        id: index + 1,
        topicId: matchingTopic ? q.topicName : undefined,
      };
    });

    console.log(`Generated ${questionsWithIds.length} questions for weak areas`);

    return new Response(
      JSON.stringify({ questions: questionsWithIds }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in fix-weak-areas-quiz:", error);
    const errorCorsHeaders = getCORSHeaders(null);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...errorCorsHeaders, "Content-Type": "application/json" } }
    );
  }
});
