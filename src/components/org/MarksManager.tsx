import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  ClipboardList, Plus, Calendar, BookOpen, ChevronDown, ChevronRight,
  Save, Sparkles, FileText, ArrowUpRight, ArrowDownRight, Users,
  TrendingUp, Award, AlertTriangle, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

interface Batch { id: string; name: string; class_number: number; academic_year: string; }
interface Section { id: string; batch_id: string; name: string; display_name: string; }
interface ExamTerm { id: string; batch_id: string; name: string; is_active: boolean; }
interface Exam {
  id: string; term_id: string; section_id: string; name: string; subject: string;
  max_written_marks: number; max_internal_marks: number; is_published: boolean; exam_date: string | null;
}
interface StudentMark {
  id?: string; exam_id: string; student_id: string; written_marks: number;
  internal_marks: number; total_marks?: number; grade: string | null;
  remarks: string | null; is_absent: boolean;
  student?: { name: string | null; avatar_url: string | null; };
}
interface SectionStudent {
  id: string; student_id: string; roll_number: string | null;
  student?: { name: string | null; avatar_url: string | null; };
}
interface AIAnalysis {
  section_summary: { average: number; highest: number; lowest: number; pass_rate: number; };
  student_reports: {
    name: string; percentage: number; rank: number; grade: string;
    status: string; strengths: string[]; weaknesses: string[]; suggestions: string[];
  }[];
  section_recommendations: string[];
}

const COMMON_SUBJECTS = [
  "Mathematics", "Physics", "Chemistry", "Biology", "English",
  "Hindi", "Social Science", "Computer Science", "Physical Education",
  "Economics", "History", "Geography", "Political Science", "Sanskrit"
];

interface MarksManagerProps { orgId: string; }

