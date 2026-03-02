import { Brain, Sparkles } from "lucide-react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

const Logo = ({ size = "md", showText = true }: LogoProps) => {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-16 w-16",
  };

  const textSizes = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-4xl",
  };

  return (
    <div className="flex items-center gap-3">
      <div
        className={`relative ${sizeClasses[size]} flex items-center justify-center`}
      >
        <div className="absolute inset-0 rounded-full gradient-bg opacity-20" />
        <Brain className="absolute h-3/5 w-3/5 text-primary" />
        <Sparkles className="absolute top-0 right-0 h-1/4 w-1/4 text-secondary animate-pulse" />
      </div>

      {showText && (
        <span className={`font-display font-bold ${textSizes[size]} neon-text`}>
          BrainBuddy
        </span>
      )}
    </div>
  );
};

export default Logo;
