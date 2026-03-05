import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { LMSSidebar } from "@/components/LMSSidebar";
import { NotificationBell } from "@/components/NotificationBell";
import { GlobalSearch } from "@/components/GlobalSearch";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { getRoleLabel, getRoleBadgeClass } from "@/hooks/usePermissions";

interface LMSLayoutProps {
  children: ReactNode;
}

export default function LMSLayout({ children }: LMSLayoutProps) {
  const { profile } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <LMSSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-50 glass-card border-b border-border/50 flex items-center px-4 py-2 gap-3">
            <SidebarTrigger />
            <GlobalSearch />
            <div className="flex-1" />
            {profile?.role && (
              <Badge variant="outline" className={getRoleBadgeClass(profile.role)}>
                {getRoleLabel(profile.role)}
              </Badge>
            )}
            <NotificationBell />
          </header>
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
