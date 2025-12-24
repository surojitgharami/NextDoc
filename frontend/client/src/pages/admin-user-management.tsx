import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, Trash2, Eye, Shield, Ban, CheckCircle, 
  Mail, Calendar, MessageSquare, Pill, Activity,
  Clock, FileText
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface User {
  id: string;
  full_name: string;
  email: string;
  roles: string[];
  created_at: string;
  is_active: boolean;
  email_verified: boolean;
  subscription?: {
    plan: string;
    status: string;
    end_date?: string;
  };
}

interface UserDetails {
  user: User;
  stats: {
    conversation_count: number;
    message_count: number;
    medicine_count: number;
    last_activity?: string;
  };
  recent_audit_logs: AuditLog[];
}

interface AuditLog {
  id: string;
  actor_id?: string;
  actor_email?: string;
  actor_name?: string;
  action: string;
  target?: string;
  details?: Record<string, unknown>;
  created_at: string;
}

export default function AdminUserManagement() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activeTab, setActiveTab] = useState("users");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const response = await fetch("/api/auth/admin/users", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
        setError(null);
      } else {
        setError("Failed to load users");
      }
    } catch (err) {
      setError("Error loading users");
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const token = await getToken();
      const response = await fetch("/api/admin/audit-logs?limit=50", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAuditLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Failed to fetch audit logs");
    }
  };

  const fetchUserDetails = async (userId: string) => {
    setLoadingDetails(true);
    try {
      const token = await getToken();
      const response = await fetch(`/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedUser(data);
        setUserModalOpen(true);
      } else {
        toast({
          title: "Error",
          description: "Failed to load user details",
          variant: "destructive"
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Error loading user details",
        variant: "destructive"
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
    try {
      const token = await getToken();
      const response = await fetch(`/api/auth/admin/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        setUsers(users.filter(u => u.id !== userId));
        toast({
          title: "User Deleted",
          description: "The user has been permanently deleted"
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive"
      });
    }
  };

  const handleBlockUser = async (userId: string, block: boolean) => {
    try {
      const token = await getToken();
      const endpoint = block 
        ? `/api/auth/admin/users/${userId}/block`
        : `/api/auth/admin/users/${userId}/unblock`;
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        fetchUsers();
        toast({
          title: block ? "User Blocked" : "User Unblocked",
          description: block 
            ? "User has been blocked from the platform"
            : "User can now access the platform"
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive"
      });
    }
  };

  const handleToggleAdmin = async (userId: string, isAdmin: boolean) => {
    try {
      const token = await getToken();
      const method = isAdmin ? "DELETE" : "POST";
      const response = await fetch(`/api/auth/admin/users/${userId}/roles/admin`, {
        method,
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        fetchUsers();
        toast({
          title: "Role Updated",
          description: isAdmin ? "Admin role removed" : "Admin role granted"
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update role",
        variant: "destructive"
      });
    }
  };

  const filteredUsers = users.filter((u) =>
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (user: User) => {
    if (!user.is_active) {
      return <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Blocked</span>;
    }
    if (!user.email_verified) {
      return <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Unverified</span>;
    }
    return <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Active</span>;
  };

  const getPlanBadge = (subscription?: User['subscription']) => {
    const plan = subscription?.plan || 'free';
    const colors: Record<string, string> = {
      free: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
      monthly: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      annual: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${colors[plan] || colors.free}`}>
        {plan}
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionIcon = (action: string) => {
    const icons: Record<string, JSX.Element> = {
      user_blocked: <Ban className="w-4 h-4 text-red-500" />,
      user_unblocked: <CheckCircle className="w-4 h-4 text-green-500" />,
      user_deleted: <Trash2 className="w-4 h-4 text-red-500" />,
      role_added: <Shield className="w-4 h-4 text-blue-500" />,
      role_removed: <Shield className="w-4 h-4 text-orange-500" />,
      subscription_updated: <Activity className="w-4 h-4 text-purple-500" />
    };
    return icons[action] || <FileText className="w-4 h-4 text-gray-500" />;
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">User Management</h1>
            <p className="text-muted-foreground mt-2">
              Manage platform users, roles, and view activity logs
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-muted-foreground" />
            <span className="text-lg font-semibold">{users.length} Users</span>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); if (v === 'logs') fetchAuditLogs(); }}>
          <TabsList>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="logs">Audit Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-4 py-2 border rounded-lg bg-background"
              />
            </div>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading users...</div>
            ) : error ? (
              <div className="text-center py-8 text-red-600">{error}</div>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold">User</th>
                      <th className="text-left py-3 px-4 font-semibold">Role</th>
                      <th className="text-left py-3 px-4 font-semibold">Plan</th>
                      <th className="text-left py-3 px-4 font-semibold">Joined</th>
                      <th className="text-left py-3 px-4 font-semibold">Status</th>
                      <th className="text-left py-3 px-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="border-t hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium">{u.full_name || 'Unknown'}</div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {u.email}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            <span className="text-sm capitalize">
                              {u.roles?.includes("admin") ? "Admin" : "User"}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">{getPlanBadge(u.subscription)}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {u.created_at ? formatDate(u.created_at) : 'N/A'}
                        </td>
                        <td className="py-3 px-4">{getStatusBadge(u)}</td>
                        <td className="py-3 px-4">
                          <div className="flex gap-1">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              title="View details"
                              onClick={() => fetchUserDetails(u.id)}
                              disabled={loadingDetails}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              title={u.roles?.includes("admin") ? "Remove admin" : "Make admin"}
                              onClick={() => handleToggleAdmin(u.id, u.roles?.includes("admin") || false)}
                            >
                              <Shield className={`w-4 h-4 ${u.roles?.includes("admin") ? "text-purple-600" : ""}`} />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              title={u.is_active ? "Block user" : "Unblock user"}
                              onClick={() => handleBlockUser(u.id, u.is_active)}
                            >
                              {u.is_active ? <Ban className="w-4 h-4 text-orange-500" /> : <CheckCircle className="w-4 h-4 text-green-500" />}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleDeleteUser(u.id)}
                              title="Delete user"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-4">Recent Activity</h3>
              {auditLogs.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No audit logs found</p>
              ) : (
                <div className="space-y-3">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                      <div className="mt-1">{getActionIcon(log.action)}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{log.actor_name || log.actor_email || 'System'}</span>
                          <span className="text-sm text-muted-foreground">
                            {log.action.replace(/_/g, ' ')}
                          </span>
                        </div>
                        {log.target && (
                          <p className="text-sm text-muted-foreground">{log.target}</p>
                        )}
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {formatDateTime(log.created_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={userModalOpen} onOpenChange={setUserModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              User Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                  {selectedUser.user.full_name?.charAt(0) || 'U'}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold">{selectedUser.user.full_name}</h3>
                  <p className="text-muted-foreground">{selectedUser.user.email}</p>
                  <div className="flex gap-2 mt-2">
                    {getStatusBadge(selectedUser.user)}
                    {getPlanBadge(selectedUser.user.subscription)}
                    {selectedUser.user.roles?.includes("admin") && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                        Admin
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4 text-center">
                  <MessageSquare className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                  <div className="text-2xl font-bold">{selectedUser.stats.message_count}</div>
                  <div className="text-xs text-muted-foreground">Messages</div>
                </Card>
                <Card className="p-4 text-center">
                  <Activity className="w-6 h-6 mx-auto mb-2 text-green-500" />
                  <div className="text-2xl font-bold">{selectedUser.stats.conversation_count}</div>
                  <div className="text-xs text-muted-foreground">Conversations</div>
                </Card>
                <Card className="p-4 text-center">
                  <Pill className="w-6 h-6 mx-auto mb-2 text-purple-500" />
                  <div className="text-2xl font-bold">{selectedUser.stats.medicine_count}</div>
                  <div className="text-xs text-muted-foreground">Medicines</div>
                </Card>
                <Card className="p-4 text-center">
                  <Calendar className="w-6 h-6 mx-auto mb-2 text-orange-500" />
                  <div className="text-sm font-medium">
                    {selectedUser.stats.last_activity 
                      ? formatDate(selectedUser.stats.last_activity) 
                      : 'Never'
                    }
                  </div>
                  <div className="text-xs text-muted-foreground">Last Active</div>
                </Card>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Account Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Joined:</span>
                    <span className="ml-2">{formatDate(selectedUser.user.created_at)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email Verified:</span>
                    <span className="ml-2">{selectedUser.user.email_verified ? 'Yes' : 'No'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Subscription:</span>
                    <span className="ml-2 capitalize">{selectedUser.user.subscription?.plan || 'Free'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <span className="ml-2 capitalize">{selectedUser.user.subscription?.status || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {selectedUser.recent_audit_logs.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Recent Activity Logs</h4>
                  <div className="space-y-2">
                    {selectedUser.recent_audit_logs.slice(0, 5).map((log) => (
                      <div key={log.id} className="flex items-center gap-2 text-sm p-2 rounded bg-muted/30">
                        {getActionIcon(log.action)}
                        <span className="text-muted-foreground">
                          {log.action.replace(/_/g, ' ')}
                        </span>
                        <span className="ml-auto text-xs text-muted-foreground">
                          {formatDateTime(log.created_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
