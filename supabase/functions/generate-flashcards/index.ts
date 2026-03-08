import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { callLovableAI } from "../_shared/lovableAI.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader ?? "" } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { subject, count = 10 } = await req.json();

    if (!subject || typeof subject !== "string" || subject.length > 200) {
      return new Response(JSON.stringify({ error: "Invalid subject" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const safeSubject = subject.replace(/[<>"]/g, "").slice(0, 200);
    const safeCount = Math.min(Math.max(Number(count) || 10, 1), 20);

    const prompt = `Generate exactly ${safeCount} flashcards for studying "${safeSubject}".

Return ONLY a valid JSON array. Each item must have:
- "front": the question or term (concise, clear)
- "back": the answer or definition (detailed but brief)

Make cards progressively harder. Cover key concepts, definitions, formulas, and application questions.

Example format:
[{"front":"What is photosynthesis?","back":"The process by which plants convert light energy into chemical energy (glucose) using CO2 and water, releasing O2 as a byproduct."}]`;

    const response = await callLovableAI(prompt, { temperature: 0.7 });

    // Parse JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("Failed to parse flashcards from AI response");
    }

    const flashcards = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify({ flashcards }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Generate flashcards error:", error);
    return new Response(JSON.stringify({ error: "Failed to generate flashcards" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
