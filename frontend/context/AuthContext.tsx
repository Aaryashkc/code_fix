'use client';
import { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authUtils } from '@/lib/auth';
import { toast } from 'sonner';

type RegisterPayload = Record<string, unknown>;

type AuthApiError = {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
};

function getAuthErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null) {
    const authError = error as AuthApiError;
    return authError.response?.data?.message || authError.message || fallback;
  }

  return fallback;
}

export type UserRole = 'tourist' | 'guide' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  createdAt?: string;
  // Tourist properties
  stats?: {
    placesVisited: number;
    pinsCreated: number;
    upcomingTrips: number;
  };
  // Guide properties
  bio?: string;
  location?: string;
  experience?: string;
  pricePerDay?: number;
  languages?: { code: string; name: string }[];
  specializations?: string[];
  phone?: string;
  rating?: number;
  reviewCount?: number;
  totalTrips?: number;
  successRate?: number;
  available?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  register: (data: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getDashboardRoute(role: UserRole): string {
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'guide') return '/guide/dashboard';
  return '/user/dashboard';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchUser = useCallback(async (retryCount = 0) => {
    try {
      const currentUser = await authUtils.getCurrentUser();
      setUser(currentUser);
      
      if (currentUser) {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('wasLoggedIn', 'true');
        }
      } else {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem('wasLoggedIn');
        }
      }
      setIsLoading(false);
    } catch (error: any) {
      const wasLoggedIn = typeof window !== 'undefined' && window.localStorage.getItem('wasLoggedIn') === 'true';
      
      // If the user was logged in and we hit a network/server error, retry in dev/local
      if (wasLoggedIn && retryCount < 5) {
        console.warn(`Connection to server failed. Retrying... (${retryCount + 1}/5)`);
        
        // Show a reconnecting toast on first failure
        if (retryCount === 0) {
          toast.error('Connection lost. Trying to reconnect to server...');
        }
        
        setTimeout(() => {
          fetchUser(retryCount + 1);
        }, 2000);
      } else {
        setUser(null);
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem('wasLoggedIn');
        }
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    // Remove legacy bearer sessions from older builds; cookies are now authoritative.
    window.localStorage.removeItem('token');
    fetchUser();
  }, [fetchUser]);

  const login = async (email: string, password: string, rememberMe: boolean) => {
    try {
      const { user: loggedInUser } = await authUtils.login(email, password, rememberMe);
      setUser(loggedInUser);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('wasLoggedIn', 'true');
      }
      router.push(getDashboardRoute(loggedInUser?.role));
    } catch (error: unknown) {
      throw new Error(getAuthErrorMessage(error, 'Login failed'));
    }
  };

  const register = async (data: RegisterPayload) => {
    try {
      const { user: newUser } = await authUtils.register(data);
      setUser(newUser);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('wasLoggedIn', 'true');
      }
      router.push(getDashboardRoute(newUser?.role));
    } catch (error: unknown) {
      throw new Error(getAuthErrorMessage(error, 'Registration failed'));
    }
  };

  const logout = async () => {
    try {
      await authUtils.logout();
    } catch {
      // Ignore logout API errors - clean up client state regardless
    } finally {
      setUser(null);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('wasLoggedIn');
      }
      router.push('/');
    }
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      refreshUser,
      setUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}
