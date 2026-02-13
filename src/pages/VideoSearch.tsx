import React, { useState, useCallback, useRef, useMemo } from 'react';
import { Play, Loader2, Search, AlertCircle, ExternalLink, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { youtubeService, YouTubeVideo } from '@/services/youtubeService';
import Sidebar from '@/components/Sidebar';

// Simple debounce utility - pure function
function createDebounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

const VideoSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null);

  // Create the debounced search function with useRef for stable reference
  const performSearchRef = useRef<(query: string) => void>();

  useMemo(() => {
    performSearchRef.current = createDebounce(async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setVideos([]);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const refinedQuery = youtubeService.refineSearchQuery(searchQuery);
        const results = await youtubeService.search(refinedQuery, 15);
        setVideos(results);

        if (results.length === 0) {
          toast.info('No videos found for that query');
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to search videos';
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    }, 500);
  }, []);

  const performSearch = useCallback((searchQuery: string) => {
    performSearchRef.current?.(searchQuery);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    performSearch(value);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div className="md:ml-64 p-4 lg:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-2">
              <Play className="h-8 w-8 text-red-500" />
              Video Search
            </h1>
            <p className="text-muted-foreground">
              Search YouTube to find the best educational videos for your topic
            </p>
          </div>

          {/* Search Form */}
          <Card className="mb-8 glass-card">
            <CardHeader>
              <CardTitle>Search Videos</CardTitle>
              <CardDescription>
                Enter a topic to find relevant YouTube videos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="flex gap-2">
                <Input
                  placeholder="Search topic (e.g., Python loops, Electromagnetics, U.S. History)"
                  value={query}
                  onChange={handleSearchChange}
                  disabled={loading}
                />
                <Button type="submit" disabled={loading || !query.trim()} className="flex-shrink-0">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Search
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Error Message */}
          {error && (
            <Card className="mb-8 bg-destructive/10 border-destructive/30">
              <CardContent className="pt-6 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Search Error</p>
                  <p className="text-sm text-muted-foreground">{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Video Player Modal */}
          {selectedVideo && (
            <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
              <Card className="w-full max-w-4xl glass-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <div className="flex-1">
                    <CardTitle>{selectedVideo.title}</CardTitle>
                    <CardDescription>{selectedVideo.channel}</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedVideo(null)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video mb-4">
                    <iframe
                      className="w-full h-full rounded-lg"
                      src={`https://www.youtube.com/embed/${selectedVideo.videoId}?autoplay=1`}
                      title={selectedVideo.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2">Description</h3>
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {selectedVideo.description}
                      </p>
                    </div>
                    <a
                      href={`https://www.youtube.com/watch?v=${selectedVideo.videoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-primary hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Watch on YouTube
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Videos Grid */}
          {videos.length > 0 && (
            <div>
              <div className="mb-4 text-sm text-muted-foreground">
                Found {videos.length} videos
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {videos.map((video) => (
                  <Card
                    key={video.videoId}
                    className="glass-card overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                    onClick={() => setSelectedVideo(video)}
                  >
                    <div className="relative aspect-video overflow-hidden bg-black">
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <Play className="h-12 w-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                        {video.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3">{video.channel}</p>
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedVideo(video);
                        }}
                        className="w-full"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Watch
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && videos.length === 0 && !error && (
            <div className="text-center py-12">
              <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-30" />
              <p className="text-muted-foreground">
                {query ? 'No videos found. Try a different search.' : 'Enter a topic to search for videos'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoSearch;
