/**
 * API Client for Zenly Mental Health Platform
 * Centralized API communication with authentication and error handling
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

// Token management
const getAccessToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('zenly_access_token');
};

const getRefreshToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('zenly_refresh_token');
};

const setTokens = (accessToken: string, refreshToken: string) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('zenly_access_token', accessToken);
  localStorage.setItem('zenly_refresh_token', refreshToken);
};

const clearTokens = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('zenly_access_token');
  localStorage.removeItem('zenly_refresh_token');
  localStorage.removeItem('zenly_user');
};

const setUser = (user: any) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('zenly_user', JSON.stringify(user));
};

const getUser = () => {
  if (typeof window === 'undefined') return null;
  const user = localStorage.getItem('zenly_user');
  return user ? JSON.parse(user) : null;
};

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

/**
 * Core fetch wrapper with authentication and error handling
 */
async function apiFetch(endpoint: string, options: RequestOptions = {}) {
  const { skipAuth = false, ...fetchOptions } = options;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (!skipAuth) {
    const token = getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    let response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    // Handle token expiration and refresh
    if (response.status === 401 && !skipAuth) {
      const errorData = await response.json();
      
      if (errorData.code === 'TOKEN_EXPIRED') {
        // Try to refresh token
        const refreshToken = getRefreshToken();
        if (refreshToken) {
          const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            setTokens(refreshData.data.accessToken, refreshToken);
            
            // Retry original request with new token
            headers['Authorization'] = `Bearer ${refreshData.data.accessToken}`;
            response = await fetch(url, {
              ...fetchOptions,
              headers,
            });
          } else {
            // Refresh failed, logout
            clearTokens();
            window.location.href = '/auth/login';
            throw new Error('Session expired');
          }
        } else {
          // No refresh token, logout
          clearTokens();
          window.location.href = '/auth/login';
          throw new Error('Authentication required');
        }
      }
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API request failed');
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

/**
 * Authentication API
 */
export const authAPI = {
  signup: async (data: {
    email: string;
    password: string;
    name: string;
    firstName?: string;
    lastName?: string;
    university?: string;
    academicYear?: string;
  }) => {
    const result = await apiFetch('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
      skipAuth: true,
    });
    
    // Note: Signup no longer returns tokens - user must verify email first
    if (result.success && result.data?.email) {
      // Store email for verification page
      if (typeof window !== 'undefined') {
        localStorage.setItem('zenly_pending_verification_email', result.data.email);
      }
    }
    
    return result;
  },

  verifyOTP: async (email: string, otp: string) => {
    const result = await apiFetch('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
      skipAuth: true,
    });
    
    if (result.success) {
      setTokens(result.data.accessToken, result.data.refreshToken);
      setUser(result.data.user);
      // Clear pending verification email
      if (typeof window !== 'undefined') {
        localStorage.removeItem('zenly_pending_verification_email');
      }
    }
    
    return result;
  },

  resendOTP: async (email: string) => {
    const result = await apiFetch('/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
      skipAuth: true,
    });
    
    return result;
  },

  login: async (email: string, password: string) => {
    const result = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    });
    
    if (result.success) {
      setTokens(result.data.accessToken, result.data.refreshToken);
      setUser(result.data.user);
    }
    
    return result;
  },

  logout: async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } finally {
      clearTokens();
    }
  },

  getMe: async () => {
    const result = await apiFetch('/auth/me');
    if (result.success) {
      setUser(result.data);
    }
    return result;
  },
};

/**
 * Journal API
 */
