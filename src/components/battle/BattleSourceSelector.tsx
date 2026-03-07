import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, FileText, Video, Bot, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type BattleSourceType = "custom_topic" | "my_notes" | "my_videos" | "ai_mixed";

export interface BattleSource {
  type: BattleSourceType;
  customTopic?: string;
  noteId?: string;
  noteContent?: string;
  videoId?: string;
  videoTitle?: string;
}

interface BattleSourceSelectorProps {
  value: BattleSource;
  onChange: (source: BattleSource) => void;
}

const sourceOptions = [
  { value: "custom_topic" as const, label: "Custom Topic", emoji: "📚", icon: BookOpen, description: "Type any topic" },
  { value: "my_notes" as const, label: "My Notes", emoji: "📄", icon: FileText, description: "From your AI notes" },
  { value: "my_videos" as const, label: "Study Videos", emoji: "🎥", icon: Video, description: "From watched videos" },
  { value: "ai_mixed" as const, label: "AI Mixed", emoji: "🤖", icon: Bot, description: "AI picks for you" },
];

export default function BattleSourceSelector({ value, onChange }: BattleSourceSelectorProps) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<{ id: string; todo_title: string; content: string }[]>([]);
  const [videos, setVideos] = useState<{ video_id: string; title: string; todo_id: string }[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (value.type === "my_notes" && notes.length === 0) {
      setLoadingData(true);
      supabase
        .from("notes")
        .select("id, content, todo_id, todos(title)")
        .eq("user_id", user.id)
        .eq("is_ai_generated", true)
        .order("created_at", { ascending: false })
        .limit(20)
        .then(({ data }) => {
          if (data) {
            setNotes(data.map((n: any) => ({
              id: n.id,
              todo_title: n.todos?.title || "Untitled",
              content: n.content,
            })));
          }
          setLoadingData(false);
        });
    }
    if (value.type === "my_videos" && videos.length === 0) {
      setLoadingData(true);
      supabase
        .from("subtask_videos")
        .select("video_id, title, subtask_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20)
        .then(({ data }) => {
          if (data) {
            setVideos(data.map((v: any) => ({
              video_id: v.video_id,
              title: v.title,
              todo_id: v.subtask_id,
            })));
          }
          setLoadingData(false);
        });
    }
  }, [value.type, user]);

  return (
    <div className="space-y-3">
      <Label className="text-sm font-semibold">Battle Source</Label>
      <div className="grid grid-cols-2 gap-2">
        {sourceOptions.map((opt) => {
          const isSelected = value.type === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ type: opt.value })}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-xs font-medium ${
                isSelected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/50 hover:border-primary/30 text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="text-lg">{opt.emoji}</span>
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>

      {/* Custom Topic Input */}
      {value.type === "custom_topic" && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Enter your topic</Label>
          <Input
            placeholder="e.g. Machine Learning Basics"
            value={value.customTopic || ""}
            onChange={(e) => onChange({ ...value, customTopic: e.target.value })}
            className="text-sm"
          />
        </div>
      )}

      {/* Notes Selector */}
      {value.type === "my_notes" && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Select your notes</Label>
          {loadingData ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading notes...
            </div>
          ) : notes.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No AI notes found. Generate some notes first!</p>
          ) : (
            <Select
              value={value.noteId || ""}
              onValueChange={(id) => {
                const note = notes.find((n) => n.id === id);
                onChange({ ...value, noteId: id, noteContent: note?.content?.slice(0, 3000) });
              }}
            >
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Choose notes..." />
              </SelectTrigger>
              <SelectContent>
                {notes.map((n) => (
                  <SelectItem key={n.id} value={n.id}>
                    📄 {n.todo_title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* Video Selector */}
      {value.type === "my_videos" && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Select a study video</Label>
          {loadingData ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading videos...
            </div>
          ) : videos.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No study videos found. Watch some videos first!</p>
          ) : (
            <Select
              value={value.videoId || ""}
              onValueChange={(vid) => {
                const video = videos.find((v) => v.video_id === vid);
                onChange({ ...value, videoId: vid, videoTitle: video?.title });
              }}
            >
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Choose a video..." />
              </SelectTrigger>
              <SelectContent>
                {videos.map((v) => (
                  <SelectItem key={v.video_id} value={v.video_id}>
                    🎥 {v.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* AI Mixed info */}
      {value.type === "ai_mixed" && (
        <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg">
          🤖 BrainBuddy AI will generate a diverse mix of questions based on popular topics and your study history.
        </p>
      )}
    </div>
  );
}
