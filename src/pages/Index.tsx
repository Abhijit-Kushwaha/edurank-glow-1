import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  MessageCircle,
  BookOpen,
  Trophy,
  ArrowRight,
  Swords,
  Video,
  Users,
  Brain,
  Zap,
  Target,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useRef, useState } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";

// Particle component for background
const FloatingParticles = () => {
  const particles = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    duration: Math.random() * 20 + 15,
    delay: Math.random() * 10,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-primary/20"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, Math.random() * 20 - 10, 0],
            opacity: [0.2, 0.6, 0.2],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

// Neural network lines animation
const NeuralLines = () => (
  <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-10" viewBox="0 0 1000 600">
    {Array.from({ length: 12 }, (_, i) => {
      const x1 = Math.random() * 1000;
      const y1 = Math.random() * 600;
      const x2 = Math.random() * 1000;
      const y2 = Math.random() * 600;
      return (
        <motion.line
          key={i}
          x1={x1} y1={y1} x2={x2} y2={y2}
          stroke="hsl(var(--primary))"
          strokeWidth="0.5"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: [0, 0.5, 0] }}
          transition={{ duration: 8 + Math.random() * 5, repeat: Infinity, delay: i * 0.8 }}
        />
      );
    })}
    {Array.from({ length: 8 }, (_, i) => (
      <motion.circle
        key={`node-${i}`}
        cx={100 + i * 120}
        cy={200 + Math.sin(i) * 100}
        r="3"
        fill="hsl(var(--primary))"
        animate={{ opacity: [0.3, 0.8, 0.3], scale: [1, 1.5, 1] }}
        transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
      />
    ))}
  </svg>
);

// Stagger container
const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 },
  },
};

