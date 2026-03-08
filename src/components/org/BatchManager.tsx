import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Plus, GraduationCap, Users, UserCog, ChevronRight, ChevronDown,
  Layers, BookOpen, UserPlus, Search, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

interface Batch {
  id: string;
  org_id: string;
  name: string;
  class_number: number;
  academic_year: string;
  is_active: boolean;
}

interface Section {
  id: string;
  batch_id: string;
  org_id: string;
  name: string;
  display_name: string;
  max_students: number;
  is_active: boolean;
}

interface SectionTeacher {
  id: string;
  section_id: string;
  teacher_id: string;
  subject: string;
  is_class_teacher: boolean;
  teacher?: { name: string | null; avatar_url: string | null };
}

interface SectionStudent {
  id: string;
  section_id: string;
  student_id: string;
  roll_number: string | null;
  status: string;
  student?: { name: string | null; avatar_url: string | null; email: string | null };
}

interface OrgMember {
  user_id: string;
  profile_id: string;
  name: string | null;
  role: string;
  avatar_url: string | null;
  email: string | null;
}

interface BatchManagerProps {
  orgId: string;
}

const COMMON_SUBJECTS = [
  "Mathematics", "Physics", "Chemistry", "Biology", "English",
  "Hindi", "Social Science", "Computer Science", "Physical Education",
  "Economics", "History", "Geography", "Political Science", "Sanskrit",
  "Art", "Music"
];

