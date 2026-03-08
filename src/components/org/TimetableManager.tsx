import { useState, useEffect, useCallback } from "react";
import { Calendar, Clock, Plus, Sparkles, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
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

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEKDAYS = DAYS.slice(1, 6);
const DAY_COLORS = ["", "bg-primary/10", "bg-accent/10", "bg-muted", "bg-primary/5", "bg-accent/5"];

interface TimetableManagerProps {
  orgId: string;
}

export default function TimetableManager({ orgId }: TimetableManagerProps) {
  const { profile } = useAuth();
  const callerRole = profile?.role || "student";
  const isSuperAdmin = callerRole === "super_admin";

  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [constraints, setConstraints] = useState("");
  const [orgName, setOrgName] = useState("");

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

  const handleAIGenerate = async () => {
    if (sections.length === 0) {
      toast.error("No teacher sections found. Teachers need to create sections first.");
      return;
    }
    setGenerating(true);
    try {
      const teachers = sections.map(s => ({
        name: s.teacher_name || "Unknown",
        subject: s.subject,
        section_name: s.section_name,
        schedule_info: s.schedule_info,
        section_id: s.id,
        teacher_id: s.teacher_id,
      }));

      const { data, error } = await supabase.functions.invoke("generate-timetable", {
        body: { teachers, constraints: constraints || null },
      });

      if (error) throw error;
      if (!data?.timetable || !Array.isArray(data.timetable)) {
        throw new Error("Invalid timetable response");
      }

      const profileId = profile?.id;
      const newEntries = data.timetable.map((entry: any) => {
        const matchSection = sections.find(s =>
          s.subject.toLowerCase() === entry.subject?.toLowerCase() &&
          s.section_name.toLowerCase() === entry.section_name?.toLowerCase()
        );
        return {
          org_id: orgId,
          teacher_id: matchSection?.teacher_id || sections[0]?.teacher_id,
          section_id: matchSection?.id || null,
          subject: entry.subject,
          day_of_week: entry.day_of_week,
          start_time: entry.start_time,
          end_time: entry.end_time,
          room: entry.room || null,
          created_by: profileId,
        };
      }).filter((e: any) => e.teacher_id && e.day_of_week >= 1 && e.day_of_week <= 5);

      if (newEntries.length === 0) {
        throw new Error("No valid entries generated");
      }

      await (supabase as any).from("timetable_entries").delete().eq("org_id", orgId);
      const { error: insertError } = await (supabase as any).from("timetable_entries").insert(newEntries);
      if (insertError) throw insertError;

      toast.success(`Timetable generated with ${newEntries.length} entries!`);
      setShowGenerateDialog(false);
      setConstraints("");
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
    if (entries.length === 0) {
      toast.error("No timetable to download");
      return;
    }

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    // Header
    doc.setFillColor(30, 58, 138); // dark blue
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

    // Group entries by day
    const byDay: Record<number, TimetableEntry[]> = {};
    entries.forEach(e => {
      if (!byDay[e.day_of_week]) byDay[e.day_of_week] = [];
      byDay[e.day_of_week].push(e);
    });

    // Get unique time slots sorted
    const allSlots = [...new Set(entries.map(e => `${e.start_time}-${e.end_time}`))].sort();

    // Table dimensions
    const marginL = 10;
    const marginR = 10;
    const tableW = pageW - marginL - marginR;
    const timeColW = 30;
    const dayColW = (tableW - timeColW) / 5;
    const headerH = 10;
    const rowH = Math.min(22, Math.max(16, (pageH - 50) / (allSlots.length + 1)));
    const tableTop = 34;

    // Table header row
    doc.setFillColor(59, 130, 246); // blue
    doc.rect(marginL, tableTop, tableW, headerH, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Time", marginL + timeColW / 2, tableTop + headerH / 2 + 1, { align: "center" });
    for (let i = 0; i < 5; i++) {
      const x = marginL + timeColW + i * dayColW;
      doc.text(WEEKDAYS[i], x + dayColW / 2, tableTop + headerH / 2 + 1, { align: "center" });
    }

    // Draw rows
    let y = tableTop + headerH;
    allSlots.forEach((slot, idx) => {
      const [start, end] = slot.split("-");
      // Alternating row colors
      if (idx % 2 === 0) {
        doc.setFillColor(241, 245, 249); // slate-100
      } else {
        doc.setFillColor(255, 255, 255);
      }
      doc.rect(marginL, y, tableW, rowH, "F");

      // Time cell
      doc.setTextColor(51, 65, 85); // slate-700
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(start?.slice(0, 5) || "", marginL + timeColW / 2, y + rowH / 2 - 1, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text(end?.slice(0, 5) || "", marginL + timeColW / 2, y + rowH / 2 + 3, { align: "center" });

      // Day cells
      for (let d = 1; d <= 5; d++) {
        const x = marginL + timeColW + (d - 1) * dayColW;
        const match = (byDay[d] || []).find(e => `${e.start_time}-${e.end_time}` === slot);
        if (match) {
          // Subject pill
          doc.setFillColor(219, 234, 254); // blue-100
          const pillW = dayColW - 6;
          const pillH = rowH - 4;
          doc.roundedRect(x + 3, y + 2, pillW, pillH, 2, 2, "F");

          doc.setTextColor(30, 64, 175); // blue-800
          doc.setFontSize(8);
          doc.setFont("helvetica", "bold");
          doc.text(match.subject, x + dayColW / 2, y + rowH / 2 - 2, { align: "center", maxWidth: pillW - 4 });

          doc.setTextColor(71, 85, 105); // slate-600
          doc.setFontSize(6.5);
          doc.setFont("helvetica", "normal");
          const subText = [match.teacher_name, match.room].filter(Boolean).join(" · ");
          doc.text(subText, x + dayColW / 2, y + rowH / 2 + 3, { align: "center", maxWidth: pillW - 4 });

          if (match.section_name) {
            doc.setFontSize(5.5);
            doc.setTextColor(100, 116, 139);
            doc.text(match.section_name, x + dayColW / 2, y + rowH / 2 + 6.5, { align: "center", maxWidth: pillW - 4 });
          }
        }
      }

      y += rowH;
    });

    // Draw grid lines
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.3);
    // Outer border
    doc.rect(marginL, tableTop, tableW, headerH + allSlots.length * rowH);
    // Vertical lines
    doc.line(marginL + timeColW, tableTop, marginL + timeColW, y);
    for (let i = 1; i < 5; i++) {
      const lx = marginL + timeColW + i * dayColW;
      doc.line(lx, tableTop, lx, y);
    }
    // Horizontal lines
    for (let i = 0; i <= allSlots.length; i++) {
      const ly = tableTop + headerH + i * rowH;
      doc.line(marginL, ly, marginL + tableW, ly);
    }

    // Footer
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.setFont("helvetica", "italic");
    doc.text("This timetable was generated by BrainBuddy", marginL, pageH - 6);
    doc.text(`Page 1 of 1`, pageW - marginR, pageH - 6, { align: "right" });

    doc.save(`${(orgName || "Timetable").replace(/\s+/g, "_")}_Timetable.pdf`);
    toast.success("Timetable PDF downloaded!");
  };

  if (loading) {
    return <div className="p-6 space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>;
  }

  // Group entries by day
  const byDay: Record<number, TimetableEntry[]> = {};
  entries.forEach(e => {
    if (!byDay[e.day_of_week]) byDay[e.day_of_week] = [];
    byDay[e.day_of_week].push(e);
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Timetable
          </h2>
          <p className="text-sm text-muted-foreground">Weekly class schedule</p>
        </div>
        <div className="flex gap-2">
          {entries.length > 0 && (
            <Button variant="outline" size="sm" onClick={downloadPDF}>
              <Download className="h-4 w-4 mr-1" /> Download PDF
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
              ? "Use AI Generate to create an optimized schedule from teacher sections."
              : "Your Super Admin will set up the timetable soon."}
          </p>
        </div>
      ) : (
        /* Formal table view */
        <div className="overflow-auto rounded-lg border border-border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-primary/10">
                <th className="border border-border/50 px-3 py-2 text-left font-semibold text-foreground w-28">Time</th>
                {WEEKDAYS.map(day => (
                  <th key={day} className="border border-border/50 px-3 py-2 text-center font-semibold text-foreground">{day}</th>
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
                    {[1, 2, 3, 4, 5].map(d => {
                      const match = (byDay[d] || []).find(e => `${e.start_time}-${e.end_time}` === slot);
                      return (
                        <td key={d} className="border border-border/50 px-2 py-1.5 text-center">
                          {match ? (
                            <div className="rounded-md bg-primary/10 p-1.5 space-y-0.5">
                              <p className="font-semibold text-xs text-primary">{match.subject}</p>
                              <p className="text-[10px] text-muted-foreground">{match.teacher_name || "TBD"}</p>
                              {match.section_name && <p className="text-[10px] text-muted-foreground italic">{match.section_name}</p>}
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

      {/* AI Generate Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Timetable Generator
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <p className="font-medium mb-1">Teacher Sections Found: {sections.length}</p>
              <div className="max-h-32 overflow-auto space-y-1">
                {sections.map(s => (
                  <p key={s.id} className="text-xs text-muted-foreground">
                    • {s.teacher_name} — {s.subject} ({s.section_name})
                  </p>
                ))}
              </div>
              {sections.length === 0 && (
                <p className="text-xs text-destructive">No sections found. Teachers need to create sections first.</p>
              )}
            </div>
            <div>
              <Label>Additional Constraints (optional)</Label>
              <Textarea
                value={constraints}
                onChange={e => setConstraints(e.target.value)}
                placeholder="e.g. Math should be in morning, no classes after 2 PM on Friday, each class needs at least 1 break period..."
                rows={3}
              />
            </div>
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">AI will optimize for:</p>
              <ul className="list-disc list-inside">
                <li>No scheduling conflicts for teachers</li>
                <li>Even distribution of subjects across the week</li>
                <li>Core subjects in morning, electives in afternoon</li>
                <li>45-minute periods with breaks</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>Cancel</Button>
            <Button onClick={handleAIGenerate} disabled={generating || sections.length === 0}>
              {generating ? (
                <span className="flex items-center gap-1">
                  <div className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Generating...
                </span>
              ) : (
                <><Sparkles className="h-4 w-4 mr-1" /> Generate Timetable</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}