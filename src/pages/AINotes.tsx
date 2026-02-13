import React, { useState } from 'react';
import { Loader2, Zap, Plus, Copy, Sparkles, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { bytezService, AINotesResponse } from '@/services/aiService';
import Sidebar from '@/components/Sidebar';

const AINotes: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [notes, setNotes] = useState<AINotesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      toast.error('Please enter a topic');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const generatedNotes = await bytezService.generateNotes(topic);
      setNotes(generatedNotes);
      toast.success('Notes generated successfully!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate notes';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const handleQuizFromNotes = () => {
    if (notes?.title) {
      // Navigate to AI Quiz with pre-filled topic
      window.location.href = `/ai-quiz?topic=${encodeURIComponent(notes.title)}`;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div className="md:ml-64 p-4 lg:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-primary" />
              AI Notes Generator
            </h1>
            <p className="text-muted-foreground">
              Generate comprehensive study notes for any topic using AI
            </p>
          </div>

          {/* Search Form */}
          <Card className="mb-8 glass-card">
            <CardHeader>
              <CardTitle>Generate Notes</CardTitle>
              <CardDescription>
                Enter a topic and let AI create detailed study notes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGenerateNotes} className="flex gap-2">
                <Input
                  placeholder="Enter topic (e.g., Photosynthesis, Quantum Mechanics, Python Functions)"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  disabled={loading}
                />
                <Button type="submit" disabled={loading} className="flex-shrink-0">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Generate
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Error Message */}
          {error && (
            <Card className="mb-8 bg-destructive/10 border-destructive/30">
              <CardContent className="pt-6 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Error</p>
                  <p className="text-sm text-muted-foreground">{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes Display */}
          {notes && (
            <div className="space-y-6">
              {/* Title */}
              <Card className="glass-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-3xl neon-text">{notes.title}</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(notes.title)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
              </Card>

              {/* Explanation */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-lg">Detailed Explanation</CardTitle>
                </CardHeader>
                <CardContent className="prose prose-invert max-w-none">
                  <p className="text-base leading-relaxed whitespace-pre-wrap">{notes.explanation}</p>
                </CardContent>
              </Card>

              {/* Key Points */}
              {notes.keyPoints && notes.keyPoints.length > 0 && (
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-lg">Key Points</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {notes.keyPoints.map((point, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <span className="text-primary font-bold flex-shrink-0">•</span>
                          <span className="text-muted-foreground">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Formulas */}
              {notes.formula && notes.formula.length > 0 && (
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-lg">Important Formulas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 font-mono text-sm bg-background/50 p-4 rounded-lg">
                      {notes.formula.map((formula, idx) => (
                        <div key={idx} className="text-primary">
                          <div>{formula}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Summary */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-lg">Quick Summary</CardTitle>
                </CardHeader>
                <CardContent className="prose prose-invert max-w-none">
                  <p className="text-base leading-relaxed whitespace-pre-wrap">{notes.summary}</p>
                </CardContent>
              </Card>

              {/* Revision Tips */}
              <Card className="glass-card bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Revision Tips
                  </CardTitle>
                </CardHeader>
                <CardContent className="prose prose-invert max-w-none">
                  <p className="text-base leading-relaxed whitespace-pre-wrap">{notes.revisionTips}</p>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-3 flex-wrap">
                <Button
                  onClick={() => copyToClipboard(JSON.stringify(notes, null, 2))}
                  variant="outline"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy All
                </Button>
                <Button onClick={handleQuizFromNotes} variant="neon" className="flex-1">
                  <Zap className="h-4 w-4 mr-2" />
                  Generate Quiz from These Notes
                </Button>
                <Button
                  onClick={() => {
                    setNotes(null);
                    setTopic('');
                  }}
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Topic
                </Button>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!notes && !loading && (
            <div className="text-center py-12">
              <Sparkles className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-30" />
              <p className="text-muted-foreground">Enter a topic to generate AI-powered study notes</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AINotes;
