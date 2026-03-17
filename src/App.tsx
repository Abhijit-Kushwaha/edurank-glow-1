import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { FilterProvider } from "@/contexts/FilterContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/layouts/AppLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import VideoPlayer from "./pages/VideoPlayer";
import Notes from "./pages/Notes";
import Quiz from "./pages/Quiz";
import Profile from "./pages/Profile";
import QuizHistory from "./pages/QuizHistory";
import Leaderboard from "./pages/Leaderboard";
import About from "./pages/About";
import NotFound from "./pages/NotFound";
import FixWeakAreas from "./pages/FixWeakAreas";
import Analysis from "./pages/Analysis";
import Friends from "./pages/Friends";
import AIChat from "./pages/AIChat";
import AINotes from "./pages/AINotes";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import QuizProcessingPage from "./pages/QuizProcessing";
import BattleArena from "./pages/BattleArena";
import BattleLobby from "./pages/BattleLobby";
import Flashcards from "./pages/Flashcards";
import PomodoroTimer from "./pages/PomodoroTimer";
import Achievements from "./pages/Achievements";
import OrgWorkspace from "./pages/OrgWorkspace";
import OrgBattleArena from "./pages/OrgBattleArena";
import TakeOrgQuiz from "./pages/TakeOrgQuiz";
import { Analytics } from "@vercel/analytics/react";

const queryClient = new QueryClient();

const ProtectedWithLayout = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <AppLayout>{children}</AppLayout>
  </ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <FilterProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner
            position="top-center"
            toastOptions={{
              classNames: {
                toast: "glass-card border-border",
                title: "text-foreground",
                description: "text-muted-foreground",
              },
            }}
          />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedWithLayout>
                    <Dashboard />
                  </ProtectedWithLayout>
                }
              />
              <Route
                path="/ai-chat"
                element={
                  <ProtectedWithLayout>
                    <AIChat />
                  </ProtectedWithLayout>
                }
              />
              <Route
                path="/ai-notes"
                element={
                  <ProtectedWithLayout>
                    <AINotes />
                  </ProtectedWithLayout>
                }
              />
              <Route
                path="/video/:todoId"
                element={
                  <ProtectedWithLayout>
                    <VideoPlayer />
                  </ProtectedWithLayout>
                }
              />
              <Route
                path="/notes/:todoId"
                element={
                  <ProtectedWithLayout>
                    <Notes />
                  </ProtectedWithLayout>
                }
              />
              <Route
                path="/quiz/processing"
                element={
                  <ProtectedWithLayout>
                    <QuizProcessingPage />
                  </ProtectedWithLayout>
                }
              />
              <Route
                path="/quiz/:quizId"
                element={
                  <ProtectedWithLayout>
                    <Quiz />
                  </ProtectedWithLayout>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedWithLayout>
                    <Profile />
                  </ProtectedWithLayout>
                }
              />
              <Route
                path="/quiz-history"
                element={
                  <ProtectedWithLayout>
                    <QuizHistory />
                  </ProtectedWithLayout>
                }
              />
              <Route
                path="/leaderboard"
                element={
                  <ProtectedWithLayout>
                    <Leaderboard />
                  </ProtectedWithLayout>
                }
              />
              <Route
                path="/fix-weak-areas"
                element={
                  <ProtectedWithLayout>
                    <FixWeakAreas />
                  </ProtectedWithLayout>
                }
              />
              <Route
                path="/analysis"
                element={
                  <ProtectedWithLayout>
                    <Analysis />
                  </ProtectedWithLayout>
                }
              />
              <Route
                path="/friends"
                element={
                  <ProtectedWithLayout>
                    <Friends />
                  </ProtectedWithLayout>
                }
              />
              <Route
                path="/battle-arena"
                element={
                  <ProtectedWithLayout>
                    <BattleArena />
                  </ProtectedWithLayout>
                }
              />
              <Route
                path="/battle/:battleId"
                element={
                  <ProtectedWithLayout>
                    <BattleLobby />
                  </ProtectedWithLayout>
                }
              />
              <Route
                path="/flashcards"
                element={
                  <ProtectedWithLayout>
                    <Flashcards />
                  </ProtectedWithLayout>
                }
              />
              <Route
                path="/pomodoro"
                element={
                  <ProtectedWithLayout>
                    <PomodoroTimer />
                  </ProtectedWithLayout>
                }
              />
              <Route
                path="/achievements"
                element={
                  <ProtectedWithLayout>
                    <Achievements />
                  </ProtectedWithLayout>
                }
              />
              <Route
                path="/org"
                element={
                  <ProtectedWithLayout>
                    <OrgWorkspace />
                  </ProtectedWithLayout>
                }
              />
              <Route
                path="/org-battle-arena"
                element={
                  <ProtectedWithLayout>
                    <OrgBattleArena />
                  </ProtectedWithLayout>
                }
              />
              <Route
                path="/org/quiz/:quizId"
                element={
                  <ProtectedWithLayout>
                    <TakeOrgQuiz />
                  </ProtectedWithLayout>
                }
              />
              <Route path="/about" element={<About />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          <Analytics />
        </TooltipProvider>
      </FilterProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
