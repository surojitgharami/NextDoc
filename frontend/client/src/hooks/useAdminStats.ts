import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';

interface AdminStats {
  totalUsers: number;
  activeSubscriptions: number;
  verifiedUsers: number;
  totalConversations: number;
  totalMessages: number;
  loading: boolean;
  error: string | null;
}

export function useAdminStats() {
  const { getToken } = useAuth();
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeSubscriptions: 0,
    verifiedUsers: 0,
    totalConversations: 0,
    totalMessages: 0,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error('No auth token');

        const response = await fetch('/api/admin/stats', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error('Failed to fetch stats');

        const data = await response.json();
        setStats({
          totalUsers: data.total_users || 0,
          activeSubscriptions: data.active_subscriptions || 0,
          verifiedUsers: data.verified_users || 0,
          totalConversations: data.total_conversations || 0,
          totalMessages: data.total_messages || 0,
          loading: false,
          error: null,
        });
      } catch (err) {
        setStats((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        }));
      }
    };

    fetchStats();
  }, [getToken]);

  return stats;
}
