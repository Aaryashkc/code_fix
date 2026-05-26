'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Mountain, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';

export default function VerifyEmailPage() {
  const params = useParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  const verifyEmail = useCallback(async () => {
    if (!params.token) {
      setStatus('error');
      setMessage('Verification link is missing or invalid.');
      return;
    }

    try {
      const response = await api.get(`/auth/verify-email/${params.token}`);
      setStatus('success');
      setMessage(response.data.message || 'Email verified successfully!');
    } catch (err: unknown) {
      setStatus('error');
      const fallbackMessage = 'Verification failed. The link may be invalid or expired.';
      if (typeof err === 'object' && err && 'response' in err) {
        const response = (err as { response?: { data?: { message?: string } } }).response;
        setMessage(response?.data?.message || fallbackMessage);
      } else {
        setMessage(fallbackMessage);
      }
    }
  }, [params.token]);

  useEffect(() => {
    verifyEmail();
  }, [verifyEmail]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-8">
          <Mountain className="h-7 w-7 text-primary" />
          <span className="text-xl font-bold font-serif text-foreground">Yatra</span>
        </Link>

        {status === 'loading' && (
          <div>
            <Loader2 className="h-16 w-16 mx-auto text-primary animate-spin mb-4" />
            <h2 className="font-serif text-2xl font-bold text-foreground">Verifying your email...</h2>
            <p className="mt-2 text-sm text-muted-foreground">Please wait a moment.</p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <div className="mx-auto h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <h2 className="font-serif text-2xl font-bold text-foreground">Email Verified!</h2>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
            <Link href="/login">
              <Button className="mt-6">
                Continue to Login
              </Button>
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div className="mx-auto h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="font-serif text-2xl font-bold text-foreground">Verification Failed</h2>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
            <div className="flex gap-3 justify-center mt-6">
              <Link href="/login">
                <Button variant="outline">Go to Login</Button>
              </Link>
              <Link href="/">
                <Button>Go Home</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
