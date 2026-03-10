import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const CTASection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative z-10 container mx-auto px-4 py-20">
      <motion.div
        className="max-w-3xl mx-auto text-center rounded-3xl p-12 md:p-16 relative overflow-hidden"
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-secondary/10 to-accent/15 rounded-3xl" />
        <div className="absolute inset-[1px] bg-background/80 backdrop-blur-xl rounded-3xl" />
        
        <div className="relative z-10">
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6"
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">100% Free to Get Started</span>
          </motion.div>
          
          <h2 className="text-3xl md:text-5xl font-bold font-display mb-6">
            Ready to <span className="neon-text">Transform</span> Your Learning?
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-lg mx-auto">
            Join thousands of students already using BrainBuddy to study smarter, not harder.
          </p>
          
          <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.97 }}>
            <Button variant="neon" size="lg" className="text-lg px-12 h-14 rounded-xl shadow-2xl shadow-primary/25" onClick={() => navigate("/auth")}>
              Start Learning Now
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
};

export default CTASection;