export const journalAPI = {
  create: async (data: { content: string; mood?: number; tags?: string[] }) => {
    return apiFetch('/journals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  list: async (params?: { limit?: number; cursor?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiFetch(`/journals${query ? `?${query}` : ''}`);
  },

  get: async (id: string) => {
    return apiFetch(`/journals/${id}`);
  },

  update: async (id: string, data: { content?: string; mood?: number; tags?: string[] }) => {
    return apiFetch(`/journals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string) => {
    return apiFetch(`/journals/${id}`, { method: 'DELETE' });
  },
};

/**
 * Mood API
 */
export const moodAPI = {
  updateToday: async (mood: number, notes?: string) => {
    return apiFetch('/moods/today', {
      method: 'PUT',
      body: JSON.stringify({ mood, notes }),
    });
  },

  list: async (params?: { from?: string; to?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiFetch(`/moods${query ? `?${query}` : ''}`);
  },
};

/**
 * Forum API
 */
export const forumAPI = {
  createPost: async (data: {
    title: string;
    content: string;
    category?: string;
    tags?: string[];
    isAnonymous?: boolean;
  }) => {
    return apiFetch('/forum/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  listPosts: async (params?: { category?: string; search?: string; tag?: string; limit?: number }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiFetch(`/forum/posts${query ? `?${query}` : ''}`, { skipAuth: true });
  },

  getPost: async (id: string) => {
    return apiFetch(`/forum/posts/${id}`, { skipAuth: true });
  },

  likePost: async (postId: string) => {
    return apiFetch(`/forum/posts/${postId}/like`, {
      method: 'POST',
    });
  },

  reportPost: async (postId: string, reason?: string) => {
    return apiFetch(`/forum/posts/${postId}/report`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  addComment: async (postId: string, data: {
    content: string;
    parentCommentId?: string;
    isAnonymous?: boolean;
  }) => {
    return apiFetch(`/forum/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  listComments: async (postId: string, parentId?: string | null) => {
    const query = parentId ? `?parentId=${parentId}` : '';
    return apiFetch(`/forum/posts/${postId}/comments${query}`, { skipAuth: true });
  },

  likeComment: async (commentId: string) => {
    return apiFetch(`/forum/comments/${commentId}/like`, {
      method: 'POST',
    });
  },

  addReaction: async (postId: string, type: string) => {
    return apiFetch(`/forum/posts/${postId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ type }),
    });
  },

  removeReaction: async (reactionId: string) => {
    return apiFetch(`/forum/reactions/${reactionId}`, { method: 'DELETE' });
  },
};

 

/**
 * AI Conversation API
 */
export const aiAPI = {
  createConversation: async (data?: { title?: string; journalEntryId?: string }) => {
    return apiFetch('/ai/conversations', {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  },

  list: async () => {
    return apiFetch('/ai/conversations');
  },

  get: async (id: string) => {
    return apiFetch(`/ai/conversations/${id}`);
  },

  sendMessage: async (conversationId: string, content: string) => {
    return apiFetch(`/ai/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },

  listMessages: async (conversationId: string) => {
    return apiFetch(`/ai/conversations/${conversationId}/messages`);
  },
};

/**
 * Resource API
 */
export const resourceAPI = {
  list: async (params?: { 
    category?: string; 
    search?: string; 
    type?: string; 
    language?: string; 
    sortBy?: string; 
    order?: 'asc' | 'desc';
    limit?: number;
  }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiFetch(`/resources${query ? `?${query}` : ''}`);
  },

  get: async (id: string) => {
    return apiFetch(`/resources/${id}`);
  },
};

/**
 * User API
 */
export const userAPI = {
  getProfile: async () => {
    return apiFetch('/users/me');
  },

  updateProfile: async (data: { name?: string; avatarUrl?: string; university?: string; firstName?: string; lastName?: string; academicYear?: string }) => {
    return apiFetch('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  updateAvatar: async (avatarUrl: string) => {
    return apiFetch('/users/me/avatar', {
      method: 'PUT',
      body: JSON.stringify({ avatarUrl }),
    });
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    return apiFetch('/users/me/password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },
};

/**
 * Notification API
 */
export const notificationAPI = {
  list: async () => {
    return apiFetch('/notifications');
  },

  markRead: async (ids: string[]) => {
    return apiFetch('/notifications/mark-read', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  },
};

/**
 * Admin API
 */
export const adminAPI = {
  getMetrics: async (params?: { from?: string; to?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiFetch(`/admin/metrics/overview${query ? `?${query}` : ''}`);
  },

  getRiskAlerts: async () => {
    return apiFetch('/admin/risk-alerts');
  },

  listUsers: async (params?: { q?: string; limit?: number }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiFetch(`/admin/users${query ? `?${query}` : ''}`);
  },

  // Forum management
  getReportedPosts: async () => {
    return apiFetch('/admin/forum/reported-posts');
  },

  getAllPosts: async (params?: { limit?: number; skip?: number; search?: string; category?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiFetch(`/admin/forum/all-posts${query ? `?${query}` : ''}`);
  },

  deletePost: async (postId: string) => {
    return apiFetch(`/admin/forum/posts/${postId}`, {
      method: 'DELETE',
    });
  },

  dismissReports: async (postId: string) => {
    return apiFetch(`/admin/forum/posts/${postId}/dismiss-reports`, {
      method: 'POST',
    });
  },
};

// Export helpers
export { getUser, clearTokens };

/**
 * Activity API
 */
export const activityAPI = {
  listRecent: async (limit: number = 2) => {
    const query = new URLSearchParams({ limit: String(limit) }).toString();
    return apiFetch(`/activity${query ? `?${query}` : ''}`);
  },
};
