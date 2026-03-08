import { useState } from "react";
import {
  FileText,
  Sparkles,
  Loader2,
  Copy,
  Check,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FILTER_OPTIONS } from "@/contexts/FilterContext";
import ReactMarkdown from "react-markdown";
import BattleLoadingOverlay from "@/components/battle/BattleLoadingOverlay";

const AINotes = () => {
  const [subject, setSubject] = useState("");
  const [classLevel, setClassLevel] = useState("");
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const subjectsForClass = classLevel
    ? FILTER_OPTIONS.subjects[classLevel] || []
    : [];

  const generateNotes = async () => {
    if (!topic.trim() || isLoading) return;

    setIsLoading(true);
    setNotes("");

    try {
      const { data, error } = await supabase.functions.invoke("ai-notes-gen", {
        body: {
          topic: topic.trim(),
          subject: subject || undefined,
          classLevel: classLevel || undefined,
        },
      });

      if (error) throw error;

      if (data?.notes) {
        setNotes(data.notes);
      } else {
        throw new Error("No notes returned");
      }
    } catch (err: any) {
      console.error("Notes generation error:", err);
      if (err?.message?.includes("429") || err?.status === 429) {
        toast.error("Rate limit reached. Please wait a moment.");
      } else if (err?.message?.includes("402") || err?.status === 402) {
        toast.error("Credits exhausted. Please add funds.");
      } else {
        toast.error("Failed to generate notes");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(notes);
    setCopied(true);
    toast.success("Notes copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Full-screen loading overlay */}
      <BattleLoadingOverlay
        show={isLoading}
        message="Generating Notes..."
        subMessage="AI is creating structured, exam-ready notes for you"
      />

      {/* Header */}
      <div className="px-6 py-4 border-b border-border/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-lg">AI Notes Generator</h1>
            <p className="text-xs text-muted-foreground">
              Ultra-fast, exam-ready notes for any subject
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <Select
            value={classLevel}
            onValueChange={(v) => {
              setClassLevel(v);
              setSubject("");
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Class / Level" />
            </SelectTrigger>
            <SelectContent>
              {FILTER_OPTIONS.classes.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={subject}
            onValueChange={setSubject}
            disabled={!classLevel}
          >
            <SelectTrigger>
              <SelectValue placeholder="Subject" />
            </SelectTrigger>
            <SelectContent>
              {subjectsForClass.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            placeholder="Chapter / Topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generateNotes()}
          />
        </div>

        <Button
          variant="neon"
          onClick={generateNotes}
          disabled={isLoading || !topic.trim()}
          className="w-full sm:w-auto"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Notes
            </>
          )}
        </Button>
      </div>

      {/* Notes output */}
      <ScrollArea className="flex-1 px-6 py-4">
        {!notes && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full gap-4 py-16">
            <BookOpen className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground text-center max-w-sm">
              Select a subject and topic, then hit Generate to get structured,
              exam-ready notes instantly.
            </p>
          </div>
        )}

        {notes && (
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? (
                  <Check className="h-4 w-4 mr-1" />
                ) : (
                  <Copy className="h-4 w-4 mr-1" />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <div className="glass-card rounded-2xl p-6 prose prose-sm prose-invert max-w-none">
              <ReactMarkdown>{notes}</ReactMarkdown>
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default AINotes;
