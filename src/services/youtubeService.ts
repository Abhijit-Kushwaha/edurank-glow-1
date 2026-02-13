const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

export interface YouTubeVideo {
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  channel: string;
  publishedAt: string;
  duration?: string;
}

export const youtubeService = {
  /**
   * Search YouTube videos
   */
  async search(query: string, maxResults: number = 10): Promise<YouTubeVideo[]> {
    try {
      if (!YOUTUBE_API_KEY) {
        throw new Error('YouTube API key not configured');
      }

      const params = new URLSearchParams({
        part: 'snippet',
        q: query,
        type: 'video',
        maxResults: String(maxResults),
        key: YOUTUBE_API_KEY,
      });

      const response = await fetch(
        `${YOUTUBE_API_BASE}/search?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(`YouTube API error: ${data.error.message}`);
      }

      return data.items.map((item: Record<string, unknown>) => ({
        videoId: ((item.id as Record<string, unknown>).videoId as string),
        title: ((item.snippet as Record<string, unknown>).title as string),
        description: ((item.snippet as Record<string, unknown>).description as string),
        thumbnail: (((item.snippet as Record<string, unknown>).thumbnails as Record<string, Record<string, unknown> | undefined>).medium?.url || (((item.snippet as Record<string, unknown>).thumbnails as Record<string, unknown>) as Record<string, unknown>).default?.url) as string,
        channel: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
      }));
    } catch (error) {
      console.error('YouTube search error:', error);
      throw error;
    }
  },

  /**
   * Get video details (duration, etc.)
   */
  async getVideoDetails(videoId: string) {
    try {
      if (!YOUTUBE_API_KEY) {
        throw new Error('YouTube API key not configured');
      }

      const params = new URLSearchParams({
        part: 'contentDetails,statistics',
        id: videoId,
        key: YOUTUBE_API_KEY,
      });

      const response = await fetch(
        `${YOUTUBE_API_BASE}/videos?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.items[0];
    } catch (error) {
      console.error('Error fetching video details:', error);
      throw error;
    }
  },

  /**
   * Refine search query using AI-like heuristics
   */
  refineSearchQuery(originalQuery: string, topic?: string): string {
    // Simple refinement logic - can be enhanced with Bytez AI if needed
    if (topic) {
      return `${originalQuery} explained ${topic}`;
    }
    return `${originalQuery} tutorial`;
  },
};
