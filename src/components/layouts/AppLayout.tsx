import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import XpLevelBar from "@/components/header/XpLevelBar";
import StreakDisplay from "@/components/header/StreakDisplay";
import { useUserStats } from "@/hooks/useUserStats";
import { useState } from "react";
import StreakProtectionModal from "@/components/header/StreakProtectionModal";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { stats, useStreakProtection } = useUserStats();
  const [streakModalOpen, setStreakModalOpen] = useState(false);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar with trigger + stats */}
          <header className="sticky top-0 z-50 glass-card border-b border-border/50 flex items-center px-4 py-2 gap-3">
            <SidebarTrigger />
            <div className="flex-1" />
            {stats && (
              <>
                <XpLevelBar
                  level={stats.level}
                  totalXp={stats.totalXp}
                  xpProgress={stats.xpProgress}
                  xpToNextLevel={stats.xpToNextLevel}
                  xpMultiplier={stats.xpMultiplier}
                />
                <StreakDisplay
                  currentStreak={stats.currentStreak}
                  longestStreak={stats.longestStreak}
                  streakProtections={stats.streakProtections}
                  onStreakClick={() => setStreakModalOpen(true)}
                />
              </>
            )}
          </header>
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>

      {stats && (
        <StreakProtectionModal
          open={streakModalOpen}
          onOpenChange={setStreakModalOpen}
          currentStreak={stats.currentStreak}
          streakProtections={stats.streakProtections}
          onUseProtection={useStreakProtection}
        />
      )}
    </SidebarProvider>
  );
}
