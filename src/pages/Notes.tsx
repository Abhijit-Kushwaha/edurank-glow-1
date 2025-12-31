import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Share2,
  CheckCircle,
  Sparkles,
  BookOpen,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import Logo from '@/components/Logo';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ParsedNotes {
  title: string;
  summary: string;
  keyPoints: string[];
  sections: Array<{
    title: string;
    content: string;
  }>;
}

const Notes = () => {
  const { todoId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<ParsedNotes | null>(null);
  const [rawNotes, setRawNotes] = useState<string>('');
  const [todoTitle, setTodoTitle] = useState('');

  useEffect(() => {
    if (todoId && user) {
      fetchNotes();
    }
  }, [todoId, user]);

  const fetchNotes = async () => {
    try {
      // Fetch todo for title
      const { data: todoData } = await supabase
        .from('todos')
        .select('title')
        .eq('id', todoId)
        .maybeSingle();

      if (todoData) {
        setTodoTitle(todoData.title);
      }

      // Fetch notes
      const { data: notesData, error } = await supabase
        .from('notes')
        .select('content')
        .eq('todo_id', todoId)
        .eq('is_ai_generated', true)
        .maybeSingle();

      if (error) throw error;

      if (notesData?.content) {
        setRawNotes(notesData.content);
        parseNotes(notesData.content, todoData?.title || 'Study Notes');
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  const parseNotes = (content: string, title: string) => {
    const lines = content.split('\n').filter(line => line.trim());
    const keyPoints: string[] = [];
    const sections: Array<{ title: string; content: string }> = [];
    let currentSection: { title: string; content: string } | null = null;
    let summary = '';

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Check for headers
      if (trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = { title: trimmed.replace(/^#+\s*/, ''), content: '' };
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const point = trimmed.replace(/^[-*]\s*/, '').replace(/\*\*/g, '');
        if (point.length > 10) {
          keyPoints.push(point);
        }
        if (currentSection) {
          currentSection.content += point + '\n';
        }
      } else if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
        // Bold line - might be a key point
        const point = trimmed.replace(/\*\*/g, '');
        if (point.length > 10) {
          keyPoints.push(point);
        }
      } else if (!trimmed.startsWith('#') && trimmed.length > 50) {
        if (!summary && !currentSection) {
          summary = trimmed.replace(/\*\*/g, '');
        } else if (currentSection) {
          currentSection.content += trimmed + '\n';
        }
      }
    }

    if (currentSection) {
      sections.push(currentSection);
    }

    // If no summary found, create one from key points
    if (!summary && keyPoints.length > 0) {
      summary = keyPoints[0];
    }

    setNotes({
      title,
      summary: summary || 'Study notes generated from your video content.',
      keyPoints: keyPoints.slice(0, 7),
      sections: sections.slice(0, 5),
    });
  };

  const handleDownload = () => {
    const blob = new Blob([rawNotes], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${todoTitle || 'notes'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Notes downloaded!');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: notes?.title || 'Study Notes',
        text: notes?.summary || '',
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!notes || !rawNotes) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">No notes found for this task</p>
        <p className="text-sm text-muted-foreground">Watch at least 50% of the video to generate notes</p>
        <Button onClick={() => navigate(`/video/${todoId}`)}>Watch Video</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Logo size="sm" />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-1" />
              Save
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-3xl">
        {/* Title */}
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center gap-2 text-primary mb-2">
            <Sparkles className="h-5 w-5" />
            <span className="text-sm font-medium">AI-Generated Notes</span>
          </div>
          <h1 className="text-3xl font-bold mb-4">{notes.title}</h1>
          <p className="text-lg text-muted-foreground">{notes.summary}</p>
        </div>

        {/* Key Points */}
        {notes.keyPoints.length > 0 && (
          <section className="mb-8 animate-slide-up">
            <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
              <CheckCircle className="h-5 w-5 text-primary" />
              Key Takeaways
            </h2>
            <div className="space-y-3">
              {notes.keyPoints.map((point, index) => (
                <div
                  key={index}
                  className="flex gap-3 p-4 glass-card rounded-xl hover:neon-glow transition-all duration-300"
                >
                  <div className="flex-shrink-0 w-6 h-6 rounded-full gradient-bg flex items-center justify-center text-xs font-bold text-primary-foreground">
                    {index + 1}
                  </div>
                  <p>{point}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Detailed Sections */}
        {notes.sections.length > 0 && (
          <section className="space-y-6 animate-slide-up">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Detailed Notes
            </h2>
            {notes.sections.map((section, index) => (
              <div key={index} className="glass-card rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-3 neon-text">{section.title}</h3>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {section.content}
                </p>
              </div>
            ))}
          </section>
        )}

        {/* CTA */}
        <div className="mt-8 text-center">
          <Button variant="neon" size="lg" onClick={() => navigate(`/quiz/${todoId}`)}>
            <Sparkles className="h-5 w-5 mr-2" />
            Take the Quiz
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Notes;
