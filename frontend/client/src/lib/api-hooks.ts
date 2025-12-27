import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "./queryClient";

// ============================================
// CHAT ENDPOINTS
// ============================================

export function useConversations(userId: string | undefined) {
  return useQuery({
    queryKey: ['/api/conversations', userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/conversations`);
      return res.json();
    }
  });
}

export function useCreateConversation() {
  return useMutation({
    mutationFn: async (data: { title: string; userId: string }) => {
      const res = await apiRequest("POST", "/api/conversations", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    }
  });
}

export function useMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: ['/api/messages', conversationId],
    enabled: !!conversationId,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/messages/${conversationId}`);
      return res.json();
    }
  });
}

export function useSendMessage() {
  return useMutation({
    mutationFn: async (data: { 
      conversationId: string; 
      userId: string; 
      content: string; 
      mode?: 'simple' | 'symptom_checker' 
    }) => {
      const res = await apiRequest("POST", "/api/v1/chat/message", data);
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages', variables.conversationId] });
    }
  });
}

// ============================================
// MEDICINE ENDPOINTS
// ============================================

export function useMedicines(userId: string | undefined) {
  return useQuery({
    queryKey: ['/medicines', userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/medicines?userId=${userId}`);
      return res.json();
    }
  });
}

export function useCreateMedicine() {
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/medicines", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/medicines'] });
    }
  });
}

export function useUpdateMedicine() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PUT", `/api/medicines/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/medicines'] });
    }
  });
}

export function useDeleteMedicine() {
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/medicines/${id}`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/medicines'] });
    }
  });
}

// ============================================
// REMINDER ENDPOINTS
// ============================================

export function useReminders(userId: string | undefined) {
  return useQuery({
    queryKey: ['/api/reminders', userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/reminders?userId=${userId}`);
      return res.json();
    }
  });
}

export function useCreateReminder() {
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/reminders", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reminders'] });
    }
  });
}

// ============================================
// USER PROFILE ENDPOINTS
// ============================================

export function useUserProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['/api/profile', userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/profile/${userId}`);
      return res.json();
    }
  });
}

export function useUpdateProfile() {
  return useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: any }) => {
      const res = await apiRequest("PUT", `/api/profile/${userId}`, data);
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/profile', variables.userId] });
    }
  });
}

// ============================================
// FILE UPLOAD ENDPOINTS
// ============================================

export function useUploadFile() {
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await apiRequest("POST", "/api/upload", formData as any);
      return res.json();
    }
  });
}

// ============================================
// APPOINTMENT ENDPOINTS
// ============================================

export function useAppointments(userId: string | undefined) {
  return useQuery({
    queryKey: ['/api/appointments', userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/appointments?userId=${userId}`);
      return res.json();
    }
  });
}

export function useCreateAppointment() {
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/appointments", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
    }
  });
}

// ============================================
// SYMPTOM CHECKER ENDPOINTS
// ============================================

export function useSymptomChecker() {
  return useMutation({
    mutationFn: async (data: { userId: string; symptoms: string[] }) => {
      const res = await apiRequest("POST", "/api/symptom-checker", data);
      return res.json();
    }
  });
}

// ============================================
// ENHANCED CHAT SESSION ENDPOINTS
// ============================================

export interface ChatSession {
  session_id: string;
  user_id: string;
  session_name?: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  preview?: string;
  summary?: string;
  is_active: boolean;
  is_pinned: boolean;
}

export interface ChatHistoryMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  thinking?: string;
}

export function useChatSessions(includeInactive: boolean = false) {
  return useQuery({
    queryKey: ['/api/v1/chat/history', includeInactive],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/v1/chat/history?include_inactive=${includeInactive}`);
      const data = await res.json();
      return data as { sessions: ChatSession[]; total_sessions: number };
    },
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 30000,
  });
}

export function useChatSessionHistory(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['/api/v1/chat/history', sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/v1/chat/history/${sessionId}`);
      const data = await res.json();
      return data as {
        session_id: string;
        messages: ChatHistoryMessage[];
        total_messages: number;
        session_name?: string;
        summary?: string;
      };
    }
  });
}

export function useStartChatSession() {
  return useMutation({
    mutationFn: async (data?: { session_name?: string }) => {
      const res = await apiRequest("POST", "/api/v1/chat/start-session", data || {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/chat/history'] });
    }
  });
}

export function useResumeChatSession() {
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await apiRequest("POST", `/api/v1/chat/resume-session/${sessionId}`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/chat/history'] });
    }
  });
}

export function useRenameChatSession() {
  return useMutation({
    mutationFn: async ({ sessionId, sessionName }: { sessionId: string; sessionName: string }) => {
      const res = await apiRequest("PATCH", `/api/v1/chat/session/${sessionId}/rename`, { session_name: sessionName });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/chat/history'] });
    }
  });
}

