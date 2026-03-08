import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Brain,
  BookOpen,
  Play,
  Trophy,
  User,
  Users,
  TrendingUp,
  Settings,
  LogOut,
  Sparkles,
  FileText,
  Swords,
  MessageSquare,
  Layers,
  Timer,
  Building2,
} from "lucide-react";
import Logo from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const mainNavItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "BrainBuddy AI", url: "/ai-chat", icon: Brain },
  { title: "AI Notes", url: "/ai-notes", icon: FileText },
  { title: "Flashcards", url: "/flashcards", icon: Layers },
  { title: "Pomodoro Timer", url: "/pomodoro", icon: Timer },
  { title: "Video Search", url: "/dashboard", icon: Play },
  { title: "Analysis", url: "/analysis", icon: TrendingUp },
];

const socialItems = [
  { title: "Organization", url: "/org", icon: Building2 },
  { title: "Battle Arena", url: "/battle-arena", icon: Swords },
  { title: "Friends", url: "/friends", icon: Users },
  { title: "Leaderboard", url: "/leaderboard", icon: Trophy },
  {
    title: "Feedback",
    url: "https://forms.office.com/r/3X7KS8fJFY",
    icon: MessageSquare,
  },
];

const accountItems = [
  { title: "Profile", url: "/profile", icon: User },
  { title: "Achievements", url: "/achievements", icon: Trophy },
  { title: "Quiz History", url: "/quiz-history", icon: BookOpen },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, logout } = useAuth();
  const { state, setOpenMobile, isMobile } = useSidebar();
  const collapsed = state === "collapsed";

  const isActive = (path: string) => location.pathname === path;

  const handleNav = (url: string) => {
    if (url.startsWith("http")) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      navigate(url);
    }
    if (isMobile) setOpenMobile(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/auth");
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary shrink-0" />
          {!collapsed && <span className="font-bold text-lg">BrainBuddy</span>}
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    onClick={() => handleNav(item.url)}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Social</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {socialItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    onClick={() => handleNav(item.url)}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {accountItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    onClick={() => handleNav(item.url)}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Logout" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {!collapsed && profile && (
          <div className="flex items-center gap-2 px-2 py-2">
            <Avatar className="h-7 w-7">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-xs">
                {(profile.name || "U")[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate">
              {profile.name || "Student"}
            </span>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
