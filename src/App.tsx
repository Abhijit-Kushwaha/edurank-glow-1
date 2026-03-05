import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { FilterProvider } from "@/contexts/FilterContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleRoute from "@/components/RoleRoute";
import AppLayout from "@/components/layouts/AppLayout";
import LMSLayout from "@/components/layouts/LMSLayout";
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
import OrgSignup from "./pages/auth/OrgSignup";
import StudentSignup from "./pages/auth/StudentSignup";
import SuperAdminOverview from "./pages/lms/SuperAdminOverview";
import AdminOverview from "./pages/lms/AdminOverview";
import TeacherOverview from "./pages/lms/TeacherOverview";
import StudentOverview from "./pages/lms/StudentOverview";
import IndependentOverview from "./pages/lms/IndependentOverview";
import PlaceholderPage from "./pages/lms/PlaceholderPage";
import { getRoleDashboardPath } from "@/hooks/usePermissions";
import type { UserRole } from "@/hooks/usePermissions";

const queryClient = new QueryClient();

const ProtectedWithLayout = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <AppLayout>{children}</AppLayout>
  </ProtectedRoute>
);

const LMSRoute = ({ children, roles }: { children: React.ReactNode; roles: UserRole[] }) => (
  <RoleRoute allowedRoles={roles}>
    <LMSLayout>{children}</LMSLayout>
  </RoleRoute>
);

function DashboardRedirect() {
  const { profile, isLoading } = useAuth();
  if (isLoading) return null;
  if (!profile?.role) return <Navigate to="/auth" replace />;
  return <Navigate to={getRoleDashboardPath(profile.role as UserRole)} replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <FilterProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner position="top-center" toastOptions={{ classNames: { toast: "glass-card border-border", title: "text-foreground", description: "text-muted-foreground" } }} />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/signup/org" element={<OrgSignup />} />
              <Route path="/auth/signup/student" element={<StudentSignup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Role-based dashboard redirect */}
              <Route path="/dashboard" element={<ProtectedRoute><DashboardRedirect /></ProtectedRoute>} />

              {/* Super Admin routes */}
              <Route path="/super-admin/overview" element={<LMSRoute roles={['super_admin']}><SuperAdminOverview /></LMSRoute>} />
              <Route path="/super-admin/*" element={<LMSRoute roles={['super_admin']}><PlaceholderPage /></LMSRoute>} />

              {/* Admin routes */}
              <Route path="/admin/overview" element={<LMSRoute roles={['admin']}><AdminOverview /></LMSRoute>} />
              <Route path="/admin/*" element={<LMSRoute roles={['admin']}><PlaceholderPage /></LMSRoute>} />

              {/* Teacher routes */}
              <Route path="/teacher/overview" element={<LMSRoute roles={['teacher']}><TeacherOverview /></LMSRoute>} />
              <Route path="/teacher/*" element={<LMSRoute roles={['teacher']}><PlaceholderPage /></LMSRoute>} />

              {/* Student routes */}
              <Route path="/student/overview" element={<LMSRoute roles={['student']}><StudentOverview /></LMSRoute>} />
              <Route path="/student/*" element={<LMSRoute roles={['student']}><PlaceholderPage /></LMSRoute>} />

              {/* Independent Student routes */}
              <Route path="/independent/overview" element={<LMSRoute roles={['independent_student']}><IndependentOverview /></LMSRoute>} />
              <Route path="/independent/*" element={<LMSRoute roles={['independent_student']}><PlaceholderPage /></LMSRoute>} />

              {/* Legacy study app routes - accessible by independent students */}
              <Route path="/ai-chat" element={<ProtectedWithLayout><AIChat /></ProtectedWithLayout>} />
              <Route path="/ai-notes" element={<ProtectedWithLayout><AINotes /></ProtectedWithLayout>} />
              <Route path="/video/:todoId" element={<ProtectedWithLayout><VideoPlayer /></ProtectedWithLayout>} />
              <Route path="/notes/:todoId" element={<ProtectedWithLayout><Notes /></ProtectedWithLayout>} />
              <Route path="/quiz/:quizId" element={<ProtectedWithLayout><Quiz /></ProtectedWithLayout>} />
              <Route path="/profile" element={<ProtectedWithLayout><Profile /></ProtectedWithLayout>} />
              <Route path="/quiz-history" element={<ProtectedWithLayout><QuizHistory /></ProtectedWithLayout>} />
              <Route path="/leaderboard" element={<ProtectedWithLayout><Leaderboard /></ProtectedWithLayout>} />
              <Route path="/fix-weak-areas" element={<ProtectedWithLayout><FixWeakAreas /></ProtectedWithLayout>} />
              <Route path="/analysis" element={<ProtectedWithLayout><Analysis /></ProtectedWithLayout>} />
              <Route path="/friends" element={<ProtectedWithLayout><Friends /></ProtectedWithLayout>} />
              <Route path="/about" element={<About />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </FilterProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
