import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  { name: "Priya S.", role: "Class 12 Student", text: "BrainBuddy's AI chat helped me understand organic chemistry in one evening. My scores jumped from 60% to 89%!", avatar: "PS" },
  { name: "Rahul M.", role: "JEE Aspirant", text: "The battle arena is addictive! Competing with friends made studying physics actually fun. Love the streak system.", avatar: "RM" },
  { name: "Ananya K.", role: "NEET Prep", text: "Smart notes saved me hours of writing. The AI generates exactly what I need for quick revision before exams.", avatar: "AK" },
];

const TestimonialsSection = () => (
  <section className="relative z-10 container mx-auto px-4 py-20">
    <motion.div
      className="text-center mb-14"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      <h2 className="text-3xl md:text-4xl font-bold font-display mb-4">
        Loved by <span className="neon-text">Students</span>
      </h2>
      <p className="text-muted-foreground">See what learners are saying about BrainBuddy</p>
    </motion.div>

    <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-5">
      {testimonials.map((t, i) => (
        <motion.div
          key={i}
          className="rounded-2xl p-6 border border-border/50 bg-card/60 backdrop-blur-md"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.15, duration: 0.5 }}
          whileHover={{ y: -4 }}
        >
          <div className="flex gap-1 mb-4">
            {Array.from({ length: 5 }).map((_, j) => (
              <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
            ))}
          </div>
          <p className="text-sm text-foreground/80 leading-relaxed mb-5">"{t.text}"</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-xs font-bold text-white">
              {t.avatar}
            </div>
            <div>
              <p className="text-sm font-semibold">{t.name}</p>
              <p className="text-xs text-muted-foreground">{t.role}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  </section>
);

export default TestimonialsSection;
