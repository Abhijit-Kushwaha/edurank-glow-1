import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole, getRoleDashboardPath } from "@/hooks/usePermissions";
import { Loader2 } from "lucide-react";

interface RoleRouteProps {
  children: ReactNode;
  allowedRoles: UserRole[];
}

export default function RoleRoute({ children, allowedRoles }: RoleRouteProps) {
  const { user, profile, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  // Check if user status allows access
  if (profile.status === 'suspended') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-card rounded-2xl p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold mb-2">Account Suspended</h1>
          <p className="text-muted-foreground">Your account has been suspended. Contact your school administrator.</p>
        </div>
      </div>
    );
  }

  if (profile.status === 'removed') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-card rounded-2xl p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold mb-2">Account Removed</h1>
          <p className="text-muted-foreground">Your account has been removed from this organisation.</p>
        </div>
      </div>
    );
  }

  const userRole = profile.role as UserRole;

  if (!allowedRoles.includes(userRole)) {
    return <Navigate to={getRoleDashboardPath(userRole)} replace />;
  }

  return <>{children}</>;
}
