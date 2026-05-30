'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { formatNPR } from '@/lib/currency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  CheckCircle, XCircle, Clock, MapPin, Users, Calendar,
  MessageSquare, Send, Loader2, Banknote, LocateFixed,
  ChevronDown, ChevronUp, TrendingUp, Star, RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { BookingListSkeleton } from '@/components/ui/skeleton-cards';

/* ─── types ──────────────────────────────────────────────────── */
interface NegotiationEntry { price: number; by: 'tourist' | 'guide'; message?: string; at: string; }
interface Booking {
  _id: string;
  tourist:    { _id: string; name: string; email: string; country?: string };
  startDate:  string;
  endDate:    string;
  numberOfDays: number;
  packageType: string;
  groupSize:  number;
  offeredPrice: number;
  counterPrice?: number;
  agreedPrice?: number;
  totalPrice: number;
  status:     string;
  paymentStatus?: string;
  paymentMethod?: string;
  completionRequestedBy?: 'tourist' | 'guide';
  completionRequestedAt?: string;
  touristCompletedAt?: string;
  guideCompletedAt?: string;
  specialRequirements?: string;
  expiresAt?: string;
  negotiationHistory: NegotiationEntry[];
  destinations: { name: string }[];
  customDestinations?: { name: string }[];
  createdAt: string;
  guide?: { pricePerDay?: number };
}

/* ─── helpers ────────────────────────────────────────────────── */
const STATUS_COLORS: Record<string, string> = {
  pending:     'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/50',
  negotiating: 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800/50',
  confirmed:   'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/50',
  completed:   'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/50',
  declined:    'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700/50',
  expired:     'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700/50',
  cancelled:   'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800/50',
};
const STATUS_ICONS: Record<string, typeof Clock> = {
  pending: Clock, negotiating: MessageSquare, confirmed: CheckCircle,
  completed: CheckCircle, declined: XCircle, expired: Clock, cancelled: XCircle,
};
const fmt = (d: string) => new Date(d).toLocaleDateString('en-US', { day:'numeric', month:'short', year:'numeric' });

const QUICK_RESPONSES = [
  "Thank you for your request! I'd be happy to guide you.",
  "I can accommodate your group. Let me suggest a fair price.",
  "I'm familiar with those destinations. Here's my counter offer.",
  "I have availability for those dates. Let's confirm the details.",
  "Could you share more about your group's experience level?",
];

