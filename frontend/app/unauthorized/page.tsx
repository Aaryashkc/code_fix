'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { useEffect, Suspense } from 'react';

function UnauthorizedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requiredRole = searchParams.get('role');
  const reason = searchParams.get('reason');

  useEffect(() => {
    // Add auth event listener for better UX
    const handleAuthEvent = () => {
      router.push('/login');
    };

    window.addEventListener('auth:unauthorized', handleAuthEvent);
    return () => {
      window.removeEventListener('auth:unauthorized', handleAuthEvent);
    };
  }, [router]);

  const getRoleMessage = (role: string | null) => {
    switch (role) {
      case 'admin':
        return 'Administrator access is required to view this page.';
      case 'guide':
        return 'Guide access is required to view this page.';
      case 'user':
        return 'User access is required to view this page.';
      default:
        return 'You do not have permission to access this page.';
    }
  };

  const getReasonMessage = (reason: string | null) => {
    switch (reason) {
      case 'expired':
        return 'Your session has expired. Please login again.';
      case 'invalid':
        return 'Invalid authentication token. Please login again.';
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <GlassCard className="p-8 text-center">
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center">
                <Shield className="h-10 w-10 text-red-500" />
              </div>
              <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-white mb-3">
            Access Denied
          </h1>
          
          <p className="text-slate-300 mb-4">
            {getRoleMessage(requiredRole)}
          </p>

          {getReasonMessage(reason) && (
            <p className="text-amber-400 text-sm mb-6">
              {getReasonMessage(reason)}
            </p>
          )}

          <div className="space-y-3">
            <Button 
              onClick={() => router.push('/login')}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              Login with Correct Account
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => router.back()}
              className="w-full border-white/20 text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>

          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-xs text-slate-400">
              If you believe this is an error, please contact support.
            </p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

export default function UnauthorizedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <UnauthorizedContent />
    </Suspense>
  );
}