export default function BatchManager({ orgId }: BatchManagerProps) {
  const { user, profile } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [sections, setSections] = useState<Record<string, Section[]>>({});
  const [sectionTeachers, setSectionTeachers] = useState<Record<string, SectionTeacher[]>>({});
  const [sectionStudents, setSectionStudents] = useState<Record<string, SectionStudent[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Dialogs
  const [showCreateBatch, setShowCreateBatch] = useState(false);
  const [showCreateSection, setShowCreateSection] = useState(false);
  const [showAssignTeacher, setShowAssignTeacher] = useState(false);
  const [showAddStudent, setShowAddStudent] = useState(false);

  // Form state
  const [batchForm, setBatchForm] = useState({ name: "", classNumber: "", academicYear: "2025-26" });
  const [sectionForm, setSectionForm] = useState({ name: "", maxStudents: "60" });
  const [teacherForm, setTeacherForm] = useState({ teacherId: "", subject: "", isClassTeacher: false });
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Members for assignment
  const [teachers, setTeachers] = useState<OrgMember[]>([]);
  const [students, setStudents] = useState<OrgMember[]>([]);

  const profileId = profile?.id;

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any).from("batches")
      .select("*")
      .eq("org_id", orgId)
      .order("class_number");
    if (data) setBatches(data as Batch[]);
    setLoading(false);
  }, [orgId]);

  const fetchSections = useCallback(async (batchId: string) => {
    const { data } = await (supabase as any).from("batch_sections")
      .select("*")
      .eq("batch_id", batchId)
      .order("name");
    if (data) setSections(prev => ({ ...prev, [batchId]: data as Section[] }));
  }, []);

  const fetchSectionDetails = useCallback(async (sectionId: string) => {
    const [teachersRes, studentsRes] = await Promise.all([
      (supabase as any).from("section_teachers")
        .select("*, teacher:profiles!section_teachers_teacher_id_fkey(name, avatar_url)")
        .eq("section_id", sectionId),
      (supabase as any).from("section_students")
        .select("*, student:profiles!section_students_student_id_fkey(name, avatar_url, email)")
        .eq("section_id", sectionId)
        .eq("status", "active"),
    ]);
    if (teachersRes.data) setSectionTeachers(prev => ({ ...prev, [sectionId]: teachersRes.data }));
    if (studentsRes.data) setSectionStudents(prev => ({ ...prev, [sectionId]: studentsRes.data }));
  }, []);

  const fetchMembers = useCallback(async () => {
    try {
      const { data } = await supabase.rpc("get_org_members_with_stats", { p_org_id: orgId });
      if (data) {
        const members = data as any[];
        setTeachers(members.filter(m => m.role === "teacher").map(m => ({
          user_id: m.user_id, profile_id: m.profile_id, name: m.name,
          role: m.role, avatar_url: m.avatar_url, email: m.email
        })));
        setStudents(members.filter(m => m.role === "student").map(m => ({
          user_id: m.user_id, profile_id: m.profile_id, name: m.name,
          role: m.role, avatar_url: m.avatar_url, email: m.email
        })));
      }
    } catch (err) { console.error(err); }
  }, [orgId]);

  useEffect(() => { fetchBatches(); fetchMembers(); }, [fetchBatches, fetchMembers]);

  // Create batch
  const handleCreateBatch = async () => {
    if (!batchForm.name.trim() || !batchForm.classNumber || !profileId) return;
    setSaving(true);
    const { error } = await (supabase as any).from("batches").insert({
      org_id: orgId,
      name: batchForm.name.trim(),
      class_number: parseInt(batchForm.classNumber),
      academic_year: batchForm.academicYear,
      created_by: profileId,
    });
    if (error) {
      toast.error(error.message.includes("duplicate") ? "This class already exists for this academic year" : error.message);
    } else {
      toast.success(`${batchForm.name} created!`);
      setShowCreateBatch(false);
      setBatchForm({ name: "", classNumber: "", academicYear: "2025-26" });
      fetchBatches();
    }
    setSaving(false);
  };

  // Create section
  const handleCreateSection = async () => {
    if (!sectionForm.name.trim() || !selectedBatchId || !profileId) return;
    const batch = batches.find(b => b.id === selectedBatchId);
    setSaving(true);
    const { error } = await (supabase as any).from("batch_sections").insert({
      batch_id: selectedBatchId,
      org_id: orgId,
      name: sectionForm.name.trim().toUpperCase(),
      display_name: `${batch?.name}-${sectionForm.name.trim().toUpperCase()}`,
      max_students: parseInt(sectionForm.maxStudents) || 60,
    });
    if (error) {
      toast.error(error.message.includes("duplicate") ? "This section already exists" : error.message);
    } else {
      toast.success(`Section ${sectionForm.name.toUpperCase()} created!`);
      setShowCreateSection(false);
      setSectionForm({ name: "", maxStudents: "60" });
      fetchSections(selectedBatchId);
    }
    setSaving(false);
  };

  // Assign teacher
  const handleAssignTeacher = async () => {
    if (!teacherForm.teacherId || !teacherForm.subject || !selectedSectionId) return;
    setSaving(true);
    const { error } = await (supabase as any).from("section_teachers").insert({
      section_id: selectedSectionId,
      org_id: orgId,
      teacher_id: teacherForm.teacherId,
      subject: teacherForm.subject,
      is_class_teacher: teacherForm.isClassTeacher,
      assigned_by: profileId,
    });
    if (error) {
      toast.error(error.message.includes("duplicate") ? "A teacher is already assigned for this subject" : error.message);
    } else {
      toast.success("Teacher assigned!");
      setShowAssignTeacher(false);
      setTeacherForm({ teacherId: "", subject: "", isClassTeacher: false });
      fetchSectionDetails(selectedSectionId);
    }
    setSaving(false);
  };

  // Add student
  const handleAddStudent = async (studentProfileId: string) => {
    if (!selectedSectionId) return;
    const currentStudents = sectionStudents[selectedSectionId] || [];
    const rollNumber = String(currentStudents.length + 1).padStart(2, "0");
    
    const { error } = await (supabase as any).from("section_students").insert({
      section_id: selectedSectionId,
      org_id: orgId,
      student_id: studentProfileId,
      roll_number: rollNumber,
      enrolled_by: profileId,
    });
    if (error) {
      toast.error(error.message.includes("duplicate") ? "Student already in this section" : error.message);
    } else {
      toast.success("Student added!");
      fetchSectionDetails(selectedSectionId);
    }
  };

  // Remove teacher
  const handleRemoveTeacher = async (teacherAssignmentId: string, sectionId: string) => {
    await (supabase as any).from("section_teachers").delete().eq("id", teacherAssignmentId);
    toast.success("Teacher removed");
    fetchSectionDetails(sectionId);
  };

  // Remove student
  const handleRemoveStudent = async (enrollmentId: string, sectionId: string) => {
    await (supabase as any).from("section_students").delete().eq("id", enrollmentId);
    toast.success("Student removed");
    fetchSectionDetails(sectionId);
  };

  // Toggle batch expand
  const toggleBatch = (batchId: string) => {
    if (expandedBatch === batchId) {
      setExpandedBatch(null);
    } else {
      setExpandedBatch(batchId);
      if (!sections[batchId]) fetchSections(batchId);
    }
  };

  // Toggle section expand
  const toggleSection = (sectionId: string) => {
    if (expandedSection === sectionId) {
      setExpandedSection(null);
    } else {
      setExpandedSection(sectionId);
      if (!sectionTeachers[sectionId]) fetchSectionDetails(sectionId);
    }
  };

  const filteredStudentsForAdd = students.filter(s => {
    if (!studentSearch) return true;
    return s.name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.email?.toLowerCase().includes(studentSearch.toLowerCase());
  });

  const enrolledStudentIds = selectedSectionId
    ? (sectionStudents[selectedSectionId] || []).map(s => s.student_id)
    : [];

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Batches & Sections
          </h2>
          <p className="text-sm text-muted-foreground">Manage classes, sections, assign teachers and enroll students</p>
        </div>
        <Button onClick={() => setShowCreateBatch(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Batch
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-3 flex items-center gap-3">
            <Layers className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{batches.length}</p>
              <p className="text-[10px] text-muted-foreground">Classes</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3 flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">
                {Object.values(sections).reduce((a, s) => a + s.length, 0)}
              </p>
              <p className="text-[10px] text-muted-foreground">Sections</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3 flex items-center gap-3">
            <UserCog className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{teachers.length}</p>
              <p className="text-[10px] text-muted-foreground">Teachers</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3 flex items-center gap-3">
            <GraduationCap className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{students.length}</p>
              <p className="text-[10px] text-muted-foreground">Students</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Batch list */}
      {batches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Layers className="h-12 w-12 mb-4" />
          <p className="font-medium">No batches created yet</p>
          <p className="text-sm">Create your first class to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          {batches.map(batch => (
            <Card key={batch.id} className="border-border/50">
              <div
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => toggleBatch(batch.id)}
              >
                {expandedBatch === batch.id ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <Layers className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="font-medium">{batch.name}</p>
                  <p className="text-xs text-muted-foreground">
                    AY: {batch.academic_year} • {(sections[batch.id] || []).length} section(s)
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  Class {batch.class_number}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={e => {
                    e.stopPropagation();
                    setSelectedBatchId(batch.id);
                    setShowCreateSection(true);
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" /> Section
                </Button>
              </div>

              {expandedBatch === batch.id && (
                <div className="px-4 pb-4 pl-12 space-y-2">
                  {(sections[batch.id] || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">No sections yet. Add one above.</p>
                  ) : (
                    (sections[batch.id] || []).map(section => (
                      <Card key={section.id} className="border-border/30">
                        <div
                          className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/20 transition-colors"
                          onClick={() => toggleSection(section.id)}
                        >
                          {expandedSection === section.id ? (
                            <ChevronDown className="h-3 w-3 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-3 w-3 text-muted-foreground" />
                          )}
                          <BookOpen className="h-4 w-4 text-primary/70" />
                          <div className="flex-1">
                            <p className="font-medium text-sm">{section.display_name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {(sectionTeachers[section.id] || []).length} teacher(s) • {(sectionStudents[section.id] || []).length}/{section.max_students} students
                            </p>
                          </div>
                          <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                            <Button
                              variant="ghost" size="sm" className="h-7 text-xs"
                              onClick={() => { setSelectedSectionId(section.id); setShowAssignTeacher(true); }}
                            >
                              <UserCog className="h-3 w-3 mr-1" /> Teacher
                            </Button>
                            <Button
                              variant="ghost" size="sm" className="h-7 text-xs"
                              onClick={() => { setSelectedSectionId(section.id); setShowAddStudent(true); }}
                            >
                              <UserPlus className="h-3 w-3 mr-1" /> Student
                            </Button>
                          </div>
                        </div>

                        {expandedSection === section.id && (
                          <div className="px-3 pb-3 pl-10 space-y-3">
                            {/* Teachers */}
                            <div>
                              <p className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider mb-1">
                                Subject Teachers
                              </p>
                              {(sectionTeachers[section.id] || []).length === 0 ? (
                                <p className="text-xs text-muted-foreground">No teachers assigned yet</p>
                              ) : (
                                <div className="space-y-1">
                                  {(sectionTeachers[section.id] || []).map(st => (
                                    <div key={st.id} className="flex items-center gap-2 text-sm p-1.5 rounded bg-muted/30">
                                      <Avatar className="h-6 w-6">
                                        <AvatarImage src={st.teacher?.avatar_url || undefined} />
                                        <AvatarFallback className="text-[10px]">
                                          {(st.teacher?.name || "?")[0]?.toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="flex-1 truncate text-xs">{st.teacher?.name || "Unknown"}</span>
                                      <Badge variant="outline" className="text-[9px]">{st.subject}</Badge>
                                      {st.is_class_teacher && <Badge className="text-[9px]">CT</Badge>}
                                      <Button
                                        variant="ghost" size="icon" className="h-5 w-5"
                                        onClick={() => handleRemoveTeacher(st.id, section.id)}
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Students */}
                            <div>
                              <p className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider mb-1">
                                Students ({(sectionStudents[section.id] || []).length})
                              </p>
                              {(sectionStudents[section.id] || []).length === 0 ? (
                                <p className="text-xs text-muted-foreground">No students enrolled yet</p>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                                  {(sectionStudents[section.id] || []).map(ss => (
                                    <div key={ss.id} className="flex items-center gap-2 text-sm p-1.5 rounded bg-muted/30">
                                      <Badge variant="outline" className="text-[9px] w-6 justify-center">
                                        {ss.roll_number || "-"}
                                      </Badge>
                                      <Avatar className="h-6 w-6">
                                        <AvatarImage src={ss.student?.avatar_url || undefined} />
                                        <AvatarFallback className="text-[10px]">
                                          {(ss.student?.name || "?")[0]?.toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="flex-1 truncate text-xs">{ss.student?.name || "Unknown"}</span>
                                      <Button
                                        variant="ghost" size="icon" className="h-5 w-5"
                                        onClick={() => handleRemoveStudent(ss.id, section.id)}
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </Card>
                    ))
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Create Batch Dialog */}
      <Dialog open={showCreateBatch} onOpenChange={setShowCreateBatch}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Create New Batch
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Class Name <span className="text-destructive">*</span></Label>
              <Input
                value={batchForm.name}
                onChange={e => setBatchForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Class 8"
              />
            </div>
            <div>
              <Label>Class Number <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                value={batchForm.classNumber}
                onChange={e => setBatchForm(p => ({ ...p, classNumber: e.target.value }))}
                placeholder="e.g. 8"
                min={1} max={12}
              />
              <p className="text-[10px] text-muted-foreground mt-1">Used for ordering (1-12)</p>
            </div>
            <div>
              <Label>Academic Year</Label>
              <Select value={batchForm.academicYear} onValueChange={v => setBatchForm(p => ({ ...p, academicYear: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024-25">2024-25</SelectItem>
                  <SelectItem value="2025-26">2025-26</SelectItem>
                  <SelectItem value="2026-27">2026-27</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateBatch(false)}>Cancel</Button>
            <Button onClick={handleCreateBatch} disabled={saving || !batchForm.name.trim() || !batchForm.classNumber}>
              {saving ? "Creating..." : "Create Batch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Section Dialog */}
      <Dialog open={showCreateSection} onOpenChange={setShowCreateSection}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Add Section to {batches.find(b => b.id === selectedBatchId)?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Section Name <span className="text-destructive">*</span></Label>
              <Input
                value={sectionForm.name}
                onChange={e => setSectionForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. A, B, C"
                maxLength={5}
              />
            </div>
            <div>
              <Label>Max Students</Label>
              <Input
                type="number"
                value={sectionForm.maxStudents}
                onChange={e => setSectionForm(p => ({ ...p, maxStudents: e.target.value }))}
                min={1} max={200}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateSection(false)}>Cancel</Button>
            <Button onClick={handleCreateSection} disabled={saving || !sectionForm.name.trim()}>
              {saving ? "Creating..." : "Add Section"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Teacher Dialog */}
      <Dialog open={showAssignTeacher} onOpenChange={setShowAssignTeacher}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-primary" />
              Assign Teacher
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Teacher <span className="text-destructive">*</span></Label>
              <Select value={teacherForm.teacherId} onValueChange={v => setTeacherForm(p => ({ ...p, teacherId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                <SelectContent>
                  {teachers.map(t => (
                    <SelectItem key={t.profile_id} value={t.profile_id}>
                      {t.name || t.email || "Unknown"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Subject <span className="text-destructive">*</span></Label>
              <Select value={teacherForm.subject} onValueChange={v => setTeacherForm(p => ({ ...p, subject: v }))}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {COMMON_SUBJECTS.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="classTeacher"
                checked={teacherForm.isClassTeacher}
                onChange={e => setTeacherForm(p => ({ ...p, isClassTeacher: e.target.checked }))}
                className="rounded border-border"
              />
              <Label htmlFor="classTeacher" className="text-sm">Class Teacher</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignTeacher(false)}>Cancel</Button>
            <Button onClick={handleAssignTeacher} disabled={saving || !teacherForm.teacherId || !teacherForm.subject}>
              {saving ? "Assigning..." : "Assign Teacher"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Student Dialog */}
      <Dialog open={showAddStudent} onOpenChange={setShowAddStudent}>
        <DialogContent className="max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Add Students
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="max-h-[400px] overflow-auto space-y-1">
              {filteredStudentsForAdd.map(s => {
                const isEnrolled = enrolledStudentIds.includes(s.profile_id);
                return (
                  <div key={s.profile_id} className="flex items-center gap-2 p-2 rounded hover:bg-muted/30 transition-colors">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={s.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">{(s.name || "?")[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{s.name || "Unknown"}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{s.email}</p>
                    </div>
                    {isEnrolled ? (
                      <Badge variant="outline" className="text-[10px] text-primary">Enrolled</Badge>
                    ) : (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleAddStudent(s.profile_id)}>
                        <Plus className="h-3 w-3 mr-1" /> Add
                      </Button>
                    )}
                  </div>
                );
              })}
              {filteredStudentsForAdd.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">No students found</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
