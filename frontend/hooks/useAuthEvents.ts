import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function useAuthEvents() {
  const router = useRouter();

  const handleUnauthorized = useCallback((event: CustomEvent) => {
    const { message } = event.detail;
    
    // Show user-friendly message
    toast.error(message || 'Session expired. Please login again.');
    
    // Only redirect if not already on auth pages
    const currentPath = window.location.pathname;
    const isAuthPage = ['/login', '/register', '/forgot-password'].includes(currentPath);
    
    if (!isAuthPage) {
      // Store intended destination for post-login redirect
      sessionStorage.setItem('redirectAfterLogin', currentPath);
      router.push('/login');
    }
  }, [router]);

  useEffect(() => {
    // Listen for auth unauthorized events
    const handleAuthEvent = (event: Event) => {
      handleUnauthorized(event as CustomEvent);
    };

    window.addEventListener('auth:unauthorized', handleAuthEvent);
    
    return () => {
      window.removeEventListener('auth:unauthorized', handleAuthEvent);
    };
  }, [handleUnauthorized]);
}