const fadeUpItem = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const FeatureCard = ({ icon: Icon, title, description, index }: { icon: any; title: string; description: string; index: number }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ scale: 1.05, y: -5 }}
      className="glass-card rounded-2xl p-6 group cursor-pointer relative overflow-hidden border border-transparent hover:border-primary/30 transition-all duration-500"
    >
      {/* Glow effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl" />
      <div className="relative z-10">
        <motion.div
          className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center mb-4 mx-auto"
          whileHover={{ rotate: [0, -10, 10, 0] }}
          transition={{ duration: 0.5 }}
        >
          <Icon className="h-6 w-6 text-primary-foreground" />
        </motion.div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </motion.div>
  );
};

const Index = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll();
  const bgY = useTransform(scrollYProgress, [0, 1], [0, -100]);

  useEffect(() => {
    if (!isLoading && user) {
      navigate("/dashboard");
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          className="h-10 w-10 border-3 border-primary border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  const features = [
    { icon: MessageCircle, title: "AI Chat", description: "Instant problem solving with your AI study buddy" },
    { icon: BookOpen, title: "Smart Notes", description: "AI-generated comprehensive study notes in seconds" },
    { icon: Trophy, title: "Interactive Quizzes", description: "Test your knowledge and track your progress" },
    { icon: Swords, title: "Battle Arena", description: "Challenge friends in real-time quiz battles" },
    { icon: Video, title: "Video Learning", description: "AI-curated video lessons for every topic" },
    { icon: Users, title: "Friends & Study Groups", description: "Learn together, compete, and grow" },
  ];

  const stats = [
    { label: "Active Students", value: "10K+", icon: Users },
    { label: "Quizzes Taken", value: "500K+", icon: Target },
    { label: "Topics Covered", value: "1000+", icon: BookOpen },
    { label: "AI Responses", value: "2M+", icon: Zap },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated background */}
      <motion.div className="absolute inset-0" style={{ y: bgY }}>
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-primary/8 rounded-full blur-[100px]"
            animate={{ scale: [1, 1.2, 1], x: [0, 30, 0], y: [0, -20, 0] }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-accent/8 rounded-full blur-[100px]"
            animate={{ scale: [1.2, 1, 1.2], x: [0, -20, 0], y: [0, 30, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-secondary/5 rounded-full blur-[120px]"
            animate={{ scale: [1, 1.1, 1], rotate: [0, 180, 360] }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          />
        </div>
        <FloatingParticles />
        <NeuralLines />
      </motion.div>

      {/* Header */}
      <motion.header
        className="relative z-10 container mx-auto px-4 py-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center justify-between">
          <Logo size="md" />
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button variant="outline" onClick={() => navigate("/auth")} className="relative overflow-hidden group">
              <span className="relative z-10">Sign In</span>
              <div className="absolute inset-0 bg-primary/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </Button>
          </motion.div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <main className="relative z-10 container mx-auto px-4 py-16 lg:py-24" ref={heroRef}>
        <motion.div
          className="max-w-4xl mx-auto text-center"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          {/* Badge */}
          <motion.div
            variants={fadeUpItem}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8"
          >
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="h-4 w-4 text-primary" />
            </motion.div>
            <span className="text-sm font-medium">
              Your AI Friend for Learning & Problem Solving
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={fadeUpItem}
            className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 font-display"
          >
            Solve Any Problem with{" "}
            <motion.span
              className="neon-text inline-block"
              animate={{ textShadow: ["0 0 10px hsl(var(--primary) / 0.5)", "0 0 30px hsl(var(--primary) / 0.8)", "0 0 10px hsl(var(--primary) / 0.5)"] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              BrainBuddy
            </motion.span>
          </motion.h1>

          {/* Description */}
          <motion.p
            variants={fadeUpItem}
            className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto"
          >
            Chat, learn, and grow with your AI study partner. Get personalized
            video recommendations, smart notes, and interactive quizzes.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            variants={fadeUpItem}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="neon"
                size="lg"
                className="text-lg relative overflow-hidden group"
                onClick={() => navigate("/auth")}
              >
                <span className="relative z-10 flex items-center">
                  Start Learning Free
                  <motion.div
                    className="ml-2"
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <ArrowRight className="h-5 w-5" />
                  </motion.div>
                </span>
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="outline"
                size="lg"
                className="text-lg"
                onClick={() => navigate("/about")}
              >
                Learn More
              </Button>
            </motion.div>
          </motion.div>

          {/* Pulsing Brain Icon */}
          <motion.div
            className="flex justify-center mb-12"
            variants={fadeUpItem}
          >
            <motion.div
              className="relative w-24 h-24 flex items-center justify-center"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl" />
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-primary/30"
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <Brain className="h-12 w-12 text-primary relative z-10" />
            </motion.div>
          </motion.div>

          {/* Stats bar */}
          <motion.div
            variants={fadeUpItem}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16"
          >
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                className="glass-card rounded-xl p-4 text-center"
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                whileHover={{ y: -3 }}
              >
                <stat.icon className="h-5 w-5 text-primary mx-auto mb-2" />
                <p className="text-xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mt-16">
            {features.map((feature, index) => (
              <FeatureCard key={index} {...feature} index={index} />
            ))}
          </div>

          {/* Battle Arena Promo */}
          <motion.div
            className="mt-20 glass-card rounded-2xl p-8 relative overflow-hidden"
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5" />
            <div className="relative z-10">
              <motion.div
                className="flex items-center justify-center gap-3 mb-4"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Swords className="h-8 w-8 text-primary" />
                <h2 className="text-2xl md:text-3xl font-bold">Battle Arena</h2>
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Zap className="h-6 w-6 text-yellow-500" />
                </motion.div>
              </motion.div>
              <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
                Challenge your friends to real-time quiz battles. Earn brain points,
                climb the leaderboard, and prove you're the smartest!
              </p>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="neon"
                  size="lg"
                  onClick={() => navigate("/auth")}
                  className="relative"
                >
                  <motion.span
                    className="absolute inset-0 bg-primary/20 rounded-md"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  <span className="relative z-10 flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Enter the Arena
                  </span>
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </main>

      {/* Footer */}
      <motion.footer
        className="relative z-10 container mx-auto px-4 py-8 text-center text-muted-foreground text-sm"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        <p className="mb-2">© 2025 BrainBuddy. All rights reserved.</p>
        <button
          onClick={() => navigate("/about")}
          className="text-primary hover:underline"
        >
          About Us
        </button>
      </motion.footer>
    </div>
  );
};

export default Index;