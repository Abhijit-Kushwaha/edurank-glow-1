import { Users, Target, BookOpen, Zap } from "lucide-react";
import { motion } from "framer-motion";

const stats = [
  { label: "Active Students", value: "10K+", icon: Users, color: "from-primary to-primary/60" },
  { label: "Quizzes Taken", value: "500K+", icon: Target, color: "from-secondary to-secondary/60" },
  { label: "Topics Covered", value: "1000+", icon: BookOpen, color: "from-accent to-accent/60" },
  { label: "AI Responses", value: "2M+", icon: Zap, color: "from-success to-success/60" },
];

const StatsBar = () => (
  <section className="relative z-10 container mx-auto px-4 pb-20">
    <div className="max-w-4xl mx-auto">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            className="relative group rounded-2xl p-5 text-center overflow-hidden border border-border/50 bg-card/60 backdrop-blur-md"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            whileHover={{ y: -4, borderColor: "hsl(var(--primary) / 0.4)" }}
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-primary/5 to-transparent" />
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mx-auto mb-3`}>
              <stat.icon className="h-5 w-5 text-primary-foreground" />
            </div>
            <p className="text-2xl md:text-3xl font-bold font-display">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default StatsBar;
