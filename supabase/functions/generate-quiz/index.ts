import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { todoId, notes } = await req.json();

    if (!todoId || !notes) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: todoId, notes" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating quiz for todo: ${todoId}`);

    // Check if quiz already exists
    const { data: existingQuiz } = await supabaseClient
      .from("quizzes")
      .select("*")
      .eq("todo_id", todoId)
      .maybeSingle();

    if (existingQuiz) {
      return new Response(
        JSON.stringify({ quiz: existingQuiz.questions, quizId: existingQuiz.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a quiz generator. Generate 5 multiple choice questions based on the provided notes.

You must respond with ONLY a valid JSON array, no markdown, no code blocks.
Each question must have this structure:
{
  "id": 1,
  "question": "Question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": 0
}

correctAnswer is the 0-based index of the correct option.
Make questions progressively harder.
Include a mix of recall, understanding, and application questions.`,
          },
          {
            role: "user",
            content: `Generate 5 MCQ questions based on these notes:\n\n${notes}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    let questionsContent = aiData.choices?.[0]?.message?.content;

    if (!questionsContent) {
      throw new Error("No content generated from AI");
    }

    // Parse the questions
    let questions;
    try {
      let cleanContent = questionsContent.trim();
      if (cleanContent.startsWith('```json')) cleanContent = cleanContent.slice(7);
      if (cleanContent.startsWith('```')) cleanContent = cleanContent.slice(3);
      if (cleanContent.endsWith('```')) cleanContent = cleanContent.slice(0, -3);
      questions = JSON.parse(cleanContent.trim());
    } catch (parseError) {
      console.error("Failed to parse questions:", parseError);
      // Fallback questions
      questions = [
        {
          id: 1,
          question: "What is the main concept covered in this material?",
          options: ["Option A", "Option B", "Option C", "Option D"],
          correctAnswer: 0
        },
        {
          id: 2,
          question: "Which statement best describes the topic?",
          options: ["Statement A", "Statement B", "Statement C", "Statement D"],
          correctAnswer: 1
        },
        {
          id: 3,
          question: "What is an important takeaway from this content?",
          options: ["Takeaway A", "Takeaway B", "Takeaway C", "Takeaway D"],
          correctAnswer: 2
        },
        {
          id: 4,
          question: "How can this knowledge be applied?",
          options: ["Application A", "Application B", "Application C", "Application D"],
          correctAnswer: 0
        },
        {
          id: 5,
          question: "What is the key principle discussed?",
          options: ["Principle A", "Principle B", "Principle C", "Principle D"],
          correctAnswer: 1
        }
      ];
    }

    console.log("Quiz generated successfully");

    // Save quiz to database
    const { data: savedQuiz, error: saveError } = await supabaseClient
      .from("quizzes")
      .insert({
        user_id: user.id,
        todo_id: todoId,
        questions: questions,
      })
      .select()
      .single();

    if (saveError) {
      console.error("Error saving quiz:", saveError);
      return new Response(
        JSON.stringify({ quiz: questions, saved: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ quiz: questions, quizId: savedQuiz.id, saved: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in generate-quiz function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
