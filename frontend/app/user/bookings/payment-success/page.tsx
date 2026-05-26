'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { CheckCircle, XCircle, Loader2, ArrowLeft, Receipt, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatNPR } from '@/lib/currency';
import { appendPaymentResult, clearPaymentReturnPath, getPaymentReturnPath } from '@/lib/paymentRedirect';

// Confetti particle component
function Confetti() {
  const colors = ['#22c55e', '#16a34a', '#4ade80', '#86efac', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'];
  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: (i * 23) % 100,
    y: -((i * 13) % 20),
    color: colors[i % colors.length],
    delay: (i % 10) * 0.05,
    duration: 1.5 + (i % 5) * 0.4,
    size: 4 + (i % 6) * 1.2,
    shape: i % 2 === 0 ? 'circle' as const : 'square' as const,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute animate-confetti"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            borderRadius: p.shape === 'circle' ? '50%' : '2px',
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

// Animated checkmark SVG
function AnimatedCheck() {
  return (
    <div className="relative h-28 w-28 mx-auto">
      {/* Pulsing ring */}
      <div className="absolute inset-0 rounded-full bg-success/20 animate-ping opacity-20" />
      {/* Outer glow */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-success/10 to-success/10 animate-pulse" />
      {/* Main circle */}
      <div className="relative h-28 w-28 rounded-full bg-gradient-to-br from-success to-success/80 flex items-center justify-center shadow-lg shadow-success/20 animate-scale-in">
        <svg className="h-14 w-14 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path className="animate-draw-check" d="M5 13l4 4L19 7" style={{ strokeDasharray: 30, strokeDashoffset: 30 }} />
        </svg>
      </div>
      {/* Sparkle effects */}
      <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-warning animate-bounce" style={{ animationDelay: '0.5s' }} />
      <Sparkles className="absolute -bottom-1 -left-3 h-5 w-5 text-success animate-bounce" style={{ animationDelay: '0.8s' }} />
    </div>
  );
}

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [paymentData, setPaymentData] = useState<any>(null);
  const [error, setError] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  const verifyPayment = useCallback(async (encodedData: string) => {
    try {
      const response = await api.post('/payments/verify', { encodedData, data: encodedData });
      setPaymentData(response.data.data);
      setStatus('success');
    } catch (err: any) {
      setStatus('failed');
      setError(err.response?.data?.message || 'Payment verification failed');
    }
  }, []);

  useEffect(() => {
    const encodedData = searchParams.get('data') || searchParams.get('encodedData');

    if (encodedData) {
      // In query strings, '+' can become spaces. Normalize before verification.
      verifyPayment(
        encodedData
          .replace(/\s/g, '+')
          .replace(/-/g, '+')
          .replace(/_/g, '/')
      );
    } else {
      setStatus('failed');
      setError('No payment data found');
    }
  }, [searchParams, verifyPayment]);

  // Show details faster after success
  useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(() => setShowDetails(true), 300);
      return () => clearTimeout(timer);
    }
  }, [status]);

  useEffect(() => {
    if (status !== 'success') return;

    const returnPath = appendPaymentResult(getPaymentReturnPath(), 'success');
    const timer = setTimeout(() => {
      clearPaymentReturnPath();
      router.replace(returnPath);
    }, 1800);

    return () => clearTimeout(timer);
  }, [router, status]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      {/* Confetti on success */}
      {status === 'success' && <Confetti />}

      <Card className={`w-full max-w-md transition-all duration-500 ${status === 'success' ? 'border-success/20 shadow-xl shadow-success/10' : ''}`}>
        <CardContent className="pt-10 pb-10 text-center space-y-6">

          {/* ===== VERIFYING STATE ===== */}
          {status === 'verifying' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="relative h-20 w-20 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                <Loader2 className="h-20 w-20 text-primary animate-spin" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Verifying Payment</h2>
                <p className="text-muted-foreground mt-2">
                  Please wait while we confirm your eSewa payment...
                </p>
              </div>
              {/* Animated progress bar */}
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full animate-progress-bar" />
              </div>
            </div>
          )}

          {/* ===== SUCCESS STATE ===== */}
          {status === 'success' && (
            <div className="space-y-6">
              <AnimatedCheck />

              <div className="animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-success to-success bg-clip-text text-transparent">
                  Payment Successful!
                </h2>
                <p className="text-muted-foreground mt-2">
                  Your booking is now confirmed via eSewa. Pack light, stay hydrated, and enjoy your trip.
                </p>
                <p className="text-sm text-muted-foreground/80 mt-3">
                  Redirecting you back to your previous page...
                </p>
              </div>

              {paymentData && showDetails && (
                <div className="animate-in fade-in slide-in-from-bottom-4 bg-gradient-to-br from-success/5 to-success/10 border border-success/20 rounded-xl p-5 text-left space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Amount Paid</span>
                    <span className="text-lg font-bold text-success">{formatNPR(paymentData.amount)}</span>
                  </div>
                  <div className="border-t border-success/10" />
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Transaction ID</span>
                    <span className="font-mono text-xs bg-white px-2 py-1 rounded border">{paymentData.transactionId}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Payment Method</span>
                    <span className="flex items-center gap-1.5 font-semibold text-success">
                      <span className="h-5 w-5 rounded bg-success text-white text-xs flex items-center justify-center font-bold">e</span>
                      eSewa
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <span className="flex items-center gap-1 text-success font-semibold">
                      <CheckCircle className="h-4 w-4" /> Paid
                    </span>
                  </div>
                  {paymentData.bookingId && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Booking ID</span>
                      <span className="font-mono text-xs bg-white px-2 py-1 rounded border">{paymentData.bookingId}</span>
                    </div>
                  )}
                </div>
              )}

              {showDetails && (
                <div className="animate-in fade-in slide-in-from-bottom-4 flex gap-3 justify-center pt-2" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
                  <Link href="/user/bookings">
                    <Button size="lg" className="bg-success hover:bg-success/90 shadow-lg shadow-success/20">
                      <Receipt className="h-4 w-4 mr-2" />
                      View My Bookings
                    </Button>
                  </Link>
                  <Link href="/user/explore">
                    <Button size="lg" variant="outline">
                      Explore Places
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* ===== FAILED STATE ===== */}
          {status === 'failed' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="relative h-20 w-20 mx-auto">
                <div className="h-20 w-20 rounded-full bg-red-100 flex items-center justify-center animate-scale-in">
                  <XCircle className="h-12 w-12 text-red-500" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-red-700">Payment Failed</h2>
                <p className="text-muted-foreground mt-2">
                  {error || 'Something went wrong with your payment. Please try again.'}
                </p>
              </div>
              <div className="flex gap-3 justify-center pt-2">
                <Link href="/user/bookings">
                  <Button variant="outline">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Bookings
                  </Button>
                </Link>
                <Link href="/user/explore">
                  <Button>
                    Find Another Place
                  </Button>
                </Link>
              </div>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
