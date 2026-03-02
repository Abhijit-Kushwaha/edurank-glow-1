import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  MessageCircle,
  BookOpen,
  Trophy,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

const Index = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      navigate("/dashboard");
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-secondary/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <Logo size="md" />
          <Button variant="outline" onClick={() => navigate("/auth")}>
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 container mx-auto px-4 py-16 lg:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8 animate-fade-in">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">
              Your AI Friend for Learning & Problem Solving
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 animate-slide-up font-display">
            Solve Any Problem with <span className="neon-text">BrainBuddy</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto animate-slide-up">
            Chat, learn, and grow with your AI study partner. Get personalized
            video recommendations, smart notes, and interactive quizzes.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-slide-up">
            <Button
              variant="neon"
              size="lg"
              className="text-lg"
              onClick={() => navigate("/auth")}
            >
              Start Learning Free
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="text-lg"
              onClick={() => navigate("/about")}
            >
              Learn More
            </Button>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mt-16">
            {[
              {
                icon: MessageCircle,
                title: "AI Chat",
                description: "Instant problem solving with your AI study buddy",
              },
              {
                icon: BookOpen,
                title: "Smart Notes",
                description:
                  "AI-generated comprehensive study notes from videos",
              },
              {
                icon: Trophy,
                title: "Interactive Quizzes",
                description: "Test your knowledge and track your progress",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="glass-card rounded-2xl p-6 hover:neon-glow transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center mb-4 mx-auto">
                  <feature.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 container mx-auto px-4 py-8 text-center text-muted-foreground text-sm">
        <p className="mb-2">© 2025 BrainBuddy. All rights reserved.</p>
        <button
          onClick={() => navigate("/about")}
          className="text-primary hover:underline"
        >
          About Us
        </button>
      </footer>
    </div>
  );
};

export default Index;
