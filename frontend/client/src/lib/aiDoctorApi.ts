import { useAuth, useUser } from "@/context/auth-context";

interface ConversationCreateRequest {
  userId: string;
  title: string;
  mode: string;
}

interface ConversationResponse {
  id: string;
  userId: string;
  title: string;
  mode: string;
  isBookmarked: string;
  isFavorite: string;
  isDeleted: string;
  createdAt: string;
  updatedAt: string;
}

interface ChatSendRequest {
  conversationId: string;
  userId: string;
  content: string;
  mode: string;
}

interface ChatMessageResponse {
  id: string;
  conversationId: string;
  userId: string;
  content: string;
  role: string;
  isThinking: string;
  thinkingContent?: string;
  timestamp: string;
}

interface ChatSendResponse {
  message: ChatMessageResponse;
  thinking?: string[];
}

export async function createConversation(
  userId: string,
  title: string,
  token: string
): Promise<ConversationResponse> {
  const response = await fetch(`/api/conversations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      userId,
      title,
      mode: "simple",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create conversation: ${response.status} - ${error}`);
  }

  return response.json();
}

// Profile endpoints
export async function getCompleteProfile(token: string): Promise<any> {
  const response = await fetch(`/api/auth/profile/complete`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get profile: ${response.status}`);
  }

  return response.json();
}

export async function updateUserProfile(userId: string, profileData: any, token: string): Promise<any> {
  const response = await fetch(`/api/profile/${userId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(profileData),
  });

  if (!response.ok) {
    throw new Error(`Failed to update profile: ${response.status}`);
  }

  return response.json();
}

export async function uploadProfilePhoto(userId: string, file: File, token: string): Promise<any> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`/api/profile/${userId}/photo`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Failed to upload photo: ${response.status}`);
  }

  return response.json();
}

// Admin endpoints
export async function getPendingDoctors(token: string): Promise<any> {
  const response = await fetch(`/api/auth/admin/pending-doctors`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get pending doctors: ${response.status}`);
  }

  return response.json();
}

export async function verifyDoctor(
  userId: number,
  action: "approve" | "reject",
  notes?: string,
  token?: string
): Promise<any> {
  const response = await fetch(`/api/auth/admin/verify-doctor`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({
      user_id: userId,
      action,
      notes: notes || null,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to verify doctor: ${response.status}`);
  }

  return response.json();
}

export async function getAllUsers(token: string, skip: number = 0, limit: number = 50): Promise<any> {
  const response = await fetch(`/api/auth/admin/users?skip=${skip}&limit=${limit}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get users: ${response.status}`);
  }

  return response.json();
}

export async function sendChatMessage(
  conversationId: string,
  userId: string,
  content: string,
  mode: string,
  token: string
): Promise<ChatSendResponse> {
  const response = await fetch(`/api/chat/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      conversationId,
      userId,
      content,
      mode,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Chat API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export async function getMessages(
  conversationId: string,
  token: string
): Promise<ChatMessageResponse[]> {
  const response = await fetch(
    `/api/messages?conversationId=${conversationId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch messages: ${response.status} - ${error}`);
  }

  return response.json();
}

export async function getConversations(
  userId: string,
  token: string
): Promise<ConversationResponse[]> {
  const response = await fetch(
    `/api/conversations?userId=${userId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch conversations: ${response.status} - ${error}`);
  }

  return response.json();
}

export function useAIDocktorChat() {
  const { user } = useUser();
  const { getToken } = useAuth();

  const sendMessage = async (
    conversationId: string,
    content: string
  ): Promise<ChatSendResponse> => {
    if (!user || !user.id) {
      throw new Error("User not authenticated");
    }

    const token = await getToken();
    if (!token) {
      throw new Error("Failed to get authentication token");
    }

    return sendChatMessage(conversationId, user.id.toString(), content, "simple", token);
  };

  const createNewConversation = async (title: string): Promise<ConversationResponse> => {
    if (!user || !user.id) {
      throw new Error("User not authenticated");
    }

    const token = await getToken();
    if (!token) {
      throw new Error("Failed to get authentication token");
    }

    return createConversation(user.id.toString(), title, token);
  };

  const fetchMessages = async (conversationId: string): Promise<ChatMessageResponse[]> => {
    if (!user || !user.id) {
      throw new Error("User not authenticated");
    }

    const token = await getToken();
    if (!token) {
      throw new Error("Failed to get authentication token");
    }

    return getMessages(conversationId, token);
  };

  const fetchConversations = async (): Promise<ConversationResponse[]> => {
    if (!user || !user.id) {
      throw new Error("User not authenticated");
    }

    const token = await getToken();
    if (!token) {
      throw new Error("Failed to get authentication token");
    }

    return getConversations(user.id.toString(), token);
  };

  return { sendMessage, createNewConversation, fetchMessages, fetchConversations };
}
