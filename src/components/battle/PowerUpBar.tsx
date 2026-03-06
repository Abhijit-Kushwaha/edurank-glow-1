import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Timer, Eye, Zap } from "lucide-react";
import { motion } from "framer-motion";

interface PowerUpBarProps {
  powerUps: Record<string, number>;
  onUsePowerUp: (type: string) => void;
  disabled?: boolean;
}

const powerUpConfig = [
  { key: "time_freeze", icon: Timer, label: "Time Freeze", description: "Pause timer for 2 seconds", color: "text-blue-400" },
  { key: "hint_vision", icon: Eye, label: "Hint Vision", description: "Remove 2 wrong answers", color: "text-green-400" },
  { key: "double_points", icon: Zap, label: "Double Points", description: "Next answer gives 2x points", color: "text-yellow-400" },
];

export default function PowerUpBar({ powerUps, onUsePowerUp, disabled }: PowerUpBarProps) {
  return (
    <div className="flex gap-2 justify-center">
      {powerUpConfig.map((pu) => {
        const count = powerUps[pu.key] || 0;
        return (
          <Tooltip key={pu.key}>
            <TooltipTrigger asChild>
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onUsePowerUp(pu.key)}
                  disabled={disabled || count <= 0}
                  className={`relative gap-1 ${count > 0 ? pu.color : "text-muted-foreground"}`}
                >
                  <pu.icon className="h-4 w-4" />
                  {count > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center font-bold">
                      {count}
                    </span>
                  )}
                </Button>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-semibold">{pu.label}</p>
              <p className="text-xs text-muted-foreground">{pu.description}</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
