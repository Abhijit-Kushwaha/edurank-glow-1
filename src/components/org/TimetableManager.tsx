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

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [entryRes, secRes] = await Promise.all([
        (supabase as any).from("timetable_entries")
          .select("*, profiles!timetable_entries_teacher_id_fkey(name), teacher_sections!timetable_entries_section_id_fkey(section_name)")
          .eq("org_id", orgId)
          .order("day_of_week")
          .order("start_time"),
        (supabase as any).from("teacher_sections")
          .select("*, profiles!teacher_sections_teacher_id_fkey(name)")
          .eq("org_id", orgId)
          .eq("is_active", true),
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

      // Map AI results to section/teacher IDs
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

      // Clear existing and insert new
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
        {isSuperAdmin && (
          <div className="flex gap-2">
            {entries.length > 0 && (
              <Button variant="outline" size="sm" onClick={clearTimetable}>
                <Trash2 className="h-4 w-4 mr-1" /> Clear
              </Button>
            )}
            <Button size="sm" onClick={() => setShowGenerateDialog(true)}>
              <Sparkles className="h-4 w-4 mr-1" /> AI Generate
            </Button>
          </div>
        )}
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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map(day => (
            <div key={day} className="space-y-2">
              <h3 className="text-sm font-semibold text-center py-1.5 rounded-lg bg-muted/50">
                {WEEKDAYS[day - 1]}
              </h3>
              {(byDay[day] || []).map(entry => (
                <Card key={entry.id} className={`border-border/50 ${DAY_COLORS[day]}`}>
                  <CardContent className="p-2.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-[9px]">{entry.subject}</Badge>
                      {entry.room && <span className="text-[9px] text-muted-foreground">{entry.room}</span>}
                    </div>
                    <p className="text-xs font-medium">{entry.teacher_name || "TBD"}</p>
                    {entry.section_name && <p className="text-[10px] text-muted-foreground">{entry.section_name}</p>}
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {entry.start_time?.slice(0, 5)} - {entry.end_time?.slice(0, 5)}
                    </p>
                  </CardContent>
                </Card>
              ))}
              {(!byDay[day] || byDay[day].length === 0) && (
                <p className="text-[10px] text-muted-foreground text-center py-4">No classes</p>
              )}
            </div>
          ))}
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
