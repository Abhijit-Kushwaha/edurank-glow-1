import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import YouTube, { YouTubeEvent, YouTubePlayer } from 'react-youtube';
import {
  ArrowLeft,
  FileText,
  Sparkles,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import Logo from '@/components/Logo';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Todo {
  id: string;
  title: string;
  video_id: string | null;
  description: string | null;
}

const VideoPlayer = () => {
  const { todoId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [player, setPlayer] = useState<YouTubePlayer | null>(null);
  const [progress, setProgress] = useState(0);
  const [showNotesButton, setShowNotesButton] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);
  const [notes, setNotes] = useState<string[]>([]);
  const [todo, setTodo] = useState<Todo | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastSavedProgress, setLastSavedProgress] = useState(0);

  useEffect(() => {
    if (todoId && user) {
      fetchTodoAndProgress();
    }
  }, [todoId, user]);

  const fetchTodoAndProgress = async () => {
    try {
      // Fetch todo
      const { data: todoData, error: todoError } = await supabase
        .from('todos')
        .select('id, title, video_id, description')
        .eq('id', todoId)
        .maybeSingle();

      if (todoError) throw todoError;
      if (!todoData) {
        toast.error('Task not found');
        navigate('/dashboard');
        return;
      }
      setTodo(todoData);

      // Fetch existing progress
      const { data: progressData } = await supabase
        .from('video_progress')
        .select('progress_percent')
        .eq('todo_id', todoId)
        .maybeSingle();

      if (progressData) {
        setProgress(progressData.progress_percent);
        setLastSavedProgress(progressData.progress_percent);
        if (progressData.progress_percent >= 50) {
          setShowNotesButton(true);
        }
      }

      // Fetch existing notes
      const { data: notesData } = await supabase
        .from('notes')
        .select('content')
        .eq('todo_id', todoId)
        .eq('is_ai_generated', true)
        .maybeSingle();

      if (notesData) {
        setNotes(notesData.content.split('\n').filter((n: string) => n.trim()));
        setShowNotesButton(true);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load video');
    } finally {
      setLoading(false);
    }
  };

  const saveProgress = async (currentProgress: number) => {
    if (!user || !todoId || !todo?.video_id) return;
    
    // Only save if progress changed significantly (every 5%)
    if (Math.abs(currentProgress - lastSavedProgress) < 5) return;

    try {
      const { error } = await supabase
        .from('video_progress')
        .upsert({
          user_id: user.id,
          todo_id: todoId,
          video_id: todo.video_id,
          progress_percent: currentProgress,
          completed: currentProgress >= 90,
        }, {
          onConflict: 'todo_id,user_id',
        });

      if (error) throw error;
      setLastSavedProgress(currentProgress);
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (player && todo?.video_id) {
        const currentTime = player.getCurrentTime();
        const duration = player.getDuration();
        if (duration > 0) {
          const currentProgress = (currentTime / duration) * 100;
          setProgress(currentProgress);
          saveProgress(currentProgress);

          if (currentProgress >= 50 && !showNotesButton) {
            setShowNotesButton(true);
            toast.success('AI Notes available!', {
              icon: <Sparkles className="h-4 w-4 text-primary" />,
            });
          }
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [player, showNotesButton, todo, lastSavedProgress]);

  const onReady = (event: YouTubeEvent) => {
    setPlayer(event.target);
  };

  const handleGenerateNotes = async () => {
    if (!user || !todoId || !todo?.video_id) return;

    // Check if notes already exist
    if (notes.length > 0) {
      setShowNotes(true);
      return;
    }

    setIsGeneratingNotes(true);
    setShowNotes(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-notes', {
        body: {
          videoId: todo.video_id,
          videoTitle: todo.title,
          todoId: todoId,
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      const generatedNotes = data.notes as string;
      const noteLines = generatedNotes.split('\n').filter((n: string) => n.trim());
      setNotes(noteLines);

      toast.success('Notes generated successfully!');
    } catch (error: any) {
      console.error('Error generating notes:', error);
      
      if (error.message?.includes('429') || error.message?.includes('Rate limit')) {
        toast.error('Rate limit exceeded. Please try again later.');
      } else if (error.message?.includes('402')) {
        toast.error('Please add credits to continue using AI features.');
      } else {
        toast.error('Failed to generate notes. Please try again.');
      }
    } finally {
      setIsGeneratingNotes(false);
    }
  };

  const opts = {
    width: '100%',
    height: '100%',
    playerVars: {
      autoplay: 0,
      modestbranding: 1,
      rel: 0,
    },
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!todo || !todo.video_id) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-muted-foreground">No video found for this task</p>
        <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Logo size="sm" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {Math.round(progress)}% watched
            </span>
            {showNotesButton && (
              <Button variant="neon" size="sm" onClick={handleGenerateNotes}>
                <Sparkles className="h-4 w-4 mr-1" />
                AI Notes
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Video Container */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Video Player */}
        <div className="flex-1 bg-background">
          <div className="aspect-video w-full max-w-5xl mx-auto">
            <YouTube
              videoId={todo.video_id}
              opts={opts}
              onReady={onReady}
              className="w-full h-full"
              iframeClassName="w-full h-full rounded-lg"
            />
          </div>

          {/* Progress Bar */}
          <div className="max-w-5xl mx-auto px-4 py-4">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full gradient-bg transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-sm text-muted-foreground">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
          </div>

          {/* Video Info */}
          <div className="max-w-5xl mx-auto px-4 pb-8">
            <h1 className="text-2xl font-bold mb-2">{todo.title}</h1>
            {todo.description && (
              <p className="text-muted-foreground">{todo.description}</p>
            )}

            <div className="mt-6 flex gap-4">
              <Button
                variant="outline"
                onClick={() => navigate(`/notes/${todoId}`)}
                disabled={notes.length === 0}
              >
                <FileText className="h-4 w-4 mr-2" />
                View Full Notes
              </Button>
            </div>
          </div>
        </div>

        {/* Notes Sidebar */}
        {showNotes && (
          <div className="lg:w-96 glass-card border-l border-border/50 animate-slide-up lg:animate-none">
            <div className="p-4 border-b border-border/50 flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                AI-Generated Notes
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setShowNotes(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-4 space-y-3 max-h-[60vh] lg:max-h-[calc(100vh-200px)] overflow-y-auto">
              {isGeneratingNotes ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
                  <p className="text-muted-foreground">Generating AI notes...</p>
                </div>
              ) : (
                notes.slice(0, 15).map((note, index) => (
                  <div
                    key={index}
                    className="flex gap-3 p-3 rounded-lg bg-muted/50 animate-fade-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <CheckCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-sm">{note.replace(/^[-*#]+\s*/, '').replace(/\*\*/g, '')}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoPlayer;
