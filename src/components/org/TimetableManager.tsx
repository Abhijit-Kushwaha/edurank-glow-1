import { useState, useEffect, useCallback } from "react";
import { Calendar, Clock, Plus, Sparkles, Download, Trash2, Coffee, UtensilsCrossed, X, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import jsPDF from "jspdf";

interface TimetableEntry {
  id: string;
  teacher_id: string;
  subject: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string | null;
  section_id: string | null;
  teacher_name?: string;
  section_name?: string;
}

const ALL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const CLASS_SUBJECTS: Record<string, string[]> = {
  "1": ["English", "Hindi", "Mathematics", "EVS", "Art", "Music", "Physical Education"],
  "2": ["English", "Hindi", "Mathematics", "EVS", "Art", "Music", "Physical Education"],
  "3": ["English", "Hindi", "Mathematics", "EVS", "Art", "Music", "Physical Education", "Computer"],
  "4": ["English", "Hindi", "Mathematics", "EVS", "Art", "Music", "Physical Education", "Computer"],
  "5": ["English", "Hindi", "Mathematics", "Science", "Social Studies", "Art", "Music", "Physical Education", "Computer"],
  "6": ["English", "Hindi", "Mathematics", "Science", "Social Studies", "Sanskrit", "Art", "Music", "Physical Education", "Computer"],
  "7": ["English", "Hindi", "Mathematics", "Science", "Social Studies", "Sanskrit", "Art", "Music", "Physical Education", "Computer"],
  "8": ["English", "Hindi", "Mathematics", "Science", "Social Studies", "Sanskrit", "Art", "Music", "Physical Education", "Computer"],
  "9": ["English", "Hindi", "Mathematics", "Physics", "Chemistry", "Biology", "History", "Geography", "Civics", "Economics", "Computer", "Physical Education"],
  "10": ["English", "Hindi", "Mathematics", "Physics", "Chemistry", "Biology", "History", "Geography", "Civics", "Economics", "Computer", "Physical Education"],
  "11": ["English", "Mathematics", "Physics", "Chemistry", "Biology", "Computer Science", "Economics", "Accountancy", "Business Studies", "History", "Political Science", "Physical Education"],
  "12": ["English", "Mathematics", "Physics", "Chemistry", "Biology", "Computer Science", "Economics", "Accountancy", "Business Studies", "History", "Political Science", "Physical Education"],
};

interface BreakSlot {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  type: "short" | "lunch" | "snack";
}

interface SubjectTeacher {
  subject: string;
  teacherName: string;
  periodsPerWeek: number;
  room: string;
}

interface TimetableManagerProps {
  orgId: string;
}

export default function TimetableManager({ orgId }: TimetableManagerProps) {
  const { profile } = useAuth();
  const callerRole = profile?.role || "student";
  const isSuperAdmin = callerRole === "super_admin" || callerRole === "admin";

  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [orgName, setOrgName] = useState("");

  // Generator config
  const [selectedClass, setSelectedClass] = useState("8");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [subjectTeachers, setSubjectTeachers] = useState<SubjectTeacher[]>([]);
  const [selectedDays, setSelectedDays] = useState<string[]>(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);
  const [periodsPerDay, setPeriodsPerDay] = useState(8);
  const [periodDuration, setPeriodDuration] = useState(40);
  const [schoolStartTime, setSchoolStartTime] = useState("08:00");
  const [breaks, setBreaks] = useState<BreakSlot[]>([
    { id: "1", name: "Short Break", startTime: "09:20", endTime: "09:30", type: "short" },
    { id: "2", name: "Snack Break", startTime: "10:50", endTime: "11:05", type: "snack" },
    { id: "3", name: "Lunch Break", startTime: "12:25", endTime: "13:00", type: "lunch" },
  ]);
  const [additionalConstraints, setAdditionalConstraints] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Initialize subjects when class changes
  useEffect(() => {
    const subs = CLASS_SUBJECTS[selectedClass] || [];
    setSelectedSubjects(subs.slice(0, Math.min(subs.length, 10)));
  }, [selectedClass]);

  // Sync subject-teacher list when subjects change
  useEffect(() => {
    setSubjectTeachers(prev => {
      const map = new Map(prev.map(st => [st.subject, st]));
      return selectedSubjects.map(sub => map.get(sub) || {
        subject: sub,
        teacherName: "",
        periodsPerWeek: sub === "Physical Education" || sub === "Art" || sub === "Music" ? 2 : 5,
        room: "",
      });
    });
  }, [selectedSubjects]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [entryRes, secRes, orgRes] = await Promise.all([
        (supabase as any).from("timetable_entries")
          .select("*, profiles!timetable_entries_teacher_id_fkey(name), teacher_sections!timetable_entries_section_id_fkey(section_name)")
          .eq("org_id", orgId)
          .order("day_of_week")
          .order("start_time"),
        (supabase as any).from("teacher_sections")
          .select("*, profiles!teacher_sections_teacher_id_fkey(name)")
          .eq("org_id", orgId)
          .eq("is_active", true),
        supabase.from("organisations").select("name").eq("id", orgId).single(),
      ]);

      if (entryRes.data) {
        setEntries(entryRes.data.map((e: any) => ({
          ...e,
          teacher_name: e.profiles?.name,
          section_name: e.teacher_sections?.section_name,
        })));
      }
      if (secRes.data) {
        setSections(secRes.data.map((s: any) => ({ ...s, teacher_name: s.profiles?.name })));
      }
      if (orgRes.data) {
        setOrgName(orgRes.data.name);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const addBreak = () => {
    setBreaks(prev => [...prev, {
      id: Date.now().toString(),
      name: "Break",
      startTime: "10:00",
      endTime: "10:10",
      type: "short",
    }]);
  };

  const removeBreak = (id: string) => {
    setBreaks(prev => prev.filter(b => b.id !== id));
  };

  const updateBreak = (id: string, field: keyof BreakSlot, value: string) => {
    setBreaks(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  const updateSubjectTeacher = (subject: string, field: keyof SubjectTeacher, value: string | number) => {
    setSubjectTeachers(prev => prev.map(st => st.subject === subject ? { ...st, [field]: value } : st));
  };

  const toggleSubject = (subject: string) => {
    setSelectedSubjects(prev =>
      prev.includes(subject) ? prev.filter(s => s !== subject) : [...prev, subject]
    );
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleAIGenerate = async () => {
    if (selectedSubjects.length === 0) {
      toast.error("Select at least one subject");
      return;
    }
    if (selectedDays.length === 0) {
      toast.error("Select at least one working day");
      return;
    }

    setGenerating(true);
    try {
      const teachersData = subjectTeachers.map(st => ({
        name: st.teacherName || `${st.subject} Teacher`,
        subject: st.subject,
        section_name: `Class ${selectedClass}`,
        schedule_info: `${st.periodsPerWeek} periods/week`,
        room: st.room || null,
        periodsPerWeek: st.periodsPerWeek,
      }));

      // Also try matching from existing sections
      const matchedTeachers = sections.length > 0 ? sections.map(s => ({
        name: s.teacher_name || "Unknown",
        subject: s.subject,
        section_name: s.section_name,
        schedule_info: s.schedule_info,
        section_id: s.id,
        teacher_id: s.teacher_id,
      })) : teachersData;

      const finalTeachers = sections.length > 0 ? matchedTeachers : teachersData;

      const configConstraints = [
        `Working days: ${selectedDays.join(", ")}`,
        `Periods per day: ${periodsPerDay}`,
        `Period duration: ${periodDuration} minutes`,
        `School starts at: ${schoolStartTime}`,
        `Class: ${selectedClass}`,
        breaks.length > 0 ? `Breaks: ${breaks.map(b => `${b.name} (${b.startTime}-${b.endTime})`).join(", ")}` : "",
        ...subjectTeachers.filter(st => st.periodsPerWeek > 0).map(st => `${st.subject}: ${st.periodsPerWeek} periods/week${st.room ? ` in ${st.room}` : ""}`),
        additionalConstraints,
      ].filter(Boolean).join("\n");

      const { data, error } = await supabase.functions.invoke("generate-timetable", {
        body: { teachers: finalTeachers, constraints: configConstraints },
      });

      if (error) throw error;
      if (!data?.timetable || !Array.isArray(data.timetable)) {
        throw new Error("Invalid timetable response");
      }

      const profileId = profile?.id;
      const newEntries = data.timetable.map((entry: any) => {
        const matchSection = sections.find(s =>
          s.subject?.toLowerCase() === entry.subject?.toLowerCase() &&
          s.section_name?.toLowerCase() === entry.section_name?.toLowerCase()
        );
        return {
          org_id: orgId,
          teacher_id: matchSection?.teacher_id || sections[0]?.teacher_id || profileId,
          section_id: matchSection?.id || null,
          subject: entry.subject,
          day_of_week: entry.day_of_week,
          start_time: entry.start_time,
          end_time: entry.end_time,
          room: entry.room || null,
          created_by: profileId,
        };
      }).filter((e: any) => e.teacher_id && e.day_of_week >= 1 && e.day_of_week <= 6);

      if (newEntries.length === 0) {
        throw new Error("No valid entries generated");
      }

      await (supabase as any).from("timetable_entries").delete().eq("org_id", orgId);
      const { error: insertError } = await (supabase as any).from("timetable_entries").insert(newEntries);
      if (insertError) throw insertError;

      toast.success(`Timetable generated with ${newEntries.length} entries!`);
      setShowGenerateDialog(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to generate timetable");
    } finally {
      setGenerating(false);
    }
  };

  const clearTimetable = async () => {
    try {
      await (supabase as any).from("timetable_entries").delete().eq("org_id", orgId);
      toast.success("Timetable cleared");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed");
    }
  };

  const downloadPDF = () => {
    if (entries.length === 0) { toast.error("No timetable to download"); return; }

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, pageW, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(orgName || "Organization", pageW / 2, 12, { align: "center" });
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("Weekly Class Timetable", pageW / 2, 20, { align: "center" });
    doc.setFontSize(8);
    doc.text(`Generated on ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`, pageW / 2, 25, { align: "center" });

    const byDay: Record<number, TimetableEntry[]> = {};
    entries.forEach(e => {
      if (!byDay[e.day_of_week]) byDay[e.day_of_week] = [];
      byDay[e.day_of_week].push(e);
    });

    const activeDays = Object.keys(byDay).map(Number).sort();
    const allSlots = [...new Set(entries.map(e => `${e.start_time}-${e.end_time}`))].sort();

    const marginL = 10;
    const marginR = 10;
    const tableW = pageW - marginL - marginR;
    const timeColW = 30;
    const dayColW = (tableW - timeColW) / activeDays.length;
    const headerH = 10;
    const rowH = Math.min(22, Math.max(16, (pageH - 50) / (allSlots.length + 1)));
    const tableTop = 34;

    doc.setFillColor(59, 130, 246);
    doc.rect(marginL, tableTop, tableW, headerH, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Time", marginL + timeColW / 2, tableTop + headerH / 2 + 1, { align: "center" });
    activeDays.forEach((d, i) => {
      const x = marginL + timeColW + i * dayColW;
      doc.text(ALL_DAYS[d - 1], x + dayColW / 2, tableTop + headerH / 2 + 1, { align: "center" });
    });

    let y = tableTop + headerH;
    allSlots.forEach((slot, idx) => {
      const [start, end] = slot.split("-");
      doc.setFillColor(idx % 2 === 0 ? 241 : 255, idx % 2 === 0 ? 245 : 255, idx % 2 === 0 ? 249 : 255);
      doc.rect(marginL, y, tableW, rowH, "F");

      doc.setTextColor(51, 65, 85);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(start?.slice(0, 5) || "", marginL + timeColW / 2, y + rowH / 2 - 1, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text(end?.slice(0, 5) || "", marginL + timeColW / 2, y + rowH / 2 + 3, { align: "center" });

      activeDays.forEach((d, di) => {
        const x = marginL + timeColW + di * dayColW;
        const match = (byDay[d] || []).find(e => `${e.start_time}-${e.end_time}` === slot);
        if (match) {
          doc.setFillColor(219, 234, 254);
          doc.roundedRect(x + 3, y + 2, dayColW - 6, rowH - 4, 2, 2, "F");
          doc.setTextColor(30, 64, 175);
          doc.setFontSize(8);
          doc.setFont("helvetica", "bold");
          doc.text(match.subject, x + dayColW / 2, y + rowH / 2 - 2, { align: "center", maxWidth: dayColW - 10 });
          doc.setTextColor(71, 85, 105);
          doc.setFontSize(6.5);
          doc.setFont("helvetica", "normal");
          const subText = [match.teacher_name, match.room].filter(Boolean).join(" · ");
          doc.text(subText, x + dayColW / 2, y + rowH / 2 + 3, { align: "center", maxWidth: dayColW - 10 });
        }
      });

      y += rowH;
    });

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.rect(marginL, tableTop, tableW, headerH + allSlots.length * rowH);
    doc.line(marginL + timeColW, tableTop, marginL + timeColW, y);
    for (let i = 1; i < activeDays.length; i++) {
      const lx = marginL + timeColW + i * dayColW;
      doc.line(lx, tableTop, lx, y);
    }
    for (let i = 0; i <= allSlots.length; i++) {
      const ly = tableTop + headerH + i * rowH;
      doc.line(marginL, ly, marginL + tableW, ly);
    }

    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.setFont("helvetica", "italic");
    doc.text("Generated by BrainBuddy", marginL, pageH - 6);
    doc.text(`Page 1 of 1`, pageW - marginR, pageH - 6, { align: "right" });

    doc.save(`${(orgName || "Timetable").replace(/\s+/g, "_")}_Timetable.pdf`);
    toast.success("Timetable PDF downloaded!");
  };

  if (loading) {
    return <div className="p-6 space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>;
  }

  const byDay: Record<number, TimetableEntry[]> = {};
  entries.forEach(e => {
    if (!byDay[e.day_of_week]) byDay[e.day_of_week] = [];
    byDay[e.day_of_week].push(e);
  });

  const activeDaysInTable = Object.keys(byDay).map(Number).sort();
  const displayDays = activeDaysInTable.length > 0 ? activeDaysInTable : [1, 2, 3, 4, 5];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Timetable
          </h2>
          <p className="text-sm text-muted-foreground">Weekly class schedule</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {entries.length > 0 && (
            <Button variant="outline" size="sm" onClick={downloadPDF}>
              <Download className="h-4 w-4 mr-1" /> PDF
            </Button>
          )}
          {isSuperAdmin && (
            <>
              {entries.length > 0 && (
                <Button variant="outline" size="sm" onClick={clearTimetable}>
                  <Trash2 className="h-4 w-4 mr-1" /> Clear
                </Button>
              )}
              <Button size="sm" onClick={() => setShowGenerateDialog(true)}>
                <Sparkles className="h-4 w-4 mr-1" /> AI Generate
              </Button>
            </>
          )}
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Calendar className="h-12 w-12 mb-4" />
          <p className="font-medium">No timetable yet</p>
          <p className="text-sm">
            {isSuperAdmin
              ? "Use AI Generate to create an optimized schedule."
              : "Your admin will set up the timetable soon."}
          </p>
        </div>
      ) : (
        <div className="overflow-auto rounded-lg border border-border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-primary/10">
                <th className="border border-border/50 px-3 py-2 text-left font-semibold text-foreground w-28">Time</th>
                {displayDays.map(d => (
                  <th key={d} className="border border-border/50 px-3 py-2 text-center font-semibold text-foreground">{ALL_DAYS[d - 1]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...new Set(entries.map(e => `${e.start_time}-${e.end_time}`))].sort().map((slot, idx) => {
                const [start, end] = slot.split("-");
                return (
                  <tr key={slot} className={idx % 2 === 0 ? "bg-card" : "bg-muted/30"}>
                    <td className="border border-border/50 px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {start?.slice(0, 5)} – {end?.slice(0, 5)}
                      </div>
                    </td>
                    {displayDays.map(d => {
                      const match = (byDay[d] || []).find(e => `${e.start_time}-${e.end_time}` === slot);
                      return (
                        <td key={d} className="border border-border/50 px-2 py-1.5 text-center">
                          {match ? (
                            <div className="rounded-md bg-primary/10 p-1.5 space-y-0.5">
                              <p className="font-semibold text-xs text-primary">{match.subject}</p>
                              <p className="text-[10px] text-muted-foreground">{match.teacher_name || "TBD"}</p>
                              {match.room && <p className="text-[10px] text-muted-foreground">📍 {match.room}</p>}
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* AI Generate Dialog - Full Config */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Timetable Generator
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Class Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-semibold">Class / Grade</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(CLASS_SUBJECTS).map(c => (
                      <SelectItem key={c} value={c}>Class {c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-semibold">School Start Time</Label>
                <Input type="time" value={schoolStartTime} onChange={e => setSchoolStartTime(e.target.value)} />
              </div>
            </div>

            {/* Working Days */}
            <div>
              <Label className="text-sm font-semibold mb-2 block">Working Days</Label>
              <div className="flex flex-wrap gap-2">
                {ALL_DAYS.map(day => (
                  <Badge
                    key={day}
                    variant={selectedDays.includes(day) ? "default" : "outline"}
                    className="cursor-pointer select-none"
                    onClick={() => toggleDay(day)}
                  >
                    {day.slice(0, 3)}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Periods & Duration */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-semibold">Periods Per Day</Label>
                <Select value={String(periodsPerDay)} onValueChange={v => setPeriodsPerDay(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[4, 5, 6, 7, 8, 9, 10].map(n => (
                      <SelectItem key={n} value={String(n)}>{n} periods</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-semibold">Period Duration</Label>
                <Select value={String(periodDuration)} onValueChange={v => setPeriodDuration(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[30, 35, 40, 45, 50, 55, 60].map(n => (
                      <SelectItem key={n} value={String(n)}>{n} minutes</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Subjects Selection */}
            <div>
              <Label className="text-sm font-semibold mb-2 block">
                Subjects for Class {selectedClass} ({selectedSubjects.length} selected)
              </Label>
              <div className="flex flex-wrap gap-2">
                {(CLASS_SUBJECTS[selectedClass] || []).map(sub => (
                  <Badge
                    key={sub}
                    variant={selectedSubjects.includes(sub) ? "default" : "outline"}
                    className="cursor-pointer select-none text-xs"
                    onClick={() => toggleSubject(sub)}
                  >
                    {sub}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Subject → Teacher Assignment */}
            <div>
              <Label className="text-sm font-semibold mb-2 block">Subject Details & Teacher Assignment</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto rounded-lg border border-border p-3">
                {subjectTeachers.map(st => (
                  <div key={st.subject} className="grid grid-cols-[1fr_1fr_70px_80px] gap-2 items-center">
                    <span className="text-xs font-medium truncate">{st.subject}</span>
                    <Input
                      placeholder="Teacher name"
                      value={st.teacherName}
                      onChange={e => updateSubjectTeacher(st.subject, "teacherName", e.target.value)}
                      className="h-8 text-xs"
                    />
                    <Input
                      type="number"
                      min={1}
                      max={15}
                      value={st.periodsPerWeek}
                      onChange={e => updateSubjectTeacher(st.subject, "periodsPerWeek", Number(e.target.value))}
                      className="h-8 text-xs"
                      title="Periods/week"
                    />
                    <Input
                      placeholder="Room"
                      value={st.room}
                      onChange={e => updateSubjectTeacher(st.subject, "room", e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                ))}
                {subjectTeachers.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">Select subjects above</p>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Columns: Subject | Teacher | Periods/Week | Room</p>
            </div>

            <Separator />

            {/* Breaks */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-semibold">Breaks & Intervals</Label>
                <Button variant="outline" size="sm" onClick={addBreak} className="h-7 text-xs">
                  <Plus className="h-3 w-3 mr-1" /> Add Break
                </Button>
              </div>
              <div className="space-y-2">
                {breaks.map(brk => (
                  <div key={brk.id} className="flex items-center gap-2 rounded-md border border-border p-2">
                    {brk.type === "lunch" ? <UtensilsCrossed className="h-4 w-4 text-orange-500 shrink-0" /> :
                     brk.type === "snack" ? <Coffee className="h-4 w-4 text-amber-500 shrink-0" /> :
                     <Clock className="h-4 w-4 text-muted-foreground shrink-0" />}
                    <Input
                      value={brk.name}
                      onChange={e => updateBreak(brk.id, "name", e.target.value)}
                      className="h-7 text-xs flex-1"
                      placeholder="Break name"
                    />
                    <Select value={brk.type} onValueChange={v => updateBreak(brk.id, "type", v)}>
                      <SelectTrigger className="h-7 text-xs w-24"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="short">Short</SelectItem>
                        <SelectItem value="snack">Snack</SelectItem>
                        <SelectItem value="lunch">Lunch</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input type="time" value={brk.startTime} onChange={e => updateBreak(brk.id, "startTime", e.target.value)} className="h-7 text-xs w-24" />
                    <Input type="time" value={brk.endTime} onChange={e => updateBreak(brk.id, "endTime", e.target.value)} className="h-7 text-xs w-24" />
                    <Button variant="ghost" size="sm" onClick={() => removeBreak(brk.id)} className="h-7 w-7 p-0">
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                {breaks.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No breaks added</p>}
              </div>
            </div>

            {/* Advanced / Constraints */}
            <div>
              <Button variant="ghost" size="sm" onClick={() => setShowAdvanced(!showAdvanced)} className="text-xs px-0">
                {showAdvanced ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                Additional Constraints
              </Button>
              {showAdvanced && (
                <Textarea
                  value={additionalConstraints}
                  onChange={e => setAdditionalConstraints(e.target.value)}
                  placeholder="e.g. Math in morning slots, no PE on Monday, lab subjects need double periods..."
                  rows={3}
                  className="mt-2"
                />
              )}
            </div>

            {/* Existing sections info */}
            {sections.length > 0 && (
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <p className="font-medium mb-1 text-xs">Existing Teacher Sections: {sections.length}</p>
                <div className="max-h-20 overflow-auto space-y-0.5">
                  {sections.map(s => (
                    <p key={s.id} className="text-[10px] text-muted-foreground">
                      • {s.teacher_name} — {s.subject} ({s.section_name})
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">AI will optimize for:</p>
              <ul className="list-disc list-inside">
                <li>No scheduling conflicts for teachers</li>
                <li>Even distribution across {selectedDays.length} days</li>
                <li>Respects all break timings</li>
                <li>{periodsPerDay} periods × {periodDuration} min each</li>
                <li>Core subjects in morning, electives in afternoon</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>Cancel</Button>
            <Button onClick={handleAIGenerate} disabled={generating || selectedSubjects.length === 0}>
              {generating ? (
                <span className="flex items-center gap-1">
                  <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Generating...
                </span>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-1" /> Generate Timetable
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
