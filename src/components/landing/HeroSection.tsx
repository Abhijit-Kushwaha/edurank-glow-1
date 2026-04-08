import { useNavigate } from "react-router-dom";
import { ArrowRight, Brain, Zap, BookOpen, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.3 },
  },
};

const fadeUpItem = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative z-10 container mx-auto px-4 pt-16 pb-20 lg:pt-28 lg:pb-32">
      <motion.div
        className="max-w-5xl mx-auto text-center"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        {/* Badge */}
        <motion.div variants={fadeUpItem} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 border border-primary/20 mb-8 backdrop-blur-sm">
          <Zap className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground/90">
            Used by 10,000+ students across India
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1 variants={fadeUpItem} className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold mb-6 font-display leading-[1.05] tracking-tight">
          Your AI Study Partner{" "}
          <br className="hidden sm:block" />
          <span className="relative inline-block">
            <span className="neon-text">That Actually Works</span>
            <motion.span
              className="absolute -bottom-2 left-0 right-0 h-1 rounded-full bg-gradient-to-r from-primary via-secondary to-accent"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 1, duration: 0.8, ease: "easeOut" }}
            />
          </span>
        </motion.h1>

        {/* Pulsing Brain */}
        <motion.div variants={fadeUpItem} className="flex justify-center mb-6">
          <motion.div
            className="relative w-20 h-20 flex items-center justify-center"
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl" />
            <motion.div
              className="absolute inset-[-8px] rounded-full border border-primary/20"
              animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            />
            <Brain className="h-10 w-10 text-primary relative z-10" />
          </motion.div>
        </motion.div>

        {/* Description */}
        <motion.p variants={fadeUpItem} className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
          Generate smart notes from any topic, take adaptive quizzes, battle friends in real-time, 
          and track your weak areas — all powered by AI. Built for CBSE, ICSE, State Boards & competitive exams.
        </motion.p>

        {/* Feature pills */}
        <motion.div variants={fadeUpItem} className="flex flex-wrap justify-center gap-3 mb-10">
          {[
            { icon: BookOpen, label: "AI Notes & Flashcards" },
            { icon: Trophy, label: "Adaptive Quizzes" },
            { icon: Brain, label: "Weak Topic Detection" },
            { icon: Zap, label: "Real-time Battles" },
          ].map((pill) => (
            <div key={pill.label} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50 text-xs font-medium text-muted-foreground">
              <pill.icon className="h-3 w-3 text-primary" />
              {pill.label}
            </div>
          ))}
        </motion.div>

        {/* CTA Buttons */}
        <motion.div variants={fadeUpItem} className="flex flex-col sm:flex-row gap-4 justify-center">
          <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.97 }}>
            <Button variant="neon" size="lg" className="text-lg px-10 h-14 rounded-xl shadow-2xl shadow-primary/25" onClick={() => navigate("/auth")}>
              <span className="flex items-center gap-2">
                Start Studying Free
                <motion.div animate={{ x: [0, 5, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                  <ArrowRight className="h-5 w-5" />
                </motion.div>
              </span>
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.97 }}>
            <Button variant="outline" size="lg" className="text-lg px-10 h-14 rounded-xl" onClick={() => navigate("/about")}>
              See How It Works
            </Button>
          </motion.div>
        </motion.div>

        {/* Social proof */}
        <motion.p variants={fadeUpItem} className="text-xs text-muted-foreground mt-8">
          No credit card required · Works on any device · Schools & coaching centers welcome
        </motion.p>
      </motion.div>
    </section>
  );
};

export default HeroSection;
