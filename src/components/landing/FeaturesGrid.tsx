import { useRef } from "react";
import { MessageCircle, BookOpen, Trophy, Swords, Layers, BarChart3, CalendarDays, Building2 } from "lucide-react";
import { motion, useInView } from "framer-motion";

const features = [
  { icon: MessageCircle, title: "AI Chat Tutor", description: "Ask any doubt and get instant, contextual explanations from your AI study buddy", gradient: "from-blue-500/20 to-cyan-500/20", iconBg: "from-blue-500 to-cyan-500" },
  { icon: BookOpen, title: "Smart Notes", description: "Generate comprehensive study notes from any topic in seconds — download as crisp PDFs", gradient: "from-violet-500/20 to-purple-500/20", iconBg: "from-violet-500 to-purple-500" },
  { icon: Trophy, title: "Adaptive Quizzes", description: "Take quizzes that adapt to your weak spots and track your improvement over time", gradient: "from-amber-500/20 to-orange-500/20", iconBg: "from-amber-500 to-orange-500" },
  { icon: Swords, title: "Battle Arena", description: "Challenge classmates to real-time quiz battles with power-ups, streaks & leaderboards", gradient: "from-rose-500/20 to-pink-500/20", iconBg: "from-rose-500 to-pink-500" },
  { icon: Layers, title: "Flashcards", description: "Spaced-repetition flashcards with AI generation — remember more, study less", gradient: "from-emerald-500/20 to-teal-500/20", iconBg: "from-emerald-500 to-teal-500" },
  { icon: BarChart3, title: "Performance Analysis", description: "Deep insights into your strengths, weaknesses, and study patterns with AI recommendations", gradient: "from-sky-500/20 to-indigo-500/20", iconBg: "from-sky-500 to-indigo-500" },
  { icon: CalendarDays, title: "Study Planner", description: "Plan revision sessions by subject, priority, and time — never miss a study goal", gradient: "from-yellow-500/20 to-amber-500/20", iconBg: "from-yellow-500 to-amber-500" },
  { icon: Building2, title: "Schools & Orgs", description: "Full LMS for schools — batch management, timetables, teacher quizzes, and analytics", gradient: "from-fuchsia-500/20 to-pink-500/20", iconBg: "from-fuchsia-500 to-pink-500" },
];

const FeatureCard = ({ feature, index }: { feature: typeof features[0]; index: number }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
      whileHover={{ scale: 1.03, y: -6 }}
      className="group relative rounded-2xl p-6 border border-border/50 bg-card/60 backdrop-blur-md overflow-hidden cursor-pointer transition-colors duration-300 hover:border-primary/30"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
      <div className="relative z-10">
        <motion.div
          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.iconBg} flex items-center justify-center mb-4 shadow-lg`}
          whileHover={{ rotate: [0, -8, 8, 0] }}
          transition={{ duration: 0.5 }}
        >
          <feature.icon className="h-6 w-6 text-white" />
        </motion.div>
        <h3 className="text-lg font-bold mb-2 font-display">{feature.title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
      </div>
    </motion.div>
  );
};

const FeaturesGrid = () => (
  <section className="relative z-10 container mx-auto px-4 py-20">
    <motion.div
      className="text-center mb-14"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      <h2 className="text-3xl md:text-4xl font-bold font-display mb-4">
        Everything You Need to <span className="neon-text">Ace Your Exams</span>
      </h2>
      <p className="text-muted-foreground max-w-xl mx-auto">Eight powerful tools working together to make learning faster, smarter, and more engaging.</p>
    </motion.div>
    <div className="max-w-5xl mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {features.map((feature, index) => (
        <FeatureCard key={index} feature={feature} index={index} />
      ))}
    </div>
  </section>
);

export default FeaturesGrid;
