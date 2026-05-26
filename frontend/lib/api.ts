import axios from 'axios';
import { API_BASE_URL } from '@/lib/runtimeConfig';

type CachedValue = { data: unknown; timestamp: number };

type UnauthorizedEventDetail = {
  message: string;
  from?: string;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for HTTP-only cookies
});

api.interceptors.request.use((config) => {
  // Auth is handled exclusively via httpOnly cookie (withCredentials: true above).
  // Do NOT read from localStorage — that would expose the token to XSS.
  return config;
});

// Controlled 401 handling with event-based approach
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        // Emit custom event for auth state management
        window.dispatchEvent(new CustomEvent<UnauthorizedEventDetail>('auth:unauthorized', {
          detail: { 
            message: error.response?.data?.message || 'Session expired',
            from: error.config?.url
          }
        }));
      }
    }
    return Promise.reject(error);
  }
);

// Simple in-memory GET request cache (30s TTL)
const cache = new Map<string, CachedValue>();
const CACHE_TTL = 30_000;

export async function cachedGet<T = unknown>(url: string, forceRefresh = false) {
  const now = Date.now();
  const cached = cache.get(url);

  if (!forceRefresh && cached && now - cached.timestamp < CACHE_TTL) {
    return cached.data as T;
  }

  const response = await api.get(url);
  cache.set(url, { data: response.data, timestamp: now });
  return response.data as T;
}

export function invalidateCache(urlPattern?: string) {
  if (!urlPattern) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.includes(urlPattern)) {
      cache.delete(key);
    }
  }
}

export default api;
