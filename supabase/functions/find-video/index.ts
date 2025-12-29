import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    console.log('Finding video for topic:', topic);

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
            content: `You are a helpful assistant that recommends the best educational YouTube videos. 
            When given a learning topic, suggest a popular, high-quality educational YouTube video.
            You must respond with ONLY a valid JSON object, no markdown, no code blocks.
            The JSON must have these exact fields:
            - videoId: a real YouTube video ID (11 characters)
            - title: the video title
            - channel: the channel name
            - reason: why this video is good for learning this topic (1 sentence)
            
            Use real, popular educational channels like:
            - 3Blue1Brown (math/science)
            - Crash Course (various subjects)
            - Khan Academy (various subjects)
            - Fireship (programming)
            - NetworkChuck (networking/cybersecurity)
            - freeCodeCamp (programming)
            - TED-Ed (general education)
            - Veritasium (science)
            - Kurzgesagt (science)
            
            Provide a real video ID from these channels that matches the topic.`
          },
          {
            role: 'user',
            content: `Find the best YouTube video for learning about: ${topic}`
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
    let videoData;
    try {
      // Clean the response - remove markdown code blocks if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.slice(7);
      }
      if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith('```')) {
        cleanContent = cleanContent.slice(0, -3);
      }
      videoData = JSON.parse(cleanContent.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Fallback with a default educational video
      videoData = {
        videoId: 'rfscVS0vtbw',
        title: 'Learn Python - Full Course for Beginners',
        channel: 'freeCodeCamp',
        reason: 'Comprehensive beginner-friendly tutorial'
      };
    }

    return new Response(
      JSON.stringify({
        videoId: videoData.videoId,
        title: videoData.title,
        channel: videoData.channel,
        reason: videoData.reason,
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
