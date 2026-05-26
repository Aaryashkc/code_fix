'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { XCircle, ArrowLeft, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { appendPaymentResult, clearPaymentReturnPath, getPaymentReturnPath } from '@/lib/paymentRedirect';

export default function PaymentFailurePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const rawData = searchParams.get('data') || searchParams.get('encodedData');
  const data = rawData
    ? rawData
        .replace(/\s/g, '+')
        .replace(/-/g, '+')
        .replace(/_/g, '/')
    : null;

  useEffect(() => {
    if (!data) return;

    try {
      const decoded = JSON.parse(atob(data));
      if (decoded.status === 'COMPLETE') {
        // If eSewa sent success data to failure URL, redirect to success.
        router.replace(`/user/bookings/payment-success?data=${encodeURIComponent(data)}`);
      }
    } catch {
      // Invalid data, just show default failure message.
    }
  }, [data, router]);

  useEffect(() => {
    const returnPath = appendPaymentResult(getPaymentReturnPath(), 'failed');
    const timer = setTimeout(() => {
      clearPaymentReturnPath();
      router.replace(returnPath);
    }, 2200);

    return () => clearTimeout(timer);
  }, [router]);

  const reason = (() => {
    if (!data) return '';
    try {
      const decoded = JSON.parse(atob(data));
      if (decoded.status === 'CANCELED') return 'Payment was cancelled';
      if (decoded.status === 'PENDING') return 'Payment is still pending';
      if (decoded.status === 'COMPLETE') return '';
      if (decoded.status) return `Payment status: ${decoded.status}`;
    } catch {
      // Ignore malformed payload and use default message.
    }
    return '';
  })();

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-8 text-center space-y-6">
          <div className="h-20 w-20 mx-auto rounded-full bg-red-100 flex items-center justify-center animate-scale-in">
            <XCircle className="h-12 w-12 text-red-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-red-700">Payment Cancelled</h2>
            <p className="text-muted-foreground mt-2">
              {reason || "Your payment was cancelled or could not be processed. Don't worry, no amount has been deducted."}
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
            <p>You can try again from your bookings page.</p>
            <p className="mt-1">Redirecting you back to where you started the payment...</p>
          </div>
          <div className="flex gap-3 justify-center pt-2">
            <Link href="/user/bookings">
              <Button>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </Link>
            <Link href="/user/bookings">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Bookings
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
