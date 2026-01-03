import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation and sanitization constants
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

/**
 * Validates and sanitizes user input to prevent prompt injection
 */
function sanitizeInput(input: string, maxLength: number): { isValid: boolean; sanitized: string; error?: string } {
  if (!input || typeof input !== 'string') {
    return { isValid: false, sanitized: '', error: 'Input must be a non-empty string' };
  }

  let sanitized = input.trim();
  if (sanitized.length === 0) {
    return { isValid: false, sanitized: '', error: 'Input cannot be empty' };
  }
  if (sanitized.length > maxLength) {
    return { isValid: false, sanitized: '', error: `Input exceeds maximum length of ${maxLength} characters` };
  }

  // Check for forbidden patterns (potential prompt injection)
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(sanitized)) {
      console.warn('Potential prompt injection detected:', sanitized.substring(0, 50));
      return { isValid: false, sanitized: '', error: 'Invalid input detected' };
    }
  }

  // Remove potentially dangerous characters
  sanitized = sanitized
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/[<>]/g, '')
    .replace(/\\/g, '')
    .trim();

  return { isValid: true, sanitized };
}

/**
 * Validates ID format (alphanumeric with dashes/underscores)
 */
function validateId(id: string): { isValid: boolean; error?: string } {
  if (!id || typeof id !== 'string') {
    return { isValid: false, error: 'ID must be a non-empty string' };
  }
  if (id.length > MAX_ID_LENGTH) {
    return { isValid: false, error: `ID exceeds maximum length of ${MAX_ID_LENGTH} characters` };
  }
  // Allow UUID format and YouTube video IDs
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    return { isValid: false, error: 'Invalid ID format' };
  }
  return { isValid: true };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Get the authorization header to verify user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get user from auth header
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { videoTitle, videoId, todoId } = await req.json();

    if (!videoTitle || !videoId || !todoId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: videoTitle, videoId, todoId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate and sanitize inputs
    const titleValidation = sanitizeInput(videoTitle, MAX_TITLE_LENGTH);
    if (!titleValidation.isValid) {
      return new Response(
        JSON.stringify({ error: titleValidation.error || "Invalid video title" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const videoIdValidation = validateId(videoId);
    if (!videoIdValidation.isValid) {
      return new Response(
        JSON.stringify({ error: videoIdValidation.error || "Invalid video ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const todoIdValidation = validateId(todoId);
    if (!todoIdValidation.isValid) {
      return new Response(
        JSON.stringify({ error: todoIdValidation.error || "Invalid todo ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sanitizedTitle = titleValidation.sanitized;

    console.log(`Generating notes for video: ${sanitizedTitle} (${videoId})`);

    // Call Lovable AI Gateway with Gemini model
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
            content: `You are an expert educational content summarizer. Your task is to generate comprehensive study notes for educational videos. 
            
Create well-structured notes that include:
1. **Key Concepts** - Main ideas and definitions
2. **Important Points** - Critical takeaways
3. **Summary** - A brief overview
4. **Study Tips** - How to remember and apply the material

Format your response in clear markdown with headers and bullet points.`,
          },
          {
            role: "user",
            content: `Generate detailed study notes for an educational video titled: "${sanitizedTitle}"

The video ID is: ${videoId}

Please create comprehensive notes that would help a student understand and retain the key concepts from this video.`,
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
          JSON.stringify({ error: "Payment required. Please add funds to continue using AI features." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const generatedNotes = aiData.choices?.[0]?.message?.content;

    if (!generatedNotes) {
      throw new Error("No content generated from AI");
    }

    console.log("Notes generated successfully");

    // Save notes to database
    const { data: savedNote, error: saveError } = await supabaseClient
      .from("notes")
      .insert({
        user_id: user.id,
        todo_id: todoId,
        video_id: videoId,
        content: generatedNotes,
        is_ai_generated: true,
      })
      .select()
      .single();

    if (saveError) {
      console.error("Error saving notes:", saveError);
      // Return the notes even if saving fails
      return new Response(
        JSON.stringify({ 
          notes: generatedNotes, 
          saved: false,
          error: "Notes generated but failed to save" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        notes: generatedNotes, 
        saved: true,
        noteId: savedNote.id 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in generate-notes function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
