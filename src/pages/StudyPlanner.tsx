import { useState, useEffect, useCallback } from "react";
import { CalendarDays, Plus, Check, Trash2, Clock, BookOpen, Target, Sparkles, ChevronLeft, ChevronRight, GripVertical, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface StudySession {
  id: string;
  subject: string;
  topic: string;
  date: string;
  startTime: string;
  duration: number; // minutes
  priority: "high" | "medium" | "low";
  completed: boolean;
  notes?: string;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FULL_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-500/20 text-red-400 border-red-500/30",
  medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  low: "bg-green-500/20 text-green-400 border-green-500/30",
};

const SUBJECTS = [
  "Mathematics", "Physics", "Chemistry", "Biology", "English",
  "History", "Geography", "Computer Science", "Economics", "Hindi",
  "Social Science", "Political Science", "Accountancy", "Business Studies",
];

const StudyPlanner = () => {
  const [sessions, setSessions] = useState<StudySession[]>(() => {
    const saved = localStorage.getItem("brainbuddy_study_planner");
    return saved ? JSON.parse(saved) : [];
  });
  const [showAdd, setShowAdd] = useState(false);
  const [editingSession, setEditingSession] = useState<StudySession | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.setDate(diff));
  });

  // Form state
  const [formSubject, setFormSubject] = useState("");
  const [formTopic, setFormTopic] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("09:00");
  const [formDuration, setFormDuration] = useState("60");
  const [formPriority, setFormPriority] = useState<"high" | "medium" | "low">("medium");
  const [formNotes, setFormNotes] = useState("");

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem("brainbuddy_study_planner", JSON.stringify(sessions));
  }, [sessions]);

  const getWeekDates = useCallback(() => {
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, [currentWeekStart]);

  const weekDates = getWeekDates();
  const today = new Date().toISOString().split("T")[0];

  const navigateWeek = (dir: number) => {
    setCurrentWeekStart(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + dir * 7);
      return d;
    });
  };

  const formatDate = (d: Date) => d.toISOString().split("T")[0];
  const isToday = (d: Date) => formatDate(d) === today;

  const getSessionsForDate = (date: string) => sessions.filter(s => s.date === date);

  const totalThisWeek = weekDates.reduce((acc, d) => acc + getSessionsForDate(formatDate(d)).length, 0);
  const completedThisWeek = weekDates.reduce((acc, d) => acc + getSessionsForDate(formatDate(d)).filter(s => s.completed).length, 0);
  const totalHoursPlanned = weekDates.reduce(
    (acc, d) => acc + getSessionsForDate(formatDate(d)).reduce((h, s) => h + s.duration, 0), 0
  ) / 60;

  const resetForm = () => {
    setFormSubject(""); setFormTopic(""); setFormDate(""); setFormTime("09:00");
    setFormDuration("60"); setFormPriority("medium"); setFormNotes("");
    setEditingSession(null);
  };

  const handleSave = () => {
    if (!formSubject || !formDate) {
      toast.error("Subject and date are required");
      return;
    }

    if (editingSession) {
      setSessions(prev => prev.map(s => s.id === editingSession.id ? {
        ...s,
        subject: formSubject,
        topic: formTopic,
        date: formDate,
        startTime: formTime,
        duration: parseInt(formDuration) || 60,
        priority: formPriority,
        notes: formNotes,
      } : s));
      toast.success("Session updated!");
    } else {
      const newSession: StudySession = {
        id: crypto.randomUUID(),
        subject: formSubject,
        topic: formTopic,
        date: formDate,
        startTime: formTime,
        duration: parseInt(formDuration) || 60,
        priority: formPriority,
        completed: false,
        notes: formNotes,
      };
      setSessions(prev => [...prev, newSession]);
      toast.success("Study session added!");
    }

    setShowAdd(false);
    resetForm();
  };

  const toggleComplete = (id: string) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, completed: !s.completed } : s));
  };

  const deleteSession = (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    toast.success("Session removed");
  };

  const openEdit = (session: StudySession) => {
    setEditingSession(session);
    setFormSubject(session.subject);
    setFormTopic(session.topic);
    setFormDate(session.date);
    setFormTime(session.startTime);
    setFormDuration(String(session.duration));
    setFormPriority(session.priority);
    setFormNotes(session.notes || "");
    setShowAdd(true);
  };

  const weekLabel = (() => {
    const start = weekDates[0];
    const end = weekDates[6];
    const sameMonth = start.getMonth() === end.getMonth();
    if (sameMonth) {
      return `${start.getDate()} – ${end.getDate()} ${start.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}`;
    }
    return `${start.getDate()} ${start.toLocaleDateString("en-IN", { month: "short" })} – ${end.getDate()} ${end.toLocaleDateString("en-IN", { month: "short", year: "numeric" })}`;
  })();

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Study Planner</h1>
              <p className="text-xs text-muted-foreground">Plan your revision schedule and track progress</p>
            </div>
          </div>
          <Button onClick={() => { resetForm(); setFormDate(today); setShowAdd(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Session
          </Button>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-xs text-muted-foreground">Sessions This Week</p>
            <p className="text-xl font-bold">{totalThisWeek}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-xs text-muted-foreground">Completed</p>
            <p className="text-xl font-bold text-green-400">{completedThisWeek}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-xs text-muted-foreground">Hours Planned</p>
            <p className="text-xl font-bold">{totalHoursPlanned.toFixed(1)}h</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-xs text-muted-foreground">Completion Rate</p>
            <div className="flex items-center gap-2">
              <p className="text-xl font-bold">
                {totalThisWeek > 0 ? Math.round((completedThisWeek / totalThisWeek) * 100) : 0}%
              </p>
              <Progress value={totalThisWeek > 0 ? (completedThisWeek / totalThisWeek) * 100 : 0} className="flex-1 h-2" />
            </div>
          </div>
        </div>
      </div>

      {/* Week navigation */}
      <div className="px-6 py-3 flex items-center justify-between border-b border-border/50">
        <Button variant="ghost" size="icon" onClick={() => navigateWeek(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-medium text-sm">{weekLabel}</span>
        <Button variant="ghost" size="icon" onClick={() => navigateWeek(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Weekly Calendar Grid */}
      <div className="flex-1 overflow-auto px-4 py-4">
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3 min-h-full">
          {weekDates.map((date, dayIdx) => {
            const dateStr = formatDate(date);
            const daySessions = getSessionsForDate(dateStr);
            const isPast = dateStr < today;

            return (
              <motion.div
                key={dateStr}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: dayIdx * 0.05 }}
                className={`flex flex-col rounded-xl border transition-colors ${
                  isToday(date)
                    ? "border-primary/50 bg-primary/5"
                    : isPast
                      ? "border-border/30 bg-muted/10 opacity-70"
                      : "border-border/50 bg-card/30"
                }`}
              >
                {/* Day header */}
                <div className={`px-3 py-2 border-b ${isToday(date) ? "border-primary/30" : "border-border/30"}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-xs font-semibold ${isToday(date) ? "text-primary" : "text-muted-foreground"}`}>
                        {DAYS[date.getDay()]}
                      </p>
                      <p className={`text-lg font-bold ${isToday(date) ? "text-primary" : ""}`}>
                        {date.getDate()}
                      </p>
                    </div>
                    {isToday(date) && (
                      <Badge variant="default" className="text-[10px] h-5">Today</Badge>
                    )}
                  </div>
                </div>

                {/* Sessions */}
                <div className="flex-1 p-2 space-y-2 min-h-[120px]">
                  <AnimatePresence>
                    {daySessions
                      .sort((a, b) => a.startTime.localeCompare(b.startTime))
                      .map((session) => (
                        <motion.div
                          key={session.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className={`p-2 rounded-lg border text-xs group cursor-pointer transition-all hover:shadow-md ${
                            session.completed
                              ? "bg-green-500/10 border-green-500/20 line-through opacity-60"
                              : PRIORITY_COLORS[session.priority]
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold truncate">{session.subject}</p>
                              {session.topic && (
                                <p className="text-muted-foreground truncate">{session.topic}</p>
                              )}
                              <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>{session.startTime}</span>
                                <span>• {session.duration}m</span>
                              </div>
                            </div>
                            <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => toggleComplete(session.id)} className="hover:text-green-400">
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => openEdit(session)} className="hover:text-blue-400">
                                <Edit2 className="h-3 w-3" />
                              </button>
                              <button onClick={() => deleteSession(session.id)} className="hover:text-red-400">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                  </AnimatePresence>

                  {daySessions.length === 0 && !isPast && (
                    <button
                      onClick={() => { resetForm(); setFormDate(dateStr); setShowAdd(true); }}
                      className="w-full flex items-center justify-center gap-1 p-2 rounded-lg border border-dashed border-border/50 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors text-xs"
                    >
                      <Plus className="h-3 w-3" />
                      Add
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showAdd} onOpenChange={(v) => { if (!v) { setShowAdd(false); resetForm(); } else setShowAdd(true); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              {editingSession ? "Edit Study Session" : "Plan Study Session"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Subject <span className="text-destructive">*</span></Label>
                <Select value={formSubject} onValueChange={setFormSubject}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date <span className="text-destructive">*</span></Label>
                <Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />
              </div>
            </div>

            <div>
              <Label>Topic / Chapter</Label>
              <Input value={formTopic} onChange={e => setFormTopic(e.target.value)} placeholder="e.g. Quadratic Equations" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Start Time</Label>
                <Input type="time" value={formTime} onChange={e => setFormTime(e.target.value)} />
              </div>
              <div>
                <Label>Duration (min)</Label>
                <Select value={formDuration} onValueChange={setFormDuration}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[15, 30, 45, 60, 90, 120, 150, 180].map(m => (
                      <SelectItem key={m} value={String(m)}>{m} min</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={formPriority} onValueChange={(v) => setFormPriority(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">🔴 High</SelectItem>
                    <SelectItem value="medium">🟡 Medium</SelectItem>
                    <SelectItem value="low">🟢 Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Notes (optional)</Label>
              <Textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="What to focus on..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAdd(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={!formSubject || !formDate}>
              {editingSession ? "Update" : "Add Session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudyPlanner;