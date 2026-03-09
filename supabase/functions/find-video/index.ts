import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, logRateLimitRequest } from "../_shared/rateLimit.ts";
import { preflightResponse, withCors, withCorsError } from "../_shared/cors.ts";
import { consumeCredits, CREDIT_COSTS } from "../_shared/credits.ts";

const MAX_TOPIC_LENGTH = 200;
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

function sanitizeInput(input: string, maxLength = MAX_TOPIC_LENGTH): { isValid: boolean; sanitized: string; error?: string } {
  if (!input || typeof input !== "string") return { isValid: false, sanitized: "", error: "Input must be a non-empty string" };
  let sanitized = input.trim();
  if (!sanitized) return { isValid: false, sanitized: "", error: "Input cannot be empty" };
  if (sanitized.length > maxLength) return { isValid: false, sanitized: "", error: `Input exceeds maximum length of ${maxLength} characters` };
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(sanitized)) return { isValid: false, sanitized: "", error: "Invalid input detected" };
  }
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").replace(/[<>]/g, "").replace(/\\/g, "").trim();
  return { isValid: true, sanitized };
}

function formatDuration(isoDuration: string): string {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "0:00";
  const hours = parseInt(match[1] || "0");
  const minutes = parseInt(match[2] || "0");
  const seconds = parseInt(match[3] || "0");
  if (hours > 0) return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatViewCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

interface YouTubeVideo {
  videoId: string;
  title: string;
  channel: string;
  description: string;
  viewCount: string;
  duration: string;
  durationFormatted: string;
  thumbnail: string;
}

async function searchYouTube(query: string, apiKey: string, maxResults = 5): Promise<YouTubeVideo[]> {
  console.log(`YouTube search: "${query}"`);
  const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&videoDuration=medium&videoEmbeddable=true&maxResults=${maxResults}&key=${apiKey}`;
  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) throw new Error(`YouTube API error: ${searchRes.status}`);
  const searchData = await searchRes.json();
  const videoIds = searchData.items?.map((i: any) => i.id.videoId).join(",");
  if (!videoIds) return [];

  const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails,snippet&id=${videoIds}&key=${apiKey}`;
  const detailsRes = await fetch(detailsUrl);
  if (!detailsRes.ok) throw new Error("Failed to get video details");
  const detailsData = await detailsRes.json();

  return (detailsData.items || []).map((item: any) => ({
    videoId: item.id,
    title: item.snippet.title,
    channel: item.snippet.channelTitle,
    description: item.snippet.description || "",
    viewCount: formatViewCount(parseInt(item.statistics?.viewCount || "0")),
    duration: item.contentDetails.duration,
    durationFormatted: formatDuration(item.contentDetails.duration),
    thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || "",
  }));
}

async function fetchTranscript(videoId: string, lang = "en"): Promise<string> {
  try {
    const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=srv3`;
    const res = await fetch(url);
    if (!res.ok) return "";
    const xml = await res.text();
    const textParts = xml.match(/<text[^>]*>(.*?)<\/text>/gs) || [];
    return textParts
      .map((t) => t.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&quot;/g, '"'))
      .join(" ")
      .slice(0, 3000);
  } catch {
    return "";
  }
}

async function generateCacheKey(topic: string, filters: any): Promise<string> {
  const raw = `${topic}|${filters?.class || ""}|${filters?.subject || ""}|${filters?.board || ""}|${filters?.language || ""}`.toLowerCase();
  const encoder = new TextEncoder();
  const data = encoder.encode(raw);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

const LOVABLE_AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function callLovableAI(messages: { role: string; content: string }[], tools?: any[], toolChoice?: any): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

  const body: any = {
    model: "google/gemini-3-flash-preview",
    messages,
    temperature: 0.3,
    max_tokens: 4000,
  };
  if (tools) body.tools = tools;
  if (toolChoice) body.tool_choice = toolChoice;

  const response = await fetch(LOVABLE_AI_GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error("Rate limit exceeded. Please try again later.");
    if (response.status === 402) throw new Error("Payment required. Please add funds.");
    throw new Error(`AI gateway error: ${response.status}`);
  }

  return await response.json();
}

function buildSearchQuery(topic: string, filters: any): string {
  const parts: string[] = [];
  if (filters?.board) parts.push(filters.board);
  if (filters?.class) parts.push(filters.class);
  if (filters?.subject) parts.push(filters.subject);
  parts.push(topic);
  if (filters?.language && filters.language !== "English") parts.push(filters.language);
  parts.push("tutorial explained");
  return parts.join(" ");
}

const QUALITY_SCORING_TOOLS = [
  {
    type: "function",
    function: {
      name: "score_videos",
      description: "Score educational videos on quality metrics and return the best one with subtask breakdown.",
      parameters: {
        type: "object",
        properties: {
          best_video_index: { type: "number", description: "0-based index of the best video" },
          quality_score: { type: "number", description: "Total quality score 0-100" },
          clarity_score: { type: "number", description: "Concept clarity score 0-20" },
          depth_score: { type: "number", description: "Depth of explanation 0-15" },
          structure_score: { type: "number", description: "Logical structure 0-10" },
          accuracy_confidence: { type: "number", description: "Accuracy confidence 0-15" },
          syllabus_match_score: { type: "number", description: "Relevance to syllabus 0-15" },
          examples_score: { type: "number", description: "Examples and analogies quality 0-10" },
          coverage_score: { type: "number", description: "Subtopic coverage 0-10" },
          simplicity_score: { type: "number", description: "Student comprehension simplicity 0-5" },
          summary: { type: "string", description: "Brief summary of why this is the best video" },
          strengths: { type: "array", items: { type: "string" }, description: "Top strengths" },
          weaknesses: { type: "array", items: { type: "string" }, description: "Weaknesses found" },
          recommended_for_grade: { type: "string", description: "Recommended grade level" },
          subtasks: {
            type: "array",
            items: {
              type: "object",
              properties: { title: { type: "string" }, searchQuery: { type: "string" } },
              required: ["title", "searchQuery"],
            },
            description: "3-5 subtasks for learning this topic",
          },
        },
        required: ["best_video_index", "quality_score", "clarity_score", "depth_score", "structure_score", "accuracy_confidence", "syllabus_match_score", "examples_score", "coverage_score", "simplicity_score", "summary", "strengths", "weaknesses", "recommended_for_grade", "subtasks"],
        additionalProperties: false,
      },
    },
  },
];

async function evaluateVideos(videos: YouTubeVideo[], transcripts: string[], topic: string, filters: any): Promise<any> {
  const videosDescription = videos.map((v, i) => {
    const transcript = transcripts[i] ? `\nTranscript excerpt: "${transcripts[i].slice(0, 1500)}"` : "\n(No transcript available - score with lower confidence)";
    return `VIDEO ${i}:\nTitle: ${v.title}\nChannel: ${v.channel}\nDescription: ${v.description.slice(0, 300)}${transcript}`;
  }).join("\n\n---\n\n");

  const filterContext = [
    filters?.class && `Grade: ${filters.class}`,
    filters?.subject && `Subject: ${filters.subject}`,
    filters?.board && `Board: ${filters.board}`,
    filters?.language && `Language: ${filters.language}`,
  ].filter(Boolean).join(", ");

  const systemPrompt = `You are an educational content quality evaluator. Your job is to analyze videos and score them PURELY on educational quality — NOT popularity, views, or engagement.

Scoring criteria (total 100 points):
- Concept clarity (0-20): Clear explanations, well-defined terms
- Depth of explanation (0-15): Thorough coverage, not superficial  
- Logical structure (0-10): Organized flow, step-by-step progression
- Accuracy confidence (0-15): Factually correct, no misinformation
- Syllabus relevance (0-15): Matches curriculum/grade level
- Examples quality (0-10): Real-world examples, analogies, demonstrations
- Subtopic coverage (0-10): Covers all key aspects
- Comprehension simplicity (0-5): Easy for students to understand

PENALTIES: Clickbait titles, filler content, shallow explanations, misinformation.
REWARDS: Step-by-step explanations, proper definitions, real-world examples, problem-solving.

Also break down the topic into 3-5 learning subtasks with YouTube search queries.`;

  const userPrompt = `Topic: "${topic}"${filterContext ? `\nFilters: ${filterContext}` : ""}

Evaluate these ${videos.length} videos and select the BEST one for educational quality:

${videosDescription}

Score the best video and provide subtask breakdown.`;

  const data = await callLovableAI(
    [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
    QUALITY_SCORING_TOOLS,
    { type: "function", function: { name: "score_videos" } }
  );

  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) return JSON.parse(toolCall.function.arguments);
  throw new Error("AI did not return structured scoring data");
}

// ---- Main handler ----

serve(async (req) => {
  const preflight = preflightResponse(req);
  if (preflight) return preflight;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return withCorsError(req, 401, "No authorization header");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) return withCorsError(req, 401, "Unauthorized");

    const creditResult = await consumeCredits(user.id, CREDIT_COSTS["find-video"]);
    if (!creditResult.success) return withCorsError(req, 402, creditResult.error || "Insufficient credits");

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { topic, filters } = await req.json();
    const validation = sanitizeInput(topic);
    if (!validation.isValid) return withCorsError(req, 400, validation.error || "Invalid input");
    const sanitizedTopic = validation.sanitized;

    // ---- Cache check ----
    const cacheKey = await generateCacheKey(sanitizedTopic, filters);
    console.log(`Cache key: ${cacheKey} for topic: "${sanitizedTopic}"`);

    const { data: cached } = await serviceClient
      .from("video_cache")
      .select("*")
      .eq("search_key", cacheKey)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cached) {
      console.log("Cache hit! Returning cached result.");
      return withCors(req, {
        json: {
          videoId: cached.video_id,
          title: cached.title,
          channel: cached.channel,
          thumbnail: cached.thumbnail,
          duration: cached.duration,
          quality_score: (cached.quality_scores as any)?.quality_score || 0,
          clarity_score: (cached.quality_scores as any)?.clarity_score || 0,
          depth_score: (cached.quality_scores as any)?.depth_score || 0,
          accuracy_confidence: (cached.quality_scores as any)?.accuracy_confidence || 0,
          syllabus_match_score: (cached.quality_scores as any)?.syllabus_match_score || 0,
          knowledge_density_score: (cached.quality_scores as any)?.coverage_score || 0,
          summary: cached.summary,
          strengths: cached.strengths,
          weaknesses: cached.weaknesses,
          recommended_for_grade: cached.recommended_grade,
          subtasks: cached.subtasks_data,
          reason: `Best educational video for "${sanitizedTopic}" (Quality: ${(cached.quality_scores as any)?.quality_score}/100)`,
          cached: true,
        },
      });
    }

    // ---- Rate limit (only for non-cached requests) ----
    const rateLimitResult = await checkRateLimit(supabaseClient, {
      operation: "find-video", userId: user.id, limitsPerHour: 10, limitsPerDay: 50,
    });
    if (!rateLimitResult.allowed) return withCorsError(req, 429, rateLimitResult.message || "Rate limit exceeded");

    const YOUTUBE_API_KEY = Deno.env.get("youtube_api_key");
    if (!YOUTUBE_API_KEY) throw new Error("YouTube API key is not configured");

    // ---- YouTube search with filter-aware query ----
    const searchQuery = buildSearchQuery(sanitizedTopic, filters);
    console.log("Searching YouTube:", searchQuery);
    const videos = await searchYouTube(searchQuery, YOUTUBE_API_KEY, 5);
    if (!videos.length) throw new Error("No videos found for this topic");

    // ---- Fetch transcripts in parallel ----
    const langCode = filters?.language === "Hindi" ? "hi" : "en";
    console.log("Fetching transcripts for", videos.length, "videos...");
    const transcripts = await Promise.all(videos.map((v) => fetchTranscript(v.videoId, langCode)));

    // ---- AI quality evaluation ----
    console.log("Evaluating video quality with AI...");
    const scores = await evaluateVideos(videos, transcripts, sanitizedTopic, filters);
    const bestIdx = Math.min(scores.best_video_index || 0, videos.length - 1);
    const bestVideo = videos[bestIdx];

    // ---- Fetch subtask videos ----
    const subtasksWithVideos = await Promise.all(
      (scores.subtasks || []).slice(0, 5).map(async (subtask: any, idx: number) => {
        try {
          const subQuery = buildSearchQuery(subtask.searchQuery || subtask.title, filters);
          const subVideos = await searchYouTube(subQuery, YOUTUBE_API_KEY, 3);
          return {
            title: subtask.title || `Part ${idx + 1}`,
            description: subtask.searchQuery || "",
            videos: subVideos.map((v, i) => ({
              videoId: v.videoId,
              title: v.title,
              channel: v.channel,
              views: v.viewCount,
              duration: v.durationFormatted,
              thumbnail: v.thumbnail,
              qualityScore: i === 0 ? scores.quality_score : null,
              reason: i === 0 ? "Best educational match" : `Alternative #${i + 1}`,
            })),
          };
        } catch (err) {
          console.error(`Subtask search error: ${subtask.title}`, err);
          return { title: subtask.title || `Part ${idx + 1}`, description: "", videos: [] };
        }
      })
    );

    // ---- Cache the result ----
    const qualityScores = {
      quality_score: scores.quality_score,
      clarity_score: scores.clarity_score,
      depth_score: scores.depth_score,
      structure_score: scores.structure_score,
      accuracy_confidence: scores.accuracy_confidence,
      syllabus_match_score: scores.syllabus_match_score,
      examples_score: scores.examples_score,
      coverage_score: scores.coverage_score,
      simplicity_score: scores.simplicity_score,
    };

    await serviceClient.from("video_cache").insert({
      search_key: cacheKey,
      topic: sanitizedTopic,
      filters: filters || {},
      video_id: bestVideo.videoId,
      quality_scores: qualityScores,
      title: bestVideo.title,
      channel: bestVideo.channel,
      thumbnail: bestVideo.thumbnail,
      duration: bestVideo.durationFormatted,
      summary: scores.summary,
      strengths: scores.strengths,
      weaknesses: scores.weaknesses,
      recommended_grade: scores.recommended_for_grade,
      subtasks_data: subtasksWithVideos,
    });

    await logRateLimitRequest(supabaseClient, user.id, "find-video", true);

    return withCors(req, {
      json: {
        videoId: bestVideo.videoId,
        title: bestVideo.title,
        channel: bestVideo.channel,
        thumbnail: bestVideo.thumbnail,
        duration: bestVideo.durationFormatted,
        quality_score: scores.quality_score,
        clarity_score: scores.clarity_score,
        depth_score: scores.depth_score,
        accuracy_confidence: scores.accuracy_confidence,
        syllabus_match_score: scores.syllabus_match_score,
        knowledge_density_score: scores.coverage_score,
        summary: scores.summary,
        strengths: scores.strengths,
        weaknesses: scores.weaknesses,
        recommended_for_grade: scores.recommended_for_grade,
        subtasks: subtasksWithVideos,
        reason: `Best educational video for "${sanitizedTopic}" (Quality: ${scores.quality_score}/100)`,
        cached: false,
      },
    });
  } catch (error: unknown) {
    console.error("Error in find-video:", error);
    return withCorsError(req, 500, "An unexpected error occurred");
  }
});
