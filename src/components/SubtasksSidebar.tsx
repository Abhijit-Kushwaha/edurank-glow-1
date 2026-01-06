import { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Play, Clock, Eye, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SubtaskVideo {
  id: string;
  video_id: string;
  title: string;
  channel: string;
  engagement_score: number | null;
  reason: string | null;
  order_index: number;
}

interface Subtask {
  id: string;
  title: string;
  order_index: number;
  videos: SubtaskVideo[];
}

interface SubtasksSidebarProps {
  subtasks: Subtask[];
  onVideoSelect: (videoId: string) => void;
  currentVideoId: string | null;
  mainVideo?: SubtaskVideo | null;
}

const SubtasksSidebar = ({ subtasks, onVideoSelect, currentVideoId, mainVideo }: SubtasksSidebarProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const [expandedSubtasks, setExpandedSubtasks] = useState<Set<string>>(
    new Set(subtasks.slice(0, 2).map(s => s.id))
  );

  const toggleSubtask = (subtaskId: string) => {
    setExpandedSubtasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(subtaskId)) {
        newSet.delete(subtaskId);
      } else {
        newSet.add(subtaskId);
      }
      return newSet;
    });
  };

  if (subtasks.length === 0 && !mainVideo) return null;

  return (
    <>
      {/* Toggle button when closed */}
      {!isOpen && (
        <Button
          variant="outline"
          size="icon"
          className="fixed left-4 top-1/2 -translate-y-1/2 z-40 bg-background shadow-lg"
          onClick={() => setIsOpen(true)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-full z-30 transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full w-80 glass-card border-r border-border/50 flex flex-col pt-20">
          {/* Header */}
          <div className="p-4 border-b border-border/50 flex items-center justify-between">
            <h2 className="font-semibold text-lg">Learning Path</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>

          {/* Subtasks list */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {/* Main Video */}
              {mainVideo && (
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                    Main Video
                  </h3>
                  <VideoCard
                    video={mainVideo}
                    isActive={currentVideoId === mainVideo.video_id}
                    onSelect={() => onVideoSelect(mainVideo.video_id)}
                  />
                </div>
              )}

              {/* Subtasks */}
              {subtasks.length > 0 && (
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                  Related Topics
                </h3>
              )}
              {subtasks
                .sort((a, b) => a.order_index - b.order_index)
                .map((subtask, idx) => (
                  <Collapsible
                    key={subtask.id}
                    open={expandedSubtasks.has(subtask.id)}
                    onOpenChange={() => toggleSubtask(subtask.id)}
                  >
                    <CollapsibleTrigger asChild>
                      <button className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-medium">
                          {idx + 1}
                        </span>
                        <span className="flex-1 font-medium text-sm line-clamp-2">
                          {subtask.title}
                        </span>
                        {expandedSubtasks.has(subtask.id) ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        )}
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-2 space-y-2 pl-2">
                        {subtask.videos
                          .sort((a, b) => a.order_index - b.order_index)
                          .map((video) => (
                            <VideoCard
                              key={video.id}
                              video={video}
                              isActive={currentVideoId === video.video_id}
                              onSelect={() => onVideoSelect(video.video_id)}
                            />
                          ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </>
  );
};

interface VideoCardProps {
  video: SubtaskVideo;
  isActive: boolean;
  onSelect: () => void;
}

const VideoCard = ({ video, isActive, onSelect }: VideoCardProps) => {
  const thumbnailUrl = `https://img.youtube.com/vi/${video.video_id}/mqdefault.jpg`;

  return (
    <button
      onClick={onSelect}
      className={`w-full p-2 rounded-lg transition-all text-left group ${
        isActive
          ? 'bg-primary/20 border border-primary/50'
          : 'bg-background/50 hover:bg-muted border border-transparent'
      }`}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video rounded-md overflow-hidden mb-2">
        <img
          src={thumbnailUrl}
          alt={video.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Play className="h-8 w-8 text-white" />
        </div>
        {isActive && (
          <div className="absolute top-1 right-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded">
            Playing
          </div>
        )}
      </div>

      {/* Video info */}
      <h4 className="text-xs font-medium line-clamp-2 mb-1">{video.title}</h4>
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1 truncate">
          <User className="h-3 w-3" />
          {video.channel}
        </span>
      </div>
      {video.engagement_score && (
        <div className="mt-1 text-[10px] text-primary">
          Score: {Math.round(video.engagement_score)}
        </div>
      )}
    </button>
  );
};

export default SubtasksSidebar;
