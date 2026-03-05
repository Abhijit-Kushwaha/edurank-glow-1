import { useAuth } from "@/contexts/AuthContext";

export type UserRole = 'super_admin' | 'admin' | 'teacher' | 'student' | 'independent_student';

export type Action =
  | 'invite_admin' | 'remove_admin'
  | 'invite_teacher' | 'remove_teacher' | 'suspend_teacher'
  | 'invite_student' | 'remove_student' | 'suspend_student'
  | 'create_classroom' | 'archive_classroom' | 'delete_classroom'
  | 'publish_content' | 'delete_content' | 'approve_content'
  | 'override_score' | 'lock_gradebook'
  | 'view_org_analytics' | 'view_audit_logs'
  | 'change_org_policies' | 'disable_ai_org' | 'disable_ai_student'
  | 'create_department'
  | 'bulk_remove_users';

const PERMISSIONS: Record<Action, UserRole[]> = {
  invite_admin:         ['super_admin'],
  remove_admin:         ['super_admin'],
  invite_teacher:       ['super_admin', 'admin'],
  remove_teacher:       ['super_admin', 'admin'],
  suspend_teacher:      ['super_admin', 'admin'],
  invite_student:       ['super_admin', 'admin', 'teacher'],
  remove_student:       ['super_admin', 'admin', 'teacher'],
  suspend_student:      ['super_admin', 'admin'],
  create_classroom:     ['super_admin', 'admin', 'teacher'],
  archive_classroom:    ['super_admin', 'admin', 'teacher'],
  delete_classroom:     ['super_admin', 'admin'],
  publish_content:      ['super_admin', 'admin', 'teacher'],
  delete_content:       ['super_admin', 'admin', 'teacher'],
  approve_content:      ['super_admin', 'admin'],
  override_score:       ['super_admin', 'teacher'],
  lock_gradebook:       ['super_admin', 'teacher'],
  view_org_analytics:   ['super_admin', 'admin'],
  view_audit_logs:      ['super_admin'],
  change_org_policies:  ['super_admin'],
  disable_ai_org:       ['super_admin'],
  disable_ai_student:   ['super_admin', 'admin', 'teacher'],
  create_department:    ['super_admin'],
  bulk_remove_users:    ['super_admin', 'admin'],
};

export function usePermission(action: Action): boolean {
  const { profile } = useAuth();
  if (!profile?.role) return false;
  return PERMISSIONS[action]?.includes(profile.role as UserRole) ?? false;
}

export function useRole(): UserRole | null {
  const { profile } = useAuth();
  return (profile?.role as UserRole) ?? null;
}

export function getRoleDashboardPath(role: UserRole | null): string {
  switch (role) {
    case 'super_admin': return '/super-admin/overview';
    case 'admin': return '/admin/overview';
    case 'teacher': return '/teacher/overview';
    case 'student': return '/student/overview';
    case 'independent_student': return '/independent/overview';
    default: return '/dashboard';
  }
}

export function getRoleLabel(role: string): string {
  switch (role) {
    case 'super_admin': return 'Super Admin';
    case 'admin': return 'Admin';
    case 'teacher': return 'Teacher';
    case 'student': return 'Student';
    case 'independent_student': return 'Independent Student';
    default: return 'User';
  }
}

export function getRoleBadgeClass(role: string): string {
  switch (role) {
    case 'super_admin': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'admin': return 'bg-destructive/20 text-destructive border-destructive/30';
    case 'teacher': return 'bg-secondary/20 text-secondary border-secondary/30';
    case 'student': return 'bg-success/20 text-success border-success/30';
    case 'independent_student': return 'bg-muted text-muted-foreground border-border';
    default: return 'bg-muted text-muted-foreground border-border';
  }
}

export function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'active': return 'bg-success/20 text-success border-success/30';
    case 'suspended': return 'bg-destructive/20 text-destructive border-destructive/30';
    case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'invited': return 'bg-primary/20 text-primary border-primary/30';
    case 'restricted': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    default: return 'bg-muted text-muted-foreground border-border';
  }
}
