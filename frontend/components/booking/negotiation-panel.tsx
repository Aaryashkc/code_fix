'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

interface NegotiationEntry {
  price: number;
  by: 'tourist' | 'guide';
  message?: string;
  at: string;
}

interface NegotiationPanelProps {
  history: NegotiationEntry[];
  currentUserRole: 'tourist' | 'guide';
  guideRate: number;
  numberOfDays: number;
  onAcceptPrice: (price?: number) => void;
  status: string;
}

export default function NegotiationPanel({
  history,
  currentUserRole,
  guideRate,
  numberOfDays,
  onAcceptPrice,
  status,
}: NegotiationPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const isActive = ['pending', 'negotiating'].includes(status);
  const latestEntry = history[history.length - 1];
  const canAccept = isActive && latestEntry && latestEntry.by !== currentUserRole;

  return (
    <div className="flex flex-col h-full">
      {/* Guide rate reference */}
      <div className="px-4 py-3 bg-muted/50 border-b">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Guide&apos;s rate</span>
          <span className="font-medium">
            Rs. {guideRate.toLocaleString()}/day ({numberOfDays} days = Rs.{' '}
            {(guideRate * numberOfDays).toLocaleString()})
          </span>
        </div>
      </div>

      {/* Negotiation history */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 max-h-64">
        {history.map((entry, idx) => {
          const isMine = entry.by === currentUserRole;
          return (
            <div key={idx} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  isMine
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-muted rounded-bl-md'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {entry.by === 'tourist' ? (
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowDownLeft className="h-3.5 w-3.5" />
                  )}
                  <span className="text-xs font-medium uppercase">
                    {entry.by === 'tourist' ? 'Tourist Offer' : 'Guide Counter'}
                  </span>
                </div>
                <p className="text-lg font-bold">Rs. {entry.price.toLocaleString()}</p>
                {entry.message && (
                  <p
                    className={`text-sm mt-1 ${
                      isMine ? 'text-primary-foreground/80' : 'text-muted-foreground'
                    }`}
                  >
                    {entry.message}
                  </p>
                )}
                <p
                  className={`text-xs mt-1 ${
                    isMine ? 'text-primary-foreground/60' : 'text-muted-foreground/60'
                  }`}
                >
                  {new Date(entry.at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          );
        })}

        {status === 'confirmed' && (
          <div className="flex justify-center py-2">
            <Badge className="bg-green-100 text-green-800 px-4 py-2 text-sm">
              <CheckCircle className="h-4 w-4 mr-2" />
              Price Agreed!
            </Badge>
          </div>
        )}
      </div>

      {/* Accept button */}
      {canAccept && (
        <div className="p-4 border-t bg-green-50">
          <div className="text-center mb-2">
            <p className="text-sm text-muted-foreground">
              {latestEntry.by === 'guide' ? 'Guide' : 'Tourist'} offered
            </p>
            <p className="text-2xl font-bold text-green-700">
              Rs. {latestEntry.price.toLocaleString()}
            </p>
          </div>
          <Button
            onClick={() => onAcceptPrice(latestEntry?.price)}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            size="lg"
          >
            <CheckCircle className="h-5 w-5 mr-2" />
            Accept This Price
          </Button>
        </div>
      )}
    </div>
  );
}
