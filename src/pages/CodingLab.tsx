import React, { useState } from 'react';
import { Code, Loader2, Send, AlertCircle, Copy, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { bytezService, CodingResponse } from '@/services/aiService';
import Sidebar from '@/components/Sidebar';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const CodingLab: React.FC = () => {
  const [language, setLanguage] = useState('python');
  const [problem, setProblem] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const languages = [
    { value: 'python', label: 'Python' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'java', label: 'Java' },
    { value: 'cpp', label: 'C++' },
    { value: 'csharp', label: 'C#' },
    { value: 'go', label: 'Go' },
    { value: 'rust', label: 'Rust' },
  ];

  const handleGenerateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!problem.trim()) {
      toast.error('Please enter a coding problem');
      return;
    }

    const userMessage: Message = { role: 'user', content: problem };
    setMessages((prev) => [...prev, userMessage]);
    setProblem('');
    setLoading(true);
    setError(null);

    try {
      const response = await bytezService.generateCode(language, problem);
      const assistantMessage: Message = {
        role: 'assistant',
        content: JSON.stringify(response, null, 2),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      toast.success('Code generated successfully!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate code';
      setError(message);
      toast.error(message);
      setMessages((prev) => prev.slice(0, -1)); // Remove the user message if failed
    } finally {
      setLoading(false);
    }
  };

  const handleDebugCode = async () => {
    if (!problem.trim()) {
      toast.error('Please enter code to debug');
      return;
    }

    const userMessage: Message = {
      role: 'user',
      content: `Debug this code:\n${problem}`,
    };
    setMessages((prev) => [...prev, userMessage]);
    setProblem('');
    setLoading(true);
    setError(null);

    try {
      const response = await bytezService.debugCode(language, problem, problem);
      const assistantMessage: Message = {
        role: 'assistant',
        content: response,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      toast.success('Debugging analysis completed!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to debug code';
      setError(message);
      toast.error(message);
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const parseCodingResponse = (content: string): CodingResponse | null => {
    try {
      return JSON.parse(content);
    } catch {
      return null;
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
              <Code className="h-8 w-8 text-primary" />
              AI Coding Assistant
            </h1>
            <p className="text-muted-foreground">
              Get help with code generation, debugging, and optimization
            </p>
          </div>

          {/* Input Section */}
          <Card className="mb-8 glass-card">
            <CardHeader>
              <CardTitle>Code Assistant</CardTitle>
              <CardDescription>
                Select a language and describe your coding problem or paste your code
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select programming language" />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <form onSubmit={handleGenerateCode} className="space-y-3">
                <textarea
                  placeholder="Describe your coding problem or paste code to debug..."
                  value={problem}
                  onChange={(e) => setProblem(e.target.value)}
                  disabled={loading}
                  className="w-full h-32 p-3 rounded-lg bg-background border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={loading || !problem.trim()}
                    className="flex-1"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Generate Code
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading || !problem.trim()}
                    onClick={handleDebugCode}
                  >
                    Debug
                  </Button>
                </div>
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

          {/* Messages */}
          <div className="space-y-4">
            {messages.map((message, idx) => {
              const codingResponse = parseCodingResponse(message.content);

              return (
                <div key={idx}>
                  {message.role === 'user' ? (
                    <Card className="glass-card bg-primary/5">
                      <CardContent className="pt-6">
                        <div className="text-sm font-medium text-muted-foreground mb-2">You</div>
                        <p className="whitespace-pre-wrap font-mono text-sm">{message.content}</p>
                      </CardContent>
                    </Card>
                  ) : codingResponse ? (
                    <div className="space-y-3">
                      {/* Code */}
                      <Card className="glass-card">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">Generated Code</CardTitle>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                copyToClipboard(codingResponse.code)
                              }
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <pre className="bg-background p-4 rounded-lg overflow-x-auto text-xs font-mono">
                            <code>{codingResponse.code}</code>
                          </pre>
                        </CardContent>
                      </Card>

                      {/* Explanation */}
                      {codingResponse.explanation && (
                        <Card className="glass-card">
                          <CardHeader>
                            <CardTitle className="text-lg">Explanation</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="whitespace-pre-wrap text-sm leading-relaxed">
                              {codingResponse.explanation}
                            </p>
                          </CardContent>
                        </Card>
                      )}

                      {/* Optimization */}
                      {codingResponse.optimization && (
                        <Card className="glass-card bg-primary/5">
                          <CardHeader>
                            <CardTitle className="text-lg">Optimization Tips</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="whitespace-pre-wrap text-sm leading-relaxed">
                              {codingResponse.optimization}
                            </p>
                          </CardContent>
                        </Card>
                      )}

                      {/* Alternatives */}
                      {codingResponse.alternatives && codingResponse.alternatives.length > 0 && (
                        <Card className="glass-card">
                          <CardHeader>
                            <CardTitle className="text-lg">Alternative Approaches</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-2">
                              {codingResponse.alternatives.map((alt, altIdx) => (
                                <li key={altIdx} className="text-sm flex items-start gap-3">
                                  <span className="text-primary font-bold flex-shrink-0">•</span>
                                  <span>{alt}</span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  ) : (
                    <Card className="glass-card">
                      <CardContent className="pt-6">
                        <div className="text-sm font-medium text-muted-foreground mb-2">
                          Assistant
                        </div>
                        <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              );
            })}
          </div>

          {/* Empty State */}
          {messages.length === 0 && (
            <div className="text-center py-12">
              <Code className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-30" />
              <p className="text-muted-foreground">
                Start by describing your coding problem or pasting code to debug
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CodingLab;