export function usePinChatSession() {
  return useMutation({
    mutationFn: async ({ sessionId, pinned }: { sessionId: string; pinned: boolean }) => {
      const res = await apiRequest("PATCH", `/api/v1/chat/session/${sessionId}/pin`, { pinned });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/chat/history'] });
    }
  });
}

export function useDeleteChatSession() {
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await apiRequest("DELETE", `/api/v1/chat/session/${sessionId}`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/chat/history'] });
    }
  });
}

export function useForceSummarizeSession() {
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await apiRequest("POST", `/api/v1/chat/session/${sessionId}/summarize`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/chat/history'] });
    }
  });
}

// ============================================
// MESSAGE REPORT ENDPOINTS
// ============================================

export interface MessageReport {
  id: string;
  reporter_id: string;
  message_id: string;
  session_id: string;
  message_text: string;
  reason: string;
  comment?: string;
  status: string;
  created_at: string;
  reviewed_at?: string;
  admin_action?: Record<string, any>;
}

export function useCreateMessageReport() {
  return useMutation({
    mutationFn: async (data: {
      message_id: string;
      session_id: string;
      reason: "incorrect_info" | "offensive" | "privacy" | "other";
      comment?: string;
    }) => {
      const res = await apiRequest("POST", "/api/message-reports", data);
      return res.json();
    }
  });
}

export function useMyMessageReports() {
  return useQuery({
    queryKey: ['/api/message-reports/mine'],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/message-reports/mine");
      return res.json() as Promise<MessageReport[]>;
    }
  });
}

// ============================================
// ADMIN MESSAGE REPORT ENDPOINTS
// ============================================

export function useAdminMessageReports(status?: string, reason?: string) {
  return useQuery({
    queryKey: ['/api/admin/message-reports', status, reason],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (reason) params.append('reason', reason);
      const res = await apiRequest("GET", `/api/admin/message-reports?${params.toString()}`);
      return res.json();
    }
  });
}

export function useAdminMessageReportDetail(reportId: string | undefined) {
  return useQuery({
    queryKey: ['/api/admin/message-reports', reportId],
    enabled: !!reportId,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/admin/message-reports/${reportId}`);
      return res.json();
    }
  });
}

export function useAdminReviewReport() {
  return useMutation({
    mutationFn: async ({ reportId, data }: { 
      reportId: string; 
      data: {
        status: "reviewed" | "dismissed" | "actioned";
        admin_action?: Record<string, any>;
        notify_user?: boolean;
        notification_text?: string;
      }
    }) => {
      const res = await apiRequest("POST", `/api/admin/message-reports/${reportId}/review`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/message-reports'] });
    }
  });
}

export function useAdminReportsStats() {
  return useQuery({
    queryKey: ['/api/admin/message-reports/stats/summary'],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/message-reports/stats/summary");
      return res.json();
    }
  });
}

// ============================================
// ADMIN NOTIFICATION ENDPOINTS
// ============================================

export function useAdminSendNotification() {
  return useMutation({
    mutationFn: async (data: {
      user_ids?: string[];
      title: string;
      body: string;
      via: ("email" | "push")[];
    }) => {
      const res = await apiRequest("POST", "/api/admin/notifications/send", data);
      return res.json();
    }
  });
}

export function useAdminNotificationHistory() {
  return useQuery({
    queryKey: ['/api/admin/notifications/history'],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/notifications/history");
      return res.json();
    }
  });
}

// ============================================
// ADMIN REPORTS ENDPOINTS (Real Data)
// ============================================

export interface ReportCard {
  id: string;
  title: string;
  description: string;
  metric_key: string;
  icon: string;
  value?: string;
}

export interface ActivityItem {
  label: string;
  value: string;
  trend?: string;
}

export interface SystemSummary {
  total_users: number;
  active_subscriptions: number;
  chat_sessions_30d: number;
  total_messages: number;
  verified_users: number;
  medicine_reminders: number;
}

export function useAdminReportsSummary() {
  return useQuery({
    queryKey: ['/api/admin/reports/summary'],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/reports/summary");
      return res.json() as Promise<SystemSummary>;
    }
  });
}

export function useAdminReportCards() {
  return useQuery({
    queryKey: ['/api/admin/reports/cards'],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/reports/cards");
      return res.json() as Promise<ReportCard[]>;
    }
  });
}

export function useAdminSystemActivity() {
  return useQuery({
    queryKey: ['/api/admin/reports/activity'],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/reports/activity");
      return res.json() as Promise<{ items: ActivityItem[] }>;
    }
  });
}

export function useDownloadReport() {
  return useMutation({
    mutationFn: async (reportId: string) => {
      const res = await apiRequest("GET", `/api/admin/reports/download/${reportId}`);
      return res.json();
    }
  });
}
