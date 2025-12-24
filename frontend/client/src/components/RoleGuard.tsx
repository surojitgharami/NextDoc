import { useAuth } from "@/context/auth-context";
import { useLocation } from "wouter";
import { useEffect } from "react";

interface RoleGuardProps {
  requiredRole: string | string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleGuard({ requiredRole, children, fallback }: RoleGuardProps) {
  const { user, isLoaded } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      setLocation("/login");
      return;
    }

    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const hasRequiredRole = roles.some((role) => user.roles?.includes(role));

    if (!hasRequiredRole) {
      setLocation("/");
    }
  }, [user, isLoaded, requiredRole, setLocation]);

  if (!isLoaded) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!user) {
    return fallback || null;
  }

  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  const hasRequiredRole = roles.some((role) => user.roles?.includes(role));

  if (!hasRequiredRole) {
    return fallback || null;
  }

  return <>{children}</>;
}
