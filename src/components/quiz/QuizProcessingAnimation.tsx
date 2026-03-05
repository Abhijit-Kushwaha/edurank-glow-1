import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const subMessages = [
    "⚡ Checking answer accuracy...",
    "📊 Calculating your score...",
    "🧩 Finding your strongest topics...",
    "🚀 Detecting improvement areas...",
    "🎯 Preparing your personalized quiz report...",
];

const QuizProcessingAnimation = ({ onComplete }: { onComplete: () => void }) => {
    const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
    const [isFinishing, setIsFinishing] = useState(false);

    useEffect(() => {
        const messageInterval = setInterval(() => {
            setCurrentMessageIndex((prevIndex) => {
                if (prevIndex < subMessages.length - 1) {
                    return prevIndex + 1;
                }
                return prevIndex;
            });
        }, 2000);

        const totalDuration = (subMessages.length) * 2000;

        const finishTimeout = setTimeout(() => {
            clearInterval(messageInterval);
            setIsFinishing(true);
            setTimeout(() => {
                onComplete();
            }, 2000);
        }, totalDuration);


        return () => {
            clearInterval(messageInterval);
            clearTimeout(finishTimeout);
        };
    }, [onComplete]);

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white overflow-hidden p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="text-center"
            >
                <h1 className="text-4xl font-bold mb-4">🧠 Analyzing Your Brain Power...</h1>
                <p className="text-lg max-w-md mx-auto mb-8">
                    Hold up! BrainBuddy is analyzing your quiz performance. We're checking your answers, spotting your strengths, and finding areas where you can level up.
                </p>

                <div className="h-12 flex items-center justify-center">
                    <AnimatePresence>
                        {!isFinishing ? (
                            <motion.p
                                key={currentMessageIndex}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.5 }}
                                className="text-xl font-semibold"
                            >
                                {subMessages[currentMessageIndex]}
                            </motion.p>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                                className="text-center"
                            >
                                <p className="text-2xl font-bold text-green-400">
                                    Almost done! Your BrainBuddy report is ready.
                                </p>
                                <p className="text-xl">
                                    Get ready to see how your brain performed! 🔥
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};

export default QuizProcessingAnimation;
