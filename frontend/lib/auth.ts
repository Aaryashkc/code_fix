import api from './api';

export type AuthUserRole = 'tourist' | 'guide' | 'admin';

export interface AuthUser {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: AuthUserRole;
  avatar?: string;
}

export interface RegisterPayload {
  [key: string]: unknown;
}

interface AuthResponse {
  user: AuthUser;
}

interface CurrentUserResponse {
  data: AuthUser | null;
}

function normalizeAuthUser(user: AuthUser | null | undefined): AuthUser | null {
  if (!user) return null;

  return {
    ...user,
    id: user.id || user._id || '',
  };
}

// Cookie-based auth utilities
export const authUtils = {
  // Check if user is authenticated via server-side validation
  async isAuthenticated(): Promise<boolean> {
    try {
      const response = await api.get('/auth/me');
      return !!response.data.data;
    } catch {
      return false;
    }
  },

  // Get current user from server
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const response = await api.get<CurrentUserResponse>('/auth/me');
      return normalizeAuthUser(response.data.data);
    } catch (error: any) {
      // If the server explicitly rejected the credentials, return null (unauthenticated)
      if (error.response?.status === 401 || error.response?.status === 403) {
        return null;
      }
      // If it's a network error or 5xx server error, throw the error
      // so the context knows NOT to clear the active session.
      throw error;
    }
  },

  // Login with credentials (server sets httpOnly cookie — no localStorage)
  async login(email: string, password: string, rememberMe: boolean): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', { email, password, rememberMe });
    // as that would expose it to XSS. The cookie is sent automatically by the browser.
    return {
      ...response.data,
      user: normalizeAuthUser(response.data.user)!,
    };
  },

  // Register (server sets httpOnly cookie)
  async register(data: RegisterPayload): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/register', data);
    return {
      ...response.data,
      user: normalizeAuthUser(response.data.user)!,
    };
  },

  // Logout (server clears httpOnly cookie)
  async logout() {
    try {
      await api.post('/auth/logout');
    } finally {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('token');
      }
    }
  }
};
