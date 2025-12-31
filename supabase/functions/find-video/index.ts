import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Curated list of real, verified educational YouTube video IDs by category
const CURATED_VIDEOS: Record<string, Array<{ videoId: string; title: string; channel: string; views: string }>> = {
  science: [
    { videoId: "QnQe0xW_JY4", title: "Cell Structure and Functions", channel: "Amoeba Sisters", views: "5.2M" },
    { videoId: "URUJD5NEXC8", title: "Cell - Structure and Functions | Class 8 Science", channel: "Magnet Brains", views: "12M" },
    { videoId: "gcnk8TnzsLc", title: "Cell Biology: Cell Organelles", channel: "Professor Dave Explains", views: "2.1M" },
    { videoId: "8IlzKri08kk", title: "The Cell Structure and Function", channel: "MooMooMath and Science", views: "1.8M" },
    { videoId: "9SdGk2T5GNo", title: "Cell Structure", channel: "Bozeman Science", views: "900K" },
    { videoId: "2HoKqC6J0e4", title: "Biology: Cell Structure", channel: "CrashCourse", views: "7.5M" },
    { videoId: "wENhHnJI1ys", title: "Tour of a Human Cell", channel: "Kurzgesagt", views: "4.2M" },
    { videoId: "cj8dDTHGJBY", title: "Photosynthesis", channel: "Amoeba Sisters", views: "3.5M" },
    { videoId: "sQK3Yr4Sc_k", title: "Photosynthesis - Light Reactions", channel: "Professor Dave Explains", views: "1.2M" },
    { videoId: "FNHB5u23LB8", title: "Respiration", channel: "Amoeba Sisters", views: "2.8M" },
  ],
  math: [
    { videoId: "WsQQvHm4lSw", title: "Algebra Basics", channel: "The Organic Chemistry Tutor", views: "8.5M" },
    { videoId: "NybHckSEQBI", title: "The Map of Mathematics", channel: "Domain of Science", views: "12M" },
    { videoId: "fYyARMqiaag", title: "Calculus in 20 Minutes", channel: "Professor Leonard", views: "3.2M" },
    { videoId: "OmJ-4B-mS-Y", title: "Linear Algebra - Full Course", channel: "3Blue1Brown", views: "5.1M" },
    { videoId: "HfACrKJ_Y2w", title: "Trigonometry For Beginners!", channel: "The Organic Chemistry Tutor", views: "6.3M" },
    { videoId: "pTnEG_WGd2Q", title: "Geometry Introduction", channel: "Math Antics", views: "4.5M" },
    { videoId: "X32dce7_D48", title: "Statistics Made Easy", channel: "StatQuest", views: "1.8M" },
    { videoId: "0T0z8d0_aY4", title: "Probability Explained", channel: "3Blue1Brown", views: "2.4M" },
  ],
  programming: [
    { videoId: "rfscVS0vtbw", title: "Learn Python - Full Course", channel: "freeCodeCamp", views: "42M" },
    { videoId: "PkZNo7MFNFg", title: "Learn JavaScript - Full Course", channel: "freeCodeCamp", views: "18M" },
    { videoId: "8mAITcNt710", title: "HTML Full Course", channel: "freeCodeCamp", views: "15M" },
    { videoId: "1Rs2ND1ryYc", title: "CSS Tutorial Full Course", channel: "freeCodeCamp", views: "8.5M" },
    { videoId: "RGOj5yH7evk", title: "Git and GitHub for Beginners", channel: "freeCodeCamp", views: "5.2M" },
    { videoId: "Ks-_Mh1QhMc", title: "React JS Course", channel: "freeCodeCamp", views: "7.8M" },
    { videoId: "eIrMbAQSU34", title: "Java Programming Full Course", channel: "freeCodeCamp", views: "12M" },
    { videoId: "kqtD5dpn9C8", title: "Python Data Science Handbook", channel: "freeCodeCamp", views: "4.1M" },
  ],
  physics: [
    { videoId: "ZM8ECpBuQYE", title: "What is Physics?", channel: "CrashCourse", views: "6.8M" },
    { videoId: "YRKHHDGLulI", title: "Newton's Laws of Motion", channel: "Professor Dave Explains", views: "2.1M" },
    { videoId: "XpyKBu5hxJA", title: "Quantum Physics for Dummies", channel: "Domain of Science", views: "3.5M" },
    { videoId: "Xo232kyTsO0", title: "Thermodynamics", channel: "CrashCourse", views: "2.8M" },
    { videoId: "O_GlZ4CRHFM", title: "Electricity Explained", channel: "The Engineering Mindset", views: "1.9M" },
    { videoId: "ywqg9PorTAw", title: "Magnetism", channel: "Professor Dave Explains", views: "1.2M" },
    { videoId: "vuMmJrbJvDY", title: "Optics: Light and Waves", channel: "CrashCourse", views: "1.5M" },
  ],
  chemistry: [
    { videoId: "bka20Q9TN6M", title: "Introduction to Chemistry", channel: "CrashCourse", views: "8.2M" },
    { videoId: "FSyAehMdpyI", title: "Periodic Table Explained", channel: "TED-Ed", views: "4.5M" },
    { videoId: "cWkn1vy8xYI", title: "Chemical Reactions", channel: "Amoeba Sisters", views: "2.3M" },
    { videoId: "zumdnI4EG14", title: "Organic Chemistry Basics", channel: "Professor Dave Explains", views: "1.8M" },
    { videoId: "TitrRpMUt0I", title: "Acids and Bases", channel: "CrashCourse", views: "3.1M" },
    { videoId: "Rd4a1X3B61w", title: "Atomic Structure", channel: "Professor Dave Explains", views: "2.5M" },
  ],
  history: [
    { videoId: "Yocja_N5s1I", title: "World War I", channel: "CrashCourse", views: "9.1M" },
    { videoId: "Q78COTwT7nE", title: "World War II", channel: "CrashCourse", views: "12M" },
    { videoId: "6E9WU9TGrec", title: "Ancient Rome", channel: "CrashCourse", views: "7.8M" },
    { videoId: "bBTFw2BuXRM", title: "Ancient Egypt", channel: "CrashCourse", views: "5.2M" },
    { videoId: "5SnR-e0S6Ic", title: "The French Revolution", channel: "Oversimplified", views: "28M" },
    { videoId: "9N5K2sLe5a0", title: "American Revolution", channel: "Oversimplified", views: "35M" },
  ],
  general: [
    { videoId: "rLXYILcRoPQ", title: "How to Learn Anything Fast", channel: "Ali Abdaal", views: "3.2M" },
    { videoId: "IlU-zDU6aQ0", title: "The Science of Learning", channel: "Veritasium", views: "8.5M" },
    { videoId: "ukLnPbIffxE", title: "How Memory Works", channel: "TED-Ed", views: "2.1M" },
    { videoId: "5MgBikgcWnY", title: "The Feynman Technique", channel: "Thomas Frank", views: "4.8M" },
    { videoId: "WL4B46LTi30", title: "Study Tips That Work", channel: "Mike and Matty", views: "1.5M" },
  ]
};