export default function MarksManager({ orgId }: MarksManagerProps) {
  const { user, profile } = useAuth();
  const callerRole = profile?.role || "student";
  const isAdmin = ["super_admin", "admin"].includes(callerRole);
  const isTeacher = callerRole === "teacher";
  const profileId = profile?.id;

  const [batches, setBatches] = useState<Batch[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [terms, setTerms] = useState<ExamTerm[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [marks, setMarks] = useState<StudentMark[]>([]);
  const [sectionStudents, setSectionStudents] = useState<SectionStudent[]>([]);
  const [loading, setLoading] = useState(true);

  // Selections
  const [selectedBatch, setSelectedBatch] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [selectedTerm, setSelectedTerm] = useState<string>("");
  const [selectedExam, setSelectedExam] = useState<string>("");

  // Dialogs
  const [showCreateTerm, setShowCreateTerm] = useState(false);
  const [showCreateExam, setShowCreateExam] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);

  // Forms
  const [termForm, setTermForm] = useState({ name: "", startDate: "", endDate: "" });
  const [examForm, setExamForm] = useState({ name: "", subject: "", maxWritten: "80", maxInternal: "20", examDate: "" });
  const [editedMarks, setEditedMarks] = useState<Record<string, { written: string; internal: string; absent: boolean; remarks: string }>>({});
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);

  // Fetch batches
  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).from("batches").select("*").eq("org_id", orgId).order("class_number");
      if (data) setBatches(data);
      setLoading(false);
    })();
  }, [orgId]);

  // Fetch sections when batch changes
  useEffect(() => {
    if (!selectedBatch) { setSections([]); return; }
    (async () => {
      const { data } = await (supabase as any).from("batch_sections").select("*").eq("batch_id", selectedBatch).order("name");
      if (data) setSections(data);
    })();
  }, [selectedBatch]);

  // Fetch terms when batch changes
  useEffect(() => {
    if (!selectedBatch) { setTerms([]); return; }
    (async () => {
      const { data } = await (supabase as any).from("exam_terms").select("*").eq("batch_id", selectedBatch).order("created_at");
      if (data) setTerms(data);
    })();
  }, [selectedBatch]);

  // Fetch exams when term+section changes
  useEffect(() => {
    if (!selectedTerm || !selectedSection) { setExams([]); return; }
    (async () => {
      const { data } = await (supabase as any).from("exams").select("*")
        .eq("term_id", selectedTerm).eq("section_id", selectedSection).order("created_at");
      if (data) setExams(data);
    })();
  }, [selectedTerm, selectedSection]);

  // Fetch marks + students when exam selected
  useEffect(() => {
    if (!selectedExam || !selectedSection) { setMarks([]); setSectionStudents([]); return; }
    (async () => {
      const [marksRes, studentsRes] = await Promise.all([
        (supabase as any).from("student_marks")
          .select("*, student:profiles!student_marks_student_id_fkey(name, avatar_url)")
          .eq("exam_id", selectedExam),
        (supabase as any).from("section_students")
          .select("*, student:profiles!section_students_student_id_fkey(name, avatar_url)")
          .eq("section_id", selectedSection).eq("status", "active"),
      ]);
      if (marksRes.data) setMarks(marksRes.data);
      if (studentsRes.data) setSectionStudents(studentsRes.data);

      // Initialize edited marks
      const existing: Record<string, any> = {};
      (marksRes.data || []).forEach((m: any) => {
        existing[m.student_id] = {
          written: String(m.written_marks || 0),
          internal: String(m.internal_marks || 0),
          absent: m.is_absent,
          remarks: m.remarks || "",
        };
      });
      // Add empty rows for students without marks
      (studentsRes.data || []).forEach((s: any) => {
        if (!existing[s.student_id]) {
          existing[s.student_id] = { written: "0", internal: "0", absent: false, remarks: "" };
        }
      });
      setEditedMarks(existing);
    })();
  }, [selectedExam, selectedSection]);

  const currentExam = exams.find(e => e.id === selectedExam);

  // Create term
  const handleCreateTerm = async () => {
    if (!termForm.name.trim() || !selectedBatch || !profileId) return;
    setSaving(true);
    const { error } = await (supabase as any).from("exam_terms").insert({
      org_id: orgId, batch_id: selectedBatch, name: termForm.name.trim(),
      start_date: termForm.startDate || null, end_date: termForm.endDate || null,
      created_by: profileId,
    });
    if (error) toast.error(error.message.includes("duplicate") ? "Term already exists" : error.message);
    else {
      toast.success("Term created!");
      setShowCreateTerm(false);
      setTermForm({ name: "", startDate: "", endDate: "" });
      const { data } = await (supabase as any).from("exam_terms").select("*").eq("batch_id", selectedBatch).order("created_at");
      if (data) setTerms(data);
    }
    setSaving(false);
  };

  // Create exam
  const handleCreateExam = async () => {
    if (!examForm.name.trim() || !examForm.subject || !selectedTerm || !selectedSection || !profileId) return;
    setSaving(true);
    const { error } = await (supabase as any).from("exams").insert({
      org_id: orgId, term_id: selectedTerm, section_id: selectedSection,
      name: examForm.name.trim(), subject: examForm.subject,
      max_written_marks: parseInt(examForm.maxWritten) || 80,
      max_internal_marks: parseInt(examForm.maxInternal) || 20,
      exam_date: examForm.examDate || null, created_by: profileId,
    });
    if (error) toast.error(error.message.includes("duplicate") ? "Exam already exists for this subject" : error.message);
    else {
      toast.success("Exam created!");
      setShowCreateExam(false);
      setExamForm({ name: "", subject: "", maxWritten: "80", maxInternal: "20", examDate: "" });
      const { data } = await (supabase as any).from("exams").select("*")
        .eq("term_id", selectedTerm).eq("section_id", selectedSection).order("created_at");
      if (data) setExams(data);
    }
    setSaving(false);
  };

  // Save all marks
  const handleSaveMarks = async () => {
    if (!selectedExam || !profileId || !selectedSection) return;
    setSaving(true);
    try {
      const upserts = Object.entries(editedMarks).map(([studentId, m]) => ({
        exam_id: selectedExam,
        student_id: studentId,
        section_id: selectedSection,
        org_id: orgId,
        written_marks: parseFloat(m.written) || 0,
        internal_marks: parseFloat(m.internal) || 0,
        is_absent: m.absent,
        remarks: m.remarks || null,
        entered_by: profileId,
      }));

      // Validate marks
      for (const u of upserts) {
        if (currentExam && u.written_marks > currentExam.max_written_marks) {
          toast.error(`Written marks cannot exceed ${currentExam.max_written_marks}`);
          setSaving(false);
          return;
        }
        if (currentExam && u.internal_marks > currentExam.max_internal_marks) {
          toast.error(`Internal marks cannot exceed ${currentExam.max_internal_marks}`);
          setSaving(false);
          return;
        }
      }

      const { error } = await (supabase as any).from("student_marks").upsert(upserts, {
        onConflict: "exam_id,student_id",
      });
      if (error) throw error;
      toast.success("Marks saved successfully!");
      // Refresh
      const { data } = await (supabase as any).from("student_marks")
        .select("*, student:profiles!student_marks_student_id_fkey(name, avatar_url)")
        .eq("exam_id", selectedExam);
      if (data) setMarks(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to save marks");
    }
    setSaving(false);
  };

  // AI Analysis
  const handleAnalyze = async () => {
    if (!selectedSection || !selectedTerm) return;
    setAnalyzing(true);
    setShowAnalysis(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-student-marks", {
        body: {
          section_id: selectedSection,
          term_id: selectedTerm,
          org_id: orgId,
        },
      });
      if (error) throw error;
      setAnalysis(data as AIAnalysis);
    } catch (err: any) {
      toast.error(err.message || "Analysis failed");
      setShowAnalysis(false);
    }
    setAnalyzing(false);
  };

  // Auto-promote students
  const handlePromote = async () => {
    if (!analysis || !selectedSection || !selectedBatch) return;
    setSaving(true);
    try {
      const batch = batches.find(b => b.id === selectedBatch);
      const nextBatch = batches.find(b => b.class_number === (batch?.class_number || 0) + 1);

      const promotions = analysis.student_reports.map(sr => {
        const student = sectionStudents.find(s => s.student?.name === sr.name);
        if (!student) return null;
        return {
          org_id: orgId,
          student_id: student.student_id,
          from_section_id: selectedSection,
          from_batch_id: selectedBatch,
          to_batch_id: nextBatch?.id || null,
          academic_year: batch?.academic_year || "2025-26",
          status: sr.status === "Pass" ? "promoted" : "detained",
          overall_percentage: sr.percentage,
        };
      }).filter(Boolean);

      if (promotions.length > 0) {
        const { error } = await (supabase as any).from("student_promotions").insert(promotions);
        if (error) throw error;

        // Update section_students status for promoted students
        const promotedIds = promotions.filter(p => p && p.status === "promoted").map(p => p!.student_id);
        if (promotedIds.length > 0) {
          await (supabase as any).from("section_students")
            .update({ status: "promoted" })
            .eq("section_id", selectedSection)
            .in("student_id", promotedIds);
        }

        toast.success(`${promotions.filter(p => p?.status === "promoted").length} students promoted, ${promotions.filter(p => p?.status === "detained").length} detained`);
      }
    } catch (err: any) {
      toast.error(err.message || "Promotion failed");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Exams & Marks
          </h2>
          <p className="text-sm text-muted-foreground">Manage exams, enter marks, and generate AI analysis</p>
        </div>
      </div>

      {/* Selection filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <Label className="text-xs">Class</Label>
          <Select value={selectedBatch} onValueChange={v => { setSelectedBatch(v); setSelectedSection(""); setSelectedTerm(""); setSelectedExam(""); }}>
            <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
            <SelectContent>
              {batches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Section</Label>
          <Select value={selectedSection} onValueChange={v => { setSelectedSection(v); setSelectedExam(""); }} disabled={!selectedBatch}>
            <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
            <SelectContent>
              {sections.map(s => <SelectItem key={s.id} value={s.id}>{s.display_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Term</Label>
            {isAdmin && selectedBatch && (
              <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1" onClick={() => setShowCreateTerm(true)}>
                <Plus className="h-3 w-3" /> Add
              </Button>
            )}
          </div>
          <Select value={selectedTerm} onValueChange={v => { setSelectedTerm(v); setSelectedExam(""); }} disabled={!selectedBatch}>
            <SelectTrigger><SelectValue placeholder="Select term" /></SelectTrigger>
            <SelectContent>
              {terms.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Exam</Label>
            {(isAdmin || isTeacher) && selectedTerm && selectedSection && (
              <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1" onClick={() => setShowCreateExam(true)}>
                <Plus className="h-3 w-3" /> Add
              </Button>
            )}
          </div>
          <Select value={selectedExam} onValueChange={setSelectedExam} disabled={!selectedTerm || !selectedSection}>
            <SelectTrigger><SelectValue placeholder="Select exam" /></SelectTrigger>
            <SelectContent>
              {exams.map(e => <SelectItem key={e.id} value={e.id}>{e.name} - {e.subject}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Marks Entry Table */}
      {selectedExam && currentExam && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                {currentExam.name} - {currentExam.subject}
                <Badge variant="outline" className="text-[10px]">
                  Written: {currentExam.max_written_marks} | Internal: {currentExam.max_internal_marks} | Total: {currentExam.max_written_marks + currentExam.max_internal_marks}
                </Badge>
              </CardTitle>
              <div className="flex gap-2">
                {selectedTerm && selectedSection && (
                  <Button variant="outline" size="sm" onClick={handleAnalyze} disabled={analyzing}>
                    <Sparkles className="h-4 w-4 mr-1" />
                    {analyzing ? "Analyzing..." : "AI Analysis"}
                  </Button>
                )}
                {(isAdmin || isTeacher) && (
                  <Button size="sm" onClick={handleSaveMarks} disabled={saving}>
                    <Save className="h-4 w-4 mr-1" />
                    {saving ? "Saving..." : "Save Marks"}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead className="w-28">Written (/{currentExam.max_written_marks})</TableHead>
                    <TableHead className="w-28">Internal (/{currentExam.max_internal_marks})</TableHead>
                    <TableHead className="w-20">Total</TableHead>
                    <TableHead className="w-16">%</TableHead>
                    <TableHead className="w-16">Absent</TableHead>
                    <TableHead className="w-40">Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sectionStudents.map((ss, idx) => {
                    const m = editedMarks[ss.student_id] || { written: "0", internal: "0", absent: false, remarks: "" };
                    const total = (parseFloat(m.written) || 0) + (parseFloat(m.internal) || 0);
                    const maxTotal = currentExam.max_written_marks + currentExam.max_internal_marks;
                    const pct = maxTotal > 0 ? ((total / maxTotal) * 100).toFixed(1) : "0";
                    const canEdit = isAdmin || isTeacher;

                    return (
                      <TableRow key={ss.student_id} className={m.absent ? "opacity-50" : ""}>
                        <TableCell className="text-xs text-muted-foreground">{ss.roll_number || idx + 1}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={ss.student?.avatar_url || undefined} />
                              <AvatarFallback className="text-[10px]">
                                {(ss.student?.name || "?")[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm truncate">{ss.student?.name || "Unknown"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={m.written}
                            onChange={e => setEditedMarks(prev => ({
                              ...prev, [ss.student_id]: { ...m, written: e.target.value }
                            }))}
                            disabled={!canEdit || m.absent}
                            className="h-8 text-sm"
                            min={0} max={currentExam.max_written_marks}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={m.internal}
                            onChange={e => setEditedMarks(prev => ({
                              ...prev, [ss.student_id]: { ...m, internal: e.target.value }
                            }))}
                            disabled={!canEdit || m.absent}
                            className="h-8 text-sm"
                            min={0} max={currentExam.max_internal_marks}
                          />
                        </TableCell>
                        <TableCell className="font-medium text-sm">{total}</TableCell>
                        <TableCell>
                          <Badge variant={parseFloat(pct) >= 33 ? "outline" : "destructive"} className="text-[10px]">
                            {pct}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={m.absent}
                            onChange={e => setEditedMarks(prev => ({
                              ...prev, [ss.student_id]: { ...m, absent: e.target.checked }
                            }))}
                            disabled={!canEdit}
                            className="rounded border-border"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={m.remarks}
                            onChange={e => setEditedMarks(prev => ({
                              ...prev, [ss.student_id]: { ...m, remarks: e.target.value }
                            }))}
                            disabled={!canEdit}
                            className="h-8 text-xs"
                            placeholder="Optional"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {sectionStudents.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No students enrolled in this section
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {!selectedExam && selectedBatch && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <ClipboardList className="h-12 w-12 mb-4" />
          <p className="font-medium">Select a class, section, term, and exam</p>
          <p className="text-sm">to start entering marks</p>
        </div>
      )}

      {!selectedBatch && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <ClipboardList className="h-12 w-12 mb-4" />
          <p className="font-medium">No class selected</p>
          <p className="text-sm">Create batches first in "Batches & Sections"</p>
        </div>
      )}

      {/* Create Term Dialog */}
      <Dialog open={showCreateTerm} onOpenChange={setShowCreateTerm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Create Exam Term
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Term Name <span className="text-destructive">*</span></Label>
              <Select value={termForm.name} onValueChange={v => setTermForm(p => ({ ...p, name: v }))}>
                <SelectTrigger><SelectValue placeholder="Select term" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Term 1">Term 1</SelectItem>
                  <SelectItem value="Term 2">Term 2</SelectItem>
                  <SelectItem value="Pre-Board">Pre-Board</SelectItem>
                  <SelectItem value="Annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Date</Label>
                <Input type="date" value={termForm.startDate} onChange={e => setTermForm(p => ({ ...p, startDate: e.target.value }))} />
              </div>
              <div>
                <Label>End Date</Label>
                <Input type="date" value={termForm.endDate} onChange={e => setTermForm(p => ({ ...p, endDate: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateTerm(false)}>Cancel</Button>
            <Button onClick={handleCreateTerm} disabled={saving || !termForm.name}>
              {saving ? "Creating..." : "Create Term"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Exam Dialog */}
      <Dialog open={showCreateExam} onOpenChange={setShowCreateExam}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Create Exam
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Exam Name <span className="text-destructive">*</span></Label>
              <Select value={examForm.name} onValueChange={v => setExamForm(p => ({ ...p, name: v }))}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Unit Test 1">Unit Test 1</SelectItem>
                  <SelectItem value="Unit Test 2">Unit Test 2</SelectItem>
                  <SelectItem value="Mid-Term">Mid-Term</SelectItem>
                  <SelectItem value="Final Exam">Final Exam</SelectItem>
                  <SelectItem value="Practical">Practical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Subject <span className="text-destructive">*</span></Label>
              <Select value={examForm.subject} onValueChange={v => setExamForm(p => ({ ...p, subject: v }))}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {COMMON_SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Max Written Marks</Label>
                <Input type="number" value={examForm.maxWritten} onChange={e => setExamForm(p => ({ ...p, maxWritten: e.target.value }))} min={0} />
              </div>
              <div>
                <Label>Max Internal Marks</Label>
                <Input type="number" value={examForm.maxInternal} onChange={e => setExamForm(p => ({ ...p, maxInternal: e.target.value }))} min={0} />
              </div>
            </div>
            <div>
              <Label>Exam Date</Label>
              <Input type="date" value={examForm.examDate} onChange={e => setExamForm(p => ({ ...p, examDate: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateExam(false)}>Cancel</Button>
            <Button onClick={handleCreateExam} disabled={saving || !examForm.name || !examForm.subject}>
              {saving ? "Creating..." : "Create Exam"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Analysis Dialog */}
      <Dialog open={showAnalysis} onOpenChange={setShowAnalysis}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Analysis Report
            </DialogTitle>
          </DialogHeader>

          {analyzing ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Analyzing student performance...</p>
            </div>
          ) : analysis ? (
            <Tabs defaultValue="summary">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="summary">Section Summary</TabsTrigger>
                <TabsTrigger value="students">Student Reports</TabsTrigger>
                <TabsTrigger value="promote">Promotion</TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Card className="border-border/50">
                    <CardContent className="p-3 text-center">
                      <TrendingUp className="h-5 w-5 text-primary mx-auto mb-1" />
                      <p className="text-2xl font-bold">{analysis.section_summary.average.toFixed(1)}%</p>
                      <p className="text-[10px] text-muted-foreground">Average</p>
                    </CardContent>
                  </Card>
                  <Card className="border-border/50">
                    <CardContent className="p-3 text-center">
                      <ArrowUpRight className="h-5 w-5 text-primary mx-auto mb-1" />
                      <p className="text-2xl font-bold">{analysis.section_summary.highest.toFixed(1)}%</p>
                      <p className="text-[10px] text-muted-foreground">Highest</p>
                    </CardContent>
                  </Card>
                  <Card className="border-border/50">
                    <CardContent className="p-3 text-center">
                      <ArrowDownRight className="h-5 w-5 text-destructive mx-auto mb-1" />
                      <p className="text-2xl font-bold">{analysis.section_summary.lowest.toFixed(1)}%</p>
                      <p className="text-[10px] text-muted-foreground">Lowest</p>
                    </CardContent>
                  </Card>
                  <Card className="border-border/50">
                    <CardContent className="p-3 text-center">
                      <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto mb-1" />
                      <p className="text-2xl font-bold">{analysis.section_summary.pass_rate.toFixed(0)}%</p>
                      <p className="text-[10px] text-muted-foreground">Pass Rate</p>
                    </CardContent>
                  </Card>
                </div>
                <Card className="border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Section Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {analysis.section_recommendations.map((r, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <Sparkles className="h-3 w-3 text-primary mt-1 shrink-0" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="students" className="space-y-3 max-h-[400px] overflow-auto">
                {analysis.student_reports.map((sr, i) => (
                  <Card key={i} className="border-border/50">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">#{sr.rank}</Badge>
                          <p className="font-medium text-sm">{sr.name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="text-[10px]">{sr.grade}</Badge>
                          <Badge variant={sr.status === "Pass" ? "outline" : "destructive"} className="text-[10px]">
                            {sr.status === "Pass" ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
                            {sr.percentage.toFixed(1)}% - {sr.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground font-medium">Strengths</p>
                          <ul className="list-disc list-inside">
                            {sr.strengths.map((s, j) => <li key={j}>{s}</li>)}
                          </ul>
                        </div>
                        <div>
                          <p className="text-muted-foreground font-medium">Weaknesses</p>
                          <ul className="list-disc list-inside">
                            {sr.weaknesses.map((w, j) => <li key={j}>{w}</li>)}
                          </ul>
                        </div>
                        <div>
                          <p className="text-muted-foreground font-medium">Suggestions</p>
                          <ul className="list-disc list-inside">
                            {sr.suggestions.map((s, j) => <li key={j}>{s}</li>)}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="promote" className="space-y-4">
                <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                  <p className="font-medium text-sm flex items-center gap-2">
                    <Award className="h-4 w-4 text-primary" />
                    Promotion Summary
                  </p>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-2xl font-bold text-green-500">
                        {analysis.student_reports.filter(s => s.status === "Pass").length}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Ready for Promotion</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-destructive">
                        {analysis.student_reports.filter(s => s.status !== "Pass").length}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Detained</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{analysis.student_reports.length}</p>
                      <p className="text-[10px] text-muted-foreground">Total</p>
                    </div>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>%</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analysis.student_reports.map((sr, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs">#{sr.rank}</TableCell>
                        <TableCell className="font-medium text-sm">{sr.name}</TableCell>
                        <TableCell>{sr.percentage.toFixed(1)}%</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{sr.grade}</Badge></TableCell>
                        <TableCell>
                          <Badge variant={sr.status === "Pass" ? "outline" : "destructive"} className="text-[10px]">
                            {sr.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {isAdmin && (
                  <Button className="w-full" onClick={handlePromote} disabled={saving}>
                    <Award className="h-4 w-4 mr-2" />
                    {saving ? "Processing..." : "Execute Promotion / Detention"}
                  </Button>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <p className="text-center text-muted-foreground py-8">No analysis available</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
