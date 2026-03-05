
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, BarChart, FileText, Sparkles } from 'lucide-react';

const stages = [
  {
    text: "Analyzing your answers...",
    icon: <BrainCircuit className="h-12 w-12 text-purple-400" />,
  },
  {
    text: "Calculating your score...",
    icon: <BarChart className="h-12 w-12 text-blue-400" />,
  },
  {
    text: "Generating your performance insights...",
    icon: <FileText className="h-12 w-12 text-purple-400" />,
  },
  {
    text: "Your results are ready!",
    icon: <Sparkles className="h-12 w-12 text-blue-400" />,
  },
];

const QuizProcessingAnimation = ({ onComplete }: { onComplete: () => void }) => {
  const [currentStage, setCurrentStage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStage((prev) => {
        if (prev < stages.length - 1) {
          return prev + 1;
        }
        clearInterval(interval);
        setTimeout(onComplete, 1000);
        return prev;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white overflow-hidden">
      <div className="relative w-full max-w-md h-64 flex items-center justify-center">
        <AnimatePresence>
          <motion.div
            key={currentStage}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <div className="flex justify-center mb-4">
              {stages[currentStage].icon}
            </div>
            <p className="text-xl font-semibold">{stages[currentStage].text}</p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default QuizProcessingAnimation;
