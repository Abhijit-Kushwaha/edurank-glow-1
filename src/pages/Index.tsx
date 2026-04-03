import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import AnimatedBackground from "@/components/landing/AnimatedBackground";
import HeroSection from "@/components/landing/HeroSection";
import StatsBar from "@/components/landing/StatsBar";
import FeaturesGrid from "@/components/landing/FeaturesGrid";
import BattlePromo from "@/components/landing/BattlePromo";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import CTASection from "@/components/landing/CTASection";

const Index = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const { scrollYProgress } = useScroll();
  const bgY = useTransform(scrollYProgress, [0, 1], [0, -100]);

  useEffect(() => {
    if (!isLoading && user) {
      navigate("/dashboard");
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          className="h-10 w-10 border-3 border-primary border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      <AnimatedBackground bgY={bgY} />

      {/* Header */}
      <motion.header
        className="relative z-20 container mx-auto px-4 py-5"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center justify-between">
          <Logo size="md" />
          <div className="flex items-center gap-3">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button variant="ghost" onClick={() => navigate("/about")} className="hidden sm:inline-flex">
                About
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button variant="outline" onClick={() => navigate("/auth")} className="rounded-xl">
                Sign In
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.header>

      <HeroSection />
      <StatsBar />
      <FeaturesGrid />
      <BattlePromo />
      <TestimonialsSection />
      <CTASection />

      {/* Footer */}
      <motion.footer
        className="relative z-10 container mx-auto px-4 py-10 text-center border-t border-border/30"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo size="sm" />
          <p className="text-sm text-muted-foreground">© 2026 BrainBuddy. All rights reserved.</p>
          <button onClick={() => navigate("/about")} className="text-sm text-primary hover:underline">
            About Us
          </button>
        </div>
      </motion.footer>
    </div>
  );
};

export default Index;
