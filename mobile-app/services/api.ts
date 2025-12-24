// API Configuration
export const API_BASE_URL = 'http://192.168.31.40:8000'; // Your backend server IP

// Get auth token from Redux store
let getAuthToken: (() => string | null) | null = null;

export function setAuthTokenGetter(getter: () => string | null) {
  getAuthToken = getter;
}

// API Request Helper
export async function apiRequest(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  endpoint: string,
  body?: any,
  options?: RequestInit
): Promise<Response> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add custom headers from options
  if (options?.headers) {
    Object.assign(headers, options.headers);
  }

  // Add authentication token if available
  if (getAuthToken) {
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const config: RequestInit = {
    method,
    headers,
    ...options,
  };

  if (body && method !== 'GET') {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, config);
    return response;
  } catch (error) {
    console.error(`API Request Error [${method} ${endpoint}]:`, error);
    throw error;
  }
}

// Chat API
export const chatAPI = {
  sendMessage: async (message: string, sessionId?: string | null, userId?: string) => {
    const response = await apiRequest('POST', '/api/v1/chat/message', {
      message,
      session_id: sessionId || null,
      user_id: userId || '',
    });
    
    if (!response.ok) {
      throw new Error(`Chat API error: ${response.status}`);
    }
    
    return response.json();
  },

  getHistory: async (sessionId: string) => {
    const response = await apiRequest('GET', `/api/v1/chat/history/${sessionId}`);
    
    if (!response.ok) {
      throw new Error(`History API error: ${response.status}`);
    }
    
    return response.json();
  },

  getSessions: async () => {
    const response = await apiRequest('GET', '/api/v1/chat/sessions');
    
    if (!response.ok) {
      throw new Error(`Sessions API error: ${response.status}`);
    }
    
    return response.json();
  },

  getConversations: async (userId: string) => {
    const response = await apiRequest('GET', `/api/conversations?userId=${userId}`);
    
    if (!response.ok) {
      throw new Error(`Conversations API error: ${response.status}`);
    }
    
    return response.json();
  },

  renameConversation: async (sessionId: string, newTitle: string) => {
    const response = await apiRequest('PATCH', `/api/v1/chat/sessions/${sessionId}`, {
      session_name: newTitle,
    });
    
    if (!response.ok) {
      throw new Error(`Rename API error: ${response.status}`);
    }
    
    return response.json();
  },

  deleteConversation: async (sessionId: string) => {
    const response = await apiRequest('DELETE', `/api/conversations/${sessionId}`);
    
    if (!response.ok) {
      throw new Error(`Delete API error: ${response.status}`);
    }
    
    return response.json();
  },

  pinConversation: async (sessionId: string, pinned: boolean) => {
    const response = await apiRequest('PATCH', `/api/conversations/${sessionId}`, {
      isFavorite: pinned ? 'true' : 'false',
    });
    
    if (!response.ok) {
      throw new Error(`Pin API error: ${response.status}`);
    }
    
    return response.json();
  },

  shareConversation: async (sessionId: string) => {
    // Share functionality - for now just return success
    // In future, implement actual sharing logic
    return { success: true, message: 'Share functionality coming soon' };
  },
};

// User Profile API
export const userAPI = {
  getProfile: async (userId: string) => {
    const response = await apiRequest('GET', `/api/users/${userId}`);
    
    if (!response.ok) {
      throw new Error(`Profile API error: ${response.status}`);
    }
    
    return response.json();
  },

  updateProfile: async (userId: string, profileData: any) => {
    const response = await apiRequest('PUT', `/api/users/${userId}`, profileData);
    
    if (!response.ok) {
      throw new Error(`Update profile API error: ${response.status}`);
    }
    
    return response.json();
  },
};
