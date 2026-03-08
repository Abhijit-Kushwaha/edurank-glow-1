import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Database, Search, Plus, Trash2, CheckSquare } from "lucide-react";
import { toast } from "sonner";
import type { ManualQuestion } from "./QuestionEditor";

interface QuestionBankItem {
  id: string;
  question_text: string;
  question_type: string;
  options: any;
  correct_answer: any;
  explanation: string | null;
  difficulty: string;
  subject: string;
  tags: string[];
  points: number;
  created_at: string;
}

interface QuestionBankPanelProps {
  orgId: string;
  onSelectQuestions: (questions: ManualQuestion[]) => void;
  mode: "browse" | "select";
}

const SUBJECTS = [
  "Mathematics", "Physics", "Chemistry", "Biology", "English",
  "Hindi", "History", "Geography", "Computer Science", "Economics",
  "Political Science", "Accountancy", "Business Studies",
];

export default function QuestionBankPanel({ orgId, onSelectQuestions, mode }: QuestionBankPanelProps) {
  const { profile } = useAuth();
  const [questions, setQuestions] = useState<QuestionBankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterDifficulty, setFilterDifficulty] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      let query = (supabase as any).from("question_bank").select("*").eq("org_id", orgId).order("created_at", { ascending: false });
      if (filterSubject !== "all") query = query.eq("subject", filterSubject);
      if (filterDifficulty !== "all") query = query.eq("difficulty", filterDifficulty);
      if (filterType !== "all") query = query.eq("question_type", filterType);
      
      const { data, error } = await query;
      if (error) throw error;
      setQuestions(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [orgId, filterSubject, filterDifficulty, filterType]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  const filtered = questions.filter(q =>
    !search || q.question_text.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleImportSelected = () => {
    const selectedQs = questions.filter(q => selected.has(q.id)).map(q => ({
      question_text: q.question_text,
      question_type: q.question_type as any,
      options: Array.isArray(q.options) ? q.options : [],
      correct_answer: q.correct_answer,
      explanation: q.explanation || "",
      difficulty: q.difficulty,
      points: q.points,
    }));
    onSelectQuestions(selectedQs);
    setSelected(new Set());
    toast.success(`Added ${selectedQs.length} question(s) from bank`);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await (supabase as any).from("question_bank").delete().eq("id", id);
      if (error) throw error;
      setQuestions(prev => prev.filter(q => q.id !== id));
      toast.success("Question deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
  };

  const typeLabel: Record<string, string> = {
    mcq: "MCQ", true_false: "T/F", fill_blank: "Fill", short_answer: "Short",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Database className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-sm">Question Bank</h3>
        <Badge variant="outline" className="text-[10px]">{questions.length} questions</Badge>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[150px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="pl-8 h-8 text-xs" />
        </div>
        <Select value={filterSubject} onValueChange={setFilterSubject}>
          <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Subject" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
          <SelectTrigger className="w-[100px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="easy">Easy</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="hard">Hard</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[100px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="mcq">MCQ</SelectItem>
            <SelectItem value="true_false">True/False</SelectItem>
            <SelectItem value="fill_blank">Fill Blank</SelectItem>
            <SelectItem value="short_answer">Short Answer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Selection actions */}
      {mode === "select" && selected.size > 0 && (
        <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg p-2">
          <CheckSquare className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium">{selected.size} selected</span>
          <Button size="sm" className="ml-auto h-7 text-xs" onClick={handleImportSelected}>
            <Plus className="h-3 w-3 mr-1" /> Add to Quiz
          </Button>
        </div>
      )}

      {/* Questions list */}
      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground text-sm py-6">
          {questions.length === 0 ? "No questions in the bank yet. Save questions from quiz builder!" : "No matching questions."}
        </p>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-auto">
          {filtered.map(q => (
            <div key={q.id} className="flex items-start gap-2 p-2.5 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
              {mode === "select" && (
                <Checkbox
                  checked={selected.has(q.id)}
                  onCheckedChange={() => toggleSelect(q.id)}
                  className="mt-0.5"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium line-clamp-2">{q.question_text}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge variant="outline" className="text-[9px]">{typeLabel[q.question_type] || q.question_type}</Badge>
                  <Badge variant="secondary" className="text-[9px]">{q.subject}</Badge>
                  <Badge variant={q.difficulty === "hard" ? "destructive" : q.difficulty === "easy" ? "default" : "secondary"} className="text-[9px]">{q.difficulty}</Badge>
                  <span className="text-[9px] text-muted-foreground">{q.points}pt</span>
                </div>
              </div>
              {mode === "browse" && (
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleDelete(q.id)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
