import { useState, useEffect, useCallback } from "react";
import { BookOpen, Plus, GraduationCap, Clock, Users, Edit, Trash2, Eye, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Section {
  id: string;
  subject: string;
  section_name: string;
  description: string | null;
  student_count: number;
  is_active: boolean;
  teacher_id: string;
  teacher_name?: string;
}

interface OrgQuiz {
  id: string;
  title: string;
  subject: string;
  description: string | null;
  difficulty: string;
  time_limit_mins: number;
  is_published: boolean;
  due_date: string | null;
  questions: any[];
  section_id: string | null;
  created_by: string;
  creator_name?: string;
  created_at: string;
}

const SUBJECTS = [
  "Mathematics", "Physics", "Chemistry", "Biology", "English",
  "Hindi", "History", "Geography", "Computer Science", "Economics",
  "Political Science", "Accountancy", "Business Studies", "Art", "Music",
  "Physical Education", "Environmental Science", "Psychology", "Sociology",
];

interface TeacherSectionsProps {
  orgId: string;
}

export default function TeacherSections({ orgId }: TeacherSectionsProps) {
  const { user, profile } = useAuth();
  const callerRole = (profile as any)?.role || "student";
  const isTeacherOrAbove = ["super_admin", "admin", "teacher"].includes(callerRole);

  const [sections, setSections] = useState<Section[]>([]);
  const [quizzes, setQuizzes] = useState<OrgQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<"sections" | "quizzes">("sections");

  // Section dialog
  const [showSectionDialog, setShowSectionDialog] = useState(false);
  const [sectionForm, setSectionForm] = useState({ subject: "", section_name: "", description: "" });
  const [savingSection, setSavingSection] = useState(false);

  // Quiz dialog
  const [showQuizDialog, setShowQuizDialog] = useState(false);
  const [quizForm, setQuizForm] = useState({
    title: "", subject: "", description: "", difficulty: "medium",
    time_limit_mins: 30, section_id: "", max_attempts: 1,
  });
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [savingQuiz, setSavingQuiz] = useState(false);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);

  const profileId = (profile as any)?.id;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [secRes, quizRes] = await Promise.all([
        (supabase as any).from("teacher_sections").select("*, profiles!teacher_sections_teacher_id_fkey(name)").eq("org_id", orgId).order("created_at", { ascending: false }),
        (supabase as any).from("org_quizzes").select("*, profiles!org_quizzes_created_by_fkey(name)").eq("org_id", orgId).order("created_at", { ascending: false }),
      ]);

      if (secRes.data) {
        setSections(secRes.data.map((s: any) => ({ ...s, teacher_name: s.profiles?.name })));
      }
      if (quizRes.data) {
        setQuizzes(quizRes.data.map((q: any) => ({ ...q, creator_name: q.profiles?.name })));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreateSection = async () => {
    if (!sectionForm.subject || !sectionForm.section_name || !profileId) return;
    setSavingSection(true);
    try {
      const { error } = await (supabase as any).from("teacher_sections").insert({
        org_id: orgId,
        teacher_id: profileId,
        subject: sectionForm.subject,
        section_name: sectionForm.section_name,
        description: sectionForm.description || null,
      });
      if (error) throw error;
      toast.success("Section created!");
      setShowSectionDialog(false);
      setSectionForm({ subject: "", section_name: "", description: "" });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create section");
    } finally {
      setSavingSection(false);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!quizForm.subject || !quizForm.title) return;
    setGeneratingQuiz(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-quiz", {
        body: {
          subject: quizForm.subject,
          topic: quizForm.title,
          difficulty: quizForm.difficulty,
          numQuestions: 10,
        },
      });
      if (error) throw error;
      if (data?.questions) {
        setQuizQuestions(data.questions);
        toast.success(`Generated ${data.questions.length} questions!`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to generate quiz");
    } finally {
      setGeneratingQuiz(false);
    }
  };

  const handleCreateQuiz = async (publish = false) => {
    if (!quizForm.title || !quizForm.subject || !profileId) return;
    if (quizQuestions.length === 0) {
      toast.error("Please generate or add questions first");
      return;
    }
    setSavingQuiz(true);
    try {
      const { error } = await (supabase as any).from("org_quizzes").insert({
        org_id: orgId,
        created_by: profileId,
        title: quizForm.title,
        subject: quizForm.subject,
        description: quizForm.description || null,
        difficulty: quizForm.difficulty,
        time_limit_mins: quizForm.time_limit_mins,
        section_id: quizForm.section_id || null,
        max_attempts: quizForm.max_attempts,
        questions: quizQuestions,
        is_published: publish,
      });
      if (error) throw error;
      toast.success(publish ? "Quiz published!" : "Quiz saved as draft!");
      setShowQuizDialog(false);
      setQuizForm({ title: "", subject: "", description: "", difficulty: "medium", time_limit_mins: 30, section_id: "", max_attempts: 1 });
      setQuizQuestions([]);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create quiz");
    } finally {
      setSavingQuiz(false);
    }
  };

  const togglePublish = async (quiz: OrgQuiz) => {
    try {
      const { error } = await (supabase as any).from("org_quizzes")
        .update({ is_published: !quiz.is_published })
        .eq("id", quiz.id);
      if (error) throw error;
      toast.success(quiz.is_published ? "Quiz unpublished" : "Quiz published!");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed");
    }
  };

  if (loading) {
    return <div className="p-6 space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Teaching
          </h2>
          <p className="text-sm text-muted-foreground">Sections, subjects & quizzes</p>
        </div>
        {isTeacherOrAbove && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowSectionDialog(true)}>
              <Plus className="h-4 w-4 mr-1" /> Section
            </Button>
            <Button size="sm" onClick={() => setShowQuizDialog(true)}>
              <Plus className="h-4 w-4 mr-1" /> Quiz
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {["sections", "quizzes"].map(v => (
          <button key={v} onClick={() => setActiveView(v as any)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeView === v ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`}
          >{v === "sections" ? "Sections & Teachers" : "Quizzes"}</button>
        ))}
      </div>

      {activeView === "sections" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sections.length === 0 ? (
            <p className="col-span-full text-center text-muted-foreground py-8">No sections yet</p>
          ) : sections.map(s => (
            <Card key={s.id} className="border-border/50">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-[10px]">{s.subject}</Badge>
                  {s.is_active && <Badge variant="outline" className="text-[10px] text-green-500 border-green-500/30">Active</Badge>}
                </div>
                <CardTitle className="text-sm mt-1">{s.section_name}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" /> Teacher: {s.teacher_name || "Unknown"}
                </p>
                {s.description && <p className="text-xs text-muted-foreground line-clamp-2">{s.description}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {quizzes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No quizzes yet</p>
          ) : quizzes.map(q => (
            <div key={q.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-card/50">
              <BookOpen className="h-5 w-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">{q.title}</p>
                  <Badge variant={q.is_published ? "default" : "outline"} className="text-[10px]">
                    {q.is_published ? "Published" : "Draft"}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">{q.subject}</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  By {q.creator_name} • {q.questions?.length || 0} questions • {q.difficulty}
                  {q.due_date && ` • Due ${new Date(q.due_date).toLocaleDateString()}`}
                </p>
              </div>
              {isTeacherOrAbove && q.created_by === profileId && (
                <Button variant="ghost" size="sm" onClick={() => togglePublish(q)}>
                  {q.is_published ? "Unpublish" : "Publish"}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Section Dialog */}
      <Dialog open={showSectionDialog} onOpenChange={setShowSectionDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Section</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Subject *</Label>
              <Select value={sectionForm.subject} onValueChange={v => setSectionForm(p => ({ ...p, subject: v }))}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Section Name *</Label>
              <Input value={sectionForm.section_name} onChange={e => setSectionForm(p => ({ ...p, section_name: e.target.value }))} placeholder="e.g. Class 10-A Physics" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={sectionForm.description} onChange={e => setSectionForm(p => ({ ...p, description: e.target.value }))} placeholder="What will you teach?" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSectionDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateSection} disabled={!sectionForm.subject || !sectionForm.section_name || savingSection}>
              {savingSection ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Quiz Dialog */}
      <Dialog open={showQuizDialog} onOpenChange={setShowQuizDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-auto">
          <DialogHeader><DialogTitle>Create Quiz for Students</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input value={quizForm.title} onChange={e => setQuizForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Chapter 5 - Electromagnetism" />
            </div>
            <div>
              <Label>Subject *</Label>
              <Select value={quizForm.subject} onValueChange={v => setQuizForm(p => ({ ...p, subject: v }))}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Section (optional)</Label>
              <Select value={quizForm.section_id} onValueChange={v => setQuizForm(p => ({ ...p, section_id: v }))}>
                <SelectTrigger><SelectValue placeholder="All students" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All students</SelectItem>
                  {sections.filter(s => s.teacher_id === profileId).map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.section_name} - {s.subject}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Difficulty</Label>
                <Select value={quizForm.difficulty} onValueChange={v => setQuizForm(p => ({ ...p, difficulty: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Time Limit (mins)</Label>
                <Input type="number" value={quizForm.time_limit_mins} onChange={e => setQuizForm(p => ({ ...p, time_limit_mins: Number(e.target.value) }))} min={5} max={120} />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={quizForm.description} onChange={e => setQuizForm(p => ({ ...p, description: e.target.value }))} placeholder="Instructions for students" rows={2} />
            </div>

            {/* AI Generate */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <p className="text-sm font-medium mb-2">🤖 AI Quiz Generator</p>
              <p className="text-xs text-muted-foreground mb-2">Auto-generate quiz questions based on subject & title</p>
              <Button variant="outline" size="sm" onClick={handleGenerateQuiz} disabled={generatingQuiz || !quizForm.subject || !quizForm.title}>
                {generatingQuiz ? (
                  <span className="flex items-center gap-1"><div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> Generating...</span>
                ) : "Generate 10 Questions"}
              </Button>
            </div>

            {quizQuestions.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">{quizQuestions.length} Questions Ready</p>
                <div className="max-h-40 overflow-auto space-y-1">
                  {quizQuestions.map((q, i) => (
                    <p key={i} className="text-xs text-muted-foreground truncate">
                      {i + 1}. {q.question || q.question_text || "Question"}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowQuizDialog(false)}>Cancel</Button>
            <Button variant="secondary" onClick={() => handleCreateQuiz(false)} disabled={savingQuiz}>Save Draft</Button>
            <Button onClick={() => handleCreateQuiz(true)} disabled={savingQuiz}>
              <Send className="h-4 w-4 mr-1" /> Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
