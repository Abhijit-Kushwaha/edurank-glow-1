
import React from 'react';
import QuizProcessingAnimation from '../components/quiz/QuizProcessingAnimation';
import { useNavigate } from 'react-router-dom';

const QuizProcessingPage = () => {
    const navigate = useNavigate();

    const handleAnimationComplete = () => {
        console.log('Animation complete, redirecting to results...');
        // For now, let's navigate to the dashboard.
        // Replace with the actual results page route when it's ready.
        navigate('/dashboard');
    };

    return (
        <QuizProcessingAnimation onComplete={handleAnimationComplete} />
    );
};

export default QuizProcessingPage;
