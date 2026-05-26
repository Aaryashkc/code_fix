'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function AuthEventHandler() {
  const router = useRouter();

  useEffect(() => {
    const handleUnauthorized = (event: CustomEvent) => {
      const { message, from } = event.detail;
      const currentPath = window.location.pathname;
      const isPaymentCallbackPage = currentPath === '/user/bookings/payment-success' ||
        currentPath === '/user/bookings/payment-failure';

      if (isPaymentCallbackPage && (from?.includes('/auth/me') || from?.includes('/payments/verify'))) {
        return;
      }
      
      // Show user-friendly message
      toast.error(message || 'Session expired. Please login again.');
      
      // Only redirect if not already on auth pages
      const isAuthPage = ['/login', '/register', '/forgot-password'].includes(currentPath);
      
      if (!isAuthPage) {
        // Store intended destination for post-login redirect
        sessionStorage.setItem('redirectAfterLogin', currentPath);
        router.push('/login');
      }
    };

    // Listen for auth unauthorized events
    window.addEventListener('auth:unauthorized', handleUnauthorized as EventListener);
    
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized as EventListener);
    };
  }, [router]);

  return null;
}
