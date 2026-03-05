import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, GraduationCap, School, BookOpen,
  BarChart3, Shield, ScrollText, CreditCard, Building2,
  MessageSquare, AlertTriangle, Brain, User, TrendingUp,
  FolderOpen, ClipboardList, Sparkles, LogOut, Settings,
  Bell,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRole, type UserRole } from "@/hooks/usePermissions";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarFooter, SidebarMenu,
  SidebarMenuItem, SidebarMenuButton, SidebarSeparator, useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
}

function getNavItems(role: UserRole | null): { label: string; items: NavItem[] }[] {
  switch (role) {
    case 'super_admin':
      return [
        {
          label: 'Management',
          items: [
            { title: 'Overview', url: '/super-admin/overview', icon: LayoutDashboard },
            { title: 'Admins', url: '/super-admin/admins', icon: Shield },
            { title: 'Teachers', url: '/super-admin/teachers', icon: GraduationCap },
            { title: 'Students', url: '/super-admin/students', icon: Users },
            { title: 'Classrooms', url: '/super-admin/classrooms', icon: School },
            { title: 'Departments', url: '/super-admin/departments', icon: Building2 },
          ],
        },
        {
          label: 'Content & Analytics',
          items: [
            { title: 'Content Library', url: '/super-admin/content-library', icon: BookOpen },
            { title: 'Analytics', url: '/super-admin/analytics', icon: BarChart3 },
            { title: 'Audit Logs', url: '/super-admin/audit-logs', icon: ScrollText },
          ],
        },
        {
          label: 'Settings',
          items: [
            { title: 'Policies', url: '/super-admin/policies', icon: Settings },
            { title: 'Billing', url: '/super-admin/billing', icon: CreditCard },
          ],
        },
      ];

    case 'admin':
      return [
        {
          label: 'Management',
          items: [
            { title: 'Overview', url: '/admin/overview', icon: LayoutDashboard },
            { title: 'Teachers', url: '/admin/teachers', icon: GraduationCap },
            { title: 'Students', url: '/admin/students', icon: Users },
            { title: 'Classrooms', url: '/admin/classrooms', icon: School },
          ],
        },
        {
          label: 'Content & Analytics',
          items: [
            { title: 'Content Library', url: '/admin/content-library', icon: BookOpen },
            { title: 'Analytics', url: '/admin/analytics', icon: BarChart3 },
            { title: 'Announcements', url: '/admin/announcements', icon: Bell },
            { title: 'Warnings', url: '/admin/warnings', icon: AlertTriangle },
          ],
        },
      ];

    case 'teacher':
      return [
        {
          label: 'Teaching',
          items: [
            { title: 'Overview', url: '/teacher/overview', icon: LayoutDashboard },
            { title: 'My Classrooms', url: '/teacher/classrooms', icon: School },
            { title: 'Content Library', url: '/teacher/content-library', icon: BookOpen },
          ],
        },
      ];

    case 'student':
      return [
        {
          label: 'Learning',
          items: [
            { title: 'Overview', url: '/student/overview', icon: LayoutDashboard },
            { title: 'My Classrooms', url: '/student/classrooms', icon: School },
            { title: 'AI Tutor', url: '/student/ai-tutor', icon: Brain },
            { title: 'Progress', url: '/student/progress', icon: TrendingUp },
          ],
        },
        {
          label: 'Account',
          items: [
            { title: 'Profile', url: '/student/profile', icon: User },
          ],
        },
      ];

    case 'independent_student':
      return [
        {
          label: 'My Workspace',
          items: [
            { title: 'Overview', url: '/independent/overview', icon: LayoutDashboard },
            { title: 'Notes', url: '/independent/notes', icon: FolderOpen },
            { title: 'Quizzes', url: '/independent/quizzes', icon: ClipboardList },
            { title: 'Tasks', url: '/independent/tasks', icon: ClipboardList },
            { title: 'AI Tutor', url: '/independent/ai-tutor', icon: Brain },
          ],
        },
        {
          label: 'Account',
          items: [
            { title: 'Profile', url: '/independent/profile', icon: User },
            { title: 'Progress', url: '/independent/progress', icon: TrendingUp },
          ],
        },
      ];

    default:
      return [];
  }
}

export function LMSSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, logout } = useAuth();
  const { state, setOpenMobile, isMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const role = useRole();

  const navGroups = getNavItems(role);
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const handleNav = (url: string) => {
    navigate(url);
    if (isMobile) setOpenMobile(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/auth");
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <Sparkles className="h-6 w-6 text-primary shrink-0" />
          {!collapsed && <span className="font-bold text-lg">BrainBuddy</span>}
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
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
        ))}

        {/* Legacy study app link for independent students */}
        {role === 'independent_student' && (
          <SidebarGroup>
            <SidebarGroupLabel>Study Tools</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Dashboard (Legacy)" onClick={() => handleNav('/dashboard')}>
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Study Dashboard</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
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
                {(profile.name || profile.full_name || "U")[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate">
              {profile.name || profile.full_name || "User"}
            </span>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
