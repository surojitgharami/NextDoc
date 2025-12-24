import { useEffect, useState } from "react";
import {
  Users,
  FileText,
  AlertCircle,
  DollarSign,
  CreditCard,
  MessageSquare,
  UserCheck,
  Flag,
  Bell,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { useAuth } from "@/context/auth-context";
import { useAdminStats } from "@/hooks/useAdminStats";

interface AdminStat {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down';
}

export default function AdminDashboard() {
  const { user, getToken } = useAuth();
  const [, setLocation] = useLocation();
  const adminStats = useAdminStats();
  const [systemHealth, setSystemHealth] = useState({ status: "healthy", uptime: "100%" });
  
  useEffect(() => {
    const fetchSystemHealth = async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const response = await fetch('/api/admin/system-health', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setSystemHealth({ status: data.status, uptime: `${data.uptime_percentage}%` });
        }
      } catch (err) {
        console.error('Failed to fetch system health:', err);
      }
    };
    fetchSystemHealth();
  }, [getToken]);

  if (!user?.roles?.includes("admin")) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Unauthorized Access</h1>
          <p className="text-muted-foreground mt-2">You do not have admin privileges</p>
        </div>
      </div>
    );
  }

  const quickStats: AdminStat[] = [
    { label: "Total Users", value: adminStats.totalUsers, change: "+12%", trend: "up" },
    { label: "Active Subscriptions", value: adminStats.activeSubscriptions, change: "+5%", trend: "up" },
    { label: "Verified Users", value: adminStats.verifiedUsers, change: "+8%", trend: "up" },
    { label: "Total Conversations", value: adminStats.totalConversations, change: "+15%", trend: "up" },
  ];

  const adminFeatures = [
    {
      icon: Users,
      title: "User Management",
      description: "Manage users and their profiles",
      path: "/admin/user-management",
      color: "from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-900",
      count: adminStats.totalUsers,
    },
    {
      icon: CreditCard,
      title: "Subscription Management",
      description: "Manage user subscriptions and plans",
      path: "/admin/payments",
      color: "from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-900",
      count: adminStats.activeSubscriptions,
    },
    {
      icon: MessageSquare,
      title: "AI Conversations",
      description: "Monitor AI chat activity and usage",
      path: "/admin/reports",
      color: "from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-900",
      count: adminStats.totalConversations,
    },
    {
      icon: UserCheck,
      title: "Verified Users",
      description: "View email-verified user accounts",
      path: "/admin/user-management",
      color: "from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-900",
      count: adminStats.verifiedUsers,
    },
    {
      icon: FileText,
      title: "System Reports",
      description: "View detailed system analytics",
      path: "/admin/reports",
      color: "from-indigo-50 to-blue-50 dark:from-indigo-950 dark:to-blue-900",
    },
    {
      icon: DollarSign,
      title: "Pricing & Payments",
      description: "Configure fees and manage transactions",
      path: "/admin/payments",
      color: "from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-900",
    },
    {
      icon: AlertCircle,
      title: "Support Dashboard",
      description: "Track support tickets and issues",
      path: "/admin/support",
      color: "from-rose-50 to-pink-50 dark:from-rose-950 dark:to-pink-900",
    },
    {
      icon: Bell,
      title: "Notifications",
      description: "Broadcast announcements to users",
      path: "/admin/notifications",
      color: "from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-900",
    },
    {
      icon: Flag,
      title: "Message Reports",
      description: "Review reported AI messages",
      path: "/admin/message-reports",
      color: "from-red-50 to-rose-50 dark:from-red-950 dark:to-rose-900",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 pb-24">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage platform, users, and system operations</p>
        </div>

        {adminStats.loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-4 animate-pulse"><div className="h-20 bg-muted rounded"></div></Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickStats.map((stat) => (
              <Card key={stat.label} className="p-4 hover:shadow-md transition-shadow">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{stat.label}</p>
                <div className="flex items-end justify-between">
                  <p className="text-2xl font-bold">{stat.value}</p>
                  {stat.change && (
                    <div className={`text-xs font-semibold ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                      {stat.trend === 'up' ? '↑' : '↓'} {stat.change}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Admin Features</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {adminFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={feature.title}
                  className={`p-5 cursor-pointer hover:shadow-lg transition-all bg-gradient-to-br ${feature.color} group`}
                  onClick={() => setLocation(feature.path)}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Icon className="w-8 h-8 text-primary group-hover:scale-110 transition-transform" />
                      {feature.count !== undefined && (
                        <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded-full">{feature.count}</span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">{feature.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{feature.description}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        <Card className={`p-6 bg-gradient-to-r ${systemHealth.status === 'healthy' ? 'from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-900 border-green-200 dark:border-green-800' : 'from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-900 border-amber-200 dark:border-amber-800'}`}>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">System Health</h3>
              <p className="text-sm text-muted-foreground">{systemHealth.status === 'healthy' ? 'All systems operational' : 'Some systems degraded'}. Database: {adminStats.loading ? 'checking...' : 'connected'}</p>
            </div>
            <div className="text-right">
              <div className={`text-3xl font-bold ${systemHealth.status === 'healthy' ? 'text-green-600' : 'text-amber-600'}`}>{systemHealth.uptime}</div>
              <p className="text-xs text-muted-foreground">Uptime</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
