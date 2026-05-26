'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Send, 
  MessageSquare,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { formatNPR } from '@/lib/currency';
import { toast } from 'sonner';
import { useSocketNegotiation } from '@/hooks/useSocketNegotiation';
import QuickResponseTemplates from './QuickResponseTemplates';

interface NegotiationEntry {
  price: number;
  by: 'tourist' | 'guide';
  message?: string;
  at: string;
}

type NegotiationEventPayload = {
  price?: number;
};

interface EnhancedNegotiationPanelProps {
  history: NegotiationEntry[];
  currentUserRole: 'tourist' | 'guide';
  guideRate: number;
  numberOfDays: number;
  onAcceptPrice: (price?: number) => void;
  status: string;
  bookingId: string;
  touristName?: string;
  guideName?: string;
}

export default function EnhancedNegotiationPanel({
  history,
  currentUserRole,
  guideRate,
  numberOfDays,
  onAcceptPrice,
  status,
  bookingId,
  touristName = 'Traveler',
  guideName = 'Guide'
}: EnhancedNegotiationPanelProps) {
  const [counterPrice, setCounterPrice] = useState('');
  const [counterMessage, setCounterMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  
  const {
    sendCounterOffer,
    acceptOffer,
    declineOffer,
    isConnected,
    listenToNegotiation
  } = useSocketNegotiation(bookingId);

  const basePrice = guideRate * numberOfDays;
  const latestEntry = history[history.length - 1];
  const canAccept = ['pending', 'negotiating'].includes(status) && latestEntry && latestEntry.by !== currentUserRole;
  const canCounter = ['pending', 'negotiating'].includes(status) && latestEntry && latestEntry.by !== currentUserRole;

  // Set up real-time listeners
  useEffect(() => {
    listenToNegotiation(
      (data: NegotiationEventPayload) => {
        // Handle negotiation updates
        console.log('Negotiation updated:', data);
      },
      (data: NegotiationEventPayload) => {
        // Handle booking accepted
        toast.success(`🎉 Booking accepted!`);
        onAcceptPrice(data.price);
      },
      () => {
        // Handle booking declined
        toast.error(`❌ Booking was declined`);
      },
      (data: NegotiationEventPayload) => {
        // Handle counter offer
        toast.info(`💰 New offer: ${formatNPR(data.price ?? 0)}`);
      }
    );
  }, [listenToNegotiation, onAcceptPrice]);


  const handleSendCounterOffer = async () => {
    const price = parseFloat(counterPrice);
    if (!price || price <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    if (!counterMessage.trim()) {
      toast.error('Please include a message with your offer');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = sendCounterOffer(bookingId, price, counterMessage);
      if (success) {
        setCounterPrice('');
        setCounterMessage('');
        setShowTemplates(false);
      }
    } catch {
      toast.error('Failed to send counter offer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAccept = async () => {
    setIsSubmitting(true);
    try {
      const success = acceptOffer(bookingId);
      if (success) {
        onAcceptPrice(latestEntry?.price);
      }
    } catch {
      toast.error('Failed to accept offer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecline = async () => {
    setIsSubmitting(true);
    try {
      const success = declineOffer(bookingId, 'Offer declined');
      if (success) {
        toast.info('Offer declined');
      }
    } catch {
      toast.error('Failed to decline offer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTemplateSelect = (message: string, price?: number) => {
    setCounterMessage(message);
    if (price) {
      setCounterPrice(price.toString());
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Connection Status */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs font-medium">
            {isConnected ? 'Connected' : 'Reconnecting...'}
          </span>
        </div>
        <Badge variant={status === 'pending' ? 'secondary' : 'default'} className="text-xs">
          {status === 'pending' ? 'Negotiating' : status}
        </Badge>
      </div>

      {/* Guide Rate Reference */}
      <div className="p-4 bg-muted/50 border-b">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Standard rate ({numberOfDays} days)</span>
          <span className="font-medium">{formatNPR(basePrice)}</span>
        </div>
      </div>

      {/* Negotiation History */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {history.map((entry, index) => (
          <div
            key={index}
            className={`flex ${entry.by === currentUserRole ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl p-3 ${
                entry.by === currentUserRole
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {entry.by === 'tourist' ? (
                  <span className="text-xs font-medium">{touristName}</span>
                ) : (
                  <span className="text-xs font-medium">{guideName}</span>
                )}
                <span className="text-xs opacity-70">{formatTime(entry.at)}</span>
              </div>
              
              <div className="text-lg font-bold mb-1">
                {formatNPR(entry.price)}
              </div>
              
              {entry.message && (
                <p className="text-sm opacity-90">{entry.message}</p>
              )}
              
              <div className="flex items-center gap-1 mt-1">
                {entry.by === currentUserRole ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownLeft className="h-3 w-3" />
                )}
                <span className="text-xs opacity-70">
                  {entry.by === 'tourist' ? 'Your offer' : "Guide's offer"}
                </span>
              </div>
            </div>
          </div>
        ))}
        
        {history.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No negotiations yet</p>
          </div>
        )}
      </div>

      {/* Action Area */}
      {canCounter && (
        <div className="border-t p-4 space-y-3">
          {!showTemplates ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium mb-1">Your Price</label>
                  <Input
                    type="number"
                    placeholder={formatNPR(basePrice)}
                    value={counterPrice}
                    onChange={(e) => setCounterPrice(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTemplates(true)}
                  className="self-end"
                >
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Templates
                </Button>
              </div>
              
              <Textarea
                placeholder="Add a message with your offer..."
                value={counterMessage}
                onChange={(e) => setCounterMessage(e.target.value)}
                className="min-h-[60px] text-sm resize-none"
              />
              
              <div className="flex gap-2">
                <Button
                  onClick={handleSendCounterOffer}
                  disabled={isSubmitting || !counterPrice || !counterMessage.trim()}
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Send Counter Offer
                </Button>
              </div>
            </>
          ) : (
            <QuickResponseTemplates
              onSelectTemplate={handleTemplateSelect}
              guideRate={guideRate}
              numberOfDays={numberOfDays}
              touristName={touristName}
            />
          )}
        </div>
      )}

      {/* Accept/Decline Buttons */}
      {canAccept && (
        <div className="border-t p-4">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-3">
            <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">
                Offer to accept: {formatNPR(latestEntry?.price)}
              </span>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={handleAccept}
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Accept Offer
            </Button>
            <Button
              variant="outline"
              onClick={handleDecline}
              disabled={isSubmitting}
            >
              Decline
            </Button>
          </div>
        </div>
      )}

      {/* Status Messages */}
      {status === 'accepted' && (
        <div className="border-t p-4">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
            <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Booking accepted! 🎉</span>
            </div>
          </div>
        </div>
      )}

      {status === 'declined' && (
        <div className="border-t p-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Booking was declined</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
