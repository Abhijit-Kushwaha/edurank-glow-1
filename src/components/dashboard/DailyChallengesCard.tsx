import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useDailyChallenges, getDifficultyColor, getChallengeIcon, UserDailyChallenge } from '@/hooks/useDailyChallenges';
import { 
  Loader2, 
  Zap, 
  Clock, 
  Trophy, 
  Star, 
  Target, 
  FileQuestion, 
  HelpCircle,
  Flame,
  Gift
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

const iconMap: Record<string, React.ReactNode> = {
  FileQuestion: <FileQuestion className="h-4 w-4" />,
  HelpCircle: <HelpCircle className="h-4 w-4" />,
  Star: <Star className="h-4 w-4" />,
  Zap: <Zap className="h-4 w-4" />,
  Target: <Target className="h-4 w-4" />,
  Trophy: <Trophy className="h-4 w-4" />,
};

export const DailyChallengesCard = () => {
  const { challenges, loading, completedCount, totalCount, totalXpEarned, getTimeRemaining } = useDailyChallenges();
  const [timeRemaining, setTimeRemaining] = useState(getTimeRemaining());
  const [previousCompleted, setPreviousCompleted] = useState(0);

  // Update time remaining every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(getTimeRemaining());
    }, 60000);
    return () => clearInterval(interval);
  }, [getTimeRemaining]);

  // Celebrate when a challenge is completed
  useEffect(() => {
    if (completedCount > previousCompleted && previousCompleted > 0) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    }
    setPreviousCompleted(completedCount);
  }, [completedCount, previousCompleted]);

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-orange-500/10 to-yellow-500/10 border-orange-500/20">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
        </CardContent>
      </Card>
    );
  }

  if (challenges.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-orange-500/10 to-yellow-500/10 border-orange-500/20">
        <CardContent className="py-6 text-center">
          <Flame className="h-8 w-8 text-orange-500 mx-auto mb-2" />
          <p className="text-foreground font-medium">Daily Challenges</p>
          <p className="text-sm text-muted-foreground">Complete quizzes to start your challenges!</p>
        </CardContent>
      </Card>
    );
  }

  const allCompleted = completedCount === totalCount;

  return (
    <Card className={`overflow-hidden transition-all ${
      allCompleted 
        ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/10 border-green-500/30' 
        : 'bg-gradient-to-br from-orange-500/10 to-yellow-500/10 border-orange-500/20'
    }`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Flame className={`h-5 w-5 ${allCompleted ? 'text-green-500' : 'text-orange-500'}`} />
            Daily Challenges
          </CardTitle>
          <div className="flex items-center gap-2">
            {totalXpEarned > 0 && (
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                <Gift className="h-3 w-3 mr-1" />
                +{totalXpEarned} XP
              </Badge>
            )}
            <Badge variant="outline" className="text-muted-foreground">
              <Clock className="h-3 w-3 mr-1" />
              {timeRemaining.hours}h {timeRemaining.minutes}m
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Overall Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">{completedCount} of {totalCount} completed</span>
            <span className="text-foreground font-medium">{Math.round((completedCount / totalCount) * 100)}%</span>
          </div>
          <Progress 
            value={(completedCount / totalCount) * 100} 
            className={`h-2 ${allCompleted ? '[&>div]:bg-green-500' : ''}`}
          />
        </div>

        {/* Challenge List */}
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {challenges.map((challenge) => (
              <ChallengeItem key={challenge.id} challenge={challenge} />
            ))}
          </AnimatePresence>
        </div>

        {/* Completion Message */}
        {allCompleted && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-2"
          >
            <p className="text-sm font-medium text-green-500">🎉 All challenges completed!</p>
            <p className="text-xs text-muted-foreground">Come back tomorrow for new challenges</p>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
};

interface ChallengeItemProps {
  challenge: UserDailyChallenge;
}

const ChallengeItem = ({ challenge }: ChallengeItemProps) => {
  const info = challenge.challenge;
  if (!info) return null;

  const progress = Math.min((challenge.current_value / challenge.target_value) * 100, 100);
  const iconName = getChallengeIcon(info.challenge_type);
  const icon = iconMap[iconName] || <Trophy className="h-4 w-4" />;
  const difficultyClasses = getDifficultyColor(info.difficulty);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`p-3 rounded-lg border transition-all ${
        challenge.is_completed
          ? 'bg-green-500/10 border-green-500/30'
          : 'bg-background/50 border-border/50'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${
          challenge.is_completed ? 'bg-green-500/20 text-green-500' : 'bg-primary/10 text-primary'
        }`}>
          {challenge.is_completed ? <Trophy className="h-4 w-4" /> : icon}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className={`font-medium text-sm ${challenge.is_completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
              {info.title}
            </p>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${difficultyClasses}`}>
              {info.difficulty}
            </Badge>
          </div>
          
          <p className="text-xs text-muted-foreground mb-2">{info.description}</p>
          
          <div className="flex items-center gap-2">
            <Progress 
              value={progress} 
              className={`h-1.5 flex-1 ${challenge.is_completed ? '[&>div]:bg-green-500' : ''}`}
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {challenge.current_value}/{challenge.target_value}
            </span>
          </div>
        </div>

        <div className="text-right">
          {challenge.is_completed ? (
            <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
              +{challenge.xp_earned} XP
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">
              +{info.base_xp_reward} XP
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};