/* ─── component ──────────────────────────────────────────────── */
export default function GuideBookingsPage() {
  const [bookings,     setBookings]     = useState<Booking[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [tab,          setTab]          = useState('pending');
  const [expanded,     setExpanded]     = useState<Set<string>>(new Set());

  // counter-offer state
  const [counterBookingId, setCounterBookingId] = useState<string | null>(null);
  const [counterPrice,     setCounterPrice]     = useState(0);
  const [counterMsg,       setCounterMsg]       = useState('');
  const [sendingCounter,   setSendingCounter]   = useState(false);

  // complete trip dialog
  const [completeDialog,   setCompleteDialog]   = useState(false);
  const [completeBooking,  setCompleteBooking]  = useState<Booking | null>(null);
  const [completing,       setCompleting]       = useState(false);

  // decline dialog
  const [declineDialog,    setDeclineDialog]    = useState(false);
  const [declineBooking,   setDeclineBooking]   = useState<Booking | null>(null);

  const fetchBookings = useCallback(async () => {
    try {
      const r = await api.get('/bookings/my-requests');
      setBookings(r.data.data ?? []);
    } catch { toast.error('Failed to load bookings'); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  // auto-refresh while pending bookings exist
  useEffect(() => {
    const hasPending = bookings.some(b => ['pending','negotiating'].includes(b.status));
    if (!hasPending) return;
    const t = setInterval(fetchBookings, 10_000);
    return () => clearInterval(t);
  }, [bookings, fetchBookings]);

  const toggleExpand = (id: string) =>
    setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  /* ── actions ── */
  const accept = async (id: string) => {
    try { await api.put(`/bookings/${id}/accept`); toast.success('Booking accepted!'); fetchBookings(); }
    catch { toast.error('Failed to accept booking'); }
  };
  const acceptPrice = async (id: string) => {
    try { await api.put(`/bookings/${id}/accept-price`); toast.success('Price accepted. Booking confirmed!'); fetchBookings(); }
    catch { toast.error('Failed to accept price'); }
  };
  const confirmCash = async (id: string) => {
    try { await api.post('/payments/confirm-cash', { bookingId: id }); toast.success('Cash payment confirmed!'); fetchBookings(); }
    catch { toast.error('Failed to confirm payment'); }
  };
  const completeTrip = async () => {
    if (!completeBooking) return;
    setCompleting(true);
    try {
      const response = await api.put(`/bookings/${completeBooking._id}/complete`);
      toast.success(response.data?.message ?? 'Completion confirmation saved!');
      setCompleteDialog(false);
      fetchBookings();
    } catch (e: any) { toast.error(e.response?.data?.message ?? 'Failed to complete trip'); }
    finally { setCompleting(false); }
  };
  const declineConfirm = async () => {
    if (!declineBooking) return;
    try {
      await api.put(`/bookings/${declineBooking._id}/decline`);
      toast.success('Booking declined');
      setDeclineDialog(false);
      fetchBookings();
    } catch { toast.error('Failed to decline booking'); }
  };
  const sendCounterOffer = async (id: string) => {
    if (counterPrice <= 0) { toast.error('Enter a valid price'); return; }
    setSendingCounter(true);
    try {
      await api.put(`/bookings/${id}/counter-offer`, { price: counterPrice, message: counterMsg });
      toast.success('Counter offer sent!');
      setCounterBookingId(null); setCounterPrice(0); setCounterMsg('');
      fetchBookings();
    } catch { toast.error('Failed to send counter offer'); }
    finally { setSendingCounter(false); }
  };

  /* ── filter tabs ── */
  const counts = {
    pending:   bookings.filter(b => ['pending','negotiating'].includes(b.status)).length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    completed: bookings.filter(b => b.status === 'completed').length,
    all:       bookings.length,
  };
  const visible = (t: string): Booking[] => {
    if (t === 'pending')   return bookings.filter(b => ['pending','negotiating'].includes(b.status));
    if (t === 'confirmed') return bookings.filter(b => b.status === 'confirmed');
    if (t === 'completed') return bookings.filter(b => b.status === 'completed');
    return bookings;
  };

  if (loading) return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">Bookings</h1><p className="text-muted-foreground mt-1">Manage your booking requests</p></div>
      <BookingListSkeleton />
    </div>
  );

  /* earnings from confirmed+completed bookings */
  const confirmedEarnings = bookings
    .filter(b => ['confirmed', 'completed'].includes(b.status))
    .reduce((s, b) => s + (b.agreedPrice ?? b.totalPrice ?? 0), 0);

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* ── Page header ── */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Manage</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">Bookings</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {counts.pending > 0 && (
              <Badge className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/50 gap-1.5 text-xs px-2.5 py-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute h-full w-full rounded-full bg-amber-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                </span>
                {counts.pending} need{counts.pending === 1 ? 's' : ''} response
              </Badge>
            )}
            <Button size="sm" variant="outline" className="gap-2 text-muted-foreground" onClick={fetchBookings}>
              <RefreshCw className="h-3.5 w-3.5" />Refresh
            </Button>
          </div>
        </div>

        {/* KPI chips row */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Pending',   value: counts.pending,   color: 'text-amber-600 dark:text-amber-400',   bg: 'bg-amber-50 dark:bg-amber-950/30',   ring: 'ring-amber-200 dark:ring-amber-800/50' },
            { label: 'Confirmed', value: counts.confirmed, color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30', ring: 'ring-emerald-200 dark:ring-emerald-800/50' },
            { label: 'Completed', value: counts.completed, color: 'text-blue-600 dark:text-blue-400',     bg: 'bg-blue-50 dark:bg-blue-950/30',       ring: 'ring-blue-200 dark:ring-blue-800/50' },
            { label: 'Pipeline',  value: formatNPR(confirmedEarnings), color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-950/30', ring: 'ring-violet-200 dark:ring-violet-800/50' },
          ].map((chip) => (
            <div key={chip.label} className={`flex flex-col rounded-xl p-3 ring-1 ${chip.bg} ${chip.ring}`}>
              <span className={`text-xl font-bold tabular-nums ${chip.color}`}>{chip.value}</span>
              <span className="mt-0.5 text-xs font-medium text-muted-foreground">{chip.label}</span>
            </div>
          ))}
        </div>
      </div>

      <Tabs defaultValue="pending" onValueChange={setTab}>
        <TabsList className="h-auto p-1 flex-wrap gap-1">
          <TabsTrigger value="pending"  className="gap-1.5">Pending <Badge variant="secondary" className="h-5 px-1.5 text-xs">{counts.pending}</Badge></TabsTrigger>
          <TabsTrigger value="confirmed" className="gap-1.5">Confirmed <Badge variant="secondary" className="h-5 px-1.5 text-xs">{counts.confirmed}</Badge></TabsTrigger>
          <TabsTrigger value="completed" className="gap-1.5">Completed <Badge variant="secondary" className="h-5 px-1.5 text-xs">{counts.completed}</Badge></TabsTrigger>
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
        </TabsList>

        {['pending','confirmed','completed','all'].map(tabKey => (
          <TabsContent key={tabKey} value={tabKey} className="mt-4 space-y-4">
            {visible(tabKey).length === 0 ? (
              <Card><CardContent className="py-16 text-center text-muted-foreground">
                No {tabKey !== 'all' ? tabKey : ''} bookings
              </CardContent></Card>
            ) : (
              visible(tabKey).map(b => <BookingCard
                key={b._id} booking={b} isExpanded={expanded.has(b._id)}
                onToggleExpand={() => toggleExpand(b._id)}
                onAccept={() => accept(b._id)}
                onDecline={() => { setDeclineBooking(b); setDeclineDialog(true); }}
                onAcceptPrice={() => acceptPrice(b._id)}
                onCounterOffer={() => { setCounterBookingId(b._id); setCounterPrice(b.offeredPrice); }}
                onConfirmCash={() => confirmCash(b._id)}
                onComplete={() => { setCompleteBooking(b); setCompleteDialog(true); }}
                counterOfferOpen={counterBookingId === b._id}
                counterPrice={counterPrice}
                counterMsg={counterMsg}
                sendingCounter={sendingCounter}
                onCounterPriceChange={setCounterPrice}
                onCounterMsgChange={setCounterMsg}
                onSendCounter={() => sendCounterOffer(b._id)}
                onCancelCounter={() => setCounterBookingId(null)}
              />)
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Complete trip dialog */}
      <Dialog open={completeDialog} onOpenChange={setCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{completeBooking?.touristCompletedAt ? 'Confirm Trip Completion' : 'Request Trip Completion'}</DialogTitle>
            <DialogDescription>
              {completeBooking?.touristCompletedAt && !completeBooking?.guideCompletedAt
                ? `Confirm ${completeBooking?.tourist?.name}'s completion request. This will finalise payment and generate a commission record.`
                : `Confirm that you completed the trip for ${completeBooking?.tourist?.name}. The traveller must also confirm before earnings are recorded.`}
            </DialogDescription>
          </DialogHeader>
          {completeBooking && (
            <div className="rounded-xl bg-muted/40 p-4 space-y-1 text-sm">
              <p><span className="font-medium">Tourist:</span> {completeBooking.tourist.name}</p>
              <p><span className="font-medium">Dates:</span> {fmt(completeBooking.startDate)} — {fmt(completeBooking.endDate)}</p>
              <p><span className="font-medium">Agreed amount:</span> {formatNPR(completeBooking.agreedPrice ?? completeBooking.totalPrice)}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteDialog(false)}>Cancel</Button>
            <Button onClick={completeTrip} disabled={completing}>
              {completing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : <><CheckCircle className="h-4 w-4 mr-2" />{completeBooking?.touristCompletedAt ? 'Confirm Completion' : 'Request Completion'}</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decline dialog */}
      <Dialog open={declineDialog} onOpenChange={setDeclineDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Booking</DialogTitle>
            <DialogDescription>
              Are you sure you want to decline the booking from {declineBooking?.tourist?.name}? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineDialog(false)}>Go Back</Button>
            <Button variant="destructive" onClick={declineConfirm}><XCircle className="h-4 w-4 mr-2" />Decline</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── booking card sub-component ─────────────────────────────── */
interface CardProps {
  booking: Booking;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onAccept: () => void;
  onDecline: () => void;
  onAcceptPrice: () => void;
  onCounterOffer: () => void;
  onConfirmCash: () => void;
  onComplete: () => void;
  counterOfferOpen: boolean;
  counterPrice: number;
  counterMsg: string;
  sendingCounter: boolean;
  onCounterPriceChange: (v: number) => void;
  onCounterMsgChange: (v: string) => void;
  onSendCounter: () => void;
  onCancelCounter: () => void;
}

function BookingCard({
  booking: b, isExpanded, onToggleExpand,
  onAccept, onDecline, onAcceptPrice, onCounterOffer, onConfirmCash, onComplete,
  counterOfferOpen, counterPrice, counterMsg, sendingCounter,
  onCounterPriceChange, onCounterMsgChange, onSendCounter, onCancelCounter,
}: CardProps) {
  const isPending = ['pending','negotiating'].includes(b.status);
  const StatusIcon = STATUS_ICONS[b.status] ?? Clock;
  const [quickOpen, setQuickOpen] = useState(false);
  const guideConfirmedCompletion = Boolean(b.guideCompletedAt);
  const touristConfirmedCompletion = Boolean(b.touristCompletedAt);
  const canActOnCompletion = b.status === 'confirmed' && b.paymentStatus === 'paid' && !guideConfirmedCompletion;
  const waitingForTouristCompletion = b.status === 'confirmed' && guideConfirmedCompletion && !touristConfirmedCompletion;

  return (
    <Card className={`transition-shadow ${isPending ? 'border-primary/30 shadow-md' : 'border-border/60 shadow-sm'}`}>
      {/* ── card header ── */}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-lg truncate">
              {b.tourist.name}
              {isPending && (
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="animate-ping absolute h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                </span>
              )}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5 truncate">
              {b.tourist.email}{b.tourist.country ? ` · ${b.tourist.country}` : ''}
            </p>
          </div>
          <Badge className={`border capitalize shrink-0 ${STATUS_COLORS[b.status] ?? ''}`}>
            <StatusIcon className="h-3 w-3 mr-1" />{b.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ── quick facts ── */}
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span>{fmt(b.startDate)} — {fmt(b.endDate)}</span>
            <Badge variant="outline" className="shrink-0">{b.numberOfDays}d</Badge>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span>{b.groupSize} people · {b.packageType}</span>
          </div>
        </div>

        {(b.destinations.length > 0 || (b.customDestinations?.length || 0) > 0) && (
          <div className="flex items-center gap-2 flex-wrap">
            <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
            {b.destinations.map((d, i) => <Badge key={i} variant="secondary" className="text-xs">{d.name}</Badge>)}
            {b.customDestinations?.map((d) => <Badge key={d.name} variant="outline" className="text-xs">{d.name}</Badge>)}
          </div>
        )}

        {b.specialRequirements && (
          <div className="rounded-lg border border-border/50 bg-muted/30 p-3 text-sm">
            <p className="text-xs font-medium text-muted-foreground mb-1">Special requirements</p>
            <p>{b.specialRequirements}</p>
          </div>
        )}

        {/* ── price panel ── */}
        <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Tourist Offer</p>
              <p className="text-base font-bold">{formatNPR(b.offeredPrice)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Your Counter</p>
              <p className="text-base font-bold">{b.counterPrice ? formatNPR(b.counterPrice) : '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">{b.agreedPrice ? 'Agreed' : 'Total'}</p>
              <p className="text-base font-bold text-primary">{formatNPR(b.agreedPrice ?? b.totalPrice)}</p>
            </div>
          </div>
        </div>

        {/* ── negotiation / message history (expandable) ── */}
        {b.negotiationHistory.length > 0 && (
          <div>
            <button
              onClick={onToggleExpand}
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {isExpanded ? 'Hide' : 'Show'} conversation ({b.negotiationHistory.length} message{b.negotiationHistory.length !== 1 ? 's' : ''})
            </button>
            {isExpanded && (
              <div className="mt-3 space-y-2 max-h-64 overflow-y-auto pr-1">
                {b.negotiationHistory.map((entry, i) => (
                  <div key={i} className={`flex gap-2 ${entry.by === 'guide' ? 'flex-row-reverse' : ''}`}>
                    <div className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm ${
                      entry.by === 'guide'
                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                        : 'bg-muted text-foreground rounded-tl-sm'
                    }`}>
                      <p className="font-semibold text-xs opacity-70 mb-1">
                        {entry.by === 'guide' ? 'You' : b.tourist.name} · {formatNPR(entry.price)}
                      </p>
                      <p>{entry.message}</p>
                      <p className={`text-[10px] mt-1 ${entry.by === 'guide' ? 'opacity-60 text-right' : 'text-muted-foreground'}`}>
                        {new Date(entry.at).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── counter offer form ── */}
        {counterOfferOpen && (
          <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-4 space-y-3">
            <p className="text-sm font-semibold flex items-center gap-2">
              <Banknote className="h-4 w-4 text-primary" />Send Counter Offer
            </p>
            <div>
              <label className="text-xs text-muted-foreground">Your price (Rs.)</label>
              <Input type="number" value={counterPrice || ''}
                onChange={e => onCounterPriceChange(parseInt(e.target.value, 10) || 0)}
                placeholder="Enter price" className="h-11 text-base font-bold mt-1" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-muted-foreground">Message</label>
                <button onClick={() => setQuickOpen(o => !o)} className="text-xs text-primary hover:underline">
                  Quick responses
                </button>
              </div>
              {quickOpen && (
                <div className="mb-2 flex flex-wrap gap-1">
                  {QUICK_RESPONSES.map(r => (
                    <button key={r} onClick={() => { onCounterMsgChange(r); setQuickOpen(false); }}
                      className="rounded-lg border border-border/60 bg-background px-2 py-1 text-xs hover:bg-muted text-left">
                      {r}
                    </button>
                  ))}
                </div>
              )}
              <Textarea value={counterMsg} onChange={e => onCounterMsgChange(e.target.value)}
                placeholder="Add a message…" rows={2} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onCancelCounter} className="flex-1">Cancel</Button>
              <Button size="sm" onClick={onSendCounter} disabled={sendingCounter} className="flex-1">
                {sendingCounter ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Send Counter
              </Button>
            </div>
          </div>
        )}

        {/* ── payment status (confirmed bookings) ── */}
        {b.status === 'confirmed' && (
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-2.5">
            <div className="flex items-center gap-2 text-sm">
              <Banknote className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Payment:</span>
              {b.paymentStatus === 'paid' ? (
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">✓ Paid</Badge>
              ) : b.paymentMethod === 'cash' ? (
                <Badge className="bg-sky-100 text-sky-700 border-sky-200">Cash – Pending</Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-700 border-amber-200">Awaiting Payment</Badge>
              )}
            </div>
            {b.paymentMethod === 'cash' && b.paymentStatus !== 'paid' && (
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={onConfirmCash}>
                <Banknote className="h-4 w-4 mr-1.5" />Confirm Cash
              </Button>
            )}
          </div>
        )}

        {b.status === 'confirmed' && b.paymentStatus === 'paid' && (b.completionRequestedBy || guideConfirmedCompletion || touristConfirmedCompletion) && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
            {touristConfirmedCompletion && !guideConfirmedCompletion
              ? 'Traveller has requested completion. Confirm it to finalize the booking and record earnings.'
              : guideConfirmedCompletion && !touristConfirmedCompletion
                ? 'You requested completion. Waiting for the traveller to confirm before earnings are recorded.'
                : 'Completion is being confirmed by both parties.'}
          </div>
        )}

        {/* ── completed commission hint ── */}
        {b.status === 'completed' && (
          <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-700">
            <TrendingUp className="h-4 w-4 shrink-0" />
            <span>Commission recorded. Request your payout from the <Link href="/guide/earnings" className="font-semibold underline">Earnings</Link> page.</span>
          </div>
        )}

        {/* ── review badge ── */}
        {b.status === 'completed' && (
          <Link href="/guide/reviews" className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700 hover:bg-amber-100 transition-colors">
            <Star className="h-4 w-4 shrink-0" />
            <span>Check what the traveller said about this trip</span>
            <ChevronUp className="h-4 w-4 ml-auto rotate-90" />
          </Link>
        )}

        {/* ── action bar ── */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t flex-wrap">
          <div>
            <p className="text-xl font-bold">{formatNPR(b.agreedPrice ?? b.totalPrice)}</p>
            <p className="text-xs text-muted-foreground">{b.agreedPrice ? 'Agreed price' : 'Offered price'}</p>
          </div>

          <div className="flex flex-wrap gap-2 justify-end">
            {isPending && (
              <>
                <Button variant="outline" size="sm" onClick={onDecline}>
                  <XCircle className="h-4 w-4 mr-1" />Decline
                </Button>
                {!counterOfferOpen && (
                  <Button variant="secondary" size="sm" onClick={onCounterOffer}>
                    <MessageSquare className="h-4 w-4 mr-1" />Counter
                  </Button>
                )}
                {b.status === 'negotiating' && b.counterPrice && (
                  <Button variant="outline" size="sm" onClick={onAcceptPrice}>
                    Accept {formatNPR(b.counterPrice)}
                  </Button>
                )}
                <Button size="sm" onClick={onAccept}>
                  <CheckCircle className="h-4 w-4 mr-1" />Accept
                </Button>
              </>
            )}

            {b.status === 'confirmed' && (
              <>
                {canActOnCompletion && (
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={onComplete}>
                    <CheckCircle className="h-4 w-4 mr-1.5" />{touristConfirmedCompletion ? 'Confirm Completion' : 'Request Completion'}
                  </Button>
                )}
                {waitingForTouristCompletion && (
                  <Button size="sm" variant="outline" disabled>
                    Waiting for Traveller
                  </Button>
                )}
                <Link href={`/guide/live?bookingId=${b._id}`}>
                  <Button size="sm" variant="outline">
                    <LocateFixed className="h-4 w-4 mr-1.5" />Monitor Live
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
