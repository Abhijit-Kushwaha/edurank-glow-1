import { useState, useEffect, useCallback } from "react";
import { BookOpen, Plus, GraduationCap, Users, Send, Trash2, Coins, AlertCircle, Database, Upload, Eye, BarChart3, Calendar, Settings2, Clock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import QuestionEditor, { type ManualQuestion, EMPTY_QUESTION } from "./QuestionEditor";
import BulkQuestionImport from "./BulkQuestionImport";
import QuestionBankPanel from "./QuestionBankPanel";
import QuizResultsDashboard from "./QuizResultsDashboard";

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
  max_attempts?: number;
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
  const callerRole = profile?.role || "student";
  const isTeacherOrAbove = ["super_admin", "admin", "teacher"].includes(callerRole);

  const [sections, setSections] = useState<Section[]>([]);
  const [quizzes, setQuizzes] = useState<OrgQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<"sections" | "quizzes" | "question_bank">("quizzes");

  // Credits
  const [orgCredits, setOrgCredits] = useState<{ total: number; used: number; remaining: number } | null>(null);

  // Section dialog
  const [showSectionDialog, setShowSectionDialog] = useState(false);
  const [sectionForm, setSectionForm] = useState({ subject: "", section_name: "", description: "" });
  const [savingSection, setSavingSection] = useState(false);

  // Quiz dialog
  const [showQuizDialog, setShowQuizDialog] = useState(false);
  const [quizForm, setQuizForm] = useState({
    title: "", subject: "", description: "", difficulty: "medium",
    time_limit_mins: 30, section_id: "all", max_attempts: 1,
    scheduled_at: "", due_date: "",
    shuffle_questions: false, shuffle_options: false, show_answers_after: true,
    lock_screen: false,
  });
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [savingQuiz, setSavingQuiz] = useState(false);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [quizCreationMode, setQuizCreationMode] = useState<"manual" | "ai" | "bank" | "import">("manual");

  // Manual question builder
  const [manualQuestions, setManualQuestions] = useState<ManualQuestion[]>([{ ...EMPTY_QUESTION }]);

  // Bulk import
  const [showBulkImport, setShowBulkImport] = useState(false);

  // Results dashboard
  const [viewingResults, setViewingResults] = useState<OrgQuiz | null>(null);

  const profileId = profile?.id;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [secRes, quizRes] = await Promise.all([
        (supabase as any).from("teacher_sections").select("*, profiles!teacher_sections_teacher_id_fkey(name)").eq("org_id", orgId).order("created_at", { ascending: false }),
        (supabase as any).from("org_quizzes").select("*, profiles!org_quizzes_created_by_fkey(name)").eq("org_id", orgId).order("created_at", { ascending: false }),
      ]);

      if (secRes.data) setSections(secRes.data.map((s: any) => ({ ...s, teacher_name: s.profiles?.name })));
      if (quizRes.data) setQuizzes(quizRes.data.map((q: any) => ({ ...q, creator_name: q.profiles?.name })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  const fetchCredits = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc("get_my_org_credits");
      if (!error && data) setOrgCredits(data as any);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchData(); fetchCredits(); }, [fetchData, fetchCredits]);

  const handleCreateSection = async () => {
    if (!sectionForm.subject || !sectionForm.section_name || !profileId) return;
    setSavingSection(true);
    try {
      const { error } = await (supabase as any).from("teacher_sections").insert({
        org_id: orgId, teacher_id: profileId,
        subject: sectionForm.subject, section_name: sectionForm.section_name,
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
    if (!orgCredits || orgCredits.remaining < 5) {
      toast.error("Insufficient credits (costs 5). Ask your Super Admin.");
      return;
    }
    setGeneratingQuiz(true);
    try {
      if (user) {
        const { data: creditResult } = await supabase.rpc("use_org_credits", {
          p_user_id: user.id, p_amount: 5,
          p_reason: `AI quiz generation: ${quizForm.title}`,
        });
        const result = creditResult as any;
        if (!result?.success) {
          toast.error(result?.error || "Credit check failed");
          setGeneratingQuiz(false);
          return;
        }
      }
      const { data, error } = await supabase.functions.invoke("generate-quiz", {
        body: { subject: quizForm.subject, topic: quizForm.title, difficulty: quizForm.difficulty, numQuestions: 10 },
      });
      if (error) throw error;
      if (data?.questions) {
        setQuizQuestions(data.questions);
        toast.success(`Generated ${data.questions.length} questions!`);
        fetchCredits();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to generate quiz");
    } finally {
      setGeneratingQuiz(false);
    }
  };

  const handleSaveToBank = async () => {
    if (!profileId || !quizForm.subject) {
      toast.error("Select a subject first");
      return;
    }
    const validQs = manualQuestions.filter(q => q.question_text.trim());
    if (validQs.length === 0) {
      toast.error("Add at least one question");
      return;
    }
    try {
      const rows = validQs.map(q => ({
        org_id: orgId,
        created_by: profileId,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options,
        correct_answer: q.correct_answer,
        explanation: q.explanation || null,
        difficulty: q.difficulty,
        subject: quizForm.subject,
        points: q.points,
      }));
      const { error } = await (supabase as any).from("question_bank").insert(rows);
      if (error) throw error;
      toast.success(`${validQs.length} question(s) saved to bank!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to save to bank");
    }
  };

  const handleCreateQuiz = async (publish = false) => {
    if (!quizForm.title || !quizForm.subject || !profileId) return;

    const finalQuestions = quizCreationMode === "ai"
      ? quizQuestions
      : manualQuestions
          .filter(q => q.question_text.trim())
          .map(q => ({
            question_text: q.question_text,
            question_type: q.question_type,
            options: q.options,
            correct_answer: q.correct_answer,
            explanation: q.explanation,
            difficulty: q.difficulty,
            points: q.points,
          }));

    if (finalQuestions.length === 0) {
      toast.error("Add at least one question");
      return;
    }

    setSavingQuiz(true);
    try {
      const { data: quizData, error } = await (supabase as any).from("org_quizzes").insert({
        org_id: orgId,
        created_by: profileId,
        title: quizForm.title,
        subject: quizForm.subject,
        description: quizForm.description || null,
        difficulty: quizForm.difficulty,
        time_limit_mins: quizForm.time_limit_mins,
        section_id: quizForm.section_id === "all" ? null : quizForm.section_id,
        max_attempts: quizForm.max_attempts,
        questions: finalQuestions,
        is_published: publish,
        due_date: quizForm.due_date || null,
        lock_screen: quizForm.lock_screen,
      }).select("id").single();
      if (error) throw error;

      // Create assignment if publishing
      if (publish && quizData) {
        await (supabase as any).from("quiz_assignments").insert({
          org_id: orgId,
          quiz_id: quizData.id,
          section_id: quizForm.section_id === "all" ? null : quizForm.section_id,
          assigned_by: profileId,
          assigned_to_all: quizForm.section_id === "all",
          scheduled_at: quizForm.scheduled_at || null,
          due_date: quizForm.due_date || null,
          max_attempts: quizForm.max_attempts,
          shuffle_questions: quizForm.shuffle_questions,
          shuffle_options: quizForm.shuffle_options,
          show_answers_after: quizForm.show_answers_after,
        });
      }

      toast.success(publish ? "Quiz published & assigned!" : "Quiz saved as draft!");
      setShowQuizDialog(false);
      resetQuizForm();
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create quiz");
    } finally {
      setSavingQuiz(false);
    }
  };

  const resetQuizForm = () => {
    setQuizForm({
      title: "", subject: "", description: "", difficulty: "medium",
      time_limit_mins: 30, section_id: "all", max_attempts: 1,
      scheduled_at: "", due_date: "",
      shuffle_questions: false, shuffle_options: false, show_answers_after: true,
      lock_screen: false,
    });
    setQuizQuestions([]);
    setManualQuestions([{ ...EMPTY_QUESTION }]);
    setQuizCreationMode("manual");
  };

  const togglePublish = async (quiz: OrgQuiz) => {
    try {
      const { error } = await (supabase as any).from("org_quizzes").update({ is_published: !quiz.is_published }).eq("id", quiz.id);
      if (error) throw error;
      toast.success(quiz.is_published ? "Quiz unpublished" : "Quiz published!");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed");
    }
  };

  const deleteQuiz = async (quiz: OrgQuiz) => {
    if (!confirm(`Delete "${quiz.title}"?`)) return;
    try {
      await (supabase as any).from("org_quizzes").delete().eq("id", quiz.id);
      toast.success("Quiz deleted");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed");
    }
  };

  // Manual question helpers
  const updateQuestion = (index: number, question: ManualQuestion) => {
    setManualQuestions(prev => prev.map((q, i) => i === index ? question : q));
  };
  const removeQuestion = (index: number) => {
    setManualQuestions(prev => prev.filter((_, i) => i !== index));
  };
  const addBankQuestions = (questions: ManualQuestion[]) => {
    setManualQuestions(prev => [...prev, ...questions]);
    setQuizCreationMode("manual");
  };
  const handleBulkImport = (questions: ManualQuestion[]) => {
    setManualQuestions(prev => [...prev, ...questions]);
  };

  if (loading) {
    return <div className="p-6 space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div>;
  }

  // If viewing results for a quiz
  if (viewingResults) {
    return (
      <div className="p-6">
        <QuizResultsDashboard
          orgId={orgId}
          quizId={viewingResults.id}
          quizTitle={viewingResults.title}
          questions={viewingResults.questions || []}
          onClose={() => setViewingResults(null)}
        />
      </div>
    );
  }

  const totalQuestionsReady = manualQuestions.filter(q => q.question_text.trim()).length;
  const totalPoints = manualQuestions.filter(q => q.question_text.trim()).reduce((sum, q) => sum + q.points, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Teaching Control Panel
          </h2>
          <p className="text-sm text-muted-foreground">Manage sections, quizzes & question bank</p>
        </div>
        <div className="flex items-center gap-3">
          {orgCredits && (
            <Badge variant="outline" className="gap-1.5 text-xs py-1">
              <Coins className="h-3 w-3" />
              {orgCredits.remaining} credits
            </Badge>
          )}
          {isTeacherOrAbove && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowSectionDialog(true)}>
                <Plus className="h-4 w-4 mr-1" /> Section
              </Button>
              <Button size="sm" onClick={() => { resetQuizForm(); setShowQuizDialog(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Create Quiz
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: "quizzes", label: "📝 Quizzes", count: quizzes.length },
          { id: "sections", label: "📚 Sections", count: sections.length },
          { id: "question_bank", label: "🗄️ Question Bank" },
        ].map(v => (
          <button key={v.id} onClick={() => setActiveView(v.id as any)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
              activeView === v.id ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            {v.label}
            {v.count !== undefined && <Badge variant="secondary" className="text-[9px] h-4 px-1">{v.count}</Badge>}
          </button>
        ))}
      </div>

      {/* Quizzes View */}
      {activeView === "quizzes" && (
        <div className="space-y-3">
          {quizzes.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">No quizzes yet</p>
              {isTeacherOrAbove && (
                <Button size="sm" className="mt-3" onClick={() => { resetQuizForm(); setShowQuizDialog(true); }}>
                  <Plus className="h-4 w-4 mr-1" /> Create Your First Quiz
                </Button>
              )}
            </div>
          ) : quizzes.map(q => (
            <Card key={q.id} className="border-border/50 hover:border-border transition-colors">
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{q.title}</p>
                      <Badge variant={q.is_published ? "default" : "outline"} className="text-[10px]">
                        {q.is_published ? "Published" : "Draft"}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">{q.subject}</Badge>
                      <Badge variant="secondary" className="text-[10px]">{q.difficulty}</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      By {q.creator_name} • {q.questions?.length || 0} questions • {q.time_limit_mins}min
                      {q.due_date && ` • Due ${new Date(q.due_date).toLocaleDateString()}`}
                    </p>
                  </div>
                  {isTeacherOrAbove && (
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setViewingResults(q)}>
                        <BarChart3 className="h-3.5 w-3.5 mr-1" /> Results
                      </Button>
                      {q.created_by === profileId && (
                        <>
                          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => togglePublish(q)}>
                            {q.is_published ? "Unpublish" : "Publish"}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteQuiz(q)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Sections View */}
      {activeView === "sections" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sections.length === 0 ? (
            <p className="col-span-full text-center text-muted-foreground py-8">No sections yet</p>
          ) : sections.map(s => (
            <Card key={s.id} className="border-border/50">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-[10px]">{s.subject}</Badge>
                  {s.is_active && <Badge variant="outline" className="text-[10px]">Active</Badge>}
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
      )}

      {/* Question Bank View */}
      {activeView === "question_bank" && (
        <QuestionBankPanel orgId={orgId} onSelectQuestions={() => {}} mode="browse" />
      )}

      {/* Create Section Dialog */}
      <Dialog open={showSectionDialog} onOpenChange={setShowSectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Section</DialogTitle>
            <DialogDescription>Add a new teaching section for your subject.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Subject *</Label>
              <Select value={sectionForm.subject} onValueChange={v => setSectionForm(p => ({ ...p, subject: v }))}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>{SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
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

      {/* Enhanced Quiz Builder Dialog */}
      <Dialog open={showQuizDialog} onOpenChange={setShowQuizDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Quiz Builder
            </DialogTitle>
            <DialogDescription>Create a comprehensive quiz with multiple question types.</DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Title *</Label>
                <Input value={quizForm.title} onChange={e => setQuizForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Chapter 5 - Electromagnetism" />
              </div>
              <div>
                <Label>Subject *</Label>
                <Select value={quizForm.subject} onValueChange={v => setQuizForm(p => ({ ...p, subject: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>{SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Instructions for Students</Label>
              <Textarea value={quizForm.description} onChange={e => setQuizForm(p => ({ ...p, description: e.target.value }))} placeholder="Any special instructions, topics covered, etc." rows={2} />
            </div>

            {/* Settings Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Section</Label>
                <Select value={quizForm.section_id} onValueChange={v => setQuizForm(p => ({ ...p, section_id: v }))}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All students</SelectItem>
                    {sections.filter(s => s.teacher_id === profileId).map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.section_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Difficulty</Label>
                <Select value={quizForm.difficulty} onValueChange={v => setQuizForm(p => ({ ...p, difficulty: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">🟢 Easy</SelectItem>
                    <SelectItem value="medium">🟡 Medium</SelectItem>
                    <SelectItem value="hard">🔴 Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Time Limit</Label>
                <Input type="number" value={quizForm.time_limit_mins} onChange={e => setQuizForm(p => ({ ...p, time_limit_mins: Number(e.target.value) }))} min={5} max={180} className="h-9" />
              </div>
              <div>
                <Label className="text-xs">Max Attempts</Label>
                <Input type="number" value={quizForm.max_attempts} onChange={e => setQuizForm(p => ({ ...p, max_attempts: Math.max(1, Number(e.target.value)) }))} min={1} max={10} className="h-9" />
              </div>
            </div>

            {/* Scheduling */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs flex items-center gap-1"><Calendar className="h-3 w-3" /> Schedule (optional)</Label>
                <Input type="datetime-local" value={quizForm.scheduled_at} onChange={e => setQuizForm(p => ({ ...p, scheduled_at: e.target.value }))} className="h-9" />
              </div>
              <div>
                <Label className="text-xs flex items-center gap-1"><Clock className="h-3 w-3" /> Due Date (optional)</Label>
                <Input type="datetime-local" value={quizForm.due_date} onChange={e => setQuizForm(p => ({ ...p, due_date: e.target.value }))} className="h-9" />
              </div>
            </div>

            {/* Advanced Settings */}
            <div className="flex flex-wrap gap-4 p-3 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-center gap-2">
                <Switch checked={quizForm.shuffle_questions} onCheckedChange={v => setQuizForm(p => ({ ...p, shuffle_questions: v }))} />
                <Label className="text-xs">Shuffle Questions</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={quizForm.shuffle_options} onCheckedChange={v => setQuizForm(p => ({ ...p, shuffle_options: v }))} />
                <Label className="text-xs">Shuffle Options</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={quizForm.show_answers_after} onCheckedChange={v => setQuizForm(p => ({ ...p, show_answers_after: v }))} />
                <Label className="text-xs">Show Answers After</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={quizForm.lock_screen} onCheckedChange={v => setQuizForm(p => ({ ...p, lock_screen: v }))} />
                <Label className="text-xs flex items-center gap-1">🔒 Lock Screen (Anti-cheat)</Label>
              </div>
            </div>

            {/* Question Creation Tabs */}
            <Tabs value={quizCreationMode} onValueChange={v => setQuizCreationMode(v as any)}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="manual" className="text-xs">✏️ Manual</TabsTrigger>
                <TabsTrigger value="bank" className="text-xs">🗄️ Bank</TabsTrigger>
                <TabsTrigger value="import" className="text-xs">📋 Import</TabsTrigger>
                <TabsTrigger value="ai" className="text-xs">🤖 AI</TabsTrigger>
              </TabsList>

              {/* Manual Question Builder */}
              <TabsContent value="manual" className="space-y-3 mt-4">
                {manualQuestions.map((q, qi) => (
                  <QuestionEditor
                    key={qi}
                    question={q}
                    index={qi}
                    onChange={updateQuestion}
                    onRemove={removeQuestion}
                    canRemove={manualQuestions.length > 1}
                  />
                ))}

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setManualQuestions(prev => [...prev, { ...EMPTY_QUESTION }])} className="flex-1">
                    <Plus className="h-4 w-4 mr-1" /> Add Question
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleSaveToBank} disabled={!quizForm.subject}>
                    <Database className="h-4 w-4 mr-1" /> Save to Bank
                  </Button>
                </div>

                <div className="text-center text-xs text-muted-foreground">
                  {totalQuestionsReady} question(s) • {totalPoints} total points
                </div>
              </TabsContent>

              {/* Question Bank */}
              <TabsContent value="bank" className="mt-4">
                <QuestionBankPanel orgId={orgId} onSelectQuestions={addBankQuestions} mode="select" />
              </TabsContent>

              {/* Bulk Import */}
              <TabsContent value="import" className="mt-4">
                <div className="text-center py-6 space-y-3">
                  <Upload className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                  <p className="text-sm text-muted-foreground">Paste multiple questions at once</p>
                  <Button variant="outline" onClick={() => setShowBulkImport(true)}>
                    <Upload className="h-4 w-4 mr-1" /> Open Bulk Import
                  </Button>
                  {manualQuestions.length > 1 && (
                    <p className="text-xs text-muted-foreground">{manualQuestions.filter(q => q.question_text.trim()).length} questions loaded</p>
                  )}
                </div>
              </TabsContent>

              {/* AI Generation */}
              <TabsContent value="ai" className="space-y-4 mt-4">
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">🤖 AI Quiz Generator</p>
                      <p className="text-xs text-muted-foreground">Auto-generate 10 MCQ questions</p>
                    </div>
                    <Badge variant="outline" className="gap-1 text-[10px]">
                      <Coins className="h-3 w-3" /> 5 credits
                    </Badge>
                  </div>

                  {orgCredits && orgCredits.remaining < 5 && (
                    <div className="flex items-center gap-2 text-destructive text-xs bg-destructive/10 rounded-md p-2">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>Not enough credits ({orgCredits.remaining} remaining).</span>
                    </div>
                  )}

                  <Button variant="outline" size="sm" onClick={handleGenerateQuiz}
                    disabled={generatingQuiz || !quizForm.subject || !quizForm.title || (orgCredits?.remaining ?? 0) < 5}
                  >
                    {generatingQuiz ? (
                      <span className="flex items-center gap-1"><div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> Generating...</span>
                    ) : "Generate 10 Questions"}
                  </Button>
                </div>

                {quizQuestions.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">{quizQuestions.length} Questions Generated</p>
                    <div className="max-h-48 overflow-auto space-y-1 rounded-lg border border-border/50 p-2">
                      {quizQuestions.map((q, i) => (
                        <p key={i} className="text-xs text-muted-foreground truncate">
                          {i + 1}. {q.question || q.question_text || "Question"}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter className="gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setShowQuizDialog(false)}>Cancel</Button>
            <Button variant="secondary" onClick={() => handleCreateQuiz(false)} disabled={savingQuiz}>Save Draft</Button>
            <Button onClick={() => handleCreateQuiz(true)} disabled={savingQuiz}>
              <Send className="h-4 w-4 mr-1" /> {savingQuiz ? "Publishing..." : "Publish & Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Dialog */}
      <BulkQuestionImport
        open={showBulkImport}
        onOpenChange={setShowBulkImport}
        onImport={handleBulkImport}
      />
    </div>
  );
}
