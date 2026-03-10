import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight, Brain } from "lucide-react";
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
    <section className="relative z-10 container mx-auto px-4 pt-20 pb-24 lg:pt-32 lg:pb-36">
      <motion.div
        className="max-w-5xl mx-auto text-center"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        {/* Badge */}
        <motion.div variants={fadeUpItem} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 border border-primary/20 mb-10 backdrop-blur-sm">
          <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }}>
            <Sparkles className="h-4 w-4 text-primary" />
          </motion.div>
          <span className="text-sm font-medium text-foreground/90">Powered by AI — Your Smartest Study Partner</span>
        </motion.div>

        {/* Headline */}
        <motion.h1 variants={fadeUpItem} className="text-5xl md:text-7xl lg:text-8xl font-bold mb-8 font-display leading-[1.05] tracking-tight">
          Learn Smarter with{" "}
          <span className="relative inline-block">
            <span className="neon-text">BrainBuddy</span>
            <motion.span
              className="absolute -bottom-2 left-0 right-0 h-1 rounded-full bg-gradient-to-r from-primary via-secondary to-accent"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 1, duration: 0.8, ease: "easeOut" }}
            />
          </span>
        </motion.h1>

        {/* Pulsing Brain */}
        <motion.div variants={fadeUpItem} className="flex justify-center mb-8">
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
            <motion.div
              className="absolute inset-[-16px] rounded-full border border-secondary/15"
              animate={{ scale: [1, 1.6, 1], opacity: [0.3, 0, 0.3] }}
              transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
            />
            <Brain className="h-10 w-10 text-primary relative z-10" />
          </motion.div>
        </motion.div>

        {/* Description */}
        <motion.p variants={fadeUpItem} className="text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
          AI-powered chat, personalized quizzes, smart notes, real-time battles, and video lessons — all in one place.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div variants={fadeUpItem} className="flex flex-col sm:flex-row gap-4 justify-center">
          <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.97 }}>
            <Button variant="neon" size="lg" className="text-lg px-10 h-14 rounded-xl shadow-2xl shadow-primary/25" onClick={() => navigate("/auth")}>
              <span className="flex items-center gap-2">
                Get Started Free
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
      </motion.div>
    </section>
  );
};

export default HeroSection;
