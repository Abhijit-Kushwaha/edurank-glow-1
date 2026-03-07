import { useState, useEffect } from "react";
import { Trophy, BookOpen, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ShareContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShare: (type: string, content: any) => void;
}

const ShareContentDialog = ({
  open,
  onOpenChange,
  onShare,
}: ShareContentDialogProps) => {
  const { user } = useAuth();
  const [tab, setTab] = useState<"quiz" | "notes">("quiz");
  const [quizResults, setQuizResults] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && user) {
      setLoading(true);
      Promise.all([
        supabase
          .from("quiz_results")
          .select(
            "id, score, correct_answers, total_questions, created_at, todo_id",
          )
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("notes")
          .select("id, content, todo_id, created_at")
          .order("created_at", { ascending: false })
          .limit(10),
      ]).then(([quizRes, notesRes]) => {
        setQuizResults(quizRes.data || []);
        setNotes(notesRes.data || []);
        setLoading(false);
      });
    }
  }, [open, user]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Study Content</DialogTitle>
          <DialogDescription asChild>
            <VisuallyHidden>
              Share your quiz results or study notes with your friends.
            </VisuallyHidden>
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <Button
            variant={tab === "quiz" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("quiz")}
          >
            <Trophy className="h-4 w-4 mr-1" /> Quiz Results
          </Button>
          <Button
            variant={tab === "notes" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("notes")}
          >
            <BookOpen className="h-4 w-4 mr-1" /> Notes
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : tab === "quiz" ? (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {quizResults.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No quiz results to share.
              </p>
            ) : (
              quizResults.map((q) => (
                <button
                  key={q.id}
                  onClick={() =>
                    onShare("quiz_share", {
                      score: q.score,
                      correct: q.correct_answers,
                      total: q.total_questions,
                    })
                  }
                  className="w-full text-left p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Score: {q.score}%
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {q.correct_answers}/{q.total_questions} correct
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {notes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No notes to share.
              </p>
            ) : (
              notes.map((n) => (
                <button
                  key={n.id}
                  onClick={() =>
                    onShare("notes_share", {
                      title: n.content?.substring(0, 100) || "Study Notes",
                      noteId: n.id,
                    })
                  }
                  className="w-full text-left p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <p className="text-sm line-clamp-2">
                    {n.content?.substring(0, 100) || "Study Notes"}
                  </p>
                </button>
              ))
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ShareContentDialog;
