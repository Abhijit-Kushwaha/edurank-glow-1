import { cn } from "@/lib/utils";

interface OnlineIndicatorProps {
  isOnline: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * A small colored dot overlay to indicate online/offline status.
 * Place inside a relative container (e.g. Avatar wrapper).
 */
const OnlineIndicator = ({
  isOnline,
  size = "sm",
  className,
}: OnlineIndicatorProps) => {
  const sizeClasses = {
    sm: "h-2.5 w-2.5",
    md: "h-3 w-3",
    lg: "h-3.5 w-3.5",
  };

  return (
    <span
      className={cn(
        "absolute bottom-0 right-0 rounded-full border-2 border-background",
        sizeClasses[size],
        isOnline ? "bg-success" : "bg-muted-foreground/40",
        className,
      )}
      aria-label={isOnline ? "Online" : "Offline"}
    />
  );
};

export default OnlineIndicator;
