import { useNavigate } from "react-router-dom";
import { Swords, Zap, Star, Trophy, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const BattlePromo = () => {
  const navigate = useNavigate();

  return (
    <section className="relative z-10 container mx-auto px-4 py-20">
      <motion.div
        className="max-w-4xl mx-auto rounded-3xl p-10 md:p-14 relative overflow-hidden border border-border/50 bg-card/60 backdrop-blur-md"
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        {/* Animated background accents */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-accent/8" />
        <motion.div
          className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px]"
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 5, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-0 left-0 w-48 h-48 bg-accent/10 rounded-full blur-[60px]"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 6, repeat: Infinity }}
        />

        <div className="relative z-10 text-center">
          {/* Floating icons */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 0 }}>
              <Trophy className="h-6 w-6 text-amber-400" />
            </motion.div>
            <motion.div
              className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-2xl shadow-primary/30"
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Swords className="h-8 w-8 text-white" />
            </motion.div>
            <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}>
              <Flame className="h-6 w-6 text-orange-400" />
            </motion.div>
          </div>

          <h2 className="text-3xl md:text-4xl font-bold font-display mb-4">
            <span className="neon-text">Battle Arena</span> — Prove Your Skills
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto text-lg leading-relaxed">
            Challenge your friends to real-time quiz battles. Earn brain points, unlock power-ups, and climb the global leaderboard!
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.97 }}>
              <Button variant="neon" size="lg" onClick={() => navigate("/auth")} className="px-8 h-13 rounded-xl text-base">
                <Star className="h-5 w-5 mr-2" />
                Enter the Arena
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default BattlePromo;
