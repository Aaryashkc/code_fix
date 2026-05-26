'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle, XCircle, MessageSquare, Loader2 } from 'lucide-react';

interface LiveRequestCardProps {
  status: string;
  offeredPrice: number;
  counterPrice?: number;
  agreedPrice?: number;
  expiresAt?: string;
  onCancel?: () => void;
  guideName?: string;
  compact?: boolean;
}

export default function LiveRequestCard({
  status,
  offeredPrice,
  counterPrice,
  agreedPrice,
  expiresAt,
  onCancel,
  guideName,
  compact = false,
}: LiveRequestCardProps) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!expiresAt || !['pending', 'negotiating'].includes(status)) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const expiry = new Date(expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft('Expired');
        clearInterval(interval);
        return;
      }

      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, status]);

  const steps = [
    { key: 'sent', label: 'Request Sent', icon: CheckCircle },
    { key: 'negotiating', label: 'Negotiating', icon: MessageSquare },
    { key: 'agreed', label: 'Price Agreed', icon: CheckCircle },
    { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
  ];

  const getActiveStep = () => {
    switch (status) {
      case 'pending':
        return 0;
      case 'negotiating':
        return 1;
      case 'confirmed':
        return agreedPrice ? 3 : 2;
      case 'declined':
      case 'cancelled':
      case 'expired':
        return -1;
      default:
        return 0;
    }
  };

  const activeStep = getActiveStep();

  const getStatusColor = () => {
    switch (status) {
      case 'pending':
        return 'bg-warning/10 text-warning';
      case 'negotiating':
        return 'bg-info/10 text-info';
      case 'confirmed':
        return 'bg-success/10 text-success';
      case 'declined':
        return 'bg-destructive/10 text-destructive';
      case 'expired':
        return 'bg-muted text-muted-foreground';
      case 'cancelled':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
        {['pending', 'negotiating'].includes(status) && (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        )}
        <div className="flex-1">
          <p className="text-sm font-medium">
            {status === 'pending' && 'Waiting for response...'}
            {status === 'negotiating' && 'Price negotiation in progress'}
            {status === 'confirmed' &&
              `Confirmed at Rs. ${(agreedPrice || offeredPrice).toLocaleString()}`}
            {status === 'declined' && 'Request declined'}
            {status === 'expired' && 'Request expired'}
          </p>
          {timeLeft && ['pending', 'negotiating'].includes(status) && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> {timeLeft} remaining
            </p>
          )}
        </div>
        <Badge className={getStatusColor()}>{status}</Badge>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        {/* Status header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {['pending', 'negotiating'].includes(status) && (
              <div className="relative">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
                <span className="absolute -top-0.5 -right-0.5 h-3 w-3 bg-success rounded-full border-2 border-white animate-pulse" />
              </div>
            )}
            {status === 'confirmed' && (
              <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
            )}
            {['declined', 'expired', 'cancelled'].includes(status) && (
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-destructive" />
              </div>
            )}
            <div>
              <h3 className="font-semibold">
                {status === 'pending' && `Waiting for ${guideName || 'guide'}...`}
                {status === 'negotiating' && 'Negotiating price'}
                {status === 'confirmed' && 'Booking confirmed!'}
                {status === 'declined' && 'Request declined'}
                {status === 'expired' && 'Request expired'}
                {status === 'cancelled' && 'Request cancelled'}
              </h3>
              {timeLeft && ['pending', 'negotiating'].includes(status) && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> Expires in {timeLeft}
                </p>
              )}
            </div>
          </div>
          <Badge className={`${getStatusColor()} capitalize px-3 py-1`}>{status}</Badge>
        </div>

        {/* Progress steps */}
        {activeStep >= 0 && (
          <div className="flex items-center justify-between mb-6">
            {steps.map((step, idx) => {
              const StepIcon = step.icon;
              const isCompleted = idx <= activeStep;
              const isCurrent = idx === activeStep;
              return (
                <div key={step.key} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        isCompleted
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      } ${isCurrent ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                    >
                      <StepIcon className="h-4 w-4" />
                    </div>
                    <span
                      className={`text-xs mt-1 ${
                        isCompleted ? 'text-primary font-medium' : 'text-muted-foreground'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {idx < steps.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 ${
                        idx < activeStep ? 'bg-primary' : 'bg-muted'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Price display */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg mb-4">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Your Offer</p>
            <p className="text-lg font-bold">Rs. {offeredPrice.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Counter</p>
            <p className="text-lg font-bold">
              {counterPrice ? `Rs. ${counterPrice.toLocaleString()}` : '--'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Agreed</p>
            <p className="text-lg font-bold text-success">
              {agreedPrice ? `Rs. ${agreedPrice.toLocaleString()}` : '--'}
            </p>
          </div>
        </div>

        {/* Cancel button */}
        {['pending', 'negotiating'].includes(status) && onCancel && (
          <Button variant="outline" className="w-full" onClick={onCancel}>
            Cancel Request
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