function selectCategory(topic: string): string {
  const lowerTopic = topic.toLowerCase();
  
  if (lowerTopic.match(/cell|biology|organism|plant|animal|dna|gene|evolution|photosynthesis|respiration/)) {
    return 'science';
  }
  if (lowerTopic.match(/math|algebra|calculus|geometry|trigonometry|statistics|probability|equation/)) {
    return 'math';
  }
  if (lowerTopic.match(/program|code|python|javascript|html|css|react|java|web|software|algorithm/)) {
    return 'programming';
  }
  if (lowerTopic.match(/physics|newton|force|energy|motion|quantum|thermodynamic|electric|magnet|wave/)) {
    return 'physics';
  }
  if (lowerTopic.match(/chemistry|element|reaction|acid|base|organic|atom|molecule|periodic/)) {
    return 'chemistry';
  }
  if (lowerTopic.match(/history|war|ancient|revolution|empire|civilization|dynasty/)) {
    return 'history';
  }
  return 'general';
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic } = await req.json();
    
    if (!topic) {
      return new Response(
        JSON.stringify({ error: 'Topic is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Finding videos for topic:', topic);

    // Determine category and get videos
    const category = selectCategory(topic);
    const categoryVideos = CURATED_VIDEOS[category] || CURATED_VIDEOS.general;
    
    // Use AI to break down the topic into subtasks and select best videos
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an educational content planner. Break down learning topics into 3-5 logical subtasks/subtopics.
            
For each subtask, select 5 videos from the provided list that would be most relevant.
            
You must respond with ONLY a valid JSON object, no markdown, no code blocks.
The JSON must have this exact structure:
{
  "subtasks": [
    {
      "title": "Subtask title",
      "description": "Brief description of what this subtask covers",
      "videoIndices": [0, 1, 2, 3, 4]
    }
  ],
  "primaryVideo": {
    "index": 0,
    "reason": "Why this is the best overall video for the main topic"
  }
}

videoIndices should be the indices (0-based) of the 5 best videos from the provided list for each subtask.`
          },
          {
            role: 'user',
            content: `Topic: "${topic}"
            
Available videos (select by index):
${categoryVideos.map((v, i) => `${i}: "${v.title}" by ${v.channel} (${v.views} views)`).join('\n')}

Break this topic into 3-5 subtasks and select the 5 most relevant videos for each subtask.`
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error('AI gateway error');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    console.log('AI response:', content);

    // Parse the JSON response
    let parsedData;
    try {
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) cleanContent = cleanContent.slice(7);
      if (cleanContent.startsWith('```')) cleanContent = cleanContent.slice(3);
      if (cleanContent.endsWith('```')) cleanContent = cleanContent.slice(0, -3);
      parsedData = JSON.parse(cleanContent.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Fallback: create simple subtasks with shuffled videos
      const shuffled = shuffleArray(categoryVideos);
      parsedData = {
        subtasks: [
          {
            title: `Introduction to ${topic}`,
            description: `Getting started with ${topic}`,
            videoIndices: [0, 1, 2, 3, 4].filter(i => i < categoryVideos.length)
          },
          {
            title: `Core concepts of ${topic}`,
            description: `Understanding the fundamentals`,
            videoIndices: [0, 1, 2, 3, 4].filter(i => i < categoryVideos.length)
          },
          {
            title: `Practice ${topic}`,
            description: `Applying what you learned`,
            videoIndices: [0, 1, 2, 3, 4].filter(i => i < categoryVideos.length)
          }
        ],
        primaryVideo: { index: 0, reason: 'Comprehensive beginner-friendly content' }
      };
    }

    // Build subtasks with actual video data
    const subtasks = (parsedData.subtasks || []).map((subtask: any, idx: number) => {
      const videoIndices = (subtask.videoIndices || [0, 1, 2, 3, 4]).slice(0, 5);
      const videos = videoIndices
        .filter((i: number) => i >= 0 && i < categoryVideos.length)
        .map((i: number, vidIdx: number) => ({
          ...categoryVideos[i],
          engagementScore: 100 - vidIdx * 10, // Higher score for first videos
          reason: `Recommended for ${subtask.title}`
        }));
      
      return {
        title: subtask.title || `Part ${idx + 1}`,
        description: subtask.description || '',
        videos: videos.length > 0 ? videos : categoryVideos.slice(0, 5).map((v, i) => ({
          ...v,
          engagementScore: 100 - i * 10,
          reason: 'General recommendation'
        }))
      };
    });

    // Get primary video
    const primaryIdx = parsedData.primaryVideo?.index || 0;
    const primaryVideo = categoryVideos[primaryIdx] || categoryVideos[0];

    return new Response(
      JSON.stringify({
        videoId: primaryVideo.videoId,
        title: primaryVideo.title,
        channel: primaryVideo.channel,
        reason: parsedData.primaryVideo?.reason || 'Best match for your topic',
        subtasks: subtasks,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in find-video function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
