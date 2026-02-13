import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, Zap, CheckCircle, XCircle, Trophy, ArrowRight, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { bytezService } from '@/services/aiService';
import { useCoins } from '@/contexts/CoinContext';
import Sidebar from '@/components/Sidebar';

interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

const AIQuiz: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [topic, setTopic] = useState(searchParams.get('topic') || '');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);
  const { addCoins } = useCoins();

  const question = questions[currentQuestion];
  const progress = questions.length > 0 ? ((currentQuestion + 1) / questions.length) * 100 : 0;

  const handleGenerateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      toast.error('Please enter a topic');
      return;
    }

    setLoading(true);
    try {
      const generatedQuestions = await bytezService.generateQuiz(topic, 10);
      setQuestions(generatedQuestions);
      setCurrentQuestion(0);
      setSelectedAnswer(null);
      setAnswers([]);
      setSubmitted(false);
      setShowResults(false);
      toast.success('Quiz generated successfully!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate quiz';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAnswer = (index: number) => {
    if (!submitted) {
      setSelectedAnswer(index);
    }
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) {
      toast.error('Please select an answer');
      return;
    }

    setAnswers([...answers, selectedAnswer]);
    setSubmitted(true);
  };

  const handleNext = async () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setSubmitted(false);
    } else {
      // Quiz finished - calculate score and award coins
      const correctCount = answers.filter((answer, idx) => answer === questions[idx].correctAnswer).length;
      const coinsEarned = correctCount * 10;

      try {
        await addCoins(coinsEarned);
      } catch (err) {
        console.error('Error awarding coins:', err);
      }

      setShowResults(true);
    }
  };

  const calculateScore = () => {
    let correct = 0;
    answers.forEach((answer, idx) => {
      if (answer === questions[idx].correctAnswer) correct++;
    });
    return correct;
  };

  const resetQuiz = () => {
    setQuestions([]);
    setTopic('');
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setAnswers([]);
    setSubmitted(false);
    setShowResults(false);
  };

  if (showResults && questions.length > 0) {
    const score = calculateScore();
    const percentage = Math.round((score / questions.length) * 100);
    const coinsEarned = score * 10;
    const isPassing = percentage >= 60;

    return (
      <div className="min-h-screen bg-background">
        <Sidebar />

        <div className="md:ml-64 p-4 lg:p-8">
          <div className="max-w-2xl mx-auto">
            <div className="text-center py-12">
              <div
                className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center ${
                  isPassing ? 'gradient-bg' : 'bg-destructive/20'
                }`}
              >
                {isPassing ? (
                  <Trophy className="h-10 w-10 text-primary-foreground" />
                ) : (
                  <XCircle className="h-10 w-10 text-destructive" />
                )}
              </div>

              <h1 className="text-4xl font-bold mb-2">
                {isPassing ? 'Congratulations!' : 'Great Effort!'}
              </h1>
              <p className="text-muted-foreground mb-8">
                {isPassing
                  ? "You've demonstrated strong understanding of the material!"
                  : 'Review the explanations and try again to improve your score.'}
              </p>

              <div className="space-y-4 mb-8">
                <div className="text-6xl font-bold neon-text">
                  {score}/{questions.length}
                </div>
                <div className="text-2xl text-muted-foreground">{percentage}% correct</div>
                <div className="text-2xl font-bold text-yellow-400">
                  🪙 +{coinsEarned} Coins Earned!
                </div>
              </div>

              <div className="flex gap-3 justify-center flex-wrap">
                <Button onClick={resetQuiz} variant="outline">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  New Quiz
                </Button>
                <Button onClick={() => window.location.href = '/dashboard'}>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div className="md:ml-64 p-4 lg:p-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-2">
              <Zap className="h-8 w-8 text-primary" />
              AI Quiz Generator
            </h1>
            <p className="text-muted-foreground">
              Generate and answer quizzes to earn coins
            </p>
          </div>

          {questions.length === 0 ? (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Generate a Quiz</CardTitle>
                <CardDescription>
                  Enter a topic and let AI create 10 multiple choice questions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleGenerateQuiz} className="flex gap-2">
                  <Input
                    placeholder="Enter topic (e.g., Biology, Python, History)"
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
          ) : (
            <div className="space-y-6">
              {/* Progress */}
              <Card className="glass-card">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      Question {currentQuestion + 1} of {questions.length}
                    </span>
                    <span className="text-sm font-medium text-primary">
                      {Math.round(progress)}%
                    </span>
                  </div>
                  <Progress value={progress} className="h-3" />
                </CardContent>
              </Card>

              {/* Question */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-xl">{question.question}</CardTitle>
                </CardHeader>
              </Card>

              {/* Options */}
              <div className="space-y-3">
                {question.options.map((option, idx) => {
                  const isSelected = selectedAnswer === idx;
                  const isCorrect = idx === question.correctAnswer;
                  const showCorrect = submitted && isCorrect;
                  const showWrong = submitted && isSelected && !isCorrect;

                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectAnswer(idx)}
                      disabled={submitted}
                      className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                        showCorrect
                          ? 'bg-success/20 border-success text-success'
                          : showWrong
                          ? 'bg-destructive/20 border-destructive text-destructive'
                          : isSelected && !submitted
                          ? 'bg-primary/20 border-primary text-primary'
                          : 'bg-background border-border hover:border-primary'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            showCorrect
                              ? 'border-success bg-success'
                              : showWrong
                              ? 'border-destructive bg-destructive'
                              : isSelected && !submitted
                              ? 'border-primary bg-primary'
                              : 'border-muted-foreground'
                          }`}
                        >
                          {showCorrect || (showWrong && isSelected) ? (
                            <span className="text-white text-sm">✓</span>
                          ) : (
                            <span className="text-sm">{String.fromCharCode(65 + idx)}</span>
                          )}
                        </div>
                        <span className="flex-1 font-medium">{option}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Explanation (after submit) */}
              {submitted && (
                <Card className="glass-card bg-primary/5">
                  <CardHeader>
                    <CardTitle className="text-sm">Explanation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{question.explanation}</p>
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                {!submitted ? (
                  <Button onClick={handleSubmitAnswer} className="flex-1" size="lg">
                    Submit Answer
                  </Button>
                ) : (
                  <Button onClick={handleNext} className="flex-1" size="lg" variant="neon">
                    {currentQuestion === questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIQuiz;
