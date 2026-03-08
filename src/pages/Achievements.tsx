import { Trophy } from "lucide-react";
import AchievementsPanel from "@/components/achievements/AchievementsPanel";

const Achievements = () => {
  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary/10">
          <Trophy className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Achievements</h1>
          <p className="text-sm text-muted-foreground">
            Track your progress and unlock rewards
          </p>
        </div>
      </div>
      <AchievementsPanel />
    </div>
  );
};

export default Achievements;
