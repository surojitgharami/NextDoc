import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { setGetTokenFn } from '@/lib/queryClient';

interface Subscription {
  plan: string;
  status: string;
  start_date?: string;
  end_date?: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
  is_verified: boolean;
  email_verified: boolean;
  avatar_url?: string;
  phone?: string;
  subscription?: Subscription;
  created_at: string;
}

interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

interface RegistrationData {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  phone?: string;
  terms_accepted?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegistrationData) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<boolean>;
  getToken: () => Promise<string | null>;
  hasRole: (role: string) => boolean;
  updateUserAvatar: (avatarUrl: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const ACCESS_TOKEN_KEY = 'healthchat_access_token';
const REFRESH_TOKEN_KEY = 'healthchat_refresh_token';
const USER_KEY = 'healthchat_user';

async function apiRequest(method: string, endpoint: string, body?: unknown, token?: string, isFormData?: boolean): Promise<Response> {
  const headers: Record<string, string> = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  let fetchBody: string | FormData | null = null;
  if (body) {
    if (isFormData && body instanceof FormData) {
      fetchBody = body;
    } else {
      headers['Content-Type'] = 'application/json';
      fetchBody = JSON.stringify(body);
    }
  }
  
  return fetch(endpoint, {
    method,
    headers,
    body: fetchBody,
    credentials: 'include',
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  });
  const [isLoaded, setIsLoaded] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(() => 
    localStorage.getItem(ACCESS_TOKEN_KEY)
  );
  const [_refreshToken, setRefreshToken] = useState<string | null>(() => 
    localStorage.getItem(REFRESH_TOKEN_KEY)
  );

  const clearAuth = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }, []);

  const saveTokens = useCallback((tokens: AuthTokens) => {
    setAccessToken(tokens.access_token);
    setRefreshToken(tokens.refresh_token);
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
  }, []);

  const saveUser = useCallback((userData: User) => {
    setUser(userData);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
  }, []);

  const refreshAuth = useCallback(async (): Promise<boolean> => {
    const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!storedRefreshToken) {
      clearAuth();
      return false;
    }

    try {
      const response = await apiRequest('POST', '/api/auth/refresh', {
        refresh_token: storedRefreshToken,
      });

      if (!response.ok) {
        clearAuth();
        return false;
      }

      const data = await response.json();
      saveTokens(data);
      
      const meResponse = await apiRequest('GET', '/api/auth/me', undefined, data.access_token);
      if (meResponse.ok) {
        const userData = await meResponse.json();
        saveUser(userData);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      clearAuth();
      return false;
    }
  }, [clearAuth, saveTokens, saveUser]);

  const getToken = useCallback(async (): Promise<string | null> => {
    let token = accessToken;
    
    if (!token) {
      token = localStorage.getItem(ACCESS_TOKEN_KEY);
    }
    
    if (!token) {
      return null;
    }
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiry = payload.exp * 1000;
      const now = Date.now();
      
      if (expiry - now < 60000) {
        const refreshed = await refreshAuth();
        if (refreshed) {
          return localStorage.getItem(ACCESS_TOKEN_KEY);
        }
        return null;
      }
      
      return token;
    } catch {
      return token;
    }
  }, [accessToken, refreshAuth]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiRequest('POST', '/api/auth/login', { email, password });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }
    
    const data = await response.json();
    saveTokens(data);
    
    if (data.user) {
      const userData: User = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.full_name,
        roles: data.user.roles || [],
        is_verified: data.user.is_active,
        email_verified: data.user.email_verified || false,
        avatar_url: data.user.avatar_url,
        phone: data.user.phone,
        subscription: data.user.subscription,
        created_at: data.user.created_at
      };
      saveUser(userData);
      
      // Redirect admin users to admin dashboard
      if (userData.roles?.includes('admin')) {
        window.location.href = '/dashboard/admin';
      }
    }
  }, [saveTokens, saveUser]);

  const register = useCallback(async (regData: RegistrationData) => {
    const formData = new FormData();
    formData.append('email', regData.email);
    formData.append('password', regData.password);
    formData.append('confirm_password', regData.confirmPassword);
    formData.append('full_name', regData.name);
    formData.append('phone', regData.phone || '');
    formData.append('terms_accepted', (regData.terms_accepted !== false).toString());
    
    const response = await apiRequest('POST', '/api/auth/register', formData, undefined, true);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Registration failed');
    }
    
    const data = await response.json();
    saveTokens(data);
    
    if (data.user) {
      const userData: User = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.full_name,
        roles: data.user.roles || [],
        is_verified: data.user.is_active,
        email_verified: data.user.email_verified || false,
        avatar_url: data.user.avatar_url,
        phone: data.user.phone,
        subscription: data.user.subscription,
        created_at: data.user.created_at
      };
      saveUser(userData);
    }
  }, [saveTokens, saveUser]);

  const logout = useCallback(async () => {
    const token = await getToken();
    if (token) {
      try {
        await apiRequest('POST', '/api/auth/logout', {}, token);
      } catch {
        // Ignore logout errors
      }
    }
    clearAuth();
  }, [getToken, clearAuth]);

  const hasRole = useCallback((role: string): boolean => {
    return user?.roles?.includes(role) || false;
  }, [user]);

  const updateUserAvatar = useCallback((avatarUrl: string) => {
    if (user) {
      const updatedUser = { ...user, avatar_url: avatarUrl };
      saveUser(updatedUser);
    }
  }, [user, saveUser]);

  useEffect(() => {
    setGetTokenFn(getToken);
    return () => {
      setGetTokenFn(null);
    };
  }, [getToken]);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem(ACCESS_TOKEN_KEY);
      if (storedToken) {
        try {
          const payload = JSON.parse(atob(storedToken.split('.')[1]));
          const expiry = payload.exp * 1000;
          
          if (expiry > Date.now()) {
            const meResponse = await apiRequest('GET', '/api/auth/me', undefined, storedToken);
            if (meResponse.ok) {
              const userData = await meResponse.json();
              saveUser(userData);
            } else {
              await refreshAuth();
            }
          } else {
            await refreshAuth();
          }
        } catch {
          await refreshAuth();
        }
      }
      setIsLoaded(true);
    };
    
    initAuth();
  }, [refreshAuth, saveUser]);

  const value: AuthContextType = {
    user,
    isLoaded,
    isSignedIn: !!accessToken,
    accessToken,
    login,
    register,
    logout,
    refreshAuth,
    getToken,
    hasRole,
    updateUserAvatar,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useUser() {
  const { user, isLoaded } = useAuth();
  return { user, isLoaded };
}
