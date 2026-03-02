import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStreakFreeze } from "@/hooks/useStreakFreeze";
import { Snowflake, Shield, AlertTriangle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const StreakFreezeCard = () => {
  const streakFreezeHook = useStreakFreeze();
  const {
    streakProtections,
    loading,
    fetchProtections,
    useStreakFreeze: activateStreakFreeze,
    checkYesterdayProgress,
  } = streakFreezeHook;

  const [showFreezeDialog, setShowFreezeDialog] = useState(false);
  const [yesterdayStatus, setYesterdayStatus] = useState<{
    missedDay: boolean;
    completedChallenges: number;
    totalChallenges: number;
  } | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    const init = async () => {
      setCheckingStatus(true);
      await fetchProtections();
      const status = await checkYesterdayProgress();
      setYesterdayStatus(status);
      setCheckingStatus(false);
    };
    init();
  }, [fetchProtections, checkYesterdayProgress]);

  const handleUseFreeze = async () => {
    const success = await activateStreakFreeze();
    if (success) {
      setShowFreezeDialog(false);
      setYesterdayStatus((prev) =>
        prev ? { ...prev, missedDay: false } : null,
      );
    }
  };

  if (checkingStatus) {
    return (
      <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/20">
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-cyan-500" />
        </CardContent>
      </Card>
    );
  }

  const showWarning = yesterdayStatus?.missedDay && streakProtections > 0;

  return (
    <>
      <Card
        className={`transition-all ${
          showWarning
            ? "bg-gradient-to-br from-amber-500/20 to-orange-500/10 border-amber-500/30"
            : "bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/20"
        }`}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Snowflake
                className={`h-5 w-5 ${showWarning ? "text-amber-500" : "text-cyan-500"}`}
              />
              Streak Freeze
            </CardTitle>
            <Badge
              variant="outline"
              className="bg-cyan-500/10 text-cyan-500 border-cyan-500/30"
            >
              <Shield className="h-3 w-3 mr-1" />
              {streakProtections} available
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <AnimatePresence mode="wait">
            {showWarning ? (
              <motion.div
                key="warning"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="space-y-3"
              >
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      You missed{" "}
                      {yesterdayStatus.totalChallenges -
                        yesterdayStatus.completedChallenges}{" "}
                      challenge
                      {yesterdayStatus.totalChallenges -
                        yesterdayStatus.completedChallenges >
                      1
                        ? "s"
                        : ""}{" "}
                      yesterday!
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Use a streak freeze to protect your daily challenge
                      streak.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowFreezeDialog(true)}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Snowflake className="h-4 w-4 mr-2" />
                  )}
                  Use Streak Freeze
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="info"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="text-center py-2"
              >
                <div className="flex justify-center gap-1 mb-2">
                  {Array.from({ length: Math.min(streakProtections, 5) }).map(
                    (_, i) => (
                      <motion.div
                        key={i}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className="p-2 rounded-full bg-cyan-500/20"
                      >
                        <Snowflake className="h-4 w-4 text-cyan-500" />
                      </motion.div>
                    ),
                  )}
                  {streakProtections > 5 && (
                    <div className="p-2 rounded-full bg-cyan-500/10 flex items-center justify-center">
                      <span className="text-xs text-cyan-500 font-medium">
                        +{streakProtections - 5}
                      </span>
                    </div>
                  )}
                  {streakProtections === 0 && (
                    <div className="p-2 rounded-full bg-muted/20">
                      <Snowflake className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {streakProtections > 0
                    ? "Streak freezes protect you when you miss a day"
                    : "Earn streak freezes by completing all daily challenges"}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      <Dialog open={showFreezeDialog} onOpenChange={setShowFreezeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Snowflake className="h-5 w-5 text-cyan-500" />
              Use Streak Freeze?
            </DialogTitle>
            <DialogDescription>
              This will use 1 of your {streakProtections} streak protection
              {streakProtections > 1 ? "s" : ""} to prevent losing your daily
              challenge streak from yesterday.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Challenges completed yesterday:
              </span>
              <span className="font-medium">
                {yesterdayStatus?.completedChallenges}/
                {yesterdayStatus?.totalChallenges}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Streak protections remaining:
              </span>
              <span className="font-medium text-cyan-500">
                {streakProtections - 1} after use
              </span>
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowFreezeDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUseFreeze}
              disabled={loading}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Snowflake className="h-4 w-4 mr-2" />
              )}
              Confirm Freeze
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
