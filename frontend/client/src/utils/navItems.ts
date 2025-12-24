import { Home, MessageCircle, Shield, CheckCircle, Users, FileText, Heart, Pill, DollarSign, HelpCircle } from 'lucide-react';

export type Role = 'user' | 'doctor' | 'admin';

export interface NavItem {
  label: string;
  path: string;
  roles: Role[];
  icon: any;
}

const navItems: NavItem[] = [
  // User Dashboard
  { label: "Dashboard", path: "/dashboard", roles: ["user"], icon: Home },
  
  // Doctor Dashboard (only for approved doctors)
  { label: "Doctor Dashboard", path: "/doctor-dashboard", roles: ["doctor"], icon: Shield },
  
  // Admin Dashboard - ONLY FOR ADMINS
  { label: "Admin Dashboard", path: "/admin", roles: ["admin"], icon: Shield },
  { label: "Doctor Verification", path: "/admin/doctor-verification", roles: ["admin"], icon: CheckCircle },
  { label: "User Management", path: "/admin/user-management", roles: ["admin"], icon: Users },
  { label: "Reports", path: "/admin/reports", roles: ["admin"], icon: FileText },
  { label: "Payments", path: "/admin/payments", roles: ["admin"], icon: DollarSign },
  { label: "Support", path: "/admin/support", roles: ["admin"], icon: HelpCircle },
  { label: "Notifications", path: "/admin/notifications", roles: ["admin"], icon: MessageCircle },
  
  // Patient features - ONLY FOR USERS (not admins)
  { label: "Medical Profile", path: "/medical-profile", roles: ["user"], icon: Heart },
  { label: "Health Records", path: "/health-records", roles: ["user"], icon: Heart },
  { label: "Prescriptions", path: "/prescriptions", roles: ["user"], icon: Pill },
  { label: "Billing", path: "/billing", roles: ["user"], icon: DollarSign },
];

/**
 * Filter navigation items based on user roles
 * @param userRoles Array of roles the user has
 * @returns Filtered navigation items that the user should see
 */
export function getNavItemsForUser(userRoles: string[]): NavItem[] {
  return navItems.filter(item =>
    item.roles.some(role => userRoles.includes(role))
  );
}

export default navItems;
