import { useParams, useNavigate } from "react-router-dom";
import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Share2,
  CheckCircle,
  Sparkles,
  BookOpen,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Brain,
  Download,
  Layers,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Logo from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import MicroQuizPopup from "@/components/MicroQuizPopup";
import jsPDF from "jspdf";

interface ParsedNotes {
  title: string;
  summary: string;
  keyPoints: string[];
  sections: Array<{
    title: string;
    content: string;
  }>;
}

interface WeakTopic {
  topic_id: string;
  topic_name: string;
  weakness_score: number;
}

const Notes = () => {
  const { todoId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<ParsedNotes | null>(null);
  const [rawNotes, setRawNotes] = useState<string>("");
  const [todoTitle, setTodoTitle] = useState("");
  const [weakTopics, setWeakTopics] = useState<WeakTopic[]>([]);
  const [microQuizOpen, setMicroQuizOpen] = useState(false);
  const [selectedQuizTopic, setSelectedQuizTopic] = useState<WeakTopic | null>(null);

  useEffect(() => {
    if (todoId && user) {
      fetchNotes();
      fetchWeakTopics();
    }
  }, [todoId, user]);

  const fetchNotes = async () => {
    try {
      const { data: todoData } = await supabase
        .from("todos")
        .select("title")
        .eq("id", todoId)
        .maybeSingle();

      if (todoData) setTodoTitle(todoData.title);

      const { data: notesData, error } = await supabase
        .from("notes")
        .select("content")
        .eq("todo_id", todoId)
        .eq("is_ai_generated", true)
        .maybeSingle();

      if (error) throw error;

      if (notesData?.content) {
        setRawNotes(notesData.content);
        parseNotes(notesData.content, todoData?.title || "Study Notes");
      }
    } catch (error) {
      console.error("Error fetching notes:", error);
      toast.error("Failed to load notes");
    } finally {
      setLoading(false);
    }
  };

  const fetchWeakTopics = async () => {
    try {
      const { data, error } = await supabase
        .from("user_topic_performance")
        .select(`topic_id, weakness_score, topics (name)`)
        .eq("user_id", user?.id)
        .eq("strength_status", "weak")
        .order("weakness_score", { ascending: false });

      if (error) throw error;

      const formattedTopics: WeakTopic[] = (data || []).map((t: any) => ({
        topic_id: t.topic_id,
        topic_name: t.topics?.name || "Unknown",
        weakness_score: t.weakness_score,
      }));

      setWeakTopics(formattedTopics);
    } catch (error) {
      console.error("Error fetching weak topics:", error);
    }
  };

  const parseNotes = (content: string, title: string) => {
    const lines = content.split("\n").filter((line) => line.trim());
    const keyPoints: string[] = [];
    const sections: Array<{ title: string; content: string }> = [];
    let currentSection: { title: string; content: string } | null = null;
    let summary = "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("## ") || trimmed.startsWith("### ")) {
        if (currentSection) sections.push(currentSection);
        currentSection = { title: trimmed.replace(/^#+\s*/, ""), content: "" };
      } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        const point = trimmed.replace(/^[-*]\s*/, "").replace(/\*\*/g, "");
        if (point.length > 10) keyPoints.push(point);
        if (currentSection) currentSection.content += point + "\n";
      } else if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
        const point = trimmed.replace(/\*\*/g, "");
        if (point.length > 10) keyPoints.push(point);
      } else if (!trimmed.startsWith("#") && trimmed.length > 50) {
        if (!summary && !currentSection) {
          summary = trimmed.replace(/\*\*/g, "");
        } else if (currentSection) {
          currentSection.content += trimmed + "\n";
        }
      }
    }

    if (currentSection) sections.push(currentSection);
    if (!summary && keyPoints.length > 0) summary = keyPoints[0];

    setNotes({
      title,
      summary: summary || "Study notes generated from your video content.",
      keyPoints: keyPoints.slice(0, 7),
      sections: sections.slice(0, 5),
    });
  };

  const containsWeakTopic = (text: string): WeakTopic | null => {
    const lowerText = text.toLowerCase();
    for (const topic of weakTopics) {
      if (lowerText.includes(topic.topic_name.toLowerCase())) return topic;
    }
    return null;
  };

  const renderHighlightedText = (text: string) => {
    const weakTopic = containsWeakTopic(text);
    if (weakTopic) {
      return (
        <div className="relative">
          <div className="absolute -left-3 top-0 bottom-0 w-1 bg-destructive rounded-full" />
          <p className="border-l-2 border-transparent">{text}</p>
          <button
            onClick={() => { setSelectedQuizTopic(weakTopic); setMicroQuizOpen(true); }}
            className="inline-flex items-center gap-1 mt-2 text-xs text-destructive hover:underline"
          >
            <Brain className="h-3 w-3" />
            Practice: {weakTopic.topic_name}
          </button>
        </div>
      );
    }
    return <p>{text}</p>;
  };

  const handleDownload = () => {
    if (!notes || !rawNotes) return;
    toast.info("Generating high-quality PDF...");

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marginL = 18;
    const marginR = 18;
    const maxW = pageW - marginL - marginR;
    let y = 20;

    const addPage = () => { doc.addPage(); y = 20; };
    const checkPage = (needed: number) => { if (y + needed > pageH - 22) addPage(); };

    // ─── Title Header Bar ───
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageW, 36, "F");
    // Accent gradient overlay
    doc.setFillColor(29, 78, 216);
    doc.rect(0, 30, pageW, 6, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    const displayTitle = notes.title.length > 45 ? notes.title.slice(0, 45) + "..." : notes.title;
    doc.text(displayTitle, pageW / 2, 16, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("AI-Generated Study Notes", pageW / 2, 24, { align: "center" });

    doc.setFontSize(7);
    doc.setTextColor(200, 220, 255);
    doc.text(
      `Generated by BrainBuddy • ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`,
      pageW / 2, 34, { align: "center" }
    );

    y = 44;

    // ─── Summary Box ───
    if (notes.summary) {
      checkPage(22);
      doc.setFillColor(239, 246, 255);
      doc.roundedRect(marginL, y, maxW, 18, 3, 3, "F");
      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(0.3);
      doc.roundedRect(marginL, y, maxW, 18, 3, 3, "S");
      doc.setTextColor(30, 64, 175);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("OVERVIEW", marginL + 5, y + 5.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(55, 65, 81);
      doc.setFontSize(9);
      const summaryLines = doc.splitTextToSize(notes.summary, maxW - 10);
      doc.text(summaryLines.slice(0, 2), marginL + 5, y + 11);
      y += 22;
    }

    // ─── Key Takeaways ───
    if (notes.keyPoints.length > 0) {
      y += 4;
      checkPage(14);
      doc.setFillColor(37, 99, 235);
      doc.rect(marginL, y, 3, 8, "F");
      doc.setTextColor(30, 58, 138);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Key Takeaways", marginL + 6, y + 6);
      y += 12;
      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(0.4);
      doc.line(marginL, y, pageW - marginR, y);
      y += 5;

      notes.keyPoints.forEach((point, idx) => {
        checkPage(10);
        // Numbered circle
        doc.setFillColor(37, 99, 235);
        doc.circle(marginL + 4, y + 2.5, 3, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.text(String(idx + 1), marginL + 4, y + 3.5, { align: "center" });

        doc.setTextColor(55, 65, 81);
        doc.setFontSize(9.5);
        doc.setFont("helvetica", "normal");
        const wrapped = doc.splitTextToSize(point, maxW - 14);
        wrapped.forEach((line: string, li: number) => {
          checkPage(6);
          doc.text(line, marginL + 10, y + 3.5);
          y += 5;
        });
        y += 2;
      });
    }

    // ─── Detailed Sections ───
    if (notes.sections.length > 0) {
      y += 4;
      checkPage(14);
      doc.setFillColor(37, 99, 235);
      doc.rect(marginL, y, 3, 8, "F");
      doc.setTextColor(30, 58, 138);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Detailed Notes", marginL + 6, y + 6);
      y += 12;
      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(0.4);
      doc.line(marginL, y, pageW - marginR, y);
      y += 5;

      notes.sections.forEach((section) => {
        checkPage(14);
        // Section title
        doc.setTextColor(30, 58, 138);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(section.title, marginL + 2, y + 5);
        y += 10;

        // Section content
        const contentLines = section.content.split("\n").filter(l => l.trim());
        contentLines.forEach((line) => {
          checkPage(8);
          const cleanLine = line.replace(/\*\*/g, "");
          
          // Check for bullet-like content
          if (cleanLine.match(/^[-•]\s/)) {
            const bulletText = cleanLine.replace(/^[-•]\s*/, "");
            doc.setFillColor(37, 99, 235);
            doc.circle(marginL + 4, y + 2.5, 1.2, "F");
            doc.setTextColor(55, 65, 81);
            doc.setFontSize(9.5);
            doc.setFont("helvetica", "normal");
            const wrapped = doc.splitTextToSize(bulletText, maxW - 10);
            wrapped.forEach((wl: string) => {
              checkPage(6);
              doc.text(wl, marginL + 8, y + 3.5);
              y += 5;
            });
          } else {
            doc.setTextColor(55, 65, 81);
            doc.setFontSize(9.5);
            doc.setFont("helvetica", "normal");
            const wrapped = doc.splitTextToSize(cleanLine, maxW);
            wrapped.forEach((wl: string) => {
              checkPage(6);
              doc.text(wl, marginL, y + 3.5);
              y += 5;
            });
          }
          y += 1;
        });
        y += 4;
      });
    }

    // ─── Footer on all pages ───
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      // Bottom accent line
      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(0.5);
      doc.line(marginL, pageH - 14, pageW - marginR, pageH - 14);
      // Footer text
      doc.setFontSize(7);
      doc.setTextColor(156, 163, 175);
      doc.setFont("helvetica", "italic");
      doc.text("BrainBuddy AI Notes • brainbuddy-glow.vercel.app", marginL, pageH - 9);
      doc.text(`Page ${i} of ${totalPages}`, pageW - marginR, pageH - 9, { align: "right" });
      // Copyright
      doc.setFontSize(6);
      doc.text("© 2026 BrainBuddy. All rights reserved.", pageW / 2, pageH - 5, { align: "center" });
    }

    const fileName = `${(notes.title || "Notes").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40)}_BrainBuddy.pdf`;
    doc.save(fileName);
    toast.success("High-quality PDF downloaded!");
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: notes?.title || "Study Notes",
        text: notes?.summary || "",
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!notes || !rawNotes) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">No notes found for this task</p>
        <p className="text-sm text-muted-foreground">Watch at least 50% of the video to generate notes</p>
        <Button onClick={() => navigate(`/video/${todoId}`)}>Watch Video</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Logo size="sm" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => navigate(`/quiz/${todoId}`)}>
              <Trophy className="h-4 w-4 mr-1" />
              Quiz
            </Button>
            <Button variant="outline" size="sm" onClick={() => {
              const subject = todoTitle || "General";
              navigate(`/flashcards?subject=${encodeURIComponent(subject)}`);
            }}>
              <Layers className="h-4 w-4 mr-1" />
              Flashcards
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-1" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </Button>
          </div>
        </div>
      </header>

      <main id="notes-content" className="container mx-auto px-4 py-6 max-w-3xl">
        {/* Weak Topics Alert */}
        {weakTopics.length > 0 && (
          <div className="mb-6 p-4 glass-card rounded-xl border border-destructive/30 bg-destructive/5 animate-fade-in">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-destructive mb-2">Weak Topics Detected</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Sections related to these topics are highlighted. Tap to practice!
                </p>
                <div className="flex flex-wrap gap-2">
                  {weakTopics.slice(0, 5).map((topic) => (
                    <Badge
                      key={topic.topic_id}
                      variant="outline"
                      className="cursor-pointer border-destructive/50 hover:bg-destructive/10"
                      onClick={() => { setSelectedQuizTopic(topic); setMicroQuizOpen(true); }}
                    >
                      <Brain className="h-3 w-3 mr-1" />
                      {topic.topic_name}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Title */}
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center gap-2 text-primary mb-2">
            <Sparkles className="h-5 w-5" />
            <span className="text-sm font-medium">AI-Generated Notes</span>
          </div>
          <h1 className="text-3xl font-bold mb-4">{notes.title}</h1>
          <p className="text-lg text-muted-foreground">{notes.summary}</p>
        </div>

        {/* Key Points */}
        {notes.keyPoints.length > 0 && (
          <section className="mb-8 animate-slide-up">
            <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
              <CheckCircle className="h-5 w-5 text-primary" />
              Key Takeaways
            </h2>
            <div className="space-y-3">
              {notes.keyPoints.map((point, index) => {
                const weakTopic = containsWeakTopic(point);
                return (
                  <div
                    key={index}
                    className={`flex gap-3 p-4 glass-card rounded-xl hover:neon-glow transition-all duration-300 ${
                      weakTopic ? "border-l-4 border-destructive bg-destructive/5" : ""
                    }`}
                  >
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      weakTopic ? "bg-destructive text-destructive-foreground" : "gradient-bg text-primary-foreground"
                    }`}>
                      {weakTopic ? <AlertTriangle className="h-3 w-3" /> : index + 1}
                    </div>
                    <div className="flex-1">
                      <p>{point}</p>
                      {weakTopic && (
                        <button
                          onClick={() => { setSelectedQuizTopic(weakTopic); setMicroQuizOpen(true); }}
                          className="inline-flex items-center gap-1 mt-2 text-xs text-destructive hover:underline font-medium"
                        >
                          <Brain className="h-3 w-3" />
                          Quick Quiz: {weakTopic.topic_name}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Detailed Sections */}
        {notes.sections.length > 0 && (
          <section className="space-y-6 animate-slide-up">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Detailed Notes
            </h2>
            {notes.sections.map((section, index) => {
              const weakTopic = containsWeakTopic(section.title) || containsWeakTopic(section.content);
              return (
                <div
                  key={index}
                  className={`glass-card rounded-xl p-6 ${
                    weakTopic ? "border-l-4 border-destructive bg-destructive/5" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className={`text-lg font-semibold ${weakTopic ? "text-destructive" : "neon-text"}`}>
                      {section.title}
                    </h3>
                    {weakTopic && (
                      <Badge variant="outline" className="border-destructive text-destructive text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Weak Area
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{section.content}</p>
                  {weakTopic && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4 border-destructive text-destructive hover:bg-destructive/10"
                      onClick={() => { setSelectedQuizTopic(weakTopic); setMicroQuizOpen(true); }}
                    >
                      <Brain className="h-4 w-4 mr-2" />
                      Practice This Topic
                    </Button>
                  )}
                </div>
              );
            })}
          </section>
        )}

        {/* CTA */}
        <div className="mt-8 text-center">
          <Button variant="neon" size="lg" onClick={() => navigate(`/quiz/${todoId}`)}>
            <Sparkles className="h-5 w-5 mr-2" />
            Take the Quiz
          </Button>
        </div>
      </main>

      {/* Micro Quiz Popup */}
      <MicroQuizPopup
        isOpen={microQuizOpen}
        onClose={() => { setMicroQuizOpen(false); setSelectedQuizTopic(null); }}
        topicName={selectedQuizTopic?.topic_name || ""}
        topicId={selectedQuizTopic?.topic_id || ""}
        todoId={todoId || ""}
      />
    </div>
  );
};

export default Notes;